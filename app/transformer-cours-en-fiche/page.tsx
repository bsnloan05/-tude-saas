import type { Metadata } from "next";
import Link from "next/link";
import AutoRedirectIfLoggedIn from "@/components/AutoRedirectIfLoggedIn";
import LogosMarquee from "@/components/LogosMarquee";
import FaqAccordion from "@/components/FaqAccordion";

export const metadata: Metadata = {
  title: "Transformer un cours en fiche de révision avec l'IA",
  description:
    "Memoflash écoute ton cours en direct pendant que le prof parle et transforme automatiquement la transcription en fiche de révision claire, sans PDF à importer.",
};

const STEPS: Array<{ title: string; text: string; icon: React.ReactNode }> = [
  {
    title: "Démarre l'enregistrement",
    text: "Un bouton à appuyer en début de cours, rien à installer.",
    icon: (
      <>
        <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
        <path d="M19 11a7 7 0 01-14 0M12 18v3" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Memoflash écoute en direct",
    text: "Pendant que le prof parle, la transcription se fait en arrière-plan. Toi, tu écoutes normalement.",
    icon: <path d="M3 18v-6a9 9 0 0118 0v6M21 19a2 2 0 01-2 2h-1v-6h3zM3 19a2 2 0 002 2h1v-6H3z" />,
  },
  {
    title: "Ta fiche est prête",
    text: "En quelques minutes, une fiche structurée à partir de ce qui a vraiment été dit en cours.",
    icon: (
      <>
        <path d="M6 3h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z" />
        <path d="M9 12h6M9 16h6M9 8h2" strokeLinecap="round" />
      </>
    ),
  },
];

export default function TransformerCoursEnFiche() {
  return (
    <div className="relative isolate flex min-h-screen flex-col items-center overflow-hidden bg-[#070a12] px-4">
      <AutoRedirectIfLoggedIn />
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
          <Link href="/" className="ml-2 flex items-baseline sm:ml-6">
            <span className="text-lg font-bold tracking-tight text-[#e7ecf5]">Memo</span>
            <span className="text-lg font-bold tracking-tight text-[#38bdf8]">flash</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
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

      <main className="w-full max-w-4xl py-16 text-center">
        <h1 className="text-balance text-3xl font-bold tracking-tight text-[#e7ecf5] sm:text-5xl">
          Transformer un cours en fiche de révision, sans rien écrire
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[#8b97b0]">
          La plupart des outils demandent de déposer un PDF ou un document déjà écrit. Memoflash
          fait autrement : il écoute ton cours en direct, pendant que le prof parle, et transforme
          la transcription en fiche de révision claire — sans que tu aies à prendre de notes.
        </p>
        <div className="mt-8 flex flex-col items-center gap-2">
          <Link
            href="/onboarding"
            className="flex h-12 items-center justify-center whitespace-nowrap rounded-full bg-[#2563eb] px-8 text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
          >
            Essayer sur mon prochain cours
          </Link>
          <span className="text-sm text-[#8b97b0]">2 min chrono</span>
        </div>
      </main>

      <section className="w-full max-w-6xl pb-10">
        <p className="mb-6 text-left text-xs font-semibold tracking-[0.2em] text-[#6b7690] uppercase">
          Utilisé dans toutes les filières
        </p>
        <LogosMarquee />
      </section>

      <section className="w-full max-w-6xl border-t border-[#232d45] py-16">
        <h2 className="text-center text-2xl font-bold text-[#e7ecf5]">
          Comment Memoflash transforme ton cours en fiche
        </h2>
        <p className="mt-2 mb-10 text-center text-[#8b97b0]">
          Trois étapes, pendant le cours — pas après.
        </p>
        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="relative rounded-lg border border-[#232d45] bg-[#141b2e] pt-9 pr-6 pb-6 pl-6"
            >
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
              <h3 className="mb-2 text-base font-semibold text-[#e7ecf5]">{step.title}</h3>
              <p className="text-sm text-[#8b97b0]">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="w-full max-w-4xl border-t border-[#232d45] py-16">
        <h2 className="mb-6 text-center text-2xl font-bold text-[#e7ecf5]">
          Pas seulement un PDF : aussi utile en vrai cours
        </h2>
        <p className="mx-auto max-w-2xl text-center text-[#8b97b0]">
          Déjà un support écrit (PDF, document, enregistrement audio) ? Memoflash le transforme
          aussi en fiche de révision, flashcards ou quiz — directement depuis ton espace, en
          complément de la transcription en direct.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/fiche-de-revision-ia"
            className="text-sm font-medium text-[#38bdf8] underline underline-offset-4"
          >
            Voir tous les outils de révision IA de Memoflash
          </Link>
        </div>
      </section>

      <section className="w-full max-w-4xl border-t border-[#232d45] py-16">
        <p className="mb-3 text-left text-xs font-semibold tracking-[0.2em] text-[#6b7690] uppercase">
          Questions
        </p>
        <h2 className="mb-8 text-left text-2xl font-bold text-[#e7ecf5]">
          Les questions qu&apos;on nous pose souvent
        </h2>
        <FaqAccordion />
      </section>

      <footer className="flex w-full max-w-6xl items-center gap-4 border-t border-[#232d45] py-10">
        <span className="text-sm font-bold text-[#e7ecf5]">Memoflash</span>
        <span className="text-sm text-[#8b97b0]">N&apos;écris pas, écoute seulement.</span>
      </footer>
    </div>
  );
}
