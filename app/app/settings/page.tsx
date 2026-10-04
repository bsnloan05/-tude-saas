"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuit",
  standard: "Standard",
  premium: "Premium",
  trimestriel: "Pro",
  lifetime: "À vie",
};

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}min`;
  return minutes === 0 ? `${hours}h` : `${hours}h${minutes.toString().padStart(2, "0")}`;
}

function formatMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default function SettingsPage() {
  const router = useRouter();
  const [usage, setUsage] = useState<{
    plan: string;
    email: string;
    usedSeconds: number;
    quotaSeconds: number | null;
  } | null>(null);
  const [memberSince, setMemberSince] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setUsage(data));

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("created_at")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.created_at) setMemberSince(data.created_at);
        });
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const usagePercent =
    usage && typeof usage.quotaSeconds === "number" && usage.quotaSeconds > 0
      ? Math.min(100, (usage.usedSeconds / usage.quotaSeconds) * 100)
      : null;

  return (
    <div className="flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <h1 className="mb-8 text-2xl font-bold text-[#e7ecf5]">Réglages</h1>

        {/* Bannière profil */}
        <div className="overflow-hidden rounded-lg border border-[#232d45] bg-gradient-to-br from-[#1b2440] to-[#141b2e] p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#2563eb] text-xl font-semibold text-white">
              {usage?.email?.[0]?.toUpperCase() ?? "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[#e7ecf5]">
                {usage?.email ?? "Chargement..."}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-[#2a3552] bg-[#0b1120]/60 px-2.5 py-0.5 text-xs font-medium text-[#8b97b0]">
                  {usage ? (PLAN_LABELS[usage.plan] ?? usage.plan) : "..."}
                </span>
                {memberSince && (
                  <span className="rounded-full border border-[#2a3552] bg-[#0b1120]/60 px-2.5 py-0.5 text-xs font-medium text-[#8b97b0]">
                    Membre depuis {formatMemberSince(memberSince)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Forfait / usage */}
        <div className="mt-6 rounded-lg border border-[#232d45] bg-[#141b2e] p-6">
          <h2 className="mb-4 text-xs font-semibold tracking-wide text-[#8b97b0] uppercase">
            Forfait
          </h2>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-[#e7ecf5]">
              {usage ? (PLAN_LABELS[usage.plan] ?? usage.plan) : "..."}
            </span>
            <Link
              href="/pricing"
              className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
            >
              Gérer mon forfait
            </Link>
          </div>

          {usage && usage.quotaSeconds === null && (
            <p className="mt-3 text-sm text-[#8b97b0]">
              Usage illimité — {formatDuration(usage.usedSeconds)} enregistrées ce mois-ci
            </p>
          )}

          {usage && usagePercent !== null && usage.quotaSeconds !== null && (
            <div className="mt-4 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-[#8b97b0]">
                <span>
                  {formatDuration(usage.usedSeconds)} / {formatDuration(usage.quotaSeconds)} ce
                  mois-ci
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#232d45]">
                <div
                  className={`h-full rounded-full transition-all ${
                    usagePercent > 85
                      ? "bg-red-500"
                      : usagePercent > 60
                        ? "bg-amber-400"
                        : "bg-[#38bdf8]"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Compte */}
        <div className="mt-6 rounded-lg border border-[#232d45] bg-[#141b2e] p-6">
          <h2 className="mb-4 text-xs font-semibold tracking-wide text-[#8b97b0] uppercase">
            Compte
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#e7ecf5]">Session</p>
              <p className="mt-0.5 text-xs text-[#8b97b0]">Te déconnecter sur cet appareil.</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-full border border-[#2a3552] px-4 py-2 text-sm font-medium text-[#c3cbdc] transition-colors transition-transform duration-150 hover:bg-[#1b2440] active:scale-95"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
