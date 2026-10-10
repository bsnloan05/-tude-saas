"use client";

import { useState } from "react";

// Info-bulle maison plutôt que l'attribut "title" natif du navigateur : ce
// dernier est lent à apparaître et ne fonctionne pas du tout au toucher
// (mobile), donc inutilisable pour consulter /admin depuis un téléphone.
export default function DailyBarChart({
  days,
  color,
  unitLabel,
}: {
  days: { date: string; count: number }[];
  color: string;
  unitLabel: string;
}) {
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="flex items-end gap-1.5 overflow-x-auto pb-6">
      {days.map((d) => {
        const heightPercent = (d.count / max) * 100;
        const label = new Date(`${d.date}T12:00:00`).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
        });
        const isActive = activeDate === d.date;

        return (
          <div
            key={d.date}
            className="relative flex w-6 flex-shrink-0 flex-col items-center gap-1"
            onMouseEnter={() => setActiveDate(d.date)}
            onMouseLeave={() => setActiveDate((current) => (current === d.date ? null : current))}
            onClick={() => setActiveDate((current) => (current === d.date ? null : d.date))}
          >
            {isActive && (
              <div className="absolute -top-7 left-1/2 z-10 -translate-x-1/2 rounded-md border border-[#232d45] bg-[#0b1120] px-2 py-1 text-[11px] font-semibold whitespace-nowrap text-[#e7ecf5] shadow-lg">
                {d.count} {unitLabel}
              </div>
            )}
            <div className="flex h-16 w-full items-end">
              <div
                className={`w-full rounded-sm ${color}`}
                style={{ height: `${Math.max(heightPercent, d.count > 0 ? 8 : 2)}%` }}
              />
            </div>
            <span className="text-[9px] text-[#6b7690]">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
