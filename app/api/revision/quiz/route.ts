import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasRevisionAccess } from "@/lib/plans";
import {
  isGroqRateLimitError,
  SINGLE_CALL_MAX_CHARS,
  CHUNK_CHAR_SIZE,
  splitIntoChunks,
} from "@/lib/fiche-generation";
import { generateQuiz } from "@/lib/revision-generation";

export const maxDuration = 60;

// Même logique de découpage que generate-notes (voir ce fichier pour le
// détail) : un texte trop long pour tenir dans la limite de débit Groq en un
// seul appel est renvoyé en morceaux au navigateur, qui les condense lui-même
// via la route générique /api/generate-notes/chunk (déjà existante, réutilisée
// telle quelle) avant d'appeler /api/revision/quiz/finalize.
export async function POST(request: NextRequest) {
  const { text, title, sourceFicheId } = await request.json();

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json({ error: "Texte vide." }, { status: 400 });
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

  const cleanText = text.trim();

  if (cleanText.length > SINGLE_CALL_MAX_CHARS) {
    return NextResponse.json({
      needsChunking: true,
      chunks: splitIntoChunks(cleanText, CHUNK_CHAR_SIZE),
      source: "document",
      title: title ?? null,
      sourceFicheId: sourceFicheId ?? null,
    });
  }

  try {
    const questions = await generateQuiz(cleanText);

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
    console.error("Erreur Groq API (quiz):", error);
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
