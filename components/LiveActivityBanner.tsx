"use client";

import { useEffect, useState } from "react";

function formatRelativeTime(iso: string): string {
  const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSeconds < 60) return "à l'instant";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

export default function LiveActivityBanner() {
  const [timestamps, setTimestamps] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/recent-activity")
      .then((res) => res.json())
      .then((data) => setTimestamps(data.timestamps ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (timestamps.length === 0) return;

    const showTimeout = setTimeout(() => setVisible(true), 1500);
    const hideTimeout = setTimeout(() => setVisible(false), 7000);
    const nextTimeout = setTimeout(() => {
      setIndex((i) => (i + 1) % timestamps.length);
    }, 8000);

    return () => {
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
      clearTimeout(nextTimeout);
    };
  }, [timestamps, index]);

  if (timestamps.length === 0) return null;

  return (
    <div
      className={`fixed bottom-5 left-5 z-20 max-w-xs rounded-lg border border-[#232d45] bg-[#141b2e] px-4 py-3 shadow-lg transition-all duration-500 print:hidden ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <p className="text-sm font-medium text-[#e7ecf5]">
        📝 Une fiche de révision vient d&apos;être générée
      </p>
      <p className="mt-0.5 text-xs text-[#8b97b0]">
        {formatRelativeTime(timestamps[index])}
      </p>
    </div>
  );
}
