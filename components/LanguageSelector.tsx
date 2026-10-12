"use client";

import { useEffect, useRef, useState } from "react";

// Un seul pays/langue disponible pour l'instant (Memoflash est pensé pour
// les étudiants français), mais le sélecteur reste vraiment cliquable —
// plus crédible qu'un simple décor qui ne répond pas au clic.
export default function LanguageSelector() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[#c3cbdc] transition-colors duration-150 hover:bg-[#1b2440] hover:text-[#e7ecf5]"
      >
        🇫🇷 France (Français)
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full right-0 z-20 mt-2 w-52 rounded-lg border border-[#232d45] bg-[#141b2e] p-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-[#e7ecf5] transition-colors duration-150 hover:bg-[#1b2440]"
          >
            <span className="flex items-center gap-2">🇫🇷 France (Français)</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="h-4 w-4 text-[#38bdf8]"
            >
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
