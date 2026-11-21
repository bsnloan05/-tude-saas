// Contrairement à flashcards/quiz (un seul appel, texte source envoyé une
// fois), le Podcast IA passe par Gemini Live (conversation audio en continu,
// voir components/PodcastLive.tsx) : l'historique de conversation est géré
// côté session Live, pas ici. Ce fichier ne garde que ce qui est partagé
// entre le serveur (systemInstruction de la session) et le client.
export const PODCAST_SOURCE_MAX_CHARS = 6000;

// Limites partagées entre la génération du schéma (voir
// app/api/revision/podcast/diagram/route.ts) et son affichage (voir
// PodcastLive.tsx) : un schéma doit rester un petit enchaînement d'étapes
// lisible, jamais un pavé de texte.
//
// Note historique : la première version laissait le modèle vocal de Gemini
// Live déclencher lui-même un schéma via un "tool call" pendant la
// conversation. Abandonné : c'est une limitation documentée des modèles
// audio natifs de Gemini Live (pas un réglage de prompt à corriger) —
// l'appel d'outil se déclenche très rarement, et le modèle dit parfois à
// voix haute qu'il "ne peut pas" au lieu de l'utiliser. Le schéma est donc
// maintenant généré après coup, à partir de la transcription de ce que
// l'IA vient de dire, par un appel Gemini classique totalement séparé de
// la session vocale (voir la route ci-dessus) — fiable, mais le schéma
// apparaît juste après la réponse plutôt que pendant.
export const DIAGRAM_MAX_STEPS = 6;
export const DIAGRAM_TITLE_MAX_CHARS = 60;
export const DIAGRAM_STEP_MAX_CHARS = 50;

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
- Si l'étudiant te demande un schéma, un dessin ou une représentation visuelle : ne dis JAMAIS que tu ne peux pas le faire. Réponds positivement (ex: "oui, bien sûr") puis explique le concept concerné de façon claire et structurée, étape par étape — un visuel apparaîtra automatiquement à l'écran en complément de ton explication, ce n'est pas à toi de le générer toi-même.
- Parle dans la même langue que le contenu du cours fourni.`;
}
