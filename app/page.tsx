import Link from "next/link";
import DeferredHeroAnimation from "@/components/DeferredHeroAnimation";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import LiveActivityBanner from "@/components/LiveActivityBanner";
import TypewriterCycle from "@/components/TypewriterCycle";
import LanguageSelector from "@/components/LanguageSelector";
import FaqAccordion from "@/components/FaqAccordion";

const FIELDS: Array<{ label: string; icon: React.ReactNode }> = [
  {
    label: "Droit",
    icon: (
      <path d="M12 3v18M5 7l-3 6a3 3 0 006 0l-3-6zM19 7l-3 6a3 3 0 006 0l-3-6zM5 7h14M8 21h8" />
    ),
  },
  {
    label: "Médecine",
    icon: <path d="M3 12h4l2-5 4 10 2-5h6" />,
  },
  {
    label: "Prépa",
    icon: (
      <>
        <path d="M2 9l10-5 10 5-10 5L2 9z" />
        <path d="M6 11v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5" />
      </>
    ),
  },
  {
    label: "Sciences",
    icon: (
      <>
        <path d="M9 2v6L3.5 18a2 2 0 001.8 3h13.4a2 2 0 001.8-3L15 8V2" />
        <path d="M9 2h6M7 15h10" />
      </>
    ),
  },
  {
    label: "Économie",
    icon: <path d="M4 18l5-6 4 4 7-9M14 7h6v6" />,
  },
  {
    label: "Lettres",
    icon: (
      <path d="M4 5c3-1.5 6-1.5 8 0v14c-2-1.5-5-1.5-8 0V5zM20 5c-3-1.5-6-1.5-8 0v14c2-1.5 5-1.5 8 0V5z" />
    ),
  },
];

