import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQuotaSeconds, hasImportAccess } from "@/lib/plans";
import { startOfMonthParis } from "@/lib/parisDate";
import {
  buildFicheFromNotesSystemPrompt,
  buildFicheFromDocumentNotesPrompt,
  finalizeFromCondensed,
  isGroqRateLimitError,
} from "@/lib/fiche-generation";

export const maxDuration = 60;

// Dernière étape d'une génération découpée en plusieurs morceaux (voir
// generate-notes/chunk) : fusionne les morceaux déjà condensés en une fiche
// finale, puis enregistre l'usage/la fiche exactement comme le ferait un
// appel unique classique.
//
// `source` choisit uniquement le style de prompt ("transcript" pour la
// transcription vocale ET l'import audio, "document" pour l'import PDF).
// `requiresImportPlan` choisit le contrôle d'accès : forfait Pro/À vie
// (import PDF/audio) plutôt que quota de minutes (transcription vocale en
// direct) — les deux sont indépendants, l'import audio utilise les prompts
// "transcript" mais le contrôle d'accès "import".
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non connecté." }, { status: 401 });
  }

  const { condensedChunks, source, requiresImportPlan, durationSeconds } =
    await request.json();

  if (
    !Array.isArray(condensedChunks) ||
    condensedChunks.length === 0 ||
    !condensedChunks.every((c) => typeof c === "string")
  ) {
    return NextResponse.json({ error: "Données invalides." }, { status: 400 });
  }
  if (source !== "transcript" && source !== "document") {
    return NextResponse.json({ error: "Source invalide." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();

  const enableDiagrams = profile?.plan === "lifetime";
  const sessionDuration =
    typeof durationSeconds === "number" && durationSeconds > 0 ? durationSeconds : 0;

  if (requiresImportPlan) {
    if (!hasImportAccess(profile?.plan)) {
      return NextResponse.json(
        {
          error: "L'import est réservé aux forfaits Pro et À vie.",
          code: "plan_required",
        },
        { status: 403 },
      );
    }
  } else {
    const quotaSeconds = getQuotaSeconds(profile?.plan);

    // Un quota de 0 (forfait gratuit) doit bloquer dans tous les cas, même
    // avec une durée annoncée de 0 : sinon, un appel direct à cette route
    // (hors interface) passerait toujours la vérification plus bas (0 + 0
    // n'est jamais strictement supérieur à 0) et ne serait jamais
    // comptabilisé, donnant un accès gratuit illimité.
    if (quotaSeconds === 0) {
      return NextResponse.json(
        {
          error: "Génération réservée aux forfaits payants. Passe à un forfait pour continuer.",
          code: "quota_exceeded",
        },
        { status: 403 },
      );
    }

    const { data: sessions } = await supabase
      .from("usage_sessions")
      .select("duration_seconds")
      .eq("user_id", user.id)
      .gte("created_at", startOfMonthParis());

    const usedSeconds = (sessions ?? []).reduce(
      (total, session) => total + session.duration_seconds,
      0,
    );

    if (quotaSeconds !== null && usedSeconds + sessionDuration >= quotaSeconds) {
      const remainingMinutes = Math.max(0, Math.floor((quotaSeconds - usedSeconds) / 60));
      return NextResponse.json(
        {
          error: `Quota mensuel atteint (il te reste ${remainingMinutes} min ce mois-ci). Passe à un forfait supérieur pour continuer.`,
          code: "quota_exceeded",
        },
        { status: 403 },
      );
    }
  }

  try {
    const notes = await finalizeFromCondensed(
      condensedChunks,
      source === "transcript"
        ? buildFicheFromNotesSystemPrompt(enableDiagrams)
        : buildFicheFromDocumentNotesPrompt(enableDiagrams),
    );

    // Seule la transcription vocale en direct consomme du quota de minutes :
    // l'import (PDF/audio) est gated par forfait, pas par durée.
    if (!requiresImportPlan && sessionDuration > 0) {
      await supabase
        .from("usage_sessions")
        .insert({ user_id: user.id, duration_seconds: sessionDuration });
    }
    if (notes.trim()) {
      await supabase.from("fiches").insert({ user_id: user.id, content: notes });
    }
    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Erreur Groq API (fusion finale):", error);
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
