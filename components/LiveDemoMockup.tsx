"use client";

import { useEffect, useState } from "react";

const BAR_COUNT = 5;

export default function LiveDemoMockup() {
  const [showFiche, setShowFiche] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowFiche((prev) => !prev);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex w-full max-w-md flex-col items-center">
      {/* Écran du Mac */}
      <div className="relative w-full rounded-t-2xl border-[10px] border-b-0 border-[#3a3a3e] bg-black pt-3">
        <div className="absolute top-0 left-1/2 h-2.5 w-14 -translate-x-1/2 rounded-b-lg bg-black" />

        <div className="overflow-hidden rounded-t-sm bg-[#141b2e]">
          <div className="flex items-center gap-1.5 border-b border-[#232d45] bg-[#0f1729] px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 truncate text-xs text-[#8b97b0]">
              memoflash.io/app
            </span>
          </div>

          <div className="relative h-72 p-5">
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
              <p className="max-w-[16rem] text-center text-xs leading-relaxed text-[#8b97b0]">
                &laquo;&nbsp;...la photosynthèse transforme l&apos;énergie
                lumineuse en énergie chimique, en présence de
                chlorophylle...&nbsp;&raquo;
              </p>
            </div>

            <div
              className={`absolute inset-0 flex flex-col gap-2 overflow-hidden p-5 transition-opacity duration-700 ${
                showFiche ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <p className="text-sm font-semibold text-amber-400">
                La photosynthèse
              </p>
              <ul className="list-disc space-y-1 pl-4 text-xs text-[#c3cbdc] marker:text-amber-400">
                <li>Se déroule dans les chloroplastes des cellules végétales</li>
                <li>Produit du glucose et de l&apos;oxygène</li>
              </ul>
              <div className="rounded-r-lg border-l-4 border-emerald-500 bg-emerald-500/10 px-3 py-1.5">
                <p className="text-xs text-emerald-200">
                  <strong className="font-semibold">Chlorophylle</strong> :
                  pigment vert qui capte la lumière
                </p>
              </div>

              <p className="mt-1 text-xs font-semibold text-teal-400">
                Les réactifs
              </p>
              <ul className="list-disc space-y-1 pl-4 text-xs text-[#c3cbdc] marker:text-teal-400">
                <li>Eau (H₂O) absorbée par les racines</li>
                <li>Dioxyde de carbone (CO₂) capté dans l&apos;air</li>
              </ul>
              <div className="rounded-r-lg border-l-4 border-emerald-500 bg-emerald-500/10 px-3 py-1.5">
                <p className="text-xs text-emerald-200">
                  <strong className="font-semibold">Stomates</strong> :
                  petites ouvertures qui laissent entrer le CO₂
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Base / clavier du Mac */}
      <div className="h-3.5 w-[104%] rounded-b-2xl bg-gradient-to-b from-[#4a4a4e] to-[#2a2a2e] shadow-lg" />
      <div className="h-1 w-20 rounded-b-md bg-[#1a1a1c]" />
    </div>
  );
}
