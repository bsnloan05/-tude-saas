"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FicheContent from "@/components/FicheContent";
import { DEMO_TITLE, DEMO_TRANSCRIPT } from "@/lib/demoTranscript";

type Step = "intro" | "course" | "generating" | "done" | "error";

// Messages affichés tour à tour pendant la génération, pour que l'attente
// (un seul appel Groq, quelques secondes) se ressente comme un vrai
// cheminement guidé plutôt qu'un simple spinner qui ne dit rien.
const PROGRESS_MESSAGES = [
  "Lecture du cours...",
  "Repérage des notions clés...",
  "Mise en forme de ta fiche...",
];

export default function DemoPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [notes, setNotes] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [progressIndex, setProgressIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startDemo = async () => {
    setStep("generating");
    setProgressIndex(0);
    window.posthog?.capture("demo_started");

    intervalRef.current = setInterval(() => {
      setProgressIndex((i) => Math.min(i + 1, PROGRESS_MESSAGES.length - 1));
    }, 1800);

    try {
      const response = await fetch("/api/demo-fiche", { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "La génération a échoué.");
      }
      const data = await response.json();
      setNotes(data.notes);
      setStep("done");
      window.posthog?.capture("demo_completed");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue.");
      setStep("error");
    } finally {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  return (
    <div className="flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <Link
          href="/app"
          className="mb-8 inline-block text-base font-medium text-[#8b97b0] transition-colors hover:text-[#e7ecf5]"
        >
          ← Retour
        </Link>

        {step === "intro" && (
          <div className="flex flex-col items-center gap-6 rounded-xl border border-[#232d45] bg-[#0d1424]/60 px-6 py-14 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#2563eb]/15 text-[#38bdf8]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
                <path d="M13 2L4 14h6l-1 8 10-13h-6l0-7z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <h1 className="mb-3 text-3xl font-bold text-[#e7ecf5]">
                Vois Memoflash à l&apos;œuvre
              </h1>
              <p className="mx-auto max-w-md text-base text-[#8b97b0]">
                Pas encore de cours à enregistrer ou de fichier à importer ? Pas de souci. On a
                pris un vrai extrait de cours —{" "}
                <span className="text-[#c3cbdc]">« {DEMO_TITLE} »</span> — tu vas d&apos;abord le
                lire, puis générer la fiche de révision que Memoflash en tire.
              </p>
            </div>
            <button
              onClick={() => {
                window.posthog?.capture("demo_course_viewed");
                setStep("course");
              }}
              className="rounded-full bg-[#2563eb] px-8 py-3.5 text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
            >
              Voir le cours
            </button>
          </div>
        )}

        {step === "course" && (
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-[#232d45] bg-[#0d1424]/60 p-6">
              <div className="mb-5 flex items-center gap-1.5 border-b border-[#232d45] pb-4 text-xs font-semibold tracking-wide text-[#8b97b0] uppercase">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5 shrink-0 text-[#38bdf8]">
                  <path d="M6 3h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 12h6M9 16h6M9 8h2" strokeLinecap="round" />
                </svg>
                Le cours — {DEMO_TITLE}
              </div>
              <div className="flex flex-col gap-4 text-base leading-relaxed text-[#c3cbdc]">
                {DEMO_TRANSCRIPT.split("\n\n").map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-[#8b97b0]">
                Voilà le cours. Maintenant, regarde ce que Memoflash en fait.
              </p>
              <button
                onClick={startDemo}
                className="rounded-full bg-[#2563eb] px-8 py-3.5 text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
              >
                Générer la fiche
              </button>
            </div>
          </div>
        )}

        {step === "generating" && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-[#232d45] bg-[#0d1424]/60 px-6 py-20 text-center">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#38bdf8]" />
            <p className="text-base text-[#8b97b0]">{PROGRESS_MESSAGES[progressIndex]}</p>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-red-900/50 bg-red-950/50 px-6 py-14 text-center">
            <p className="text-base text-red-200">{errorMessage}</p>
            {errorMessage.includes("déjà été utilisée") ||
            errorMessage.includes("réservée aux comptes gratuits") ? (
              <Link
                href="/app"
                className="rounded-full bg-[#2563eb] px-6 py-2.5 text-sm font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
              >
                Retour à l&apos;accueil
              </Link>
            ) : (
              <button
                onClick={startDemo}
                className="rounded-full bg-[#2563eb] px-6 py-2.5 text-sm font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
              >
                Réessayer
              </button>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col gap-6">
            <div className="fiche-enter w-full rounded-lg border border-[#232d45] bg-[#0d1424]/60 p-5 shadow-sm backdrop-blur-sm">
              <div className="mb-5 flex items-center gap-1.5 border-b border-[#232d45] px-2 pb-4 text-xs font-semibold tracking-wide text-[#8b97b0] uppercase">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5 shrink-0 text-[#38bdf8]">
                  <path d="M12 20h9" strokeLinecap="round" />
                  <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Exemple de fiche — {DEMO_TITLE}
              </div>
              <div className="px-2">
                <FicheContent notes={notes} highlightMode />
              </div>
            </div>

            <div className="fiche-enter flex flex-col items-center gap-5 rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-6 py-10 text-center">
              <p className="text-xl font-bold text-[#e7ecf5]">
                C&apos;est exactement ce que Memoflash fait avec{" "}
                <span className="text-emerald-400">tes propres cours</span>.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => router.push("/app")}
                  className="rounded-full bg-[#2563eb] px-7 py-3 text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
                >
                  Enregistrer mon premier cours
                </button>
                <Link
                  href="/pricing"
                  className="rounded-full border border-[#2a3552] px-7 py-3 text-base font-medium text-[#c3cbdc] transition-colors transition-transform duration-150 hover:bg-[#1b2440] active:scale-95"
                >
                  Voir les forfaits
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
