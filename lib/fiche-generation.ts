import Groq from "groq-sdk";

export const groqClient = new Groq();

// Le tier gratuit de Groq limite chaque requête à 8000 tokens (entrée + sortie
// cumulées) par minute. Un texte source dépasse vite cette limite, donc on
// découpe les longs textes en morceaux traités un par un, avec une pause
// entre chaque appel le temps que le quota se réinitialise.
export const SINGLE_CALL_MAX_CHARS = 12000; // ~30-35 min de cours, tient en un seul appel
export const CHUNK_CHAR_SIZE = 20000;
export const DELAY_BETWEEN_CALLS_MS = 60000;

export const STRUCTURE_RULES = `Règles de structure (très important, à respecter strictement) :
- Regroupe le contenu en 4 à 7 grandes parties maximum, chacune avec un titre ## qui nomme un vrai thème du cours (pas un par notion isolée).
- N'écris JAMAIS de numéro dans un titre (pas de "1.", "2.", "I.", etc.) : le titre seul suffit.
- N'utilise un sous-titre ### que si une partie ## contient plusieurs sous-thèmes clairement distincts ; sinon reste directement en liste à puces sous le titre ##.
- À l'intérieur de chaque partie, utilise des listes à puces courtes plutôt que de longs paragraphes, pour que ce soit rapide à relire.
- Chaque définition importante ou notion clé doit être écrite sous forme de citation Markdown (commence la ligne par ">"), au format : "> **Terme** : explication". N'utilise ce format que pour les vraies définitions, pas pour des phrases ordinaires.`;

// Fonctionnalité réservée au forfait "À vie" : des schémas Mermaid quand le
// sujet s'y prête, sinon un exemple concret. Appliquée uniquement via les
// fonctions build...Prompt ci-dessous, jamais sur les prompts par défaut, pour
// ne rien changer au comportement existant des autres forfaits.
export const DIAGRAM_RULES = `Schémas (fonctionnalité exclusive à ce forfait, à utiliser avec parcimonie) :
- Si une notion se prête vraiment à une représentation visuelle (un processus en plusieurs étapes, un cycle, une hiérarchie, une chronologie, des relations entre éléments), tu peux ajouter un schéma au format Mermaid dans un bloc de code \`\`\`mermaid, juste après la notion concernée. Utilise un type simple et syntaxiquement correct (flowchart TD ou mindmap de préférence).
- Écris tous les textes à l'intérieur du schéma (titres des nœuds, étiquettes des flèches) dans la même langue que le reste de la fiche. N'utilise jamais l'anglais si la fiche est dans une autre langue.
- N'ajoute JAMAIS de schéma si le sujet ne s'y prête pas naturellement : donne plutôt un exemple concret dans le texte pour mieux faire comprendre la notion.
- Au maximum un schéma par fiche, uniquement si c'est vraiment pertinent. Ne force jamais un schéma artificiel.`;

export function buildFicheSystemPrompt(enableDiagrams: boolean): string {
  return `Tu es un assistant qui transforme la transcription brute d'un cours oral en une fiche de révision claire et bien structurée pour un étudiant.

${STRUCTURE_RULES}
- Écris dans la même langue que la transcription.
- Sois complet : garde tous les exemples, chiffres, dates et détails concrets donnés par le prof, une fiche trop courte n'aide pas à réviser. Ne résume pas à l'excès.
- Corrige les hésitations, répétitions et tournures orales du prof pour obtenir un texte écrit propre.
- Ne rajoute aucune information qui n'est pas dans la transcription.
- Si la transcription est trop courte ou peu compréhensible, fais de ton mieux et signale-le en une phrase à la fin.${enableDiagrams ? `\n\n${DIAGRAM_RULES}` : ""}`;
}

export const CONDENSE_SYSTEM_PROMPT = `Tu reçois un extrait d'une transcription de cours oral (ce n'est qu'une partie du cours complet, pas la totalité). Liste en détail toutes les informations importantes de cet extrait : notions, définitions, exemples concrets, dates, chiffres. Sois complet et précis, ne résume pas à l'excès : il vaut mieux une liste un peu longue qu'une liste qui perd des informations utiles pour réviser. Pas de mise en forme complexe, juste des puces simples. Ne fais aucun commentaire sur le fait que c'est un extrait.`;

export function buildFicheFromNotesSystemPrompt(enableDiagrams: boolean): string {
  return `Tu es un assistant qui transforme des notes condensées d'un cours oral en une fiche de révision claire et bien structurée pour un étudiant. On te donne plusieurs extraits successifs du même cours, dans l'ordre chronologique, séparés par "---".

${STRUCTURE_RULES}
- Écris dans la même langue que les notes fournies.
- Fusionne les extraits en un seul document cohérent, sans répéter les informations redondantes, mais sans en perdre le contenu : regrouper des notions proches sous une même partie ne veut pas dire les résumer à l'excès.
- Ne rajoute aucune information qui n'est pas dans les notes fournies.${enableDiagrams ? `\n\n${DIAGRAM_RULES}` : ""}`;
}

