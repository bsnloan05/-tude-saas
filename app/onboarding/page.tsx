"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

const GOAL_INDEX = 6;

const GOAL_PHRASES: Record<string, string> = {
  "Réviser plus efficacement": "réviser plus efficacement",
  "Moins stresser": "moins stresser avant les examens",
  "Avoir de meilleures notes": "avoir de meilleures notes",
  "Avoir plus de temps libre": "avoir plus de temps libre",
};

const TOTAL_STEPS = QUESTIONS.length + 4;

// Reproduit le visuel d'un bulletin (capture d'écran envoyée par un
// client) en vrai HTML plutôt qu'en image : les deux cartes "avant" et
// "après" sont ainsi garanties strictement identiques (police, taille,
// alignement), seuls les chiffres changent.
function MoyenneCard({ eleve, classe }: { eleve: string; classe: string }) {
  return (
    <div className="w-full rounded-lg bg-[#ececec] p-5 text-left sm:max-w-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-lg font-bold text-[#1f5c45]">Moyenne générale élève :</span>
        <span className="shrink-0 text-xl font-bold text-[#1f5c45]">{eleve}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <span className="text-base text-[#4b5563]">Moyenne générale classe :</span>
        <span className="shrink-0 text-base text-[#4b5563]">{classe}</span>
      </div>
    </div>
  );
}

