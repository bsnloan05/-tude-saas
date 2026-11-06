import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasRevisionAccess } from "@/lib/plans";
import { isGroqRateLimitError } from "@/lib/fiche-generation";
import { generateQuiz } from "@/lib/revision-generation";

export const maxDuration = 60;

// Dernière étape après condensation des morceaux via /api/generate-notes/chunk
// (voir /api/revision/quiz) : fusionne les morceaux condensés et génère le
// quiz final.
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
    const questions = await generateQuiz(condensedChunks.join("\n\n---\n\n"));

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "Impossible de générer un quiz à partir de ce contenu." },
        { status: 500 },
      );
    }

    const { data: set, error: insertError } = await supabase
      .from("quiz_sets")
      .insert({
        user_id: user.id,
        title: title || null,
        source_fiche_id: sourceFicheId || null,
        questions,
      })
      .select("id")
      .single();

    if (insertError || !set) {
      return NextResponse.json(
        { error: "Le quiz a été généré mais n'a pas pu être enregistré." },
        { status: 500 },
      );
    }

    return NextResponse.json({ setId: set.id, questions });
  } catch (error) {
    console.error("Erreur Groq API (quiz, fusion finale):", error);
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
