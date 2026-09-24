"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { marked } from "marked";
import { createClient } from "@/lib/supabase/client";
import FicheContent from "@/components/FicheContent";
import { downloadFichePdf } from "@/lib/downloadFichePdf";

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

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuit",
  standard: "Standard",
  premium: "Premium",
};

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
  const [errorMessage, setErrorMessage] = useState("");
  const [isQuotaError, setIsQuotaError] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [copied, setCopied] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [highlightMode, setHighlightMode] = useState(true);
  const [usage, setUsage] = useState<{
    usedSeconds: number;
    quotaSeconds: number;
    plan: string;
    email: string;
  } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef("");
  const latestTranscriptRef = useRef("");
  const sessionDurationRef = useRef(0);
  const isRecordingRef = useRef(false);

  const barRefs = useRef<Array<HTMLDivElement | null>>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const waveformRafRef = useRef<number | null>(null);

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
    audioContextRef.current?.close();
    audioContextRef.current = null;
    micStreamRef.current?.getTracks().forEach((track) => track.stop());
    micStreamRef.current = null;
    barRefs.current.forEach((bar) => {
      if (bar) bar.style.height = "15%";
    });
  };

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
      latestTranscriptRef.current = finalTranscriptRef.current + interim;
      setLiveTranscript(latestTranscriptRef.current);
    };

    recognition.onerror = (event) => {
      // Ces erreurs sont temporaires (silence, coupure wifi passagère...) :
      // pas la peine d'afficher une erreur, onend va relancer l'écoute tout seul.
      if (
        event.error === "no-speech" ||
        event.error === "aborted" ||
        event.error === "network"
      ) {
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
      // Le navigateur peut arrêter l'écoute tout seul (silence, limite interne...).
      // Tant qu'on est censé être en train d'enregistrer, on relance automatiquement.
      if (isRecordingRef.current) {
        recognition.start();
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
    if (!profileOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

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
    return () => stopWaveform();
  }, []);

  const startRecording = () => {
    if (!recognitionRef.current) return;
    finalTranscriptRef.current = "";
    latestTranscriptRef.current = "";
    setLiveTranscript("");
    setNotes("");
    setErrorMessage("");
    setIsQuotaError(false);
    setCopied(false);
    isRecordingRef.current = true;
    setStatus("recording");
    recognitionRef.current.start();
    startWaveform();
  };

  const generateFiche = async (transcript: string, durationSeconds: number) => {
    setStatus("generating");
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
      setNotes(data.notes);
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

  const stopRecording = async () => {
    if (!recognitionRef.current) return;
    isRecordingRef.current = false;
    recognitionRef.current.stop();
    stopWaveform();
    sessionDurationRef.current = recordingSeconds;

    const transcript = latestTranscriptRef.current.trim();
    if (!transcript) {
      setStatus("error");
      setErrorMessage("Aucune parole n'a été détectée.");
      return;
    }

    await generateFiche(transcript, sessionDurationRef.current);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
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

      <header className="relative mb-12 flex w-full max-w-5xl flex-wrap items-center justify-between gap-y-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2563eb] text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
              <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.93V20H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07A7 7 0 0019 11z" />
            </svg>
          </span>
          <span className="text-base font-semibold text-[#e7ecf5]">Memoflash</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="rounded-full border border-[#2a3552] px-3 py-1 text-sm font-medium text-[#8b97b0]">
            Bêta
          </span>
          <Link
            href="/pricing"
            className="rounded-full bg-[#2563eb]/15 px-3.5 py-1.5 text-base font-semibold text-[#38bdf8] transition-colors transition-transform duration-150 hover:bg-[#2563eb]/25 active:scale-95"
          >
            Tarifs
          </Link>
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setProfileOpen((open) => !open)}
              className="flex items-center gap-1.5 text-base font-medium text-[#8b97b0] transition-colors transition-transform duration-150 hover:text-[#e7ecf5] active:scale-95"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" />
                <path d="M4 20a8 8 0 0116 0 1 1 0 01-1 1H5a1 1 0 01-1-1z" />
              </svg>
              Profil
            </button>

            {profileOpen && (
              <div className="absolute top-full right-0 z-10 mt-2 w-64 rounded-lg border border-[#232d45] bg-[#141b2e] p-4 shadow-lg">
                {usage ? (
                  <>
                    <p className="truncate text-sm font-medium text-[#e7ecf5]">
                      {usage.email}
                    </p>
                    <p className="mt-1 text-xs text-[#8b97b0]">
                      Forfait :{" "}
                      <span className="font-semibold text-[#38bdf8]">
                        {PLAN_LABELS[usage.plan] ?? usage.plan}
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-[#8b97b0]">Chargement...</p>
                )}
                <Link
                  href="/app/fiches"
                  className="mt-3 block rounded-full border border-[#2a3552] px-3 py-1.5 text-center text-sm font-medium text-[#c3cbdc] transition-colors hover:bg-[#1b2440]"
                >
                  Mes fiches
                </Link>
                <Link
                  href="/pricing"
                  className="mt-2 block rounded-full border border-[#2a3552] px-3 py-1.5 text-center text-sm font-medium text-[#c3cbdc] transition-colors hover:bg-[#1b2440]"
                >
                  Gérer mon forfait
                </Link>
                <button
                  onClick={handleLogout}
                  className="mt-2 w-full rounded-full px-3 py-1.5 text-center text-sm font-medium text-[#8b97b0] transition-colors hover:bg-[#1b2440] hover:text-[#e7ecf5]"
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

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

          {usage && usage.quotaSeconds === 0 && (
            <div className="mt-2 flex w-full max-w-xs flex-col items-center gap-2 rounded-lg border border-[#232d45] bg-[#141b2e] p-4 text-center">
              <p className="text-sm text-[#c3cbdc]">
                Choisis un forfait pour commencer à créer des fiches.
              </p>
              <Link
                href="/pricing"
                className="rounded-full bg-[#2563eb] px-4 py-1.5 text-sm font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
              >
                Voir les tarifs
              </Link>
            </div>
          )}

          {usage && usage.quotaSeconds > 0 && (
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

        {!isSupported && (
          <p className="rounded-lg border border-amber-900/50 bg-amber-950/50 px-4 py-3 text-sm text-amber-200 print:hidden">
            Ton navigateur ne supporte pas la reconnaissance vocale. Utilise
            Google Chrome pour tester ce prototype.
          </p>
        )}

        {isSupported && (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={status === "recording" ? stopRecording : startRecording}
              disabled={status === "generating" || (usage?.quotaSeconds === 0 && status !== "recording")}
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
            {status === "idle" && (
              <p className="text-xs text-[#8b97b0]">Fonctionne avec Google Chrome</p>
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
                  Pour un cours long, ça peut prendre plusieurs minutes
                  (limite du service gratuit) — ne ferme pas cette page,
                  même si ça semble ne rien faire.
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

        {status === "done" && (
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
    </div>
  );
}
