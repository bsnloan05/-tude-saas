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

export default function SettingsPage() {
  const router = useRouter();
  const [usage, setUsage] = useState<{ plan: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setUsage(data));
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="dot-grid flex min-h-screen flex-col items-center bg-[#0b1120] px-4 py-12">
      <div className="mb-10 flex w-full max-w-2xl items-center justify-between">
        <Link
          href="/app"
          className="text-sm font-medium text-[#8b97b0] transition-colors transition-transform duration-150 hover:text-[#e7ecf5] active:scale-95"
        >
          ← Retour
        </Link>
        <span className="text-sm font-semibold text-[#e7ecf5]">Memoflash</span>
      </div>

      <div className="w-full max-w-2xl">
        <h1 className="mb-8 text-2xl font-bold text-[#e7ecf5]">Réglages</h1>

        <div className="rounded-lg border border-[#232d45] bg-[#141b2e] p-6">
          <h2 className="mb-4 text-xs font-semibold tracking-wide text-[#8b97b0] uppercase">
            Compte
          </h2>

          {usage ? (
            <>
              <p className="text-sm font-medium text-[#e7ecf5]">{usage.email}</p>
              <p className="mt-1 text-sm text-[#8b97b0]">
                Forfait :{" "}
                <span className="font-semibold text-[#38bdf8]">
                  {PLAN_LABELS[usage.plan] ?? usage.plan}
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm text-[#8b97b0]">Chargement...</p>
          )}

          <div className="mt-5 flex flex-wrap gap-2 border-t border-[#232d45] pt-5">
            <Link
              href="/pricing"
              className="rounded-full border border-[#2a3552] px-4 py-2 text-sm font-medium text-[#c3cbdc] transition-colors transition-transform duration-150 hover:bg-[#1b2440] active:scale-95"
            >
              Gérer mon forfait
            </Link>
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
