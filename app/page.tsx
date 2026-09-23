import Link from "next/link";

const STEPS = [
  {
    title: "Démarre",
    text: "Appuie sur un bouton en début de cours, Elyo écoute en direct.",
  },
  {
    title: "Écoute ton cours normalement",
    text: "Pas besoin d'écrire quoi que ce soit, concentre-toi sur ce que dit ton prof.",
  },
  {
    title: "Récupère ta fiche",
    text: "Une fiche de révision claire et structurée, prête en quelques minutes.",
  },
];

export default function LandingPage() {
  return (
    <div className="dot-grid relative isolate flex min-h-screen flex-col items-center overflow-hidden bg-[#0b1120] px-4">
      <div
        aria-hidden
        className="-z-10 pointer-events-none absolute -top-32 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-[#2563eb]/25 blur-[100px]"
      />

      <header className="flex w-full max-w-5xl items-center justify-between py-8">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2563eb] text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
              <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.93V20H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07A7 7 0 0019 11z" />
            </svg>
          </span>
          <span className="text-sm font-semibold text-[#e7ecf5]">Elyo</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/pricing"
            className="text-sm font-medium text-[#8b97b0] transition-colors hover:text-[#e7ecf5]"
          >
            Tarifs
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-[#8b97b0] transition-colors hover:text-[#e7ecf5]"
          >
            Se connecter
          </Link>
        </div>
      </header>

      <main className="flex w-full max-w-3xl flex-col items-center py-16 text-center">
        <span className="mb-5 rounded-full border border-[#2a3552] px-3 py-1 text-xs font-medium text-[#8b97b0]">
          Fait pour les étudiants
        </span>

        <h1 className="text-balance text-4xl font-bold tracking-tight text-[#e7ecf5] sm:text-5xl">
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
              />
            </svg>
          </span>
        </h1>

        <p className="mt-6 max-w-md text-balance text-[#8b97b0]">
          Plus besoin d&apos;écrire pendant le cours. Démarre l&apos;enregistrement,
          écoute, et récupère une fiche claire à la fin.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/login?mode=signup"
            className="flex h-12 w-52 items-center justify-center rounded-full bg-[#2563eb] text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
          >
            Essayer gratuitement
          </Link>
          <Link
            href="/pricing"
            className="flex h-12 w-52 items-center justify-center rounded-full border border-[#2a3552] text-base font-medium text-[#c3cbdc] transition-colors transition-transform duration-150 hover:bg-[#141b2e] active:scale-95"
          >
            Voir les tarifs
          </Link>
        </div>
        <p className="mt-3 text-xs text-[#8b97b0]">
          2h gratuites par mois, sans carte bancaire.
        </p>
      </main>

      <section className="w-full max-w-4xl border-t border-[#232d45] py-16">
        <h2 className="mb-10 text-center text-2xl font-bold text-[#e7ecf5]">
          Comment ça marche
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="rounded-lg border border-[#232d45] bg-[#141b2e] p-6"
            >
              <span className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#2563eb]/20 text-sm font-semibold text-[#38bdf8]">
                {index + 1}
              </span>
              <h3 className="mb-2 text-base font-semibold text-[#e7ecf5]">
                {step.title}
              </h3>
              <p className="text-sm text-[#8b97b0]">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="flex w-full max-w-4xl flex-col items-center gap-4 border-t border-[#232d45] py-10 text-center sm:flex-row sm:justify-between sm:text-left">
        <span className="text-sm text-[#8b97b0]">© 2026 Elyo</span>
        <div className="flex gap-4">
          <Link
            href="/pricing"
            className="text-sm text-[#8b97b0] transition-colors hover:text-[#e7ecf5]"
          >
            Tarifs
          </Link>
          <Link
            href="/login"
            className="text-sm text-[#8b97b0] transition-colors hover:text-[#e7ecf5]"
          >
            Se connecter
          </Link>
        </div>
      </footer>
    </div>
  );
}
