import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildFicheSystemPrompt, generateSingleCallFiche, isGroqRateLimitError } from "@/lib/fiche-generation";
import { DEMO_TRANSCRIPT } from "@/lib/demoTranscript";

export const maxDuration = 60;

// Génère une fiche à partir de l'exemple de cours bundlé (voir
// lib/demoTranscript.ts), pour montrer le produit à un compte qui vient de
// s'inscrire sans cours en direct ni fichier à importer. Volontairement sans
// contrôle de quota/forfait (contrairement à generate-notes) : accessible aux
// comptes gratuits, mais limité à une seule fois par compte via
// profiles.demo_used_at, pour que ça reste un moment de démo guidé plutôt
// qu'un générateur gratuit illimité.
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
    .select("demo_used_at")
    .eq("id", user.id)
    .single();

  if (profile?.demo_used_at) {
    return NextResponse.json(
      { error: "La démo a déjà été utilisée sur ce compte." },
      { status: 403 },
    );
  }

  try {
    const notes = await generateSingleCallFiche(DEMO_TRANSCRIPT, buildFicheSystemPrompt(false));

    await supabase
      .from("profiles")
      .update({ demo_used_at: new Date().toISOString() })
      .eq("id", user.id);

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Erreur Groq API (démo):", error);
    return NextResponse.json(
      {
        error: isGroqRateLimitError(error)
          ? "Beaucoup de monde utilise Memoflash en ce moment. Attends quelques minutes puis réessaie."
          : "La génération a rencontré un petit souci. Réessaie.",
      },
      { status: 500 },
    );
  }
}
