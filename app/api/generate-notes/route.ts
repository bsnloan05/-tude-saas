import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuotaSeconds } from "@/lib/plans";
import {
  buildFicheSystemPrompt,
  generateSingleCallFiche,
  isGroqRateLimitError,
  SINGLE_CALL_MAX_CHARS,
  CHUNK_CHAR_SIZE,
  splitIntoChunks,
} from "@/lib/fiche-generation";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const { transcript, durationSeconds } = await request.json();

  if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
    return NextResponse.json({ error: "Transcription vide." }, { status: 400 });
  }

  const sessionDuration =
    typeof durationSeconds === "number" && durationSeconds > 0 ? durationSeconds : 0;

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

  const quotaSeconds = getQuotaSeconds(profile?.plan);
  const enableDiagrams = profile?.plan === "lifetime";

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: sessions } = await supabase
    .from("usage_sessions")
    .select("duration_seconds")
    .eq("user_id", user.id)
    .gte("created_at", startOfMonth.toISOString());

  const usedSeconds = (sessions ?? []).reduce(
    (total, session) => total + session.duration_seconds,
    0,
  );

  if (quotaSeconds !== null && usedSeconds + sessionDuration > quotaSeconds) {
    const remainingMinutes = Math.max(0, Math.floor((quotaSeconds - usedSeconds) / 60));
    return NextResponse.json(
      {
        error: `Quota mensuel atteint (il te reste ${remainingMinutes} min ce mois-ci). Passe à un forfait supérieur pour continuer.`,
        code: "quota_exceeded",
      },
      { status: 403 },
    );
  }

  const cleanTranscript = transcript.trim();

  // Un cours assez long (au-delà d'environ 30-35 min de parole) dépasse la
  // limite de débit Groq en un seul appel et doit être découpé, ce qui prend
  // plusieurs minutes (pause d'une minute entre chaque morceau) — largement
  // au-delà des 60s max d'une fonction Vercel sur le plan gratuit. On renvoie
  // donc les morceaux au navigateur, qui pilote lui-même la suite via
  // generate-notes/chunk puis generate-notes/finalize, sans limite de temps.
  if (cleanTranscript.length > SINGLE_CALL_MAX_CHARS) {
    return NextResponse.json({
      needsChunking: true,
      chunks: splitIntoChunks(cleanTranscript, CHUNK_CHAR_SIZE),
      source: "transcript",
      requiresImportPlan: false,
      durationSeconds: sessionDuration,
    });
  }

  try {
    const notes = await generateSingleCallFiche(
      cleanTranscript,
      buildFicheSystemPrompt(enableDiagrams),
    );

    if (sessionDuration > 0) {
      await supabase
        .from("usage_sessions")
        .insert({ user_id: user.id, duration_seconds: sessionDuration });
    }
    if (notes.trim()) {
      await supabase.from("fiches").insert({ user_id: user.id, content: notes });
    }
    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Erreur Groq API:", error);

    // Un pic de demandes en même temps (plusieurs étudiants génèrent une
    // fiche au même moment) déclenche une erreur 429 côté Groq. Ce n'est pas
    // une panne : un message rassurant qui invite à réessayer est plus
    // approprié qu'un message d'erreur technique qui fait peur.
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
