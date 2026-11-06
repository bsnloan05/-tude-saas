import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasRevisionAccess } from "@/lib/plans";
import { isGroqRateLimitError } from "@/lib/fiche-generation";
import { generateFlashcards } from "@/lib/revision-generation";

export const maxDuration = 60;

// Dernière étape après condensation des morceaux via /api/generate-notes/chunk
// (voir /api/revision/flashcards) : fusionne les morceaux condensés et génère
// les flashcards finales.
export async function POST(request: NextRequest) {
  const { condensedChunks, title, sourceFicheId } = await request.json();

  if (
    !Array.isArray(condensedChunks) ||
    condensedChunks.length === 0 ||
    !condensedChunks.every((c) => typeof c === "string")
  ) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  if (!hasRevisionAccess(profile?.plan)) {
    return NextResponse.json(
      {
        error: "La révision (flashcards/quiz) est réservée aux forfaits payants.",
        code: "plan_required",
      },
      { status: 403 },
    );
  }

  try {
    const cards = await generateFlashcards(condensedChunks.join("\n\n---\n\n"));

    if (cards.length === 0) {
      return NextResponse.json(
        { error: "Impossible de générer des flashcards à partir de ce contenu." },
        { status: 500 },
      );
    }

    const { data: set, error: insertError } = await supabase
      .from("flashcard_sets")
      .insert({
        user_id: user.id,
        title: title || null,
        source_fiche_id: sourceFicheId || null,
        cards,
      })
      .select("id")
      .single();

    if (insertError || !set) {
      return NextResponse.json(
        { error: "Les flashcards ont été générées mais n'ont pas pu être enregistrées." },
        { status: 500 },
      );
    }

    return NextResponse.json({ setId: set.id, cards });
  } catch (error) {
    console.error("Erreur Groq API (flashcards, fusion finale):", error);
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
