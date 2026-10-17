import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPostHogServerClient } from "@/lib/posthog-server";

// Supabase redirige ici après une connexion Google (ou tout autre
// fournisseur OAuth) avec un code à échanger contre une vraie session,
// côté serveur, pour que les cookies soient posés correctement.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error_description");
  const origin = request.nextUrl.origin;

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(oauthError)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Code manquant.")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Erreur échange code OAuth:", error);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Une connexion par email identifie déjà la personne côté client, dans
  // /login, avec la bonne propriété "set once" (is_new_signup ou
  // has_existing_account — voir ce fichier) pour exclure les comptes déjà
  // existants des entonnoirs d'acquisition PostHog. Une connexion Google
  // arrive ici directement, sans jamais passer par ce code côté client :
  // sans ce bloc, elle ne serait jamais taguée. On distingue un vrai nouveau
  // compte d'une reconnexion en comparant la date de création à la date de
  // cette connexion : elles ne sont (quasi) identiques que lors de la toute
  // première connexion.
  try {
    const user = data.user;
    if (user) {
      const createdAt = new Date(user.created_at).getTime();
      const lastSignInAt = user.last_sign_in_at
        ? new Date(user.last_sign_in_at).getTime()
        : createdAt;
      const isNewSignup = lastSignInAt - createdAt < 60000;

      const posthogServer = getPostHogServerClient();
      posthogServer?.setPersonProperties({
        distinctId: user.id,
        properties: { email: user.email },
        propertiesOnce: isNewSignup
          ? { is_new_signup: true }
          : { has_existing_account: true },
      });
      posthogServer?.capture({
        distinctId: user.id,
        event: isNewSignup ? "signup_completed" : "login_completed",
      });
      await posthogServer?.shutdown();
    }
  } catch (posthogError) {
    // Le suivi analytique ne doit jamais empêcher une vraie connexion.
    console.error("Erreur PostHog (callback OAuth):", posthogError);
  }

  return NextResponse.redirect(`${origin}/app`);
}