function TestimonialStep({
  caption,
  onBack,
  onContinue,
}: {
  caption: string;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="fiche-enter w-full">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm text-[#8b97b0] transition-colors duration-150 hover:text-[#e7ecf5]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Question précédente
      </button>

      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[#6b7690] uppercase">
          Ils sont passés par là
        </p>
        <h1 className="mb-8 text-balance text-2xl font-bold text-[#e7ecf5] sm:text-3xl">
          Avant, après.
        </h1>

        <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:items-stretch sm:gap-6">
          <MoyenneCard eleve="12,33" classe="10,44" />

          <span className="flex h-9 w-9 shrink-0 rotate-90 items-center justify-center self-center rounded-full border border-[#3a4568] text-[#e7ecf5] sm:rotate-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>

          <MoyenneCard eleve="17,12" classe="13,94" />
        </div>

        <p className="mb-8 max-w-xl text-sm text-[#8b97b0]">{caption}</p>

        <button
          onClick={onContinue}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2563eb] px-8 text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
        >
          Continuer
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function RealisticStep({
  targetAverage,
  onBack,
  onContinue,
}: {
  targetAverage: number;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="fiche-enter w-full">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-1.5 text-sm text-[#8b97b0] transition-colors duration-150 hover:text-[#e7ecf5]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Question précédente
      </button>

      <div className="mx-auto flex max-w-2xl flex-col items-center py-12 text-center">
        <p className="mb-4 text-xs font-semibold tracking-[0.2em] text-[#6b7690] uppercase">Ton cap</p>
        <h1 className="text-balance text-3xl font-bold text-[#e7ecf5] sm:text-4xl">
          {targetAverage}/20, c&apos;est tout à fait réaliste.
        </h1>
        <p className="mb-10 text-balance text-3xl font-bold text-[#38bdf8] sm:text-4xl">
          Et Memoflash va t&apos;y aider.
        </p>

        <button
          onClick={onContinue}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#2563eb] px-8 text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
        >
          Continuer
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Faux chargement (comme chez Pimzi) : ne reflète aucun vrai calcul, juste
// une séquence animée qui donne l'impression que Memoflash prépare un plan
// sur mesure avant de renvoyer vers la création de compte.
function LoadingStep({ items, onDone }: { items: string[]; onDone: () => void }) {
  const [doneCount, setDoneCount] = useState(0);

  useEffect(() => {
    const stepDelay = 2100;
    const timers = items.map((_, i) =>
      setTimeout(() => setDoneCount((count) => Math.max(count, i + 1)), (i + 1) * stepDelay),
    );
    const finalTimer = setTimeout(onDone, items.length * stepDelay + 900);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finalTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = Math.round((doneCount / items.length) * 100);

  return (
    <div className="fiche-enter w-full">
      <div className="mx-auto flex max-w-xl flex-col items-center py-16 text-center">
        <h1 className="mb-8 text-balance text-2xl font-bold text-[#e7ecf5] sm:text-3xl">
          Memoflash prépare ton plan<span className="text-[#38bdf8]">...</span>
        </h1>

        <div className="mb-6 flex w-full flex-col gap-3">
          {items.map((item, i) => {
            const isItemDone = i < doneCount;
            const isActive = i === doneCount;
            return (
              <div
                key={item}
                className={`flex items-center gap-3 rounded-xl border px-5 py-4 text-left transition-opacity duration-300 ${
                  isItemDone || isActive
                    ? "border-[#232d45] bg-[#141b2e] opacity-100"
                    : "border-[#1b2440] bg-[#0f1424] opacity-40"
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                  {isItemDone ? (
                    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                      <circle cx="12" cy="12" r="10" fill="#34d39926" />
                      <path
                        d="M8 12.5l2.5 2.5L16 9.5"
                        stroke="#34d399"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : isActive ? (
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 animate-spin text-[#38bdf8]">
                      <path
                        d="M12 2a10 10 0 010 20"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    <span className="block h-2 w-2 rounded-full bg-[#3a4568]" />
                  )}
                </span>
                <span className="text-sm font-medium text-[#e7ecf5]">{item}</span>
              </div>
            );
          })}
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#232d45]">
          <div
            className="h-full rounded-full bg-[#2563eb] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-[#8b97b0]">{progress}%</p>
      </div>
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

// Évalue l'ampleur de l'écart entre la moyenne actuelle et la moyenne
// visée, pour donner un retour immédiat ("c'est jouable" vs "ça va
// demander du travail") plutôt que de laisser l'utilisateur deviner si
// son objectif est raisonnable. 5 paliers, avec un titre + une
// description qui changent, et une petite barre à 5 segments pour
// visualiser où on se situe (même logique qu'un indicateur de "niveau
// d'ambition" classique sur ce genre de slider).
const EFFORT_TIERS: Array<{ label: string; title: string; description: string; color: string }> = [
  {
    label: "Faisable",
    title: "Un objectif atteignable",
    description: "Un peu de travail régulier et ça passe.",
    color: "#34d399",
  },
  {
    label: "Jouable",
    title: "Ça demande un peu de rigueur",
    description: "Avec de la régularité, c'est largement atteignable.",
    color: "#a3e635",
  },
  {
    label: "Il faut bosser",
    title: "Un vrai travail de fond",
    description: "Il va falloir s'y mettre sérieusement, mais c'est possible.",
    color: "#fbbf24",
  },
  {
    label: "Ambitieux",
    title: "Un objectif ambitieux",
    description: "Ça va demander un gros effort et beaucoup de régularité.",
    color: "#fb923c",
  },
  {
    label: "Très ambitieux",
    title: "Un objectif très exigeant",
    description: "Faisable avec une vraie discipline, mais ne te mets pas la pression.",
    color: "#f87171",
  },
];

function getEffortTierIndex(delta: number): number {
  if (delta <= 2) return 0;
  if (delta <= 4) return 1;
  if (delta <= 6) return 2;
  if (delta <= 8) return 3;
  return 4;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [showCurrentAverageStep, setShowCurrentAverageStep] = useState(true);
  const [showTargetAverageStep, setShowTargetAverageStep] = useState(false);
  const [currentAverage, setCurrentAverage] = useState(11);
  const [targetAverage, setTargetAverage] = useState(14);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showGoalTestimonial, setShowGoalTestimonial] = useState(false);
  const [showRealisticStep, setShowRealisticStep] = useState(false);

  const isDone =
    !showCurrentAverageStep &&
    !showTargetAverageStep &&
    !showGoalTestimonial &&
    !showRealisticStep &&
    step >= QUESTIONS.length;
  const goal = answers[GOAL_INDEX];
  const averageDelta = targetAverage - currentAverage;
  const effortTier = EFFORT_TIERS[getEffortTierIndex(averageDelta)];

  // Numéro affiché (1-indexé) : les deux étapes moyenne (actuelle, puis
  // visée), puis les questions, avec un témoignage après "gagner du temps
  // sur une seule chose", et l'écran "c'est réaliste" juste avant le bilan.
  const stepNumber = showCurrentAverageStep
    ? 1
    : showTargetAverageStep
      ? 2
      : showGoalTestimonial
        ? QUESTIONS.length + 3
        : showRealisticStep
          ? QUESTIONS.length + 4
          : step + 3;

  // Suit la progression dans le questionnaire via le numéro d'étape affiché
  // plutôt que chaque branche individuellement : ça capture tous les
  // chemins possibles (témoignages, écran "c'est réaliste", etc.) sans
  // avoir à instrumenter chaque handler un par un.
  useEffect(() => {
    window.posthog?.capture("onboarding_started");
  }, []);

  const lastTrackedStepRef = useRef(0);
  useEffect(() => {
    if (stepNumber === lastTrackedStepRef.current) return;
    lastTrackedStepRef.current = stepNumber;
    window.posthog?.capture("onboarding_step_reached", { step: stepNumber, total: TOTAL_STEPS });
  }, [stepNumber]);

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
    const wasGoalStep = step === GOAL_INDEX;
    setTimeout(() => {
      setAnswers((prev) => {
        const next = [...prev];
        next[step] = option;
        return next;
      });
      setStep((current) => current + 1);
      setSelectedOption(null);
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

        {showCurrentAverageStep ? (
        <div className="fiche-enter w-full max-w-4xl">
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[#6b7690] uppercase">
            Ton objectif
          </p>
          <h1 className="mb-2 text-balance text-3xl font-bold text-[#e7ecf5] sm:text-4xl">
            Quelle est ta moyenne actuelle ?
          </h1>
          <p className="mb-6 text-base text-[#8b97b0]">
            On commence par où tu en es.
          </p>

          <div className="mb-6 rounded-lg border border-[#232d45] bg-[#141b2e] p-6 sm:p-8">
            <p className="mb-6 text-center text-5xl font-bold text-[#e7ecf5] sm:text-6xl">{currentAverage}</p>

            <div>
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
                className="slider-thumb-lg h-3 w-full"
                style={
                  {
                    "--thumb-color": "#2563eb",
                    "--range-progress": `${(currentAverage / 20) * 100}%`,
                  } as React.CSSProperties
                }
              />
            </div>
          </div>

          <button
            onClick={() => {
              setShowCurrentAverageStep(false);
              setShowTargetAverageStep(true);
            }}
            className="flex h-12 w-full items-center justify-center rounded-full bg-[#2563eb] text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
          >
            Continuer
          </button>
        </div>
      ) : showTargetAverageStep ? (
        <div className="fiche-enter w-full max-w-4xl">
          <button
            onClick={() => {
              setShowTargetAverageStep(false);
              setShowCurrentAverageStep(true);
            }}
            className="mb-6 flex items-center gap-1.5 text-sm text-[#8b97b0] transition-colors duration-150 hover:text-[#e7ecf5]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Question précédente
          </button>

          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-[#6b7690] uppercase">
            Ton objectif
          </p>
          <h1 className="mb-2 text-balance text-3xl font-bold text-[#e7ecf5] sm:text-4xl">
            Quelle moyenne vises-tu ?
          </h1>
          <p className="mb-6 text-base text-[#8b97b0]">
            Tu es actuellement à {currentAverage}/20. Et où tu veux aller ?
          </p>

          <div className="mb-6 rounded-lg border border-[#232d45] bg-[#141b2e] p-6 sm:p-8">
            <p className="mb-6 text-center text-5xl font-bold text-[#38bdf8] sm:text-6xl">
              {targetAverage}
            </p>

            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-semibold text-[#38bdf8]">
                <span>Ta moyenne visée</span>
                <span>{targetAverage}/20</span>
              </label>
              <input
                type="range"
                min={currentAverage}
                max={20}
                step={0.5}
                value={targetAverage}
                onChange={(e) => handleTargetAverageChange(parseFloat(e.target.value))}
                className="slider-thumb-lg h-3 w-full"
                style={
                  {
                    "--thumb-color": "#38bdf8",
                    "--range-progress": `${
                      currentAverage >= 20
                        ? 100
                        : ((targetAverage - currentAverage) / (20 - currentAverage)) * 100
                    }%`,
                  } as React.CSSProperties
                }
              />
            </div>

            <div className="mt-4 flex items-center gap-1.5">
              {EFFORT_TIERS.map((tier, index) => (
                <div
                  key={tier.label}
                  className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor:
                      index <= getEffortTierIndex(averageDelta) ? tier.color : "#232d45",
                  }}
                />
              ))}
            </div>

            <div key={effortTier.label} className="badge-pop mt-5 text-center">
              <p className="text-base font-semibold text-[#e7ecf5]">{effortTier.title}</p>
              <p className="mt-1 text-sm text-[#8b97b0]">{effortTier.description}</p>
            </div>
          </div>

          <button
            onClick={() => setShowTargetAverageStep(false)}
            className="flex h-12 w-full items-center justify-center rounded-full bg-[#2563eb] text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
          >
            Continuer
          </button>
        </div>
      ) : showGoalTestimonial ? (
        <TestimonialStep
          caption="Encore un témoignage d'une étudiante qui utilise déjà Memoflash. C'est le genre de résultat que tu peux viser."
          onBack={() => {
            setStep(GOAL_INDEX);
            setShowGoalTestimonial(false);
          }}
          onContinue={() => {
            setShowGoalTestimonial(false);
            setShowRealisticStep(true);
          }}
        />
      ) : showRealisticStep ? (
        <RealisticStep
          targetAverage={targetAverage}
          onBack={() => {
            setShowGoalTestimonial(true);
            setShowRealisticStep(false);
          }}
          onContinue={() => setShowRealisticStep(false)}
        />
      ) : !isDone ? (
        <div key={step} className="fiche-enter w-full max-w-4xl">
          {step > 0 && (
            <button
              onClick={() => setStep((current) => current - 1)}
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
        <LoadingStep
          items={[
            "Analyse de tes réponses...",
            `Objectif repéré : ${GOAL_PHRASES[goal] ?? "gagner du temps sur tes études"}...`,
            `Moyenne visée calibrée : ${targetAverage}/20 (${getAverageBadge(targetAverage)})...`,
            "Préparation de ton espace Memoflash...",
          ]}
          onDone={() => {
            window.posthog?.capture("onboarding_completed", { goal, target_average: targetAverage });
            router.push("/login?mode=signup");
          }}
        />
        )}
      </div>
    </div>
  );
}
