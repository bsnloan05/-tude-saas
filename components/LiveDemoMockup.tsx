"use client";

import { useEffect, useState } from "react";

const BAR_COUNT = 5;

export default function LiveDemoMockup() {
  const [showFiche, setShowFiche] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowFiche((prev) => !prev);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-xl border border-[#232d45] bg-[#141b2e] shadow-2xl shadow-black/40">
      <div className="flex items-center gap-1.5 border-b border-[#232d45] bg-[#0f1729] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 truncate text-xs text-[#8b97b0]">memoflash.io/app</span>
      </div>

      <div className="relative h-64 p-5">
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-4 p-5 transition-opacity duration-700 ${
            showFiche ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-red-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Enregistrement en cours
          </div>
          <div className="flex h-10 items-end gap-1.5">
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              <span
                key={i}
                className="w-2 rounded-full bg-[#38bdf8]"
                style={{
                  height: `${25 + ((i * 37) % 60)}%`,
                  animation: `waveform-bar 1.1s ease-in-out ${i * 0.12}s infinite`,
                }}
              />
            ))}
          </div>
          <p className="max-w-[15rem] text-center text-xs leading-relaxed text-[#8b97b0]">
            &laquo;&nbsp;...la photosynthèse transforme l&apos;énergie lumineuse
            en énergie chimique, en présence de chlorophylle...&nbsp;&raquo;
          </p>
        </div>

        <div
          className={`absolute inset-0 flex flex-col gap-2.5 p-5 transition-opacity duration-700 ${
            showFiche ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <p className="text-sm font-semibold text-amber-400">La photosynthèse</p>
          <ul className="list-disc space-y-1.5 pl-4 text-xs text-[#c3cbdc] marker:text-amber-400">
            <li>Transforme l&apos;énergie lumineuse en énergie chimique</li>
            <li>Se déroule dans les chloroplastes</li>
            <li>Produit du glucose et de l&apos;oxygène</li>
          </ul>
          <div className="mt-1 rounded-r-lg border-l-4 border-emerald-500 bg-emerald-500/10 px-3 py-2">
            <p className="text-xs text-emerald-200">
              <strong className="font-semibold">Chlorophylle</strong> : pigment
              vert qui capte la lumière
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
