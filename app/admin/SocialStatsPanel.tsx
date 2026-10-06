"use client";

import { useEffect, useState } from "react";

type SocialStat = { date: string; instagram_views: number; tiktok_views: number };

function todayParisDateInput(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
}

export default function SocialStatsPanel() {
  const [stats, setStats] = useState<SocialStat[]>([]);
  const [date, setDate] = useState(todayParisDateInput());
  const [instagramViews, setInstagramViews] = useState("");
  const [tiktokViews, setTiktokViews] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    const res = await fetch("/api/admin/social-stats");
    if (res.ok) {
      const data = await res.json();
      setStats(data.stats ?? []);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/admin/social-stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        instagramViews: Number(instagramViews),
        tiktokViews: Number(tiktokViews),
      }),
    });

    setSaving(false);
    if (res.ok) {
      setMessage("Enregistré.");
      setInstagramViews("");
      setTiktokViews("");
      load();
    } else {
      setMessage("Erreur lors de l'enregistrement.");
    }
  };

  return (
    <div className="mt-6 rounded-lg border border-[#232d45] bg-[#141b2e] p-6">
      <h2 className="mb-4 text-xs font-semibold tracking-wide text-[#8b97b0] uppercase">
        Vues Instagram / TikTok
      </h2>

      <form onSubmit={handleSubmit} className="mb-5 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#8b97b0]">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-[#2a3552] bg-[#0b1120] px-3 py-2 text-sm text-[#e7ecf5] outline-none focus:border-[#2563eb]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#8b97b0]">Vues Instagram</label>
          <input
            type="number"
            min={0}
            required
            value={instagramViews}
            onChange={(e) => setInstagramViews(e.target.value)}
            className="w-32 rounded-md border border-[#2a3552] bg-[#0b1120] px-3 py-2 text-sm text-[#e7ecf5] outline-none focus:border-[#2563eb]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[#8b97b0]">Vues TikTok</label>
          <input
            type="number"
            min={0}
            required
            value={tiktokViews}
            onChange={(e) => setTiktokViews(e.target.value)}
            className="w-32 rounded-md border border-[#2a3552] bg-[#0b1120] px-3 py-2 text-sm text-[#e7ecf5] outline-none focus:border-[#2563eb]"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "..." : "Enregistrer"}
        </button>
        {message && <span className="text-xs text-[#8b97b0]">{message}</span>}
      </form>

      {stats.length > 0 && (
        <div className="flex flex-col gap-2">
          {stats.map((row) => (
            <div
              key={row.date}
              className="flex items-center justify-between border-b border-[#232d45] pb-1.5 text-sm last:border-0"
            >
              <span className="text-[#8b97b0]">
                {new Date(`${row.date}T12:00:00`).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </span>
              <span className="text-[#c3cbdc]">
                Insta : <strong className="text-[#e7ecf5]">{row.instagram_views}</strong>
              </span>
              <span className="text-[#c3cbdc]">
                TikTok : <strong className="text-[#e7ecf5]">{row.tiktok_views}</strong>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
