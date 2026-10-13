"use client";

import { useState } from "react";
import Link from "next/link";

type Question = {
  question: string;
  options: string[];
};

const QUESTIONS: Question[] = [
  {
    question: "En quelle année es-tu ?",
    options: ["Lycée", "BTS / BUT", "Prépa", "Licence", "Master", "Doctorat", "Autre"],
  },
  {
    question: "Qu'est-ce que tu étudies ?",
    options: [
      "Sciences / Ingénierie",
      "Économie / Gestion / Droit",
      "Médecine / Santé",
      "Lettres / Sciences humaines",
      "Autre",
    ],
  },
  {
    question: "Combien d'heures de cours as-tu par semaine ?",
    options: ["0-10h", "10-20h", "20-30h", "30h+"],
  },
  {
    question: "Comment tu prends tes notes actuellement ?",
    options: [
      "Stylo et papier",
      "Ordinateur",
      "J'arrive pas vraiment à suivre",
      "Je révise juste avec les supports du prof",
    ],
  },
  {
    question: "C'est quoi ta plus grosse galère pendant les cours ?",
    options: [
      "Je n'arrive pas à tout noter à temps",
      "Je décroche ou je m'endors pendant le cours",
      "Je révise à la dernière minute dans le chaos",
      "Mes notes sont illisibles après coup",
    ],
  },
  {
    question: "À quel point tu te sens stressé(e) à l'approche des examens ?",
    options: ["Pas du tout", "Un peu", "Beaucoup", "Énormément"],
  },
  {
    question: "Si tu pouvais gagner du temps sur une seule chose, ce serait quoi ?",
    options: [
      "Réviser plus efficacement",
      "Moins stresser",
      "Avoir de meilleures notes",
      "Avoir plus de temps libre",
    ],
  },
];

const PAIN_POINT_INDEX = 4;
const GOAL_INDEX = 6;

const PAIN_POINT_RESPONSES: Record<string, string> = {
  "Je n'arrive pas à tout noter à temps":
    "Plus besoin d'écrire en même temps que le prof parle : Memoflash transcrit et structure tout à ta place.",
  "Je décroche ou je m'endors pendant le cours":
    "Même si tu décroches quelques minutes, Memoflash capte tout le cours pour toi, en entier.",
  "Je révise à la dernière minute dans le chaos":
    "Ta fiche de révision est prête dès la fin du cours, claire et structurée : fini le chaos de dernière minute.",
  "Mes notes sont illisibles après coup":
    "Memoflash transforme automatiquement ta voix en fiche propre et lisible, sans que tu aies à écrire quoi que ce soit.",
};

const GOAL_PHRASES: Record<string, string> = {
  "Réviser plus efficacement": "réviser plus efficacement",
  "Moins stresser": "moins stresser avant les examens",
  "Avoir de meilleures notes": "avoir de meilleures notes",
  "Avoir plus de temps libre": "avoir plus de temps libre",
};

const TOTAL_STEPS = QUESTIONS.length + 1;

function getAverageBadge(target: number): string {
  if (target >= 18) return "Excellent";
  if (target >= 16) return "Très bien";
  if (target >= 14) return "Bien";
  if (target >= 12) return "Assez bien";
  return "Passable";
}

