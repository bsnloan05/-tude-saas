import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { hasRevisionAccess } from "@/lib/plans";
import { DIAGRAM_MAX_STEPS, DIAGRAM_TITLE_MAX_CHARS, DIAGRAM_STEP_MAX_CHARS } from "@/lib/podcast-conversation";

export const maxDuration = 30;

// Le modèle vocal natif de Gemini Live (voir PodcastLive.tsx) ne déclenche
// quasiment jamais ses "tool calls" de façon fiable (limitation documentée
// du modèle, pas un réglage de prompt à corriger — voir discussion) : il
// expliquait à voix haute qu'il "ne pouvait pas générer de schéma" au lieu
// d'utiliser l'outil. On déclenche donc le schéma séparément, après coup,
// à partir de la transcription texte de ce que l'IA vient de dire — un
// appel Gemini classique (pas Live), volontairement pas Groq pour ne pas
// ajouter de charge sur un quota déjà tendu (voir mémoire Groq).
const DIAGRAM_DECISION_MODEL = "gemini-3.5-flash-lite";

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: "Réservé aux forfaits payants." }, { status: 403 });
  }

  const { text } = await request.json();
  if (typeof text !== "string" || text.trim().length < 30) {
    // Trop court pour mériter un schéma (ex: "oui", "d'accord") : pas la
    // peine de solliciter le modèle pour ça.
    return NextResponse.json({ diagram: null });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const generationConfig = {
    model: DIAGRAM_DECISION_MODEL,
    contents: [
      {
        role: "user" as const,
        parts: [
          {
            text: `Voici ce qu'un professeur vient de dire à voix haute à un étudiant :\n\n"""\n${text.trim().slice(0, 2000)}\n"""\n\nCe passage décrit-il un vrai processus en plusieurs étapes, une chronologie, une hiérarchie, une suite de causes/conséquences, OU une classification/comparaison de plusieurs éléments parallèles bien distincts (ex: plusieurs définitions, catégories, types) qui mérite vraiment un petit schéma visuel pour mieux comprendre ? Sois strict : la plupart des passages ne méritent AUCUN schéma, uniquement les vrais enchaînements ou regroupements structurés — pas une simple phrase descriptive isolée.`,
          },
        ],
      },
    ],
    config: {
      // Confirmé en test réel : sans limite, ce modèle part parfois en
      // répétition dégénérée sur le titre (des dizaines de milliers de
      // caractères de texte délirant) au lieu de s'arrêter proprement —
      // un schéma n'a jamais besoin de plus de quelques dizaines de mots.
      maxOutputTokens: 400,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          schemaPertinent: { type: Type.BOOLEAN },
          titre: { type: Type.STRING, maxLength: String(DIAGRAM_TITLE_MAX_CHARS) },
          etapes: {
            type: Type.ARRAY,
            items: { type: Type.STRING, maxLength: String(DIAGRAM_STEP_MAX_CHARS) },
            maxItems: String(DIAGRAM_MAX_STEPS),
          },
        },
        required: ["schemaPertinent"],
      },
    },
  };

  // Confirmé en test réel : ce modèle renvoie parfois une erreur 503
  // "high demand" côté Google (pic de charge, rien à voir avec notre code).
  // Google indique lui-même que ces pics sont généralement temporaires —
  // on retente deux fois avec une courte pause avant d'abandonner.
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = await ai.models.generateContent(generationConfig);
      return parseDiagramResponse(response.text ?? "{}");
    } catch (error) {
      lastError = error;
    }
  }
  // Un schéma raté ne doit jamais remonter d'erreur visible : la
  // conversation vocale continue normalement sans lui.
  console.error("Erreur génération schéma Podcast IA (après 3 tentatives):", lastError);
  return NextResponse.json({ diagram: null });
}

function parseDiagramResponse(raw: string) {
  try {
    const parsed = JSON.parse(raw) as {
      schemaPertinent?: boolean;
      titre?: string;
      etapes?: string[];
    };

    if (
      !parsed.schemaPertinent ||
      typeof parsed.titre !== "string" ||
      !Array.isArray(parsed.etapes) ||
      parsed.etapes.length < 2
    ) {
      return NextResponse.json({ diagram: null });
    }

    return NextResponse.json({
      diagram: {
        title: parsed.titre.slice(0, DIAGRAM_TITLE_MAX_CHARS),
        steps: parsed.etapes.slice(0, DIAGRAM_MAX_STEPS).map((s) => String(s).slice(0, DIAGRAM_STEP_MAX_CHARS)),
      },
    });
  } catch (error) {
    // Un schéma raté ne doit jamais remonter d'erreur visible : la
    // conversation vocale continue normalement sans lui.
    console.error("Erreur génération schéma Podcast IA:", error);
    return NextResponse.json({ diagram: null });
  }
}
