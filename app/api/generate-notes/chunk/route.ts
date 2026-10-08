import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuotaSeconds } from "@/lib/plans";
import {
  CONDENSE_SYSTEM_PROMPT,
  CONDENSE_DOCUMENT_PROMPT,
  condenseChunk,
  isGroqRateLimitError,
} from "@/lib/fiche-generation";

export const maxDuration = 60;

// Condense un seul morceau d'un texte trop long pour un appel unique (voir
// SINGLE_CALL_MAX_CHARS). Appelée plusieurs fois de suite par le navigateur,
// avec une pause entre chaque appel, plutôt que depuis une seule requête
// serveur qui dépasserait la limite de 60s du plan gratuit Vercel.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  // Un compte gratuit ne peut de toute façon jamais finaliser une génération
  // (voir generate-notes/finalize) : autant le bloquer ici aussi, pour ne
  // pas dépenser de budget Groq sur des morceaux qui n'aboutiront jamais à
  // une fiche si quelqu'un appelle cette route directement, hors interface.
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (getQuotaSeconds(profile?.plan) === 0) {
    return NextResponse.json(
      {
        error: "Génération réservée aux forfaits payants. Passe à un forfait pour continuer.",
        code: "quota_exceeded",
      },
      { status: 403 },
    );
  }

  const { chunk, source } = await request.json();

  if (typeof chunk !== "string" || chunk.trim().length === 0) {
    return NextResponse.json({ error: "Morceau de texte vide." }, { status: 400 });
  }
  if (source !== "transcript" && source !== "document") {
    return NextResponse.json({ error: "Source invalide." }, { status: 400 });
  }

  try {
    const condensed = await condenseChunk(
      chunk,
      source === "transcript" ? CONDENSE_SYSTEM_PROMPT : CONDENSE_DOCUMENT_PROMPT,
    );
    return NextResponse.json({ condensed });
  } catch (error) {
    console.error("Erreur Groq API (condensation):", error);
    return NextResponse.json(
      {
        error: isGroqRateLimitError(error)
          ? "Beaucoup de monde utilise Memoflash en ce moment. Attends quelques minutes puis réessaie : ta transcription est bien enregistrée, tu ne perdras rien."
          : "La génération a rencontré un petit souci. Réessaie, ta transcription est toujours là.",
      },
      { status: 500 },
    );
  }
}
