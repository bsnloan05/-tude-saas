import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sleep } from "@/lib/fiche-generation";
import { DEMO_FICHE_NOTES } from "@/lib/demoFiche";

export const maxDuration = 60;

// Sert une fiche pré-générée (voir lib/demoFiche.ts) pour montrer le produit
// à un compte qui vient de s'inscrire sans cours en direct ni fichier à
// importer. Le cours démo est toujours le même (lib/demoTranscript.ts), donc
// pas besoin de rappeler Groq à chaque fois : ça évite de consommer le quota
// partagé avec les vrais clients pour un résultat qui serait de toute façon
// identique. Limité à une seule fois par compte via profiles.demo_used_at,
// pour que ça reste un moment de démo guidé plutôt qu'un raccourci permanent.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, demo_used_at")
    .eq("id", user.id)
    .single();

  if (profile?.plan && profile.plan !== "free") {
    return NextResponse.json(
      { error: "La démo est réservée aux comptes gratuits." },
      { status: 403 },
    );
  }

  if (profile?.demo_used_at) {
    return NextResponse.json(
      { error: "La démo a déjà été utilisée sur ce compte." },
      { status: 403 },
    );
  }

  // Pause artificielle : la fiche est déjà prête (pas d'appel Groq), mais un
  // résultat instantané casserait l'effet "génération guidée" de l'écran de
  // chargement (voir app/app/demo/page.tsx), qui tourne sur ~3 messages de
  // 1,8s chacun.
  await sleep(3200);

  // Client admin requis ici : comme partout ailleurs dans l'app (webhook
  // Stripe, désabonnement...), le client lié à la session de l'utilisateur
  // n'a pas le droit d'écrire sur sa propre ligne `profiles` (RLS) — un
  // update avec le client normal échoue silencieusement, sans erreur.
  await createAdminClient()
    .from("profiles")
    .update({ demo_used_at: new Date().toISOString() })
    .eq("id", user.id);

  return NextResponse.json({ notes: DEMO_FICHE_NOTES });
}