export default function OnboardingPage() {
  const [showAverageStep, setShowAverageStep] = useState(true);
  const [currentAverage, setCurrentAverage] = useState(11);
  const [targetAverage, setTargetAverage] = useState(14);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  const isDone = !showAverageStep && step >= QUESTIONS.length;
  const painPoint = answers[PAIN_POINT_INDEX];
  const goal = answers[GOAL_INDEX];
  const averageDelta = targetAverage - currentAverage;

  const handleCurrentAverageChange = (value: number) => {
    setCurrentAverage(value);
    if (value > targetAverage) setTargetAverage(value);
  };

  const handleTargetAverageChange = (value: number) => {
    setTargetAverage(Math.max(value, currentAverage));
  };

  const selectOption = (option: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = option;
      return next;
    });
    setStep((current) => current + 1);
  };

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center overflow-hidden bg-[#070a12] px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none fixed -right-32 -bottom-32 -z-10 h-[46rem] w-[46rem] rounded-full bg-[#2563eb]/35 blur-[150px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 -left-32 -z-10 h-[24rem] w-[24rem] rounded-full bg-[#38bdf8]/10 blur-[130px]"
      />

      <div className="mb-10 flex w-full max-w-4xl items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-[#8b97b0] transition-colors transition-transform duration-150 hover:text-[#e7ecf5] active:scale-95"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2563eb] text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M13 2L4 14h6l-1 8 10-13h-6l0-7z" />
            </svg>
          </span>
          <span className="text-[#e7ecf5]">Memoflash</span>
        </Link>
        {!isDone && (
          <span className="text-xs text-[#8b97b0]">
            {showAverageStep ? 1 : step + 2} / {TOTAL_STEPS}
          </span>
        )}
      </div>

      {!isDone && (
        <div className="mb-8 h-1.5 w-full max-w-4xl overflow-hidden rounded-full bg-[#232d45]">
          <div
            className="h-full rounded-full bg-[#2563eb] transition-all duration-300"
            style={{
              width: `${((showAverageStep ? 0 : step + 1) / TOTAL_STEPS) * 100}%`,
            }}
          />
        </div>
      )}

      {showAverageStep ? (
        <div className="fiche-enter w-full max-w-4xl">
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[#6b7690] uppercase">
            Ton objectif
          </p>
          <h1 className="mb-2 text-balance text-3xl font-bold text-[#e7ecf5] sm:text-4xl">
            Quelle moyenne vises-tu ?
          </h1>
          <p className="mb-6 text-base text-[#8b97b0]">
            Dis-nous où tu en es, et où tu veux aller.
          </p>

          <div className="mb-6 rounded-lg border border-[#232d45] bg-[#141b2e] p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-6 sm:gap-8">
              <div>
                <p className="mb-1 text-sm font-semibold tracking-wide text-[#8b97b0] uppercase">
                  Actuelle
                </p>
                <p className="text-5xl font-bold text-[#e7ecf5] sm:text-6xl">{currentAverage}</p>
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-7 w-7 text-[#8b97b0] sm:h-9 sm:w-9"
              >
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <p className="mb-1 text-sm font-semibold tracking-wide text-[#38bdf8] uppercase">
                  Visée
                </p>
                <p className="text-5xl font-bold text-[#38bdf8] sm:text-6xl">
                  {targetAverage}
                  {averageDelta > 0 && (
                    <span className="ml-2 text-lg font-semibold text-emerald-400">
                      (+{averageDelta})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-2 flex items-center justify-between text-sm font-semibold text-[#8b97b0]">
                <span>Ta moyenne actuelle</span>
                <span>{currentAverage}/20</span>
              </label>
              <input
                type="range"
                min={0}
                max={20}
                step={0.5}
                value={currentAverage}
                onChange={(e) => handleCurrentAverageChange(parseFloat(e.target.value))}
                className="h-2 w-full accent-[#2563eb]"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-semibold text-[#38bdf8]">
                <span>Ta moyenne visée</span>
                <span>{targetAverage}/20</span>
              </label>
              <input
                type="range"
                min={0}
                max={20}
                step={0.5}
                value={targetAverage}
                onChange={(e) => handleTargetAverageChange(parseFloat(e.target.value))}
                className="h-2 w-full accent-[#38bdf8]"
              />
            </div>
          </div>

          <button
            onClick={() => setShowAverageStep(false)}
            className="flex h-12 w-full items-center justify-center rounded-full bg-[#2563eb] text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
          >
            Continuer
          </button>
        </div>
      ) : !isDone ? (
        <div key={step} className="fiche-enter w-full max-w-4xl">
          <h1 className="mb-6 text-balance text-center text-2xl font-bold text-[#e7ecf5]">
            {QUESTIONS[step].question}
          </h1>
          <div className="flex flex-col gap-3">
            {QUESTIONS[step].options.map((option) => (
              <button
                key={option}
                onClick={() => selectOption(option)}
                className="rounded-lg border border-[#232d45] bg-[#141b2e] px-5 py-3.5 text-left text-sm font-medium text-[#e7ecf5] transition-colors transition-transform duration-150 hover:border-[#2563eb] hover:bg-[#1b2440] active:scale-[0.98]"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="fiche-enter w-full max-w-4xl rounded-lg border border-[#232d45] bg-[#141b2e] p-8">
          <div className="mb-6 text-center">
            <span className="mb-3 inline-block rounded-full border border-[#2a3552] px-4 py-1.5 text-sm font-semibold text-[#e7ecf5]">
              Ton bilan personnalisé
            </span>
            <p className="text-sm text-[#8b97b0]">
              Objectif :{" "}
              <span className="font-medium text-[#e7ecf5]">
                {GOAL_PHRASES[goal] ?? "gagner du temps sur tes études"}
              </span>
            </p>
          </div>

          <div className="mb-4 rounded-lg border border-[#2563eb]/40 bg-[#2563eb]/10 p-4 text-center">
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-[#7dd3fc] uppercase">
              Ta moyenne visée
            </p>
            <p className="text-2xl font-bold text-[#e7ecf5]">
              {targetAverage}/20{" "}
              {averageDelta > 0 && (
                <span className="text-base font-semibold text-emerald-400">
                  (+{averageDelta} points)
                </span>
              )}
            </p>
            <span className="mt-2 inline-block rounded-full border border-[#2a3552] px-3 py-1 text-xs font-semibold text-[#c3cbdc]">
              {getAverageBadge(targetAverage)}
            </span>
          </div>

          <div className="mb-4 rounded-lg border border-[#2a3552] bg-[#0b1120] p-4">
            <p className="mb-1.5 text-[17px] font-semibold tracking-wide text-[#8b97b0] uppercase">
              Ta plus grosse galère :
            </p>
            <p className="text-[16px] font-medium text-[#e7ecf5]">{painPoint}</p>
          </div>

          <div className="mb-6 flex justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-[#38bdf8]">
              <path d="M12 4v16M6 14l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="mb-8 rounded-lg border border-[#2563eb]/40 bg-[#2563eb]/10 p-4">
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-[#7dd3fc] uppercase">
              Ce que Memoflash change pour toi :
            </p>
            <p className="text-sm font-medium text-[#e7ecf5]">
              {PAIN_POINT_RESPONSES[painPoint] ??
                "Tes cours se transforment automatiquement en fiches de révision claires, sans effort."}
            </p>
          </div>

          <Link
            href="/login?mode=signup"
            className="flex h-12 w-full items-center justify-center rounded-full bg-[#2563eb] text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
          >
            Créer mon compte
          </Link>
        </div>
      )}
    </div>
  );
}
