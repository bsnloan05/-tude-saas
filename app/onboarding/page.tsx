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

const TOTAL_STEPS = QUESTIONS.length + 3;

type Testimonial = { quote: string; name: string };

// Vrais témoignages déjà utilisés sur /pricing (TESTIMONIALS), choisis ici
// selon la réponse pour que le témoignage affiché colle au mieux au sujet.
const PAIN_POINT_TESTIMONIALS: Record<string, Testimonial> = {
  "Je n'arrive pas à tout noter à temps": {
    quote:
      "Je comprends beaucoup mieux les cours : j'écoute le prof, et en rentrant, je relis directement ma fiche.",
    name: "Eliot",
  },
  "Je décroche ou je m'endors pendant le cours": {
    quote: "Je comprends beaucoup mieux mes cours.",
    name: "Dounia",
  },
  "Je révise à la dernière minute dans le chaos": {
    quote: "Mes cours sont bien mieux structurés grâce à l'option où j'ai accès à toutes mes fiches.",
    name: "Chloé",
  },
  "Mes notes sont illisibles après coup": {
    quote: "Mes cours sont beaucoup plus structurés.",
    name: "Clara",
  },
};

const GOAL_TESTIMONIALS: Record<string, Testimonial> = {
  "Réviser plus efficacement": {
    quote: "Mes cours sont bien mieux structurés grâce à l'option où j'ai accès à toutes mes fiches.",
    name: "Chloé",
  },
  "Moins stresser": {
    quote: "Je comprends beaucoup mieux mes cours.",
    name: "Dounia",
  },
  "Avoir de meilleures notes": {
    quote:
      "Je comprends beaucoup mieux les cours : j'écoute le prof, et en rentrant, je relis directement ma fiche.",
    name: "Eliot",
  },
  "Avoir plus de temps libre": {
    quote: "Mes cours sont beaucoup plus structurés.",
    name: "Clara",
  },
};

