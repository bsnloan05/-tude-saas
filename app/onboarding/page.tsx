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

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  const isDone = step >= QUESTIONS.length;
  const painPoint = answers[PAIN_POINT_INDEX];
  const goal = answers[GOAL_INDEX];

  const selectOption = (option: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = option;
      return next;
    });
    setStep((current) => current + 1);
  };

  return (
    <div className="dot-grid relative isolate flex min-h-screen flex-col items-center overflow-hidden bg-[#0b1120] px-4 py-16">
      <div
        aria-hidden
        className="-z-10 pointer-events-none absolute -top-32 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-[#2563eb]/25 blur-[100px]"
      />

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

      <div className="mb-10 flex w-full max-w-md items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-[#8b97b0] transition-colors transition-transform duration-150 hover:text-[#e7ecf5] active:scale-95"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2563eb] text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
              <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.93V20H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07A7 7 0 0019 11z" />
            </svg>
          </span>
          <span className="text-[#e7ecf5]">Memoflash</span>
        </Link>
        {!isDone && (
          <span className="text-xs text-[#8b97b0]">
            {step + 1} / {QUESTIONS.length}
          </span>
        )}
      </div>

      {!isDone && (
        <div className="mb-8 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-[#232d45]">
          <div
            className="h-full rounded-full bg-[#2563eb] transition-all duration-300"
            style={{ width: `${(step / QUESTIONS.length) * 100}%` }}
          />
        </div>
      )}

      {!isDone ? (
        <div key={step} className="fiche-enter w-full max-w-md">
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
        <div className="fiche-enter w-full max-w-md rounded-lg border border-[#232d45] bg-[#141b2e] p-8">
          <div className="mb-6 text-center">
            <span className="mb-3 inline-block rounded-full border border-[#2a3552] px-3 py-1 text-xs font-medium text-[#8b97b0]">
              Ton bilan personnalisé
            </span>
            <p className="text-sm text-[#8b97b0]">
              Objectif :{" "}
              <span className="font-medium text-[#e7ecf5]">
                {GOAL_PHRASES[goal] ?? "gagner du temps sur tes études"}
              </span>
            </p>
          </div>

          <div className="mb-4 rounded-lg border border-[#2a3552] bg-[#0b1120] p-4">
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-[#8b97b0] uppercase">
              Ta plus grosse galère
            </p>
            <p className="text-sm font-medium text-[#e7ecf5]">{painPoint}</p>
          </div>

          <div className="mb-6 flex justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-[#38bdf8]">
              <path d="M12 4v16M6 14l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="mb-8 rounded-lg border border-[#2563eb]/40 bg-[#2563eb]/10 p-4">
            <p className="mb-1.5 text-xs font-semibold tracking-wide text-[#7dd3fc] uppercase">
              Ce que Memoflash change pour toi
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
