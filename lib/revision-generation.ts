import { groqClient, maxOutputTokensFor } from "@/lib/fiche-generation";

export interface FlashcardItem {
  front: string;
  back: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

const FLASHCARDS_SYSTEM_PROMPT = `Tu transformes des notes de cours en flashcards de révision (recto/verso) pour un étudiant.

Règles :
- Réponds UNIQUEMENT avec un objet JSON de la forme {"cards": [{"front": "...", "back": "..."}, ...]}, rien d'autre avant ou après.
- "front" est une question courte ou un terme à retenir, "back" est la réponse ou la définition correspondante, courte et précise.
- Couvre les notions, définitions, dates et chiffres les plus importants des notes fournies, sans te limiter à un nombre fixe : une dizaine à une vingtaine de cartes selon la richesse du contenu.
- N'invente aucune information qui n'est pas dans les notes fournies.
- Écris dans la même langue que les notes fournies.`;

const QUIZ_SYSTEM_PROMPT = `Tu transformes des notes de cours en quiz à choix multiples pour un étudiant.

Règles :
- Réponds UNIQUEMENT avec un objet JSON de la forme {"questions": [{"question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0}, ...]}, rien d'autre avant ou après.
- Chaque question a EXACTEMENT 4 options, une seule correcte. "correctIndex" est l'index (0 à 3) de la bonne réponse dans "options".
- Les mauvaises réponses doivent être plausibles (pas absurdes), pour que le quiz soit un vrai entraînement.
- Couvre les notions les plus importantes des notes fournies, sans te limiter à un nombre fixe : une dizaine à une quinzaine de questions selon la richesse du contenu.
- N'invente aucune information qui n'est pas dans les notes fournies.
- Écris dans la même langue que les notes fournies.`;

function extractJsonObject(raw: string): unknown {
  // Le mode JSON de Groq renvoie en principe un objet JSON pur, mais au cas
  // où le modèle ajoute du texte autour (markdown, phrase d'intro), on ne
  // garde que le premier bloc {...} pour rester tolérant.
  const match = raw.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : raw);
}

export async function generateFlashcards(text: string): Promise<FlashcardItem[]> {
  const response = await groqClient.chat.completions.create({
    model: "openai/gpt-oss-120b",
    max_tokens: maxOutputTokensFor(text, 2000, 4000),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: FLASHCARDS_SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = extractJsonObject(raw) as { cards?: unknown };
  const cards = Array.isArray(parsed.cards) ? parsed.cards : [];

  return cards.filter(
    (c): c is FlashcardItem =>
      !!c &&
      typeof c === "object" &&
      typeof (c as FlashcardItem).front === "string" &&
      typeof (c as FlashcardItem).back === "string" &&
      (c as FlashcardItem).front.trim() !== "" &&
      (c as FlashcardItem).back.trim() !== "",
  );
}

export async function generateQuiz(text: string): Promise<QuizQuestion[]> {
  const response = await groqClient.chat.completions.create({
    model: "openai/gpt-oss-120b",
    max_tokens: maxOutputTokensFor(text, 2000, 4500),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: QUIZ_SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = extractJsonObject(raw) as { questions?: unknown };
  const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

  return questions.filter((q): q is QuizQuestion => {
    if (!q || typeof q !== "object") return false;
    const item = q as QuizQuestion;
    return (
      typeof item.question === "string" &&
      item.question.trim() !== "" &&
      Array.isArray(item.options) &&
      item.options.length === 4 &&
      item.options.every((o) => typeof o === "string" && o.trim() !== "") &&
      Number.isInteger(item.correctIndex) &&
      item.correctIndex >= 0 &&
      item.correctIndex <= 3
    );
  });
}
