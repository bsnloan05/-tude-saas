import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const client = new Groq();

// Quotas mensuels par forfait, en secondes.
const PLAN_QUOTA_SECONDS: Record<string, number> = {
  free: 2 * 3600,
  standard: 40 * 3600,
  premium: 75 * 3600,
};

// Le tier gratuit de Groq limite chaque requête à 8000 tokens (entrée + sortie
// cumulées) par minute. Une transcription de cours dépasse vite cette limite,
// donc on découpe les longues transcriptions en morceaux traités un par un,
// avec une pause entre chaque appel le temps que le quota se réinitialise.
const SINGLE_CALL_MAX_CHARS = 12000; // ~30-35 min de cours, tient en un seul appel
const CHUNK_CHAR_SIZE = 20000;
const DELAY_BETWEEN_CALLS_MS = 60000;

const FICHE_SYSTEM_PROMPT = `Tu es un assistant qui transforme la transcription brute d'un cours oral en une fiche de révision claire et bien structurée pour un étudiant.

Règles :
- Écris dans la même langue que la transcription.
- Organise le contenu avec des titres (##), des sous-titres si utile, et des listes à puces.
- Chaque définition importante ou notion clé doit être écrite sous forme de citation Markdown (commence la ligne par ">"), au format : "> **Terme** : explication". N'utilise ce format que pour les vraies définitions, pas pour des phrases ordinaires.
- Corrige les hésitations, répétitions et tournures orales du prof pour obtenir un texte écrit propre.
- Ne rajoute aucune information qui n'est pas dans la transcription.
- Si la transcription est trop courte ou peu compréhensible, fais de ton mieux et signale-le en une phrase à la fin.`;

const CONDENSE_SYSTEM_PROMPT = `Tu reçois un extrait d'une transcription de cours oral (ce n'est qu'une partie du cours complet, pas la totalité). Extrais et liste les informations importantes de cet extrait : notions, définitions, exemples, dates, chiffres. Sois concis mais ne perds aucune information utile. Pas de mise en forme complexe, juste des puces simples. Ne fais aucun commentaire sur le fait que c'est un extrait.`;

const FICHE_FROM_NOTES_SYSTEM_PROMPT = `Tu es un assistant qui transforme des notes condensées d'un cours oral en une fiche de révision claire et bien structurée pour un étudiant. On te donne plusieurs extraits successifs du même cours, dans l'ordre chronologique, séparés par "---".

Règles :
- Écris dans la même langue que les notes fournies.
- Organise le contenu avec des titres (##), des sous-titres si utile, et des listes à puces.
- Chaque définition importante ou notion clé doit être écrite sous forme de citation Markdown (commence la ligne par ">"), au format : "> **Terme** : explication".
- Fusionne les extraits en un seul document cohérent, sans répéter les informations redondantes.
- Ne rajoute aucune information qui n'est pas dans les notes fournies.`;

function splitIntoChunks(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const chunks: string[] = [];
  let current = "";

  for (const word of words) {
    if (current.length + word.length + 1 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  const plan = profile?.plan ?? "free";
  const quotaSeconds = PLAN_QUOTA_SECONDS[plan] ?? PLAN_QUOTA_SECONDS.free;

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

  if (usedSeconds + sessionDuration > quotaSeconds) {
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

  try {
    // Transcription courte : un seul appel direct, comme avant.
    if (cleanTranscript.length <= SINGLE_CALL_MAX_CHARS) {
      const response = await client.chat.completions.create({
        model: "openai/gpt-oss-120b",
        max_tokens: 4096,
        messages: [
          { role: "system", content: FICHE_SYSTEM_PROMPT },
          { role: "user", content: cleanTranscript },
        ],
      });

      const notes = response.choices[0]?.message?.content ?? "";
      if (sessionDuration > 0) {
        await supabase
          .from("usage_sessions")
          .insert({ user_id: user.id, duration_seconds: sessionDuration });
      }
      return NextResponse.json({ notes });
    }

    // Transcription longue : on découpe, on condense chaque morceau,
    // puis on fusionne le tout en une fiche finale.
    const chunks = splitIntoChunks(cleanTranscript, CHUNK_CHAR_SIZE);
    const condensed: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) await sleep(DELAY_BETWEEN_CALLS_MS);

      const response = await client.chat.completions.create({
        model: "openai/gpt-oss-120b",
        max_tokens: 1200,
        messages: [
          { role: "system", content: CONDENSE_SYSTEM_PROMPT },
          { role: "user", content: chunks[i] },
        ],
      });

      condensed.push(response.choices[0]?.message?.content ?? "");
    }

    await sleep(DELAY_BETWEEN_CALLS_MS);

    const finalResponse = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      max_tokens: 4096,
      messages: [
        { role: "system", content: FICHE_FROM_NOTES_SYSTEM_PROMPT },
        { role: "user", content: condensed.join("\n\n---\n\n") },
      ],
    });

    const notes = finalResponse.choices[0]?.message?.content ?? "";
    if (sessionDuration > 0) {
      await supabase
        .from("usage_sessions")
        .insert({ user_id: user.id, duration_seconds: sessionDuration });
    }
    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Erreur Groq API:", error);
    return NextResponse.json(
      { error: "La génération de la fiche a échoué. Vérifie ta clé API." },
      { status: 500 },
    );
  }
}
