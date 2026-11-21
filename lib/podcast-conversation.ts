import { Type, type FunctionDeclaration } from "@google/genai";

// Contrairement à flashcards/quiz (un seul appel, texte source envoyé une
// fois), le Podcast IA passe par Gemini Live (conversation audio en continu,
// voir components/PodcastLive.tsx) : l'historique de conversation est géré
// côté session Live, pas ici. Ce fichier ne garde que ce qui est partagé
// entre le serveur (systemInstruction de la session) et le client.
export const PODCAST_SOURCE_MAX_CHARS = 6000;

// Limites appliquées des deux côtés (le prompt les annonce à l'IA, le
// client les fait respecter en revalidant l'appel reçu) : un schéma doit
// rester un petit enchaînement d'étapes lisible, jamais un pavé de texte.
export const DIAGRAM_MAX_STEPS = 6;
export const DIAGRAM_TITLE_MAX_CHARS = 60;
export const DIAGRAM_STEP_MAX_CHARS = 50;

// Outil que l'IA peut appeler pendant la conversation (function calling de
// Gemini Live) pour afficher un petit schéma à l'écran — en complément de
// ce qu'elle dit à voix haute, jamais à sa place. Le rendu (police
// manuscrite, boîtes reliées par des flèches, style croquis) est toujours
// fait de la même façon fiable côté client à partir de cette structure ;
// seul le contenu (titre, étapes) vient du modèle. Si l'appel est mal
// formé, le client l'ignore silencieusement (voir PodcastLive.tsx) : un
// schéma raté ne doit jamais perturber la conversation vocale.
export const DIAGRAM_TOOL_NAME = "montrer_schema";

export const DIAGRAM_TOOL_DECLARATION: FunctionDeclaration = {
  name: DIAGRAM_TOOL_NAME,
  description:
    "Affiche un petit schéma visuel à l'écran pour accompagner ton explication orale : un titre et une suite de 2 à 6 étapes ou éléments courts, reliés dans l'ordre. À utiliser avec parcimonie, seulement à des moments vraiment importants (un processus, une chronologie, une hiérarchie, une suite de causes/conséquences) ou quand l'étudiant dit explicitement qu'il n'a pas compris une étape. Jamais à chaque réponse.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      titre: {
        type: Type.STRING,
        description: `Titre court du schéma (max ${DIAGRAM_TITLE_MAX_CHARS} caractères).`,
      },
      etapes: {
        type: Type.ARRAY,
        description: `De 2 à ${DIAGRAM_MAX_STEPS} étapes ou éléments courts (max ${DIAGRAM_STEP_MAX_CHARS} caractères chacun), dans l'ordre logique.`,
        items: { type: Type.STRING },
      },
    },
    required: ["titre", "etapes"],
  },
};

// Message interne envoyé au tout premier tour pour que l'IA se présente et
// lance la conversation, sans qu'un vrai message "utilisateur" n'apparaisse.
export const PODCAST_KICKOFF_TRIGGER =
  "(Présente le sujet du cours en 1 à 2 phrases, puis invite l'étudiant à poser sa première question.)";

export function truncateSource(text: string): string {
  if (text.length <= PODCAST_SOURCE_MAX_CHARS) return text;
  const hardCut = text.slice(0, PODCAST_SOURCE_MAX_CHARS);
  // Recule jusqu'à la dernière phrase complète si on en trouve une dans les
  // ~20% finaux, pour éviter de couper en plein milieu d'une phrase.
  const searchStart = Math.floor(PODCAST_SOURCE_MAX_CHARS * 0.8);
  const lastSentenceEnd = hardCut.lastIndexOf(". ");
  if (lastSentenceEnd >= searchStart) {
    return hardCut.slice(0, lastSentenceEnd + 1);
  }
  return hardCut;
}

export function buildPodcastSystemPrompt(sourceText: string): string {
  return `Tu es un professeur qui explique un cours à voix haute, en conversation orale avec un étudiant, à partir du contenu suivant (il peut être tronqué si le cours est long) :

"""
${sourceText}
"""

Règles importantes, car tu parles à voix haute en temps réel :
- Réponds en 2 à 4 phrases maximum à la fois, jamais plus : c'est une conversation orale, pas un document écrit.
- N'utilise JAMAIS de markdown (pas d'astérisques, pas de titres, pas de listes) : uniquement du texte parlé naturel.
- Si l'étudiant t'interrompt en pleine phrase, arrête-toi immédiatement et réponds à ce qu'il vient de dire.
- Si la question sort du contenu fourni, dis-le simplement en une phrase et recentre la conversation sur le cours.
- Ne réponds jamais "en tant qu'IA" ou autre formule robotique.
- Ne termine pas systématiquement ta réponse par "as-tu des questions ?" ou une formule similaire — ça doit rester rare et naturel, pas une habitude répétée à chaque tour. La plupart du temps, enchaîne simplement sur la suite du cours.
- Parle dans la même langue que le contenu du cours fourni.
- Tu as accès à l'outil "${DIAGRAM_TOOL_NAME}" pour afficher un petit schéma à l'écran en complément de ce que tu dis. Utilise-le rarement, uniquement à un moment vraiment important (un processus en plusieurs étapes, une chronologie, une hiérarchie, une suite de causes/conséquences) ou quand l'étudiant dit explicitement qu'il n'a pas compris une étape — jamais à chaque réponse, et jamais pour une notion isolée qui n'a pas de vraie structure séquentielle.`;
}
