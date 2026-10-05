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
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetch("/api/usage")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => data && setUsage(data));

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("created_at, has_password")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.created_at) setMemberSince(data.created_at);
          setHasPassword(data?.has_password ?? false);
        });
    });
  }, []);

  const handleSetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 6) {
      setPasswordError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setSavingPassword(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }

    if (data.user) {
      // Supabase ne crée pas d'identity "email" distincte quand on ajoute
      // juste un mot de passe à un compte Google : on garde nous-mêmes la
      // trace pour savoir quel libellé afficher la prochaine fois.
      await supabase.from("profiles").update({ has_password: true }).eq("id", data.user.id);
    }

    setHasPassword(true);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSuccess("Mot de passe enregistré.");
  };

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

        {/* Mot de passe */}
        {hasPassword !== null && (
          <div className="mt-6 rounded-lg border border-[#232d45] bg-[#141b2e] p-6">
            <h2 className="mb-4 text-xs font-semibold tracking-wide text-[#8b97b0] uppercase">
              Sécurité
            </h2>
            <p className="mb-4 text-sm text-[#8b97b0]">
              {hasPassword
                ? "Change le mot de passe de ton compte."
                : "Ton compte a été créé avec Google : ajoute un mot de passe si tu veux aussi pouvoir te connecter avec ton email."}
            </p>
            <form onSubmit={handleSetPassword} className="flex flex-col gap-3">
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe (6 caractères min.)"
                className="w-full rounded-md border border-[#2a3552] bg-[#0b1120] px-3 py-2 text-sm text-[#e7ecf5] outline-none placeholder:text-[#6b7690] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30"
              />
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme le mot de passe"
                className="w-full rounded-md border border-[#2a3552] bg-[#0b1120] px-3 py-2 text-sm text-[#e7ecf5] outline-none placeholder:text-[#6b7690] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30"
              />

              {passwordError && (
                <p className="rounded-md border border-red-900/50 bg-red-950/50 px-3 py-2 text-sm text-red-200">
                  {passwordError}
                </p>
              )}
              {passwordSuccess && (
                <p className="rounded-md border border-emerald-900/50 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-200">
                  {passwordSuccess}
                </p>
              )}

              <button
                type="submit"
                disabled={savingPassword}
                className="self-start rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingPassword
                  ? "Enregistrement..."
                  : hasPassword
                    ? "Modifier le mot de passe"
                    : "Ajouter un mot de passe"}
              </button>
            </form>
          </div>
        )}

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