// Variantes utilisées par l'import de document (PDF) : même structure que
// pour la transcription vocale, mais sans la mention d'un "cours oral" ni la
// consigne de corriger des hésitations à l'oral, qui n'ont pas de sens pour
// un texte déjà écrit.
export function buildFicheFromDocumentPrompt(enableDiagrams: boolean): string {
  return `Tu es un assistant qui transforme le contenu d'un document de cours en une fiche de révision claire et bien structurée pour un étudiant.

${STRUCTURE_RULES}
- Écris dans la même langue que le document.
- Sois complet : garde tous les exemples, chiffres, dates et détails concrets du document, une fiche trop courte n'aide pas à réviser. Ne résume pas à l'excès.
- Ne rajoute aucune information qui n'est pas dans le document.
- Si le texte extrait est incomplet ou mal formaté (mise en page complexe, document en partie scanné), fais de ton mieux et signale-le en une phrase à la fin.${enableDiagrams ? `\n\n${DIAGRAM_RULES}` : ""}`;
}

export const CONDENSE_DOCUMENT_PROMPT = `Tu reçois un extrait d'un document de cours (ce n'est qu'une partie du document complet, pas la totalité). Liste en détail toutes les informations importantes de cet extrait : notions, définitions, exemples concrets, dates, chiffres. Sois complet et précis, ne résume pas à l'excès : il vaut mieux une liste un peu longue qu'une liste qui perd des informations utiles pour réviser. Pas de mise en forme complexe, juste des puces simples. Ne fais aucun commentaire sur le fait que c'est un extrait.`;

export function buildFicheFromDocumentNotesPrompt(enableDiagrams: boolean): string {
  return `Tu es un assistant qui transforme des notes condensées d'un document de cours en une fiche de révision claire et bien structurée pour un étudiant. On te donne plusieurs extraits successifs du même document, dans l'ordre, séparés par "---".

${STRUCTURE_RULES}
- Écris dans la même langue que les notes fournies.
- Fusionne les extraits en un seul document cohérent, sans répéter les informations redondantes, mais sans en perdre le contenu.
- Ne rajoute aucune information qui n'est pas dans les notes fournies.${enableDiagrams ? `\n\n${DIAGRAM_RULES}` : ""}`;
}

export function splitIntoChunks(text: string, maxChars: number): string[] {
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

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Estimation grossière (~4 caractères par token) utilisée pour rester sous la
// limite de 8000 tokens/minute du tier gratuit de Groq sur chaque appel :
// on calcule combien de tokens de sortie on peut encore se permettre une fois
// le texte d'entrée compté, avec une marge de sécurité.
export const GROQ_TPM_BUDGET = 7500;
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
export function maxOutputTokensFor(inputText: string, floor: number, ceiling: number): number {
  const available = GROQ_TPM_BUDGET - estimateTokens(inputText);
  return Math.max(floor, Math.min(ceiling, available));
}

export interface FicheGenerationPrompts {
  singleCallSystemPrompt: string;
  condenseSystemPrompt: string;
  chunkedSystemPrompt: string;
}

// Logique commune de génération (appel direct si le texte est court, sinon
// découpage + condensation + fusion), partagée entre la transcription vocale
// et l'import de document : seuls les prompts système changent selon la
// source du texte.
export async function generateFicheFromText(
  text: string,
  prompts: FicheGenerationPrompts,
): Promise<string> {
  const cleanText = text.trim();

  if (cleanText.length <= SINGLE_CALL_MAX_CHARS) {
    const response = await groqClient.chat.completions.create({
      model: "openai/gpt-oss-120b",
      max_tokens: maxOutputTokensFor(cleanText, 2000, 4500),
      messages: [
        { role: "system", content: prompts.singleCallSystemPrompt },
        { role: "user", content: cleanText },
      ],
    });
    return response.choices[0]?.message?.content ?? "";
  }

  const chunks = splitIntoChunks(cleanText, CHUNK_CHAR_SIZE);
  const condensed: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await sleep(DELAY_BETWEEN_CALLS_MS);

    const response = await groqClient.chat.completions.create({
      model: "openai/gpt-oss-120b",
      max_tokens: maxOutputTokensFor(chunks[i], 1200, 1500),
      messages: [
        { role: "system", content: prompts.condenseSystemPrompt },
        { role: "user", content: chunks[i] },
      ],
    });

    condensed.push(response.choices[0]?.message?.content ?? "");
  }

  await sleep(DELAY_BETWEEN_CALLS_MS);

  const condensedText = condensed.join("\n\n---\n\n");
  const finalResponse = await groqClient.chat.completions.create({
    model: "openai/gpt-oss-120b",
    max_tokens: maxOutputTokensFor(condensedText, 1500, 4096),
    messages: [
      { role: "system", content: prompts.chunkedSystemPrompt },
      { role: "user", content: condensedText },
    ],
  });

  return finalResponse.choices[0]?.message?.content ?? "";
}

export function isGroqRateLimitError(error: unknown): boolean {
  return (
    (error as { status?: number })?.status === 429 ||
    (error instanceof Error && error.message.includes("429"))
  );
}
