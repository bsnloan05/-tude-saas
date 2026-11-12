"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// Mêmes déclarations que app/app/page.tsx (l'API de reconnaissance vocale du
// navigateur n'est pas standardisée dans les types TypeScript officiels, et
// n'est pas exportée depuis ce fichier, donc on la redéclare ici).
interface SpeechRecognitionResultEvent extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

// Dupliqué depuis lib/podcast-conversation.ts (pas importé : ce fichier
// serveur instancie groq-sdk, qu'on ne veut pas faire entrer dans le bundle
// client — même logique que PODCAST_SOURCE_MAX_CHARS dans PodcastCreate.tsx).
interface PodcastMessage {
  role: "user" | "assistant";
  content: string;
}
const PODCAST_KICKOFF_MESSAGE =
  "(Présente le sujet du cours en 1 à 2 phrases, puis invite l'étudiant à poser sa première question.)";

type PodcastStatus = "listening" | "thinking" | "speaking" | "error";

// Durée de silence (sans nouveau mot capté) avant de considérer que
// l'étudiant a fini de parler et d'envoyer sa question — remplace l'ancien
// "onend" du mode pousser-pour-parler, qui ne signifie plus "fin de phrase"
// maintenant que l'écoute est permanente (continuous).
const SILENCE_TIMEOUT_MS = 1100;

// En dessous de ce nombre de mots, un texte capté PENDANT que l'IA parle est
// traité par prudence comme le micro qui se réentend lui-même (écho), sauf
// s'il contient un mot-clé d'interruption explicite — trop court pour être
// sûr que c'est une vraie interruption plutôt qu'un bout de l'écho.
const MIN_BARGE_IN_WORDS = 4;
const INTERRUPT_KEYWORDS = ["stop", "attends", "pardon", "excuse-moi", "arrête"];
// Si plus de 60% des mots captés se retrouvent déjà dans ce que l'IA vient
// de dire, c'est très probablement le micro qui capte sa propre voix par les
// haut-parleurs plutôt qu'une vraie interruption.
const ECHO_OVERLAP_THRESHOLD = 0.6;

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
}

// Distingue "le micro se réentend parler l'IA" de "l'étudiant parle
// vraiment par-dessus" — une heuristique texte, pas une vraie annulation
// d'écho acoustique (non disponible via l'API de reconnaissance vocale du
// navigateur). Fonctionne bien au casque/pièce calme, moins parfait au
// haut-parleur d'un ordinateur portable : le bouton "Couper" sert de filet
// de secours manuel pour ce cas-là.
function isLikelyEcho(candidate: string, aiReply: string): boolean {
  const lower = candidate.toLowerCase();
  if (INTERRUPT_KEYWORDS.some((kw) => lower.includes(kw))) return false;

  const candidateWords = normalizeWords(candidate);
  if (candidateWords.length < MIN_BARGE_IN_WORDS) return true;

  const aiWords = new Set(normalizeWords(aiReply));
  if (aiWords.size === 0) return false;

  const overlap = candidateWords.filter((w) => aiWords.has(w)).length;
  return overlap / candidateWords.length > ECHO_OVERLAP_THRESHOLD;
}

