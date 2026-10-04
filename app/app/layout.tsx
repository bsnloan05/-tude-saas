"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuit",
  standard: "Standard",
  premium: "Premium",
  trimestriel: "Pro",
  lifetime: "À vie",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [usage, setUsage] = useState<{ plan: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setUsage(data));
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0b1120]">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[#232d45] px-4 py-6 md:flex">
        <div className="flex items-center gap-2 px-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2563eb] text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M13 2L4 14h6l-1 8 10-13h-6l0-7z" />
            </svg>
          </span>
          <span className="text-base font-semibold text-[#e7ecf5]">Memoflash</span>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          <Link
            href="/app"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-[#c3cbdc] transition-colors duration-150 hover:bg-[#1b2440] hover:text-[#e7ecf5]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0">
              <path d="M3 11l9-8 9 8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Accueil
          </Link>
          <Link
            href="/app/fiches"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-[#c3cbdc] transition-colors duration-150 hover:bg-[#1b2440] hover:text-[#e7ecf5]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0">
              <path d="M4 5a2 2 0 012-2h11a1 1 0 011 1v15a1 1 0 01-1 1H6a2 2 0 00-2 2V5z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 19.5A2 2 0 016 18h12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Mes fiches
          </Link>
          <Link
            href="/pricing"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-[#c3cbdc] transition-colors duration-150 hover:bg-[#1b2440] hover:text-[#e7ecf5]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0">
              <path d="M20.6 12.3L12 20.9a2 2 0 01-2.8 0l-7-7a2 2 0 010-2.8L10.8 2.5a2 2 0 011.4-.6H19a2 2 0 012 2v6.6a2 2 0 01-.4 1.2z" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="15.5" cy="7.5" r="1.3" />
            </svg>
            Tarifs
          </Link>
          <Link
            href="/app/settings"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-[#c3cbdc] transition-colors duration-150 hover:bg-[#1b2440] hover:text-[#e7ecf5]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Réglages
          </Link>
        </nav>

        <Link
          href="/app/settings"
          className="mt-auto flex items-center gap-2 rounded-md px-2 py-2 transition-colors duration-150 hover:bg-[#1b2440]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2a3552] text-xs font-semibold text-[#c3cbdc]">
            {usage?.email?.[0]?.toUpperCase() ?? "?"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-[#e7ecf5]">
              {usage?.email ?? "Profil"}
            </span>
            <span className="block text-xs text-[#8b97b0]">
              {usage ? (PLAN_LABELS[usage.plan] ?? usage.plan) : "..."}
            </span>
          </span>
        </Link>
      </aside>

      <div className="dot-grid flex min-w-0 flex-1 flex-col">
        {/* Barre visible uniquement sur mobile/fenêtre étroite : la barre
            latérale est cachée en dessous de sm, donc on garde un accès au
            logo ici et la navigation dans la barre du bas. */}
        <div className="flex w-full items-center gap-2 border-b border-[#232d45] px-4 py-3 md:hidden">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2563eb] text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M13 2L4 14h6l-1 8 10-13h-6l0-7z" />
            </svg>
          </span>
          <span className="text-base font-semibold text-[#e7ecf5]">Memoflash</span>
        </div>

        <div className="flex-1 pb-20 md:pb-0">{children}</div>
      </div>

      {/* Barre de navigation du bas, visible uniquement sur mobile/fenêtre
          étroite : équivalent en icônes de la barre latérale. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around border-t border-[#232d45] bg-[#0b1120] py-2 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <Link
          href="/app"
          aria-label="Accueil"
          className="flex flex-col items-center gap-0.5 p-2 text-[#8b97b0] transition-colors duration-150 hover:text-[#e7ecf5]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path d="M3 11l9-8 9 8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <Link
          href="/app/fiches"
          aria-label="Mes fiches"
          className="flex flex-col items-center gap-0.5 p-2 text-[#8b97b0] transition-colors duration-150 hover:text-[#e7ecf5]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path d="M4 5a2 2 0 012-2h11a1 1 0 011 1v15a1 1 0 01-1 1H6a2 2 0 00-2 2V5z" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 19.5A2 2 0 016 18h12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <Link
          href="/pricing"
          aria-label="Tarifs"
          className="flex flex-col items-center gap-0.5 p-2 text-[#8b97b0] transition-colors duration-150 hover:text-[#e7ecf5]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path d="M20.6 12.3L12 20.9a2 2 0 01-2.8 0l-7-7a2 2 0 010-2.8L10.8 2.5a2 2 0 011.4-.6H19a2 2 0 012 2v6.6a2 2 0 01-.4 1.2z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="15.5" cy="7.5" r="1.3" />
          </svg>
        </Link>
        <Link
          href="/app/settings"
          aria-label="Réglages"
          className="flex flex-col items-center gap-0.5 p-2 text-[#8b97b0] transition-colors duration-150 hover:text-[#e7ecf5]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </nav>
    </div>
  );
}
