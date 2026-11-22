"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Patrick_Hand } from "next/font/google";
import { GoogleGenAI, Modality, type Session, type LiveServerMessage } from "@google/genai";
import {
  buildPodcastSystemPrompt,
  PODCAST_KICKOFF_TRIGGER,
  DIAGRAM_MAX_STEPS,
  DIAGRAM_TITLE_MAX_CHARS,
  DIAGRAM_STEP_MAX_CHARS,
} from "@/lib/podcast-conversation";

// En dessous de ça, pas la peine de solliciter l'API pour un schéma (ex:
// "oui", "d'accord", une phrase de transition).
const DIAGRAM_MIN_TRANSCRIPT_CHARS = 30;

// Police manuscrite pour l'affichage des schémas (voir plus bas) : donne le
// rendu "tableau/croquis" demandé, chargée ici plutôt que globalement car
// seul ce composant en a besoin.
const patrickHand = Patrick_Hand({ weight: "400", subsets: ["latin"] });

interface PodcastDiagram {
  title: string;
  steps: string[];
}

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
  const [diagram, setDiagram] = useState<PodcastDiagram | null>(null);
  // Sous-titre live (dernière phrase en cours), mini-sommaire des points
  // abordés, et chronomètre de session — purement visuels, pour occuper
  // l'espace sous le micro sans surcharger l'écran d'un transcript complet.
  const [caption, setCaption] = useState("");
  const [summaryPoints, setSummaryPoints] = useState<string[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const sessionStartRef = useRef<number | null>(null);

  const sessionRef = useRef<Session | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlaybackTimeRef = useRef(0);
  const pendingSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const closedByUserRef = useRef(false);
  // Accumule la transcription texte de ce que l'IA dit pendant le tour en
  // cours (voir outputAudioTranscription dans la config de connexion), pour
  // déclencher la génération d'un schéma une fois le tour terminé.
  const turnTranscriptRef = useRef("");
  // Le kickoff est le seul tour envoyé en texte (sendClientContent) plutôt
  // qu'en vrai flux audio micro — confirmé en test réel que c'est
  // spécifiquement ce tour qui peut déclencher un bug Gemini Live connu :
  // le modèle répond parfois par du texte (son "plan" de réponse, jamais
  // affiché) au lieu de générer de l'audio, sans erreur. Résultat : silence
  // total au démarrage, car aucun chunk audio n'arrive jamais pour ce tour.
  // On relance automatiquement le kickoff tant qu'aucun audio n'est arrivé.
  const awaitingKickoffAudioRef = useRef(true);
  const kickoffRetriesRef = useRef(0);
  const MAX_KICKOFF_RETRIES = 2;
  // Même bug, généralisé à n'importe quel tour (signalé le 2026-11-22 : un
  // blocage au tout début d'une conversation, hors kickoff) : si un tour se
  // termine sans avoir produit ni audio ni transcription, on relance
  // doucement plutôt que de rester bloqué en silence.
  const turnHasContentRef = useRef(false);
  const emptyTurnRetriesRef = useRef(0);
  const MAX_EMPTY_TURN_RETRIES = 2;
  // Signalé le 2026-11-22 : même après la règle de prompt "enchaîne
  // toi-même" (voir buildPodcastSystemPrompt), l'IA s'arrête parfois quand
  // même après une simple affirmation, sans question ni suite — une
  // instruction de prompt n'est jamais suivie à 100% par le modèle. Filet de
  // sécurité générique, indépendant de la cause exacte : si plus rien ne se
  // passe (ni nouveau message serveur, ni reprise de l'IA) pendant plusieurs
  // secondes après la fin d'un tour, on relance tout seul plutôt que de
  // laisser l'étudiant découvrir qu'il doit dire "continue".
  const continueWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoContinueCountRef = useRef(0);
  const MAX_AUTO_CONTINUE = 4;
  const CONTINUE_WATCHDOG_MS = 8000;

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

  // Ne garde que des champs bien formés et dans des tailles raisonnables —
  // si la réponse a une forme inattendue, on ignore silencieusement plutôt
  // que d'afficher un schéma cassé : un schéma raté ne doit jamais
  // perturber la conversation vocale.
  const parseDiagramResponse = (data: unknown): PodcastDiagram | null => {
    if (!data || typeof data !== "object") return null;
    const { title: rawTitle, steps: rawSteps } = data as { title?: unknown; steps?: unknown };
    if (typeof rawTitle !== "string" || !rawTitle.trim()) return null;
    if (!Array.isArray(rawSteps) || rawSteps.length < 2) return null;

    const steps = rawSteps
      .filter((step): step is string => typeof step === "string" && step.trim().length > 0)
      .slice(0, DIAGRAM_MAX_STEPS)
      .map((step) => step.trim().slice(0, DIAGRAM_STEP_MAX_CHARS));
    if (steps.length < 2) return null;

    return { title: rawTitle.trim().slice(0, DIAGRAM_TITLE_MAX_CHARS), steps };
  };

  // Appelée une fois le tour de l'IA terminé, avec ce qu'elle vient de dire
  // à voix haute — un appel Gemini séparé (pas Groq, voir la route) décide
  // si ça mérite un schéma. Échec silencieux volontaire : si cet appel rate
  // ou met du temps, la conversation vocale n'en est jamais affectée.
  //
  // Pas de garde anti-concurrence ici (déjà tenté et retiré) : un
  // compteur "n'applique que la toute dernière requête lancée" semblait
  // logique, mais dans une conversation active un nouveau tour démarre
  // presque toujours avant que la requête précédente n'ait eu le temps de
  // répondre — ça invalidait quasiment chaque réponse et faisait
  // disparaître les schémas presque à chaque fois. Le petit risque restant
  // (une réponse plus ancienne qui s'affiche après une plus récente si
  // elles se doublent) est largement préférable à "rien ne s'affiche
  // jamais".
  const requestDiagram = async (text: string) => {
    if (text.trim().length < DIAGRAM_MIN_TRANSCRIPT_CHARS) return;
    try {
      const response = await fetch("/api/revision/podcast/diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) return;
      const { diagram: raw } = await response.json();
      const parsed = parseDiagramResponse(raw);
      // Chaque nouveau tour remplace le schéma affiché par celui du sujet
      // actuel — y compris en le faisant disparaître (`null`) si ce tour ne
      // mérite pas de schéma : sans ça, un schéma reste affiché même une
      // fois la conversation passée à un tout autre sujet.
      setDiagram(parsed);
    } catch {
      // Un schéma raté ne doit jamais perturber la conversation vocale.
    }
  };

  // Déclenche la génération du schéma avec ce qui a été accumulé jusqu'ici,
  // puis vide le buffer. Appelé aussi bien sur une fin de tour normale que
  // sur une interruption (voir plus bas) : vu les soucis d'interruption déjà
  // rencontrés sur ce Podcast IA, une réponse coupée avant la fin propre est
  // courante — sans ça, le tour aurait pu ne jamais être exploité.
  const flushTurnTranscript = () => {
    const text = turnTranscriptRef.current;
    turnTranscriptRef.current = "";
    requestDiagram(text);
    // Un tour trop court (ex: "oui", une relance interne) ne mérite pas une
    // ligne dans le mini-sommaire — même seuil que pour le schéma.
    if (text.trim().length >= DIAGRAM_MIN_TRANSCRIPT_CHARS) {
      const firstSentence = (text.trim().split(/(?<=[.!?])\s/)[0] ?? text.trim()).trim();
      const label = firstSentence.length > 60 ? `${firstSentence.slice(0, 57)}…` : firstSentence;
      setSummaryPoints((prev) => [...prev, label]);
    }
  };

  const clearContinueWatchdog = () => {
    if (continueWatchdogRef.current) {
      clearTimeout(continueWatchdogRef.current);
      continueWatchdogRef.current = null;
    }
  };

  const scheduleContinueWatchdog = () => {
    clearContinueWatchdog();
    if (autoContinueCountRef.current >= MAX_AUTO_CONTINUE) return;
    continueWatchdogRef.current = setTimeout(() => {
      if (!sessionRef.current) return;
      autoContinueCountRef.current += 1;
      sessionRef.current.sendClientContent({
        turns: [{ role: "user", parts: [{ text: "(Continue.)" }] }],
        turnComplete: true,
      });
    }, CONTINUE_WATCHDOG_MS);
  };

  const handleServerMessage = (message: LiveServerMessage) => {
    // N'importe quel message serveur signale une activité réelle : on
    // annule le filet de sécurité, il sera reprogrammé à la prochaine fin
    // de tour si besoin.
    clearContinueWatchdog();

    const content = message.serverContent;
    if (!content) return;

    if (content.interrupted) {
      // L'utilisateur a pris la parole avant même la fin du kickoff : on
      // laisse la conversation suivre son cours plutôt que de relancer un
      // kickoff qui n'a plus lieu d'être.
      awaitingKickoffAudioRef.current = false;
      stopPlayback();
      flushTurnTranscript();
    }

    const parts = content.modelTurn?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        awaitingKickoffAudioRef.current = false;
        turnHasContentRef.current = true;
        playAudioChunk(part.inlineData.data);
      }
    }

    if (content.outputTranscription?.text) {
      turnHasContentRef.current = true;
      turnTranscriptRef.current += content.outputTranscription.text;
      // Sous-titre live : ne garde que la dernière phrase (complète ou en
      // cours), pas tout le cumul du tour — sinon la ligne grossit sans fin.
      const sentences = turnTranscriptRef.current.split(/(?<=[.!?])\s+/).filter(Boolean);
      setCaption(sentences[sentences.length - 1] ?? "");
    }

    if (content.turnComplete) {
      if (awaitingKickoffAudioRef.current) {
        if (kickoffRetriesRef.current < MAX_KICKOFF_RETRIES && sessionRef.current) {
          kickoffRetriesRef.current += 1;
          sessionRef.current.sendClientContent({
            turns: [{ role: "user", parts: [{ text: PODCAST_KICKOFF_TRIGGER }] }],
            turnComplete: true,
          });
        } else {
          // On abandonne après 2 tentatives supplémentaires plutôt que de
          // réessayer indéfiniment : l'étudiant peut toujours lancer la
          // conversation lui-même au micro si le kickoff échoue encore.
          awaitingKickoffAudioRef.current = false;
        }
      } else if (!turnHasContentRef.current) {
        if (emptyTurnRetriesRef.current < MAX_EMPTY_TURN_RETRIES && sessionRef.current) {
          emptyTurnRetriesRef.current += 1;
          sessionRef.current.sendClientContent({
            turns: [{ role: "user", parts: [{ text: "(Continue.)" }] }],
            turnComplete: true,
          });
        }
      } else {
        emptyTurnRetriesRef.current = 0;
      }
      turnHasContentRef.current = false;
      flushTurnTranscript();
      scheduleContinueWatchdog();
    }
  };

  const cleanup = () => {
    clearContinueWatchdog();
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
    // echoCancellation peut vraiment agir ici (contrairement à l'ancienne
    // version basée sur speechSynthesis, dont la sortie ne passait par aucun
    // pipeline audio surveillable) : l'audio de l'IA est maintenant joué via
    // une vraie destination Web Audio, que le navigateur peut référencer
    // comme signal à annuler dans le micro.
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    micStreamRef.current = stream;

    const inputContext = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });
    inputContextRef.current = inputContext;
    // Un AudioContext peut démarrer "suspendu" selon la politique anti-
    // autoplay du navigateur, surtout après plusieurs await (le clic
    // d'origine sur "Démarrer" n'est alors plus considéré assez proche) —
    // ça bloquerait silencieusement tout le flux micro, sans erreur visible,
    // de façon intermittente. On force explicitement la reprise.
    if (inputContext.state === "suspended") await inputContext.resume();
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

      try {
        session.sendRealtimeInput({
          audio: { data: base64, mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}` },
        });
      } catch {
        // Sans ce try/catch, une exception ici (ex: socket déjà fermé côté
        // serveur) peut rester invisible — une exception dans
        // onaudioprocess ne remonte pas forcément à la console.
      }
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
        const { token, voice } = (await tokenResponse.json()) as { token: string; voice: string };
        if (cancelled) return;

        const ai = new GoogleGenAI({ apiKey: token, httpOptions: { apiVersion: "v1alpha" } });
        const outputContext = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
        // Même raison que pour inputContext (voir startMicrophoneStreaming) :
        // sans ça, l'IA peut "parler" au sens des données reçues sans que
        // rien ne soit réellement audible, de façon intermittente.
        if (outputContext.state === "suspended") await outputContext.resume();
        outputContextRef.current = outputContext;
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
            // Testé avec une sensibilité de détection abaissée (LOW) pour
            // réduire les faux déclenchements sur l'écho : ça a aussi rendu
            // l'interruption volontaire beaucoup trop dure à déclencher
            // (signalé par l'utilisateur), donc retour à la sensibilité par
            // défaut (HIGH, la plus réactive pour une vraie interruption).
            // On compte uniquement sur echoCancellation côté micro
            // (voir startMicrophoneStreaming) pour réduire l'écho à la
            // source plutôt que sur la sensibilité du serveur.
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
            },
            // Signalé par l'utilisateur : l'IA met du temps à répondre une
            // fois qu'on a fini de parler. `silenceDurationMs` est le délai
            // de silence que le serveur attend avant de considérer le tour
            // terminé — distinct de `startOfSpeechSensitivity`/
            // `endOfSpeechSensitivity` (jamais retouchés depuis l'incident
            // où ça avait cassé l'interruption volontaire, voir mémoire) :
            // ce réglage-ci ne change pas la détection de voix elle-même,
            // juste le délai avant de conclure que l'étudiant a terminé.
            // Valeur par défaut de l'API non documentée précisément mais
            // plus haute que ça ; réduit ici pour une réponse plus rapide,
            // au prix d'un risque légèrement plus élevé de couper l'étudiant
            // s'il marque une pause en pleine phrase.
            // Signalé aussi : quand c'est l'IA qui pose une question et
            // attend la réponse, elle met parfois du temps à réagir, ou
            // rate carrément le tout début de la réponse (il faut répéter) —
            // jamais quand c'est l'étudiant qui l'interrompt en pleine
            // phrase, qui marche très bien. `prefixPaddingMs` est la durée
            // de parole requise avant que le serveur "s'engage" sur un
            // début de prise de parole : contrairement à
            // startOfSpeechSensitivity/endOfSpeechSensitivity (niveaux de
            // sensibilité, jamais retouchés depuis l'incident), c'est un
            // délai numérique — abaissé ici pour que le tout début d'une
            // réponse soit reconnu plus vite après un silence.
            realtimeInputConfig: {
              automaticActivityDetection: { silenceDurationMs: 500, prefixPaddingMs: 100 },
            },
            // Transcription texte de ce que l'IA dit : sert à déclencher la
            // génération d'un schéma après coup (voir requestDiagram), et
            // alimente aussi le sous-titre live et le mini-sommaire affichés
            // à l'écran (jamais le texte brut complet, juste la dernière
            // phrase et un court résumé par tour).
            outputAudioTranscription: {},
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

  // Chronomètre de session : démarre dès que la connexion est vraiment
  // établie (pas au montage), s'arrête tout seul si on quitte "live".
  useEffect(() => {
    if (status !== "live") return;
    if (sessionStartRef.current === null) sessionStartRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - (sessionStartRef.current ?? Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

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
            {status === "live" && (
              <>
                {isAiSpeaking ? "Je t'explique..." : "Je t'écoute"}
                {" — "}
                {String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:
                {String(elapsedSeconds % 60).padStart(2, "0")}
              </>
            )}
          </p>
          {caption && (
            <p className="max-w-sm text-center text-sm italic text-[#6b7694]">{caption}</p>
          )}
          {diagram && (
            <div className="relative w-full max-w-sm rounded-xl bg-[#141b2e] p-5 shadow-lg">
              <p className={`${patrickHand.className} mb-4 text-center text-xl text-[#e7ecf5]`}>
                {diagram.title}
              </p>
              <div className="flex flex-col items-center gap-1">
                {diagram.steps.map((step, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div
                      className={`${patrickHand.className} px-4 py-2 text-center text-lg text-[#c3cbdc] ${
                        i % 2 === 0 ? "-rotate-1" : "rotate-1"
                      }`}
                    >
                      {step}
                    </div>
                    {i < diagram.steps.length - 1 && (
                      <span className="text-xl text-[#38bdf8]/70">↓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {summaryPoints.length > 0 && (
            <ul className="w-full max-w-sm space-y-1.5 text-sm text-[#8b97b0]">
              {summaryPoints.map((point, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-[#38bdf8]/70">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
