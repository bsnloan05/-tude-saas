import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { hasRevisionAccess } from "@/lib/plans";
import {
  DIAGRAM_MAX_STEPS,
  DIAGRAM_TITLE_MAX_CHARS,
  DIAGRAM_STEP_MAX_CHARS,
  DIAGRAM_EMOJI_MAX_CHARS,
} from "@/lib/podcast-conversation";

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
            text: `Voici ce qu'un professeur vient de dire à voix haute à un étudiant :\n\n"""\n${text.trim().slice(0, 2000)}\n"""\n\nCe passage contient-il au moins 2 exemples, catégories, facteurs ou éléments CONCRETS et nommés (des choses précises : des noms de domaines, de personnes, de types, de dates, de lieux...) — même cités rapidement en exemple, pas forcément le sujet principal de la phrase ? Si oui, réponds oui et liste ces éléments concrets comme étapes. Réponds non si le passage se contente de reformuler ou résumer le sujet en termes généraux SANS donner d'exemples concrets distincts (ex: une conclusion, une transition, une question, une remarque générale qui ne fait que parler "du cours" ou "du sujet" sans rien nommer de précis).\n\nSi oui, donne aussi pour chaque étape un seul emoji pertinent qui illustre bien son contenu (ex: une couronne pour un roi, une pièce pour l'argent, une balance pour la justice) — choisis un emoji vraiment lié au sens de l'étape, pas un emoji générique répété à chaque fois.`,
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
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          schemaPertinent: { type: Type.BOOLEAN },
          titre: { type: Type.STRING, maxLength: String(DIAGRAM_TITLE_MAX_CHARS) },
          etapes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                texte: { type: Type.STRING, maxLength: String(DIAGRAM_STEP_MAX_CHARS) },
                emoji: { type: Type.STRING, maxLength: String(DIAGRAM_EMOJI_MAX_CHARS) },
              },
              required: ["texte"],
            },
            maxItems: String(DIAGRAM_MAX_STEPS),
          },
        },
        required: ["schemaPertinent"],
      },
    },
  };

  // Ce modèle (gemini-3.5-flash-lite) a deux défauts confirmés en test réel,
  // indépendants l'un de l'autre :
  // 1. Une erreur 503 "high demand" côté Google (pic de charge temporaire).
  // 2. Une répétition dégénérée sur le titre (des dizaines de milliers de
  //    caractères de texte incohérent au lieu de s'arrêter proprement) —
  //    confirmé fréquent (plusieurs dizaines de % des appels) sur certains
  //    contenus, et PAS résolu par une température basse ni une consigne
  //    anti-répétition dans le prompt : c'est une instabilité du modèle à
  //    contourner, pas un réglage de prompt à corriger.
  // Les deux sont traités comme le même genre de panne transitoire : on
  // retente plusieurs fois avant d'abandonner.
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = await ai.models.generateContent(generationConfig);
      const rawText = response.text ?? "{}";
      if (rawText.length > 1000) {
        // Une réponse légitime ne dépasse jamais quelques centaines de
        // caractères : au-delà, c'est presque certainement la répétition
        // dégénérée décrite ci-dessus (JSON tronqué par maxOutputTokens
        // avant d'être valide) — autant retenter tout de suite.
        throw new Error("Réponse anormalement longue (répétition dégénérée probable)");
      }
      return NextResponse.json({ diagram: parseDiagram(rawText) });
    } catch (error) {
      lastError = error;
    }
  }
  // Un schéma raté ne doit jamais remonter d'erreur visible : la
  // conversation vocale continue normalement sans lui.
  console.error("Erreur génération schéma Podcast IA (après 5 tentatives):", lastError);
  return NextResponse.json({ diagram: null });
}

// Un vrai mot (français ou toute autre langue) ne dépasse jamais ~25
// caractères sans espace — confirmé en test réel que la répétition
// dégénérée du modèle peut aussi prendre la forme d'un bloc de caractères
// collés sans espaces (ex: "...hjhgkhjfhjkfhjkdfhjkhjkdfhjk...") qui reste
// sous le seuil de longueur totale (voir plus bas) et passerait inaperçu
// sans cette vérification.
const MAX_WORD_LENGTH = 25;
function hasGlueGarbage(text: string): boolean {
  return text.split(/\s+/).some((word) => word.length > MAX_WORD_LENGTH);
}

// Peut lancer (JSON invalide, ou texte détecté comme corrompu) si la
// réponse est mauvaise — l'appelant retente dans ce cas plutôt que de
// considérer ça comme un "pas de schéma" légitime. Un `schemaPertinent:
// false` valide, lui, n'est jamais une erreur.
function parseDiagram(raw: string): { title: string; steps: { text: string; emoji: string }[] } | null {
  const parsed = JSON.parse(raw) as {
    schemaPertinent?: boolean;
    titre?: string;
    etapes?: { texte?: string; emoji?: string }[];
  };

  if (
    !parsed.schemaPertinent ||
    typeof parsed.titre !== "string" ||
    !Array.isArray(parsed.etapes) ||
    parsed.etapes.length < 2
  ) {
    return null;
  }

  if (hasGlueGarbage(parsed.titre) || parsed.etapes.some((s) => typeof s.texte === "string" && hasGlueGarbage(s.texte))) {
    throw new Error("Texte corrompu détecté (mots anormalement longs, répétition dégénérée probable)");
  }

  const steps = parsed.etapes
    .filter((s) => typeof s?.texte === "string" && s.texte.trim().length > 0)
    .slice(0, DIAGRAM_MAX_STEPS)
    .map((s) => ({
      text: s.texte!.slice(0, DIAGRAM_STEP_MAX_CHARS),
      // Un emoji manquant ou mal formé ne doit jamais casser l'affichage —
      // simple texte vide, le rendu s'adapte (voir PodcastLive.tsx).
      emoji: typeof s.emoji === "string" ? s.emoji.slice(0, DIAGRAM_EMOJI_MAX_CHARS) : "",
    }));
  if (steps.length < 2) return null;

  return {
    title: parsed.titre.slice(0, DIAGRAM_TITLE_MAX_CHARS),
    steps,
  };
}