export default function PodcastLive({
  sourceText,
  title,
  onExit,
}: {
  sourceText: string;
  title: string | null;
  onExit: () => void;
}) {
  const [status, setStatus] = useState<PodcastStatus>("thinking");
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPlanError, setIsPlanError] = useState(false);
  const [transcriptLog, setTranscriptLog] = useState<PodcastMessage[]>([]);

  const statusRef = useRef<PodcastStatus>("thinking");
  const historyRef = useRef<PodcastMessage[]>([]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldListenRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAiReplyRef = useRef("");
  const hasStartedRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Envoie un message au serveur (Groq), affiche la réponse, puis la fait
  // parler. Utilisé à la fois pour le message d'accueil (historique vide) et
  // pour chaque question posée par l'étudiant.
  const respond = async (message: string, isKickoff = false) => {
    setStatus("thinking");
    setErrorMessage("");
    setIsPlanError(false);
    try {
      const response = await fetch("/api/revision/podcast/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText,
          history: historyRef.current,
          message,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.code === "plan_required") setIsPlanError(true);
        throw new Error(data.error || "La génération a échoué.");
      }
      const { reply } = (await response.json()) as { reply: string };

      if (!isKickoff) {
        historyRef.current = [...historyRef.current, { role: "user", content: message }];
      }
      historyRef.current = [...historyRef.current, { role: "assistant", content: reply }];
      setTranscriptLog((prev) => [
        ...prev,
        ...(isKickoff ? [] : [{ role: "user" as const, content: message }]),
        { role: "assistant" as const, content: reply },
      ]);

      speak(reply);
    } catch (error) {
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };

  // Fait parler l'IA. Le statut ne revient à "listening" que via onend/onerror
  // de l'utterance, ou via une vraie interruption détectée pendant qu'elle
  // parle (voir onresult plus bas / bouton "Couper") — jamais un minuteur.
  const speak = (text: string) => {
    lastAiReplyRef.current = text;
    setStatus("speaking");
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.onend = () => setStatus("listening");
    utterance.onerror = () => setStatus("listening");
    window.speechSynthesis.speak(utterance);
  };

  // Coupe l'IA manuellement — filet de secours si l'heuristique anti-écho ne
  // détecte pas une vraie interruption (environnement bruyant, par exemple).
  const interrupt = () => {
    if (statusRef.current !== "speaking") return;
    window.speechSynthesis.cancel();
    setStatus("listening");
  };

  const retryListening = () => {
    setErrorMessage("");
    setIsPlanError(false);
    shouldListenRef.current = true;
    setStatus("listening");
    try {
      recognitionRef.current?.start();
    } catch {
      // Si ça échoue encore, onerror remettra "error" et on pourra réessayer.
    }
  };

  // Écoute permanente (pas de bouton "Parler") : démarre au montage et reste
  // active tout le long de la conversation, y compris pendant que l'IA
  // parle (nécessaire pour pouvoir l'interrompre). Reprend la logique déjà
  // éprouvée en prod dans app/app/page.tsx (continuous=true sur Chrome,
  // continuous=false + redémarrage automatique ailleurs pour le bug WebKit).
  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor || !("speechSynthesis" in window)) {
      queueMicrotask(() => setIsSupported(false));
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    const ua = navigator.userAgent;
    const isChromeEngine = /Chrome/.test(ua) && !/Edg|OPR/.test(ua);
    recognition.continuous = isChromeEngine;
    recognition.interimResults = true;
    recognition.lang = "fr-FR";

    // "onend" ne veut plus dire "l'étudiant a fini de parler" (l'écoute est
    // continue) : c'est notre propre minuteur de silence qui détecte la fin
    // d'un tour. Si "thinking" est encore en cours quand le silence est
    // détecté, on re-vérifie un peu plus tard au lieu de perdre le texte.
    const checkSilence = () => {
      if (statusRef.current === "thinking") {
        silenceTimerRef.current = setTimeout(checkSilence, 300);
        return;
      }
      const transcript = finalTranscriptRef.current.trim();
      finalTranscriptRef.current = "";
      if (!transcript) return;
      respond(transcript);
    };

    const scheduleSilenceCheck = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(checkSilence, SILENCE_TIMEOUT_MS);
    };

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscriptRef.current += text + " ";
        } else {
          interim += text;
        }
      }

      // Pendant que l'IA parle : vérifie si ce qui est capté ressemble à
      // une vraie interruption plutôt qu'au micro qui se réentend lui-même.
      if (statusRef.current === "speaking") {
        const combined = (finalTranscriptRef.current + interim).trim();
        if (combined && !isLikelyEcho(combined, lastAiReplyRef.current)) {
          window.speechSynthesis.cancel();
          setStatus("listening");
        }
      }

      scheduleSilenceCheck();
    };

    recognition.onerror = (event) => {
      // Erreurs temporaires : le redémarrage automatique (onend) suffit.
      if (event.error === "no-speech" || event.error === "aborted" || event.error === "network") {
        return;
      }
      shouldListenRef.current = false;
      setStatus("error");
      setErrorMessage("Erreur micro. Vérifie que le micro est autorisé pour ce site.");
    };

    recognition.onend = () => {
      if (!shouldListenRef.current) return;
      try {
        recognition.start();
      } catch {
        setTimeout(() => {
          if (!shouldListenRef.current) return;
          try {
            recognition.start();
          } catch {
            setTimeout(() => {
              if (!shouldListenRef.current) return;
              try {
                recognition.start();
              } catch {
                // Vraiment bloqué : rien d'automatique de plus à faire ici.
              }
            }, 1500);
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;
    shouldListenRef.current = true;
    try {
      recognition.start();
    } catch {
      // onerror/onend prendront le relais si besoin.
    }

    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      respond(PODCAST_KICKOFF_MESSAGE, true);
    }

    return () => {
      shouldListenRef.current = false;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      window.speechSynthesis.cancel();
      recognition.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExit = () => {
    shouldListenRef.current = false;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    window.speechSynthesis.cancel();
    recognitionRef.current?.stop();
    onExit();
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-amber-900/50 bg-amber-950/50 p-10 text-center">
        <p className="text-base text-amber-200">
          Le podcast IA nécessite un navigateur compatible (Chrome ou Edge sur ordinateur).
        </p>
        <button
          onClick={onExit}
          className="rounded-full border border-[#2a3552] px-6 py-3 text-base font-medium text-[#c3cbdc] transition-colors hover:bg-[#1b2440]"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="truncate text-lg font-semibold text-[#e7ecf5]">
          {title || "Podcast IA"}
        </h2>
        <button
          onClick={handleExit}
          className="shrink-0 rounded-full border border-[#2a3552] px-4 py-2 text-sm font-medium text-[#c3cbdc] transition-colors hover:bg-[#1b2440]"
        >
          Terminer
        </button>
      </div>

      {transcriptLog.length > 0 && (
        <div className="flex max-h-[45vh] flex-col gap-3 overflow-y-auto rounded-xl border border-[#232d45] bg-[#0d1424]/60 p-5">
          {transcriptLog.map((entry, i) => (
            <p
              key={i}
              className={
                entry.role === "user"
                  ? "self-end rounded-lg bg-[#2563eb]/20 px-4 py-2 text-base text-[#e7ecf5]"
                  : "self-start rounded-lg bg-[#1b2440] px-4 py-2 text-base text-[#c3cbdc]"
              }
            >
              {entry.content}
            </p>
          ))}
        </div>
      )}

      {status === "error" ? (
        <div className="rounded-md border border-red-900/50 bg-red-950/50 px-4 py-3 text-base text-red-200">
          <p>{errorMessage}</p>
          {isPlanError ? (
            <Link
              href="/pricing"
              className="mt-2 inline-block font-medium text-[#38bdf8] hover:underline"
            >
              Voir les tarifs
            </Link>
          ) : (
            <button
              onClick={retryListening}
              className="mt-2 rounded-full bg-[#2563eb] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
            >
              Réessayer
            </button>
          )}
        </div>
      ) : (
        <div className="flex min-h-[20vh] flex-col items-center justify-center gap-4">
          {status === "speaking" ? (
            <button
              onClick={interrupt}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2563eb] text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
              aria-label="Couper l'IA"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-full ${
                status === "thinking" ? "bg-[#232d45]" : "bg-[#2563eb]/70"
              }`}
            >
              {status === "thinking" ? (
                <span className="h-7 w-7 animate-spin rounded-full border-2 border-transparent [border-right-color:#38bdf8] [border-top-color:#38bdf8]" />
              ) : (
                <span className="relative flex h-20 w-20 items-center justify-center">
                  <span className="absolute h-20 w-20 animate-ping rounded-full bg-[#2563eb]/30" />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="relative h-9 w-9 text-white">
                    <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
                    <path d="M19 11a7 7 0 01-14 0M12 18v3" strokeLinecap="round" />
                  </svg>
                </span>
              )}
            </div>
          )}
          <p className="text-sm text-[#8b97b0]">
            {status === "listening" && "Je t'écoute"}
            {status === "thinking" && "Réflexion..."}
            {status === "speaking" && "Appuie pour couper"}
          </p>
        </div>
      )}
    </div>
  );
}