function TestimonialStep({
  testimonial,
  avantText,
  caption,
  onBack,
  onContinue,
}: {
  testimonial: Testimonial;
  avantText: string;
  caption: string;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="fiche-enter w-full max-w-4xl">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm text-[#8b97b0] transition-colors duration-150 hover:text-[#e7ecf5]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Question précédente
      </button>

      <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[#6b7690] uppercase">
        Ils sont passés par là
      </p>
      <h1 className="mb-8 text-balance text-3xl font-bold text-[#e7ecf5] sm:text-4xl">Avant, après.</h1>

      <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:items-stretch sm:gap-6">
        <div className="w-full rounded-lg border border-[#232d45] bg-[#141b2e] p-5 sm:max-w-xs">
          <p className="mb-3 text-xs font-semibold tracking-wide text-[#8b97b0] uppercase">Avant</p>
          <p className="text-sm text-[#6b7690]">{avantText}</p>
        </div>

        <span className="flex h-9 w-9 shrink-0 rotate-90 items-center justify-center self-center rounded-full border border-[#232d45] text-[#8b97b0] sm:rotate-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        <div className="w-full rounded-lg border border-[#2563eb]/40 bg-[#2563eb]/10 p-5 sm:max-w-xs">
          <p className="mb-3 text-xs font-semibold tracking-wide text-[#7dd3fc] uppercase">
            Avec Memoflash
          </p>
          <p className="text-sm font-medium text-[#e7ecf5]">« {testimonial.quote} »</p>
          <p className="mt-3 text-sm font-semibold text-[#38bdf8]">— {testimonial.name}</p>
        </div>
      </div>

      <p className="mb-8 text-sm text-[#8b97b0]">{caption}</p>

      <button
        onClick={onContinue}
        className="flex h-12 w-full items-center justify-center rounded-full bg-[#2563eb] text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
      >
        Continuer
      </button>
    </div>
  );
}

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
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showTestimonial, setShowTestimonial] = useState(false);
  const [showGoalTestimonial, setShowGoalTestimonial] = useState(false);

  const isDone = !showAverageStep && !showGoalTestimonial && step >= QUESTIONS.length;
  const painPoint = answers[PAIN_POINT_INDEX];
  const goal = answers[GOAL_INDEX];
  const averageDelta = targetAverage - currentAverage;

  // Numéro affiché (1-indexé) : étape moyenne, puis questions, avec un
  // témoignage inséré après "plus grosse galère" et un autre après
  // "gagner du temps sur une seule chose" (juste avant le bilan).
  const stepNumber = showAverageStep
    ? 1
    : showTestimonial
      ? PAIN_POINT_INDEX + 3
      : showGoalTestimonial
        ? QUESTIONS.length + 3
        : step <= PAIN_POINT_INDEX
          ? step + 2
          : step + 3;

  const handleCurrentAverageChange = (value: number) => {
    setCurrentAverage(value);
    if (value > targetAverage) setTargetAverage(value);
  };

  const handleTargetAverageChange = (value: number) => {
    setTargetAverage(Math.max(value, currentAverage));
  };

  const selectOption = (option: string) => {
    // Un court flash visuel (case cochée) avant de passer à la question
    // suivante, pour que le clic se sente confirmé plutôt qu'instantané.
    setSelectedOption(option);
    const wasPainPointStep = step === PAIN_POINT_INDEX;
    const wasGoalStep = step === GOAL_INDEX;
    setTimeout(() => {
      setAnswers((prev) => {
        const next = [...prev];
        next[step] = option;
        return next;
      });
      setStep((current) => current + 1);
      setSelectedOption(null);
      if (wasPainPointStep) setShowTestimonial(true);
      if (wasGoalStep) setShowGoalTestimonial(true);
    }, 220);
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#070a12]">
      <div
        aria-hidden
        className="pointer-events-none fixed -right-32 -bottom-32 -z-10 h-[46rem] w-[46rem] rounded-full bg-[#2563eb]/35 blur-[150px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 -left-32 -z-10 h-[24rem] w-[24rem] rounded-full bg-[#38bdf8]/10 blur-[130px]"
      />

      <div className="relative border-b border-[#232d45]">
        <header className="flex w-full items-center justify-between px-4 py-4 sm:px-10 lg:px-[16%]">
          <div className="flex items-baseline">
            <span className="text-lg font-bold tracking-tight text-[#e7ecf5]">Memo</span>
            <span className="text-lg font-bold tracking-tight text-[#38bdf8]">flash</span>
          </div>
          <div className="flex items-center gap-4">
            {!isDone && (
              <span className="text-xs text-[#8b97b0]">
                {stepNumber} / {TOTAL_STEPS}
              </span>
            )}
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm font-medium text-[#8b97b0] transition-colors duration-150 hover:text-[#e7ecf5]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Retour à l&apos;accueil
            </Link>
          </div>
        </header>
      </div>

      <div className="flex flex-col items-start px-4 py-12 sm:px-10 lg:px-[16%]">
        {!isDone && (
          <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-[#232d45]">
            <div
              className="h-full rounded-full bg-[#2563eb] transition-all duration-300"
              style={{
                width: `${((stepNumber - 1) / TOTAL_STEPS) * 100}%`,
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
      ) : showTestimonial ? (
        <TestimonialStep
          testimonial={
            PAIN_POINT_TESTIMONIALS[painPoint] ?? PAIN_POINT_TESTIMONIALS["Je n'arrive pas à tout noter à temps"]
          }
          avantText="Des notes prises à la va-vite, et un prof qui a déjà enchaîné sur autre chose."
          caption="Le témoignage d'une étudiante qui utilise déjà Memoflash. C'est exactement ce que tu peux ressentir, toi aussi."
          onBack={() => {
            setStep(PAIN_POINT_INDEX);
            setShowTestimonial(false);
          }}
          onContinue={() => setShowTestimonial(false)}
        />
      ) : showGoalTestimonial ? (
        <TestimonialStep
          testimonial={GOAL_TESTIMONIALS[goal] ?? GOAL_TESTIMONIALS["Réviser plus efficacement"]}
          avantText="Du temps perdu à tout réécrire, pour des révisions qui restent approximatives."
          caption="Encore un témoignage d'une étudiante qui utilise déjà Memoflash. C'est le genre de résultat que tu peux viser."
          onBack={() => {
            setStep(GOAL_INDEX);
            setShowGoalTestimonial(false);
          }}
          onContinue={() => setShowGoalTestimonial(false)}
        />
      ) : !isDone ? (
        <div key={step} className="fiche-enter w-full max-w-4xl">
          {step > 0 && (
            <button
              onClick={() => {
                if (step === PAIN_POINT_INDEX + 1) {
                  setShowTestimonial(true);
                } else {
                  setStep((current) => current - 1);
                }
              }}
              className="mb-6 flex items-center gap-1.5 text-sm text-[#8b97b0] transition-colors duration-150 hover:text-[#e7ecf5]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Question précédente
            </button>
          )}
          <h1 className="mb-6 text-balance text-2xl font-bold text-[#e7ecf5]">
            {QUESTIONS[step].question}
          </h1>
          <div className="flex flex-col gap-3">
            {QUESTIONS[step].options.map((option) => {
              const isSelected = selectedOption === option;
              return (
                <button
                  key={option}
                  onClick={() => selectOption(option)}
                  disabled={selectedOption !== null}
                  className={`flex items-center gap-4 rounded-xl border px-6 py-5 text-left text-base font-semibold text-[#e7ecf5] transition-colors transition-transform duration-150 active:scale-[0.98] disabled:cursor-default ${
                    isSelected
                      ? "border-[#2563eb] bg-[#1b2440]"
                      : "border-[#232d45] bg-[#141b2e] hover:border-[#2563eb] hover:bg-[#1b2440]"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-150 ${
                      isSelected ? "border-[#2563eb] bg-[#2563eb]" : "border-[#3a4568]"
                    }`}
                  >
                    {isSelected && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="h-3.5 w-3.5">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span>{option}</span>
                </button>
              );
            })}
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
    </div>
  );
}
