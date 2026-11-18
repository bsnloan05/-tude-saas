import type { Metadata } from "next";
import Link from "next/link";
import AutoRedirectIfLoggedIn from "@/components/AutoRedirectIfLoggedIn";
import LogosMarquee from "@/components/LogosMarquee";
import FaqAccordion from "@/components/FaqAccordion";

export const metadata: Metadata = {
  title: "Fiche de révision IA, flashcards et quiz",
  description:
    "Memoflash génère tes fiches de révision par IA à partir de ton cours (transcription live, PDF ou audio), puis des flashcards, un quiz ou un podcast pour réviser à l'oral.",
};

const FEATURES: Array<{ title: string; text: string; icon: React.ReactNode; href?: string }> = [
  {
    title: "Transcription en direct",
    text: "Écoute ton cours pendant que le prof parle, sans rien noter toi-même.",
    icon: (
      <>
        <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
        <path d="M19 11a7 7 0 01-14 0M12 18v3" strokeLinecap="round" />
      </>
    ),
    href: "/transformer-cours-en-fiche",
  },
  {
    title: "Import PDF ou audio",
    text: "Déjà un support écrit ou un enregistrement ? Dépose-le, Memoflash s'occupe du reste.",
    icon: <path d="M6 3h9l5 5v13a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z M9 12h6M9 16h6M9 8h2" strokeLinecap="round" />,
  },
  {
    title: "Fiche de révision claire",
    text: "Une fiche structurée, sobre, générée uniquement à partir de ce qui a été dit — rien d'inventé.",
    icon: <path d="M4 5h16M4 10h16M4 15h10M4 20h10" strokeLinecap="round" />,
  },
  {
    title: "Flashcards",
    text: "Des cartes recto/verso pour mémoriser rapidement les points clés de ton cours.",
    icon: (
      <>
        <rect x="4" y="5" width="13" height="16" rx="2" />
        <path d="M8 2v4M13 2v4" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Quiz",
    text: "Des questions à choix multiples générées depuis ta fiche, pour te tester vraiment.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 3.5" strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="0.5" fill="currentColor" />
      </>
    ),
  },
  {
    title: "Podcast IA",
    text: "Discute à voix haute avec une IA qui t'explique ton cours et répond à tes questions.",
    icon: (
      <>
        <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
        <path d="M19 11a7 7 0 01-14 0M12 18v3" strokeLinecap="round" />
      </>
    ),
  },
];

export default function FicheDeRevisionIa() {
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
          Fiche de révision IA, flashcards et quiz
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[#8b97b0]">
          Memoflash transforme tes cours en supports de révision complets : fiche claire,
          flashcards, quiz, et même une conversation vocale avec une IA pour réviser à l&apos;oral.
        </p>
        <div className="mt-8 flex flex-col items-center gap-2">
          <Link
            href="/onboarding"
            className="flex h-12 w-56 items-center justify-center rounded-full bg-[#2563eb] text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
          >
            Créer ma fiche
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
          Tout ce dont tu as besoin pour réviser
        </h2>
        <p className="mt-2 mb-10 text-center text-[#8b97b0]">
          À partir d&apos;un cours écouté en direct, d&apos;un PDF ou d&apos;un audio.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            return (
              <div
                key={feature.title}
                className="flex flex-col gap-3 rounded-lg border border-[#232d45] bg-[#141b2e] p-6"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                  className="h-7 w-7 text-[#38bdf8]"
                >
                  {feature.icon}
                </svg>
                <h3 className="text-base font-semibold text-[#e7ecf5]">{feature.title}</h3>
                <p className="text-sm text-[#8b97b0]">{feature.text}</p>
                {feature.href && (
                  <Link
                    href={feature.href}
                    className="mt-1 text-sm font-medium text-[#38bdf8] underline underline-offset-4"
                  >
                    En savoir plus
                  </Link>
                )}
              </div>
            );
          })}
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