const STEPS: Array<{ title: string; text: string; icon: React.ReactNode }> = [
  {
    title: "Démarre",
    text: "Appuie sur un bouton en début de cours, Memoflash écoute en direct.",
    icon: (
      <>
        <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
        <path d="M19 11a7 7 0 01-14 0M12 18v3" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Écoute ton cours normalement",
    text: "Pas besoin d'écrire quoi que ce soit, concentre-toi sur ce que dit ton prof.",
    icon: <path d="M3 18v-6a9 9 0 0118 0v6M21 19a2 2 0 01-2 2h-1v-6h3zM3 19a2 2 0 002 2h1v-6H3z" />,
  },
  {
    title: "Récupère ta fiche",
    text: "Une fiche de révision claire et structurée, prête en quelques minutes.",
    icon: (
      <>
        <path d="M6 3h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
        <path d="M9 12h6M9 16h6M9 8h2" strokeLinecap="round" />
      </>
    ),
  },
];

export default function LandingPage() {
  return (
    <div className="relative isolate flex min-h-screen flex-col items-center overflow-hidden bg-[#070a12] px-4">
      {/* Fond dégradé bleu sombre, façon Gemini : sombre en haut à gauche,
          halo bleu en bas à droite, pour un effet diagonal. Fixé à l'écran
          (pas à la page) pour rester cohérent même en scrollant. */}
      <div
        aria-hidden
        className="pointer-events-none fixed -right-32 -bottom-32 -z-10 h-[46rem] w-[46rem] rounded-full bg-[#2563eb]/35 blur-[150px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 -left-32 -z-10 h-[24rem] w-[24rem] rounded-full bg-[#38bdf8]/10 blur-[130px]"
      />

      <div className="relative -mx-4 w-[calc(100%+2rem)] border-b border-[#232d45]">
        <header className="relative mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 sm:px-10">
          <div className="ml-2 flex items-baseline sm:ml-6">
            <span className="text-lg font-bold tracking-tight text-[#e7ecf5]">Memo</span>
            <span className="text-lg font-bold tracking-tight text-[#38bdf8]">flash</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSelector />
            <Link
              href="/login"
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-[#e7ecf5] transition-colors transition-transform duration-150 hover:bg-[#1b2440] active:scale-95"
            >
              Se connecter
            </Link>
            <Link
              href="/onboarding"
              className="rounded-full bg-[#2563eb] px-5 py-2 text-sm font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
            >
              Commencer
            </Link>
          </div>
        </header>
      </div>

      <main className="w-full max-w-6xl py-16">
        <div className="grid items-center gap-12 md:grid-cols-[1.3fr_1fr] lg:grid-cols-[1fr_1.15fr]">
          <div className="flex flex-col items-start text-left">
            <span className="mb-5 flex items-center gap-1.5 rounded-full border border-[#2a3552] bg-[#141b2e] px-4 py-2 text-sm font-bold text-[#c3cbdc]">
              🎧 N&apos;écris pas, écoute seulement
            </span>

            <h1 className="text-balance text-4xl font-bold tracking-tight text-[#e7ecf5] sm:text-5xl lg:max-w-md">
              Transforme la voix de ton prof en{" "}
              <span className="relative inline-block">
                fiche de révision
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

            <p className="mt-6 max-w-xl text-lg text-[#8b97b0] sm:text-xl">
              Démarre l&apos;enregistrement pendant le cours et{" "}
              <TypewriterCycle
                words={[
                  "récupère une fiche claire en quelques minutes",
                  "concentre-toi sur ce que dit ton prof",
                  "révise sans avoir rien écrit toi-même",
                  "ne loupe plus aucune information importante",
                ]}
              />
            </p>

            <div className="mt-8 flex flex-col items-center gap-2">
              <Link
                href="/onboarding"
                className="flex h-12 w-52 items-center justify-center rounded-full bg-[#2563eb] text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
              >
                Créer ma fiche
              </Link>
              <span className="text-sm text-[#8b97b0]">2 min chrono</span>
            </div>
          </div>

          <DeferredHeroAnimation />
        </div>
      </main>

      <section className="w-full max-w-6xl pb-10">
        <ScrollFadeIn>
          <p className="mb-6 text-left text-xs font-semibold tracking-[0.2em] text-[#6b7690] uppercase">
            Memoflash fonctionne pour toutes les filières
          </p>
          <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="animate-marquee flex w-max items-center gap-14">
              {[...FIELDS, ...FIELDS].map((field, i) => (
                <span
                  key={i}
                  className="flex shrink-0 items-center gap-2.5 text-lg font-semibold text-[#8b97b0]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    {field.icon}
                  </svg>
                  {field.label}
                </span>
              ))}
            </div>
          </div>
        </ScrollFadeIn>
      </section>

      <section className="w-full max-w-6xl border-t border-[#232d45] py-16">
        <h2 className="text-center text-2xl font-bold text-[#e7ecf5]">
          Comment ça marche
        </h2>
        <p className="mt-2 mb-10 text-center text-[#8b97b0]">
          Trois étapes, zéro effort.
        </p>
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <ScrollFadeIn key={step.title} delayMs={index * 120}>
              <div className="relative rounded-lg border border-[#232d45] bg-[#141b2e] pt-9 pr-6 pb-6 pl-6">
                <span className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-[#2563eb] text-sm font-bold text-white shadow-[0_6px_16px_rgba(37,99,235,0.5)]">
                  {index + 1}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                  className="mb-4 h-7 w-7 text-[#38bdf8]"
                >
                  {step.icon}
                </svg>
                <h3 className="mb-2 text-base font-semibold text-[#e7ecf5]">
                  {step.title}
                </h3>
                <p className="text-sm text-[#8b97b0]">{step.text}</p>
              </div>
            </ScrollFadeIn>
          ))}
        </div>
      </section>

      <section className="w-full max-w-6xl border-t border-[#232d45] py-16">
        <ScrollFadeIn>
          <p className="mb-3 text-left text-xs font-semibold tracking-[0.2em] text-[#6b7690] uppercase">
            Questions
          </p>
          <h2 className="mb-8 text-left text-2xl font-bold text-[#e7ecf5]">
            Les questions qu&apos;on nous pose souvent
          </h2>
          <FaqAccordion />
        </ScrollFadeIn>
      </section>

      <footer className="flex w-full max-w-6xl items-center gap-4 border-t border-[#232d45] py-10">
        <span className="text-sm font-bold text-[#e7ecf5]">Memoflash</span>
        <span className="text-sm text-[#8b97b0]">N&apos;écris pas, écoute seulement.</span>
      </footer>

      <LiveActivityBanner />
    </div>
  );
}
