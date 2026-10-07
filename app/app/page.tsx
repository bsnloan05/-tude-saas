"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { marked } from "marked";
import { createClient } from "@/lib/supabase/client";
import FicheContent from "@/components/FicheContent";
import { downloadFichePdf } from "@/lib/downloadFichePdf";
import { hasImportAccess } from "@/lib/plans";

// L'API de reconnaissance vocale du navigateur n'est pas encore standardisée
// dans les types TypeScript officiels, donc on la déclare nous-mêmes ici.
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

type Status = "idle" | "recording" | "generating" | "done" | "error";

const BACKUP_STORAGE_KEY = "memoflash_recording_backup";
const BACKUP_SAVE_INTERVAL_MS = 15000;
const BACKUP_MAX_AGE_MS = 12 * 60 * 60 * 1000;

interface RecordingBackup {
  transcript: string;
  startedAt: number;
  savedAt: number;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}min`;
  return minutes === 0 ? `${hours}h` : `${hours}h${minutes.toString().padStart(2, "0")}`;
}

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [showFreePreview, setShowFreePreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [copied, setCopied] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [highlightMode, setHighlightMode] = useState(true);
  const [chunkProgress, setChunkProgress] = useState("");
  const [usage, setUsage] = useState<{
    usedSeconds: number;
    quotaSeconds: number | null;
    plan: string;
    email: string;
  } | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");
  const latestTranscriptRef = useRef("");
  const pendingInterimRef = useRef("");
  const sessionDurationRef = useRef(0);
  const isRecordingRef = useRef(false);
  const restartIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const [micSilent, setMicSilent] = useState(false);
  const [showStartTip, setShowStartTip] = useState(false);
  const [showChromeModal, setShowChromeModal] = useState(false);
  const [needsChromeHint, setNeedsChromeHint] = useState(false);
  const isIPadRef = useRef(false);
  const chromeTipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkErrorTimestampsRef = useRef<number[]>([]);
  const [networkUnstable, setNetworkUnstable] = useState(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const backupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recoveredSession, setRecoveredSession] = useState<RecordingBackup | null>(
    null,
  );

  const barRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const waveformRafRef = useRef<number | null>(null);
  const keepAliveOscillatorRef = useRef<OscillatorNode | null>(null);

  const BAR_COUNT = 5;

  const startWaveform = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const audioContext = new AudioContextCtor();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      // Un son quasi inaudible joué en continu signale au navigateur que cet
      // onglet est "actif" au niveau audio, ce qui réduit le risque qu'il le
      // décharge de la mémoire en arrière-plan (perte totale de la session).
      const oscillator = audioContext.createOscillator();
      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0.0001;
      oscillator.connect(silentGain);
      silentGain.connect(audioContext.destination);
      oscillator.start();
      keepAliveOscillatorRef.current = oscillator;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const groupSize = Math.floor(data.length / BAR_COUNT) || 1;

      const tick = () => {
        analyser.getByteFrequencyData(data);
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0;
          for (let j = 0; j < groupSize; j++) {
            sum += data[i * groupSize + j] ?? 0;
          }
          const average = sum / groupSize;
          const heightPercent = Math.max(15, Math.min(100, (average / 255) * 100));
          const bar = barRefs.current[i];
          if (bar) bar.style.height = `${heightPercent}%`;
        }
        waveformRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Si l'accès au micro pour la visualisation échoue, on laisse tomber
      // silencieusement : la transcription (qui gère son propre accès) continue.
    }
  };

  const stopWaveform = () => {
    if (waveformRafRef.current) cancelAnimationFrame(waveformRafRef.current);
    waveformRafRef.current = null;
    try {
      keepAliveOscillatorRef.current?.stop();
    } catch {
      // Déjà arrêté ou contexte fermé : rien à faire.
    }
    keepAliveOscillatorRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    barRefs.current.forEach((bar) => {
      if (bar) bar.style.height = "15%";
    });
  };

  useEffect(() => {
    // Sur iPhone, Apple oblige tous les navigateurs (même l'appli "Chrome")
    // à utiliser en coulisses le même moteur que Safari : y recommander
    // Chrome ne changerait rien, donc on exclut l'iPhone de l'astuce.
    const ua = navigator.userAgent;
    const isIPhone = /iPhone|iPod/.test(ua);
    const isChrome = /Chrome/.test(ua) && !/Edg|OPR/.test(ua);
    setNeedsChromeHint(!isIPhone && !isChrome);
    // iPadOS se fait souvent passer pour un Mac dans le user-agent (depuis
    // iPadOS 13) : on le détecte aussi via le tactile, absent sur un vrai Mac.
    isIPadRef.current =
      /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  }, []);

  useEffect(() => {
    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "fr-FR";

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
      // On garde aussi le texte "en cours" (pas encore confirmé) : si on
      // arrête l'enregistrement juste après avoir parlé, le tout dernier
      // passage n'est parfois pas encore finalisé, et on ne veut pas le perdre.
      pendingInterimRef.current = interim;
      latestTranscriptRef.current = finalTranscriptRef.current + interim;
      setLiveTranscript(latestTranscriptRef.current);
      lastActivityRef.current = Date.now();
      setMicSilent(false);
    };

    recognition.onerror = (event) => {
      // Ces erreurs sont temporaires (silence, coupure wifi passagère...) :
      // pas la peine d'afficher une erreur, onend va relancer l'écoute tout seul.
      if (
        event.error === "no-speech" ||
        event.error === "aborted" ||
        event.error === "network"
      ) {
        if (event.error === "network") {
          // Une erreur réseau isolée est normale, mais si ça se répète en
          // peu de temps, c'est le signe d'un wifi instable — utile à dire
          // au client pour qu'il ne pense pas que le site est en cause.
          const now = Date.now();
          const WINDOW_MS = 2 * 60 * 1000;
          const recent = networkErrorTimestampsRef.current.filter(
            (t) => now - t < WINDOW_MS,
          );
          recent.push(now);
          networkErrorTimestampsRef.current = recent;
          setNetworkUnstable(recent.length >= 3);
        }
        return;
      }

      isRecordingRef.current = false;
      stopWaveform();
      setStatus("error");
      setErrorMessage(
        "Erreur pendant la capture audio. Vérifie que le micro est autorisé.",
      );
    };

    recognition.onend = () => {
      // Quand le navigateur arrête l'écoute (redémarrage interne, limite de
      // session...), tout résultat "en cours" non encore confirmé disparaît
      // avec l'ancienne session. Sur Chrome, ces redémarrages sont fréquents
      // (environ toutes les 60s) : sans ça, un bout de phrase capté juste
      // avant le redémarrage s'effaçait au lieu d'être gardé.
      if (pendingInterimRef.current) {
        finalTranscriptRef.current += pendingInterimRef.current + " ";
        pendingInterimRef.current = "";
        latestTranscriptRef.current = finalTranscriptRef.current;
        setLiveTranscript(latestTranscriptRef.current);
      }

      // Le navigateur peut arrêter l'écoute tout seul (silence, limite interne,
      // redémarrage forcé pour rafraîchir la connexion...). Tant qu'on est censé
      // être en train d'enregistrer, on relance automatiquement.
      if (!isRecordingRef.current) return;
      try {
        recognition.start();
      } catch {
        // Le navigateur n'a parfois pas fini de libérer l'instance précédente :
        // on retente une fois après un court délai plutôt que d'abandonner la
        // transcription en silence (c'est ce qui causait le blocage après
        // de longues sessions d'enregistrement).
        setTimeout(() => {
          if (!isRecordingRef.current) return;
          try {
            recognition.start();
          } catch {
            // Toujours bloqué après deux essais rapprochés : un dernier essai
            // avec un délai plus long, au cas où le navigateur ait juste
            // besoin de plus de temps pour libérer l'instance précédente.
            setTimeout(() => {
              if (!isRecordingRef.current) return;
              try {
                recognition.start();
              } catch {
                // Vraiment bloqué cette fois : le rafraîchissement périodique
                // (toutes les 100s) ou un retour sur l'onglet retentera.
              }
            }, 1500);
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await fetch("/api/usage");
      if (!response.ok) return;
      const data = await response.json();
      setUsage(data);
    } catch {
      // Pas grave si ça échoue : c'est juste un indicateur, pas bloquant.
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  useEffect(() => {
    // Si une session d'enregistrement a été sauvegardée automatiquement mais
    // n'a jamais été finalisée (onglet fermé, crash, coupure de courant...),
    // on propose de la récupérer plutôt que de perdre tout le cours.
    try {
      const raw = window.localStorage.getItem(BACKUP_STORAGE_KEY);
      if (!raw) return;
      const backup = JSON.parse(raw) as RecordingBackup;
      const isFresh =
        backup?.transcript?.trim() &&
        Date.now() - backup.savedAt < BACKUP_MAX_AGE_MS;
      if (isFresh) setRecoveredSession(backup);
      else window.localStorage.removeItem(BACKUP_STORAGE_KEY);
    } catch {
      window.localStorage.removeItem(BACKUP_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    // On avertit aussi pendant "generating"/"error" : la fiche n'est pas
    // encore générée avec succès, même si le texte est maintenant sauvegardé
    // et récupérable au prochain chargement.
    if (status !== "recording" && status !== "generating" && status !== "error") return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status]);

  useEffect(() => {
    if (status !== "generating") {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status !== "recording") {
      setRecordingSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setRecordingSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status !== "recording") {
      setMicSilent(false);
      return;
    }
    // Si la reconnaissance vocale ne détecte plus aucune parole pendant un
    // long moment, le micro est probablement mal configuré (mauvaise entrée
    // sélectionnée, coupé...) — mieux vaut prévenir pendant le cours qu'à la
    // fin avec une fiche vide.
    const SILENCE_WARNING_MS = 45000;
    const interval = setInterval(() => {
      setMicSilent(Date.now() - lastActivityRef.current > SILENCE_WARNING_MS);
    }, 5000);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    return () => {
      // Si on quitte la page (navigation vers une autre page du site) pendant
      // un enregistrement, il faut bien tout arrêter et libérer le verrou
      // anti-partage de compte — sinon le compte reste "bloqué en
      // enregistrement" jusqu'à 6h alors que la personne n'enregistre plus.
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        try {
          recognitionRef.current?.stop();
        } catch {
          // Rien à faire si ça échoue, on quitte la page de toute façon.
        }
        fetch("/api/recording/stop", { method: "POST" }).catch(() => {});
      }
      stopWaveform();
      if (restartIntervalRef.current) clearInterval(restartIntervalRef.current);
      if (backupIntervalRef.current) clearInterval(backupIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    // Quand l'onglet redevient actif après avoir été mis en arrière-plan
    // (changement d'onglet, d'application...), le navigateur a pu dégrader
    // la reconnaissance vocale pendant ce temps. On force un redémarrage
    // propre de la connexion pour repartir sur de bonnes bases.
    const handleVisibilityChange = () => {
      if (!document.hidden && isRecordingRef.current) {
        recognitionRef.current?.stop();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Appelé depuis la pop-up d'avertissement navigateur une fois confirmée :
  // relance exactement le même comportement qu'un clic direct sur Démarrer.
  const confirmChromeWarningAndStart = () => {
    setShowChromeModal(false);
    setShowStartTip(true);
    // Sur iPad, l'astuce se masque après 3 min pour ne pas gêner un long
    // cours ; sur Mac/Windows/Android elle reste affichée sans limite,
    // jusqu'à l'arrêt.
    if (isIPadRef.current) {
      chromeTipTimeoutRef.current = setTimeout(() => {
        setShowStartTip(false);
      }, 3 * 60 * 1000);
    }
    startRecording();
  };

  const startRecording = async () => {
    if (!recognitionRef.current) return;
    setErrorMessage("");
    setIsQuotaError(false);
    setShowFreePreview(false);

    // Empêche deux enregistrements simultanés sur le même compte (partage de
    // compte entre plusieurs personnes en même temps).
    try {
      const response = await fetch("/api/recording/start", { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setErrorMessage(
          data.error ?? "Impossible de démarrer l'enregistrement pour le moment.",
        );
        setStatus("error");
        return;
      }
    } catch {
      // Si la vérification échoue (souci réseau...), on laisse démarrer plutôt
      // que de bloquer l'utilisateur pour un problème indépendant.
    }

    finalTranscriptRef.current = "";
    latestTranscriptRef.current = "";
    pendingInterimRef.current = "";
    setLiveTranscript("");
    setNotes("");
    setCopied(false);
    lastActivityRef.current = Date.now();
    setMicSilent(false);
    networkErrorTimestampsRef.current = [];
    setNetworkUnstable(false);
    setRecoveredSession(null);
    window.localStorage.removeItem(BACKUP_STORAGE_KEY);
    recordingStartTimeRef.current = Date.now();
    isRecordingRef.current = true;
    setStatus("recording");
    try {
      recognitionRef.current.start();
    } catch {
      // Ignoré : si une instance précédente tourne encore, onend la relancera.
    }
    startWaveform();

    // Sur les très longues sessions, la reconnaissance vocale du navigateur a
    // tendance à se dégrader (moins précise, voire silencieuse) après environ
    // une heure. On force donc un redémarrage périodique de la connexion, ce
    // qui la garde fraîche sans perdre le texte déjà transcrit (accumulé à
    // part dans latestTranscriptRef).
    if (restartIntervalRef.current) clearInterval(restartIntervalRef.current);
    restartIntervalRef.current = setInterval(() => {
      if (isRecordingRef.current) recognitionRef.current?.stop();
    }, 100000);

    // Sauvegarde régulière du texte déjà transcrit dans le navigateur, pour
    // pouvoir le récupérer si l'onglet crashe ou se ferme avant la fin.
    if (backupIntervalRef.current) clearInterval(backupIntervalRef.current);
    backupIntervalRef.current = setInterval(() => {
      if (!isRecordingRef.current || !latestTranscriptRef.current.trim()) return;
      const backup: RecordingBackup = {
        transcript: latestTranscriptRef.current,
        startedAt: recordingStartTimeRef.current ?? Date.now(),
        savedAt: Date.now(),
      };
      try {
        window.localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backup));
      } catch {
        // Stockage plein ou indisponible : pas grave, on retentera au prochain tick.
      }
    }, BACKUP_SAVE_INTERVAL_MS);
  };

  // Doit correspondre à DELAY_BETWEEN_CALLS_MS dans lib/fiche-generation.ts
  // (pause nécessaire entre deux appels Groq pour respecter sa limite de
  // débit par minute).
  const CHUNK_DELAY_MS = 60000;

  // Pilote la génération morceau par morceau depuis le navigateur quand le
  // serveur a répondu "needsChunking" (texte trop long pour un seul appel
  // Groq) : une fonction Vercel du plan gratuit est limitée à 60s, bien en
  // dessous des minutes nécessaires pour condenser plusieurs morceaux avec
  // une pause d'une minute entre chaque. Le navigateur n'a pas cette limite,
  // donc chaque étape est une requête HTTP séparée qu'il enchaîne lui-même.
  const runChunkedGeneration = async (
    chunks: string[],
    source: "transcript" | "document",
    requiresImportPlan: boolean,
    durationSeconds?: number,
  ): Promise<string> => {
    const condensedChunks: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) {
        setChunkProgress(`Pause anti-surcharge avant la suite du cours (${i}/${chunks.length})...`);
        await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));
      }
      setChunkProgress(`Traitement du cours en cours (${i + 1}/${chunks.length})...`);

      const response = await fetch("/api/generate-notes/chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chunk: chunks[i], source }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "La génération a échoué.");
      }
      const data = await response.json();
      condensedChunks.push(data.condensed ?? "");
    }

    setChunkProgress("Dernière étape : assemblage de la fiche...");
    await new Promise((resolve) => setTimeout(resolve, CHUNK_DELAY_MS));

    const finalResponse = await fetch("/api/generate-notes/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ condensedChunks, source, requiresImportPlan, durationSeconds }),
    });

    setChunkProgress("");

    if (!finalResponse.ok) {
      const data = await finalResponse.json().catch(() => ({}));
      if (data.code === "quota_exceeded" || data.code === "plan_required") {
        setIsQuotaError(true);
      }
      throw new Error(data.error || "La génération a échoué.");
    }

    const finalData = await finalResponse.json();
    return finalData.notes;
  };

  const generateFiche = async (transcript: string, durationSeconds: number) => {
    setStatus("generating");
    setChunkProgress("");
    setShowFreePreview(false);
    setIsQuotaError(false);
    try {
      const response = await fetch("/api/generate-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, durationSeconds }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.code === "quota_exceeded") setIsQuotaError(true);
        throw new Error(data.error || "La génération a échoué.");
      }

      const data = await response.json();
      const finalNotes = data.needsChunking
        ? await runChunkedGeneration(
            data.chunks,
            data.source,
            data.requiresImportPlan,
            data.durationSeconds,
          )
        : data.notes;

      setNotes(finalNotes);
      setStatus("done");
      window.localStorage.removeItem(BACKUP_STORAGE_KEY);
      fetchUsage();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Une erreur est survenue.",
      );
    }
  };

  // Mur de paiement commun à tous les points d'entrée qui génèrent une
  // fiche à partir d'une transcription déjà enregistrée (arrêt normal,
  // récupération après crash/fermeture) : un compte gratuit voit un faux
  // aperçu flouté (aucun appel IA, donc aucun coût) avec un bouton qui
  // l'envoie vers les tarifs au clic, plutôt que d'atteindre l'API et se
  // heurter au quota serveur (qui donnerait un message de quota technique,
  // pas un vrai mur de paiement).
  const generateFicheOrPaywall = (transcript: string, durationSeconds: number) => {
    if (usage?.plan === "free") {
      // Court passage par "generating" avant l'aperçu flouté, pour que ça ne
      // s'affiche pas de façon instantanée et artificielle.
      setStatus("generating");
      setTimeout(() => {
        setShowFreePreview(true);
        setStatus("done");
      }, 1500);
      return;
    }
    generateFiche(transcript, durationSeconds);
  };

  const importAudio = async (file: File) => {
    setStatus("generating");
    setChunkProgress("");
    setIsQuotaError(false);
    setNotes("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const extension = file.name.includes(".") ? file.name.split(".").pop() : "audio";
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("audio-imports")
        .upload(path, file, { contentType: file.type || undefined });
      if (uploadError) {
        throw new Error("L'envoi du fichier audio a échoué.");
      }

      const response = await fetch("/api/import-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.code === "plan_required") setIsQuotaError(true);
        throw new Error(data.error || "L'import a échoué.");
      }

      const data = await response.json();
      const finalNotes = data.needsChunking
        ? await runChunkedGeneration(
            data.chunks,
            data.source,
            data.requiresImportPlan,
          )
        : data.notes;

      setNotes(finalNotes);
      setStatus("done");
      fetchUsage();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Une erreur est survenue.",
      );
    }
  };

  const retryGeneration = () => {
    const transcript = latestTranscriptRef.current.trim();
    if (!transcript) {
      setErrorMessage("Aucune transcription à récupérer, relance un enregistrement.");
      return;
    }
    generateFiche(transcript, sessionDurationRef.current);
  };

  const importPdf = async (file: File) => {
    setStatus("generating");
    setChunkProgress("");
    setIsQuotaError(false);
    setNotes("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/import-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.code === "plan_required") setIsQuotaError(true);
        throw new Error(data.error || "L'import a échoué.");
      }

      const data = await response.json();
      const finalNotes = data.needsChunking
        ? await runChunkedGeneration(
            data.chunks,
            data.source,
            data.requiresImportPlan,
          )
        : data.notes;

      setNotes(finalNotes);
      setStatus("done");
      fetchUsage();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Une erreur est survenue.",
      );
    }
  };

  const stopRecording = async () => {
    if (!recognitionRef.current) return;
    isRecordingRef.current = false;
    setShowStartTip(false);
    if (chromeTipTimeoutRef.current) {
      clearTimeout(chromeTipTimeoutRef.current);
      chromeTipTimeoutRef.current = null;
    }
    if (restartIntervalRef.current) {
      clearInterval(restartIntervalRef.current);
      restartIntervalRef.current = null;
    }
    if (backupIntervalRef.current) {
      clearInterval(backupIntervalRef.current);
      backupIntervalRef.current = null;
    }
    // On garde la sauvegarde jusqu'à ce que la fiche soit générée avec
    // succès (voir generateFiche) : si l'onglet est fermé pendant une
    // génération en attente (ex. pic de trafic), le texte reste récupérable.
    recognitionRef.current.stop();
    stopWaveform();
    sessionDurationRef.current = recordingSeconds;
    fetch("/api/recording/stop", { method: "POST" }).catch(() => {});

    const transcript = latestTranscriptRef.current.trim();
    if (!transcript) {
      setStatus("error");
      setErrorMessage("Aucune parole n'a été détectée.");
      window.localStorage.removeItem(BACKUP_STORAGE_KEY);
      return;
    }

    // Sauvegarde finale avec le texte complet (l'intervalle de sauvegarde
    // vient d'être arrêté, il peut donc manquer les toutes dernières
    // secondes) : si la génération échoue et que l'onglet est fermé avant
    // de réessayer, ce texte reste récupérable au prochain chargement.
    try {
      window.localStorage.setItem(
        BACKUP_STORAGE_KEY,
        JSON.stringify({
          transcript,
          startedAt: recordingStartTimeRef.current ?? Date.now(),
          savedAt: Date.now(),
        } satisfies RecordingBackup),
      );
    } catch {
      // Stockage plein ou indisponible : la fiche peut quand même être
      // générée tout de suite, seule la récupération après fermeture
      // d'onglet ne sera pas possible dans ce cas.
    }

    // Le mur de paiement n'arrive qu'ici, au moment de générer la fiche
    // (pas avant, pour laisser essayer la transcription gratuitement) : la
    // transcription reste sauvegardée (voir plus haut), donc rien n'est
    // perdu, et le bandeau de récupération sur /app la proposera après
    // qu'il ait choisi un forfait.
    generateFicheOrPaywall(transcript, sessionDurationRef.current);
  };

  // On génère un PDF via une page toute neuve, indépendante, déjà stylée en
  // clair dès sa création — plutôt que de faire basculer la page actuelle en
  // clair puis d'imprimer (ce qui dépend du support de "@media print" du
  // navigateur, peu fiable sur Safari iOS : le fond sombre restait visible).
  // Ici il n'y a rien à attendre ni à synchroniser, donc ça marche partout.
  const downloadPdf = () => {
    downloadFichePdf(notes, highlightMode, (message) => {
      setErrorMessage(message);
      setStatus("error");
    });
  };

  return (
    <div className="dot-grid relative isolate flex min-h-screen flex-col items-center overflow-hidden bg-[#0b1120] px-4 py-16">
      <div
        aria-hidden
        className="-z-10 pointer-events-none absolute -top-32 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-[#2563eb]/25 blur-[100px]"
      />

      {/* Grande icône signature qui dérive autour du centre de l'écran, sur
          un trajet irrégulier qui visite plusieurs zones (pas juste une
          diagonale) — pur CSS (translate + scale), aucun impact sur la
          capture audio qui tourne indépendamment.
          "-z-10" est indispensable : les éléments "position: absolute"
          passent toujours au-dessus des éléments non positionnés (comme la
          carte de la fiche), même s'ils arrivent avant dans le code — sans
          ça, l'icône transperçait la fiche au lieu de rester derrière. */}
      <svg
        aria-hidden
        className="big-bg-icon pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 text-[#38bdf8]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
      >
        <path d="M4 5c3-1.5 6-1.5 8 0v14c-2-1.5-5-1.5-8 0V5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 5c-3-1.5-6-1.5-8 0v14c2-1.5 5-1.5 8 0V5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div
        aria-hidden
        className="-z-10 pointer-events-none absolute inset-0 overflow-hidden"
      >
        <svg
          className="float-icon absolute top-[10%] left-[6%] h-11 w-11 text-[#38bdf8]/20"
          style={{ animationDelay: "0s" }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg
          className="float-icon absolute top-[62%] left-[88%] h-12 w-12 text-[#38bdf8]/20"
          style={{ animationDelay: "1.6s" }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 5c3-1.5 6-1.5 8 0v14c-2-1.5-5-1.5-8 0V5z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 5c-3-1.5-6-1.5-8 0v14c2-1.5 5-1.5 8 0V5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg
          className="float-icon absolute top-[82%] left-[12%] h-10 w-10 text-[#38bdf8]/20"
          style={{ animationDelay: "3.2s" }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 3l10 5-10 5L2 8l10-5z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 10.5V16c0 1.5 2.5 3 6 3s6-1.5 6-3v-5.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg
          className="float-icon absolute top-[22%] left-[92%] h-11 w-11 text-[#38bdf8]/20"
          style={{ animationDelay: "4.8s" }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="3" y="9" width="18" height="6" rx="1" transform="rotate(-15 12 12)" />
          <path d="M7 10.5v2M10 10v2.5M13 10.5v2M16 10v2.5" transform="rotate(-15 12 12)" strokeLinecap="round" />
        </svg>
        <svg
          className="float-icon absolute top-[45%] left-[3%] h-9 w-9 text-[#38bdf8]/20"
          style={{ animationDelay: "2.4s" }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="13" r="7" strokeLinecap="round" />
          <path d="M12 6c0-1.5.8-2.5 2-3" strokeLinecap="round" />
          <path d="M14 4c.6-.4 1.4-.5 2-.2" strokeLinecap="round" />
        </svg>
      </div>

      <span className="relative mb-8 self-start rounded-full border border-[#2a3552] px-3 py-1 text-sm font-medium text-[#8b97b0]">
        Bêta
      </span>

      <main className="flex w-full max-w-2xl flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-balance text-2xl font-bold tracking-tight text-[#e7ecf5] sm:text-3xl">
            Transforme tes cours en{" "}
            <span className="relative inline-block">
              fiches de révision
              <svg
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
                className="absolute -bottom-1 left-0 h-2.5 w-full text-[#38bdf8]"
              >
                <path
                  d="M2 8c40-6 120-6 196 0"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  className="draw-underline"
                  pathLength={100}
                />
              </svg>
            </span>
          </h1>
          <p className="max-w-md text-[#8b97b0]">
            Démarre l&apos;enregistrement pendant le cours,
            <br />
            arrête-le à la fin : ta fiche est générée automatiquement.
          </p>

          {usage && usage.quotaSeconds === null && (
            <p className="mt-2 text-xs text-[#8b97b0]">
              Usage illimité — {formatDuration(usage.usedSeconds)} enregistrées ce mois-ci
            </p>
          )}

          {usage && typeof usage.quotaSeconds === "number" && usage.quotaSeconds > 0 && (
            <div className="mt-2 flex w-full max-w-xs flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-[#8b97b0]">
                <span>
                  {formatDuration(usage.usedSeconds)} / {formatDuration(usage.quotaSeconds)}{" "}
                  ce mois-ci
                </span>
                {usage.usedSeconds / usage.quotaSeconds > 0.6 && (
                  <Link
                    href="/pricing"
                    className="font-medium text-[#38bdf8] transition-transform duration-150 hover:underline active:scale-95"
                  >
                    Passer au payant
                  </Link>
                )}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#232d45]">
                <div
                  className={`h-full rounded-full transition-all ${
                    usage.usedSeconds / usage.quotaSeconds > 0.85
                      ? "bg-red-500"
                      : usage.usedSeconds / usage.quotaSeconds > 0.6
                        ? "bg-amber-400"
                        : "bg-[#38bdf8]"
                  }`}
                  style={{
                    width: `${Math.min(100, (usage.usedSeconds / usage.quotaSeconds) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {recoveredSession && status === "idle" && (
          <div className="flex w-full flex-col items-center gap-3 rounded-lg border border-[#2563eb]/40 bg-[#2563eb]/10 p-4 text-center">
            <p className="text-sm text-[#e7ecf5]">
              Une session d&apos;enregistrement interrompue a été retrouvée
              (non terminée la dernière fois). Veux-tu récupérer ce texte et
              générer la fiche ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const backup = recoveredSession;
                  const durationSeconds = Math.max(
                    0,
                    Math.round((backup.savedAt - backup.startedAt) / 1000),
                  );
                  sessionDurationRef.current = durationSeconds;
                  setRecoveredSession(null);
                  // On garde la sauvegarde : si cette tentative échoue aussi
                  // (pic de trafic) et que l'onglet est fermé, le texte reste
                  // récupérable. generateFiche l'efface lui-même en cas de succès.
                  generateFicheOrPaywall(backup.transcript, durationSeconds);
                }}
                className="rounded-full bg-[#2563eb] px-4 py-1.5 text-sm font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
              >
                Récupérer et générer la fiche
              </button>
              <button
                onClick={() => {
                  setRecoveredSession(null);
                  window.localStorage.removeItem(BACKUP_STORAGE_KEY);
                }}
                className="rounded-full border border-[#2a3552] px-4 py-1.5 text-sm font-medium text-[#c3cbdc] transition-colors transition-transform duration-150 hover:bg-[#1b2440] active:scale-95"
              >
                Ignorer
              </button>
            </div>
          </div>
        )}

        {!isSupported && (
          <p className="rounded-lg border border-amber-900/50 bg-amber-950/50 px-4 py-3 text-sm text-amber-200 print:hidden">
            Ton navigateur ne supporte pas la reconnaissance vocale. Utilise
            Safari (Mac/iPhone) ou Google Chrome.
          </p>
        )}

        {isSupported && (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => {
                if (status === "recording") {
                  stopRecording();
                } else if (needsChromeHint) {
                  // Bloque le démarrage tant que l'avertissement navigateur
                  // n'est pas confirmé (voir la pop-up plus bas).
                  setShowChromeModal(true);
                } else {
                  // Tout le monde peut transcrire gratuitement, même sans
                  // forfait : le mur de paiement n'arrive qu'au moment de
                  // générer la fiche (voir stopRecording), pas avant.
                  startRecording();
                }
              }}
              disabled={status === "generating"}
              className={`flex h-14 w-44 items-center justify-center gap-2 rounded-full text-base font-semibold text-white shadow-sm transition-transform transition-colors duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                status === "recording"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-[#2563eb] hover:bg-[#1d4ed8]"
              }`}
            >
              {status === "recording" ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                  <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
                  <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.93V20H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07A7 7 0 0019 11z" />
                </svg>
              )}
              {status === "recording"
                ? "Arrêter"
                : status === "generating"
                  ? "Génération..."
                  : "Démarrer"}
            </button>
            {status === "idle" && needsChromeHint && (
              <p className="tip-pulse flex items-center gap-1.5 rounded-md border border-amber-900/50 bg-amber-950/50 px-3 py-2 text-sm font-medium text-amber-200">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor">
                  <circle cx="12" cy="12" r="4" />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 016.93 4H12a4 4 0 00-3.46 2L5.07 6.34A7.96 7.96 0 0112 4zM4 12c0-1.17.28-2.27.78-3.25l3.47 6.01A4 4 0 0012 16l-3.46 5.98A8 8 0 014 12zm8 8a7.96 7.96 0 01-2.78-.5l3.47-6.01A4 4 0 0016 10h4.22A8 8 0 0112 20z"
                  />
                </svg>
                Nous te conseillons Google Chrome pour une meilleure
                transcription
              </p>
            )}
            {(status === "idle" || status === "done") && (
              <div className="flex flex-wrap items-center justify-center gap-4">
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    if (file.size > 4 * 1024 * 1024) {
                      setStatus("error");
                      setErrorMessage("Ce PDF est trop lourd (4 Mo maximum).");
                      return;
                    }
                    importPdf(file);
                  }}
                />
                <button
                  onClick={() => {
                    if (!usage || hasImportAccess(usage.plan)) {
                      pdfInputRef.current?.click();
                    } else {
                      router.push("/pricing");
                    }
                  }}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#8b97b0] transition-colors duration-150 hover:text-[#c3cbdc]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path d="M14 3v4a1 1 0 001 1h4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6 21h12a1 1 0 001-1V7l-5-5H6a1 1 0 00-1 1v17a1 1 0 001 1z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Importer un PDF
                  {usage && !hasImportAccess(usage.plan) && (
                    <span className="rounded-full bg-[#2a3552] px-2 py-0.5 text-xs font-semibold text-[#8b97b0]">
                      Pro / À vie
                    </span>
                  )}
                </button>

                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    if (file.size > 25 * 1024 * 1024) {
                      setStatus("error");
                      setErrorMessage("Ce fichier audio est trop lourd (25 Mo maximum).");
                      return;
                    }
                    importAudio(file);
                  }}
                />
                <button
                  onClick={() => {
                    if (!usage || hasImportAccess(usage.plan)) {
                      audioInputRef.current?.click();
                    } else {
                      router.push("/pricing");
                    }
                  }}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#8b97b0] transition-colors duration-150 hover:text-[#c3cbdc]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                    <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
                    <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.93V20H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07A7 7 0 0019 11z" />
                  </svg>
                  Importer un audio
                  {usage && !hasImportAccess(usage.plan) && (
                    <span className="rounded-full bg-[#2a3552] px-2 py-0.5 text-xs font-semibold text-[#8b97b0]">
                      Pro / À vie
                    </span>
                  )}
                </button>
              </div>
            )}
            {status === "generating" && (
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#38bdf8]" />
                  <span className="font-mono text-sm text-[#8b97b0]">
                    {Math.floor(elapsedSeconds / 60)
                      .toString()
                      .padStart(2, "0")}
                    :{(elapsedSeconds % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                <p className="max-w-xs text-center text-xs text-[#8b97b0]">
                  {chunkProgress ||
                    "Pour un cours long, ça peut prendre plusieurs minutes (limite du service gratuit) — ne ferme pas cette page, même si ça semble ne rien faire."}
                </p>
              </div>
            )}
            {status === "recording" && (
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex h-8 items-end gap-1">
                  {Array.from({ length: BAR_COUNT }).map((_, i) => (
                    <div
                      key={i}
                      ref={(el) => {
                        barRefs.current[i] = el;
                      }}
                      className="w-1.5 rounded-full bg-[#38bdf8] transition-[height] duration-75"
                      style={{ height: "15%" }}
                    />
                  ))}
                </div>
                <span className="font-mono text-sm text-[#8b97b0]">
                  {Math.floor(recordingSeconds / 60)
                    .toString()
                    .padStart(2, "0")}
                  :{(recordingSeconds % 60).toString().padStart(2, "0")}
                </span>
                <p className="max-w-xs text-center text-xs text-amber-300/80">
                  Reste sur cet onglet pendant l&apos;enregistrement (ne
                  change pas d&apos;onglet ni d&apos;application), sinon le
                  navigateur peut perdre des mots.
                </p>
                {showStartTip && (
                  <p className="tip-pulse max-w-xs rounded-md border border-amber-900/50 bg-amber-950/50 px-3 py-2 text-center text-sm font-medium text-amber-200">
                    Nous te conseillons{" "}
                    <strong className="font-bold">Google Chrome</strong> pour
                    une meilleure transcription.
                  </p>
                )}
                {micSilent && (
                  <p className="max-w-xs rounded-md border border-red-900/50 bg-red-950/50 px-3 py-2 text-center text-xs text-red-200">
                    Aucune voix détectée depuis un moment — vérifie que le
                    micro est bien autorisé et qu&apos;il capte le bon son.
                  </p>
                )}
                {networkUnstable && (
                  <p className="max-w-xs rounded-md border border-red-900/50 bg-red-950/50 px-3 py-2 text-center text-xs text-red-200">
                    Connexion internet instable détectée — passe en 4G/5G si
                    possible, la transcription peut perdre des mots.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {status === "recording" && (
          <div className="w-full rounded-lg border border-[#232d45] bg-[#141b2e] p-4 print:hidden">
            <p className="mb-2 text-sm font-medium text-[#8b97b0]">
              Transcription en direct
            </p>
            <p className="text-[#e7ecf5]">{liveTranscript || "En écoute..."}</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex w-full flex-col items-center gap-3 rounded-lg border border-red-900/50 bg-red-950/50 px-4 py-3 text-sm text-red-200 print:hidden">
            <p>{errorMessage}</p>
            {isQuotaError ? (
              <Link
                href="/pricing"
                className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors transition-transform duration-150 hover:bg-red-500 active:scale-95"
              >
                Voir les tarifs
              </Link>
            ) : (
              latestTranscriptRef.current.trim() && (
                <button
                  onClick={retryGeneration}
                  className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors transition-transform duration-150 hover:bg-red-500 active:scale-95"
                >
                  Réessayer la génération
                </button>
              )
            )}
          </div>
        )}

        {status === "done" && showFreePreview && (
          <div className="fiche-enter relative w-full overflow-hidden rounded-lg border border-[#232d45] bg-[#141b2e] p-5 shadow-sm">
            <div aria-hidden className="pointer-events-none blur-sm select-none">
              <div className="mb-5 h-5 w-2/3 rounded bg-[#232d45]" />
              <div className="mb-6 rounded-r-lg border-l-4 border-[#38bdf8] bg-[#38bdf8]/10 py-2.5 pr-3 pl-4">
                <div className="mb-1.5 h-3 w-1/4 rounded bg-[#38bdf8]/30" />
                <div className="h-3 w-5/6 rounded bg-[#38bdf8]/20" />
              </div>
              <div className="mb-3 h-4 w-1/3 rounded bg-[#232d45]" />
              <div className="mb-2 h-3 w-full rounded bg-[#1b2440]" />
              <div className="mb-2 h-3 w-11/12 rounded bg-[#1b2440]" />
              <div className="mb-5 h-3 w-4/5 rounded bg-[#1b2440]" />
              <div className="mb-3 h-4 w-2/5 rounded bg-[#232d45]" />
              <div className="mb-2 h-3 w-full rounded bg-[#1b2440]" />
              <div className="h-3 w-3/4 rounded bg-[#1b2440]" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-[#0b1120]/50">
              <button
                onClick={() => router.push("/pricing?from=transcription")}
                className="flex items-center gap-2 rounded-full bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
                  <rect x="4" y="11" width="16" height="9" rx="2" />
                  <path d="M8 11V7a4 4 0 118 0v4" strokeLinecap="round" />
                </svg>
                Accéder à la fiche
              </button>
            </div>
          </div>
        )}

        {status === "done" && !showFreePreview && (
          <div className="fiche-enter w-full rounded-lg border border-[#232d45] bg-[#141b2e] p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 border-b border-[#232d45] px-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#8b97b0] uppercase">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5 shrink-0 text-[#38bdf8]">
                  <path d="M12 20h9" strokeLinecap="round" />
                  <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Ta fiche de cours
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-full border border-[#2a3552] p-0.5 text-xs font-medium">
                  <button
                    onClick={() => setHighlightMode(false)}
                    className={`rounded-full px-3 py-1 transition-colors transition-transform duration-150 active:scale-95 ${
                      !highlightMode
                        ? "bg-[#2563eb] text-white"
                        : "text-[#8b97b0] hover:text-[#e7ecf5]"
                    }`}
                  >
                    Sobre
                  </button>
                  <button
                    onClick={() => setHighlightMode(true)}
                    className={`rounded-full px-3 py-1 transition-colors transition-transform duration-150 active:scale-95 ${
                      highlightMode
                        ? "bg-[#2563eb] text-white"
                        : "text-[#8b97b0] hover:text-[#e7ecf5]"
                    }`}
                  >
                    Surligné
                  </button>
                </div>
                <button
                  onClick={async () => {
                    const html = await marked.parse(notes);
                    await navigator.clipboard.write([
                      new ClipboardItem({
                        "text/html": new Blob([html], { type: "text/html" }),
                        "text/plain": new Blob([notes], { type: "text/plain" }),
                      }),
                    ]);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="rounded-full border border-[#2a3552] px-3 py-1.5 text-xs font-medium text-[#c3cbdc] transition-colors transition-transform duration-150 hover:bg-[#1b2440] active:scale-95 sm:px-4 sm:text-sm"
                >
                  {copied ? "Copié !" : "Copier la fiche"}
                </button>
                <button
                  onClick={downloadPdf}
                  className="rounded-full border border-[#2a3552] px-3 py-1.5 text-xs font-medium text-[#c3cbdc] transition-colors transition-transform duration-150 hover:bg-[#1b2440] active:scale-95 sm:px-4 sm:text-sm"
                >
                  Télécharger en PDF
                </button>
              </div>
            </div>
            <FicheContent notes={notes} highlightMode={highlightMode} />
          </div>
        )}
      </main>

      {showChromeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1120]/70 px-4">
          <div className="w-full max-w-md rounded-lg border border-amber-900/50 bg-[#141b2e] p-8 text-center shadow-lg">
            <p className="mb-4 text-xl font-extrabold tracking-wide text-red-500 uppercase">
              Attention
            </p>
            <p className="mb-6 text-base font-medium text-amber-200">
              Si la transcription rencontre des problèmes, nous te conseillons
              Google Chrome pour une meilleure transcription.
            </p>
            <button
              onClick={confirmChromeWarningAndStart}
              className="rounded-full bg-[#2563eb] px-6 py-3 text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
            >
              Continuer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
