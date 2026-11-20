// Script ponctuel : génère deux courts échantillons audio (Nova = Kore,
// Buzz = Charon) via l'API Gemini TTS, pour la prévisualisation de voix
// dans l'onboarding. À exécuter une fois en local (node scripts/generate-voice-samples.mjs),
// pas appelé en production.
import { GoogleGenAI } from "@google/genai";
import { writeFileSync, mkdirSync, readFileSync } from "fs";

const envContent = readFileSync(new URL("../.env.local", import.meta.url), "utf-8");
const apiKey = envContent.match(/^GEMINI_API_KEY=(.*)$/m)?.[1]?.trim();
if (!apiKey) throw new Error("GEMINI_API_KEY introuvable dans .env.local");

const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1beta" } });

const SAMPLES = [
  { file: "nova", voice: "Kore", text: "Salut, moi c'est Nova ! On va réviser ensemble." },
  { file: "buzz", voice: "Charon", text: "Yo, moi c'est Buzz ! Prêt à bosser ton cours ?" },
];

// Ajoute un en-tête WAV minimal autour du PCM brut 24kHz 16 bits mono
// renvoyé par l'API, pour obtenir un fichier lisible par une balise <audio>.
function pcmToWav(pcmBuffer, sampleRate = 24000) {
  const header = Buffer.alloc(44);
  const dataSize = pcmBuffer.length;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

mkdirSync(new URL("../public/voices", import.meta.url), { recursive: true });

for (const { file, voice, text } of SAMPLES) {
  console.log(`Génération de ${file} (${voice})...`);
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ role: "user", parts: [{ text }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  });
  const base64 = response.candidates[0].content.parts[0].inlineData.data;
  const wav = pcmToWav(Buffer.from(base64, "base64"));
  const outPath = new URL(`../public/voices/${file}.wav`, import.meta.url);
  writeFileSync(outPath, wav);
  console.log(`Écrit : public/voices/${file}.wav (${wav.length} octets)`);
}
