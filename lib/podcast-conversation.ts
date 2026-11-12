import { groqClient, maxOutputTokensFor, estimateTokens, GROQ_TPM_BUDGET } from "@/lib/fiche-generation";

export interface PodcastMessage {
  role: "user" | "assistant";
  content: string;
}

// Contrairement à flashcards/quiz (un seul appel, texte source envoyé une
// fois), ici le texte source est renvoyé à CHAQUE tour de conversation
// (Groq ne garde aucune mémoire côté serveur entre deux appels). On le
// tronque donc beaucoup plus court que SINGLE_CALL_MAX_CHARS (12000) pour
// garder de la place pour l'historique de conversation à chaque appel.
// Limitation connue de cette v1 : un cours très long est tronqué, pas de
// chunking/condensation comme pour les fiches/flashcards/quiz.
export const PODCAST_SOURCE_MAX_CHARS = 6000;

// Message interne envoyé au tout premier tour (historique vide) pour que
// l'IA se présente et lance la conversation, sans qu'un vrai message
// "utilisateur" n'apparaisse dans l'historique affiché/stocké.
export const PODCAST_KICKOFF_MESSAGE =
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

Règles très importantes, car ta réponse est lue à voix haute par une synthèse vocale (jamais affichée à l'écran) :
- Réponds en 2 à 4 phrases maximum, jamais plus : c'est une conversation orale, pas un document écrit.
- N'utilise JAMAIS de markdown (pas d'astérisques, pas de titres, pas de listes à tirets, pas de numéros de liste) : écris uniquement du texte parlé naturel.
- Si la question sort du contenu fourni, dis-le simplement en une phrase et recentre la conversation sur le cours.
- Si l'historique de conversation est vide, c'est le tout début : présente le sujet du cours en 1 à 2 phrases, puis invite l'étudiant à poser sa première question. Ne réponds jamais "en tant qu'IA" ou autre formule robotique.
- Écris dans la même langue que le contenu du cours fourni.`;
}

// Ne garde que les messages les plus récents qui tiennent dans le budget de
// tokens Groq (une fois le system prompt et le nouveau message comptés, plus
// une marge réservée pour la réponse) : supprime toujours les PLUS ANCIENS
// messages en premier, jamais les plus récents.
export function trimHistory(
  history: PodcastMessage[],
  systemPrompt: string,
  userMessage: string,
): PodcastMessage[] {
  const reservedForOutput = 150;
  let budget =
    GROQ_TPM_BUDGET - estimateTokens(systemPrompt) - estimateTokens(userMessage) - reservedForOutput;

  const kept: PodcastMessage[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const cost = estimateTokens(history[i].content);
    if (cost > budget) break;
    kept.unshift(history[i]);
    budget -= cost;
  }
  return kept;
}

// Nettoie les symboles markdown résiduels que le modèle pourrait malgré
// tout ajouter, pour que la synthèse vocale ne les lise jamais à voix haute.
function stripMarkdown(text: string): string {
  return text.replace(/[*_#`]/g, "").trim();
}

export async function getPodcastReply(
  sourceText: string,
  history: PodcastMessage[],
  userMessage: string,
): Promise<string> {
  const truncatedSource = truncateSource(sourceText);
  const systemPrompt = buildPodcastSystemPrompt(truncatedSource);
  const trimmedHistory = trimHistory(history, systemPrompt, userMessage);

  const inputText =
    systemPrompt + trimmedHistory.map((m) => m.content).join(" ") + userMessage;

  const response = await groqClient.chat.completions.create({
    model: "openai/gpt-oss-120b",
    max_tokens: maxOutputTokensFor(inputText, 150, 350),
    messages: [
      { role: "system", content: systemPrompt },
      ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "";
  return stripMarkdown(raw);
}
