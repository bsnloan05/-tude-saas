import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Lien cliqué depuis l'email de réinitialisation de mot de passe. Distinct
// de /auth/callback (qui renvoie vers /app) : ici on doit plutôt amener
// l'utilisateur vers le formulaire de nouveau mot de passe.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Lien invalide ou expiré.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Lien invalide ou expiré.")}`,
    );
  }

  return NextResponse.redirect(`${origin}/reset-password`);
}
