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

type PodcastStatus = "idle" | "listening" | "thinking" | "speaking" | "error";

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

  const historyRef = useRef<PodcastMessage[]>([]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");
  const hasStartedRef = useRef(false);

  // Envoie un message au serveur (Groq), affiche la réponse, puis la fait
  // parler. Utilisé à la fois pour le message d'accueil (historique vide) et
  // pour chaque question posée par l'étudiant.
  const respond = async (message: string, isKickoff: boolean) => {
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
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };

  // Fait parler l'IA. Seul onend/onerror ramène le statut à "idle" (jamais un
  // minuteur) : c'est ce qui garantit que le bouton "Parler" ne redevient
  // actif qu'une fois l'IA vraiment silencieuse, évitant tout effet larsen
  // (le micro ne s'active jamais pendant que l'IA parle).
  const speak = (text: string) => {
    setStatus("speaking");
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "fr-FR";
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");
    window.speechSynthesis.speak(utterance);
  };

  // Démarre l'écoute d'une seule phrase de l'étudiant. Appelé UNIQUEMENT
  // depuis un clic explicite sur le bouton "Parler" — jamais automatiquement,
  // jamais pendant "thinking"/"speaking" (le bouton est désactivé dans ces
  // états, et cette fonction re-vérifie le statut par sécurité).
  const startListening = () => {
    if (status !== "idle" || !recognitionRef.current) return;
    window.speechSynthesis.cancel();
    finalTranscriptRef.current = "";
    setStatus("listening");
    try {
      recognitionRef.current.start();
    } catch {
      setStatus("idle");
    }
  };

  // Détection + initialisation de la reconnaissance vocale. Une seule phrase
  // à la fois (continuous = false) : pas besoin de la logique de
  // redémarrage automatique de app/app/page.tsx, utilisée là-bas pour de la
  // dictée continue, pas pour une conversation tour par tour.
  useEffect(() => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor || !("speechSynthesis" in window)) {
      queueMicrotask(() => setIsSupported(false));
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "fr-FR";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) transcript += result[0].transcript;
      }
      finalTranscriptRef.current = transcript;
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setStatus("error");
      setErrorMessage("Erreur micro. Vérifie que le micro est autorisé pour ce site.");
    };

    recognition.onend = () => {
      const transcript = finalTranscriptRef.current.trim();
      if (!transcript) {
        setStatus("idle");
        return;
      }
      respond(transcript, false);
    };

    recognitionRef.current = recognition;

    // Message d'accueil : lance la conversation sans jamais toucher le
    // micro avant que l'IA ait fini de se présenter.
    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      respond(PODCAST_KICKOFF_MESSAGE, true);
    }

    return () => {
      window.speechSynthesis.cancel();
      recognitionRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExit = () => {
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

      {status === "error" && (
        <div className="rounded-md border border-red-900/50 bg-red-950/50 px-4 py-3 text-base text-red-200">
          <p>{errorMessage}</p>
          {isPlanError && (
            <Link
              href="/pricing"
              className="mt-2 inline-block font-medium text-[#38bdf8] hover:underline"
            >
              Voir les tarifs
            </Link>
          )}
        </div>
      )}

      <div className="flex min-h-[20vh] flex-col items-center justify-center gap-4">
        <button
          onClick={status === "error" ? () => setStatus("idle") : startListening}
          disabled={status === "thinking" || status === "speaking"}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2563eb] text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95 disabled:cursor-not-allowed disabled:bg-[#232d45] disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-9 w-9">
            <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
            <path d="M19 11a7 7 0 01-14 0M12 18v3" strokeLinecap="round" />
          </svg>
        </button>
        <p className="text-sm text-[#8b97b0]">
          {status === "idle" && "Appuie pour parler"}
          {status === "listening" && "Écoute..."}
          {status === "thinking" && "Réflexion..."}
          {status === "speaking" && "..."}
          {status === "error" && "Réessayer"}
        </p>
      </div>
    </div>
  );
}
