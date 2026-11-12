"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from "@google/genai";
import { buildPodcastSystemPrompt, PODCAST_KICKOFF_TRIGGER } from "@/lib/podcast-conversation";

// Modèle audio natif de l'API Live, éligible au palier gratuit au moment de
// l'écriture. Google fait tourner régulièrement les versions "preview" de ce
// modèle : si la connexion échoue avec une erreur "model not found", vérifier
// le nom à jour sur https://aistudio.google.com.
const LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-09-2025";

// Fréquences fixées par l'API Live (pas négociables) : micro envoyé en PCM
// 16 bits 16kHz, audio reçu en PCM 16 bits 24kHz.
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

type PodcastStatus = "connecting" | "live" | "error";

// v1 à base de SpeechRecognition/SpeechSynthesis + détection d'écho côté
// client (texte, puis volume RMS) a échoué deux fois en test réel : la
// sortie de speechSynthesis ne passe par aucun pipeline audio que
// l'echoCancellation du navigateur peut surveiller (limite structurelle de
// l'API, pas un réglage à affiner), donc rien ne distingue fiablement
// l'écho d'une vraie interruption côté client. On streame maintenant l'audio
// brut en continu vers un modèle audio-à-audio (Gemini Live) qui fait cette
// détection lui-même côté serveur et nous le signale (`interrupted`).
export default function PodcastLive({
  sourceText,
  title,
  onExit,
}: {
  sourceText: string;
  title: string | null;
  onExit: () => void;
}) {
  const [status, setStatus] = useState<PodcastStatus>("connecting");
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPlanError, setIsPlanError] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlaybackTimeRef = useRef(0);
  const pendingSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const closedByUserRef = useRef(false);

  // Vide immédiatement toute la file de lecture audio en attente : c'est
  // l'effet déclenché par `interrupted`, le signal serveur qui remplace
  // toutes les tentatives précédentes de détection d'écho côté client.
  const stopPlayback = () => {
    pendingSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Peut déjà être terminé.
      }
    });
    pendingSourcesRef.current = [];
    if (outputContextRef.current) {
      nextPlaybackTimeRef.current = outputContextRef.current.currentTime;
    }
    setIsAiSpeaking(false);
  };

  const playAudioChunk = (base64Data: string) => {
    const outputContext = outputContextRef.current;
    if (!outputContext) return;

    const binary = atob(base64Data);
    const pcm16 = new Int16Array(binary.length / 2);
    for (let i = 0; i < pcm16.length; i++) {
      pcm16[i] = (binary.charCodeAt(i * 2 + 1) << 8) | binary.charCodeAt(i * 2);
    }
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }

    const buffer = outputContext.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);

    const source = outputContext.createBufferSource();
    source.buffer = buffer;
    source.connect(outputContext.destination);

    const startAt = Math.max(nextPlaybackTimeRef.current, outputContext.currentTime);
    source.start(startAt);
    nextPlaybackTimeRef.current = startAt + buffer.duration;

    pendingSourcesRef.current.push(source);
    setIsAiSpeaking(true);
    source.onended = () => {
      pendingSourcesRef.current = pendingSourcesRef.current.filter((s) => s !== source);
      if (pendingSourcesRef.current.length === 0) setIsAiSpeaking(false);
    };
  };

  const handleServerMessage = (message: LiveServerMessage) => {
    const content = message.serverContent;
    if (!content) return;

    if (content.interrupted) {
      stopPlayback();
    }

    const parts = content.modelTurn?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        playAudioChunk(part.inlineData.data);
      }
    }
  };

  const cleanup = () => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    inputContextRef.current?.close().catch(() => {});
    inputContextRef.current = null;
    outputContextRef.current?.close().catch(() => {});
    outputContextRef.current = null;
    pendingSourcesRef.current = [];
    sessionRef.current?.close();
    sessionRef.current = null;
  };

  const startMicrophoneStreaming = async (session: Session) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStreamRef.current = stream;

    const inputContext = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
    inputContextRef.current = inputContext;
    const source = inputContext.createMediaStreamSource(stream);
    // ScriptProcessorNode est dépréciée mais reste largement supportée et
    // suffit pour ce besoin simple — pas de justification pour un
    // AudioWorklet séparé ici.
    const processor = inputContext.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (event) => {
      const floatData = event.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(floatData.length);
      for (let i = 0; i < floatData.length; i++) {
        const sample = Math.max(-1, Math.min(1, floatData[i]));
        pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }
      let binary = "";
      const bytes = new Uint8Array(pcm16.buffer);
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      session.sendRealtimeInput({
        audio: { data: base64, mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
      });
    };

    source.connect(processor);
    processor.connect(inputContext.destination);
  };

  useEffect(() => {
    let cancelled = false;

    const connect = async () => {
      setStatus("connecting");
      setErrorMessage("");
      setIsPlanError(false);

      try {
        const tokenResponse = await fetch("/api/revision/podcast/token", { method: "POST" });
        if (!tokenResponse.ok) {
          const data = await tokenResponse.json().catch(() => ({}));
          if (data.code === "plan_required") setIsPlanError(true);
          throw new Error(data.error || "Impossible de démarrer la session vocale.");
        }
        const { token } = (await tokenResponse.json()) as { token: string };
        if (cancelled) return;

        const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });
        outputContextRef.current = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
        nextPlaybackTimeRef.current = 0;

        // Ne rien faire dans `onopen` qui référence la variable `session` :
        // ce callback peut se déclencher avant que `await ai.live.connect`
        // ne redonne la main ici (la connexion socket s'ouvre avant que la
        // promesse ne soit résolue), donc `session` ne serait pas encore
        // assignée. On démarre le kickoff/micro juste après l'`await` à la
        // place, ce qui revient au même puisque la promesse ne se résout
        // qu'une fois la connexion ouverte.
        const session = await ai.live.connect({
          model: LIVE_MODEL,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: buildPodcastSystemPrompt(sourceText),
          },
          callbacks: {
            onmessage: handleServerMessage,
            onerror: () => {
              if (cancelled || closedByUserRef.current) return;
              setStatus("error");
              setErrorMessage("La connexion vocale a été interrompue. Réessaie.");
            },
            onclose: () => {
              if (cancelled || closedByUserRef.current) return;
              setStatus("error");
              setErrorMessage("La connexion vocale a été interrompue. Réessaie.");
            },
          },
        });
        if (cancelled) {
          session.close();
          return;
        }
        sessionRef.current = session;

        session.sendClientContent({
          turns: [{ role: "user", parts: [{ text: PODCAST_KICKOFF_TRIGGER }] }],
          turnComplete: true,
        });
        try {
          await startMicrophoneStreaming(session);
        } catch {
          setStatus("error");
          setErrorMessage("Erreur micro. Vérifie que le micro est autorisé pour ce site.");
          return;
        }
        setStatus("live");
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue.");
      }
    };

    connect();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryConnection = () => {
    cleanup();
    closedByUserRef.current = false;
    setStatus("connecting");
    setErrorMessage("");
    setIsPlanError(false);
    // Remonte le composant en changeant de clé serait plus simple, mais un
    // rechargement de page reste la façon la plus fiable de relancer tous
    // les flux audio/WebSocket sans état résiduel.
    window.location.reload();
  };

  const handleExit = () => {
    closedByUserRef.current = true;
    cleanup();
    onExit();
  };

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
              onClick={retryConnection}
              className="mt-2 rounded-full bg-[#2563eb] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
            >
              Réessayer
            </button>
          )}
        </div>
      ) : (
        <div className="flex min-h-[20vh] flex-col items-center justify-center gap-4">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full ${
              status === "connecting" ? "bg-[#232d45]" : "bg-[#2563eb]/70"
            }`}
          >
            {status === "connecting" ? (
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-transparent [border-right-color:#38bdf8] [border-top-color:#38bdf8]" />
            ) : (
              <span className="relative flex h-20 w-20 items-center justify-center">
                {isAiSpeaking && (
                  <span className="absolute h-20 w-20 animate-ping rounded-full bg-[#2563eb]/30" />
                )}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="relative h-9 w-9 text-white">
                  <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
                  <path d="M19 11a7 7 0 01-14 0M12 18v3" strokeLinecap="round" />
                </svg>
              </span>
            )}
          </div>
          <p className="text-sm text-[#8b97b0]">
            {status === "connecting" && "Connexion..."}
            {status === "live" && (isAiSpeaking ? "Je t'explique..." : "Je t'écoute")}
          </p>
        </div>
      )}
    </div>
  );
}
