"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");

    if (!tokenHash) {
      setHasSession(false);
      setCheckingSession(false);
      return;
    }

    // Vérifié avec le client @supabase/supabase-js "nu" (comme pour l'envoi
    // du lien) : le client @supabase/ssr de l'app, configuré pour le flow
    // PKCE, échoue à vérifier un token au format implicite même valide.
    // La session obtenue est ensuite réinjectée dans le client normal de
    // l'app (cookies), pour que la suite (nouveau mot de passe, accès à
    // /app) fonctionne normalement.
    const verifyClient = createSupabaseJsClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );

    verifyClient.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(async ({ data, error }) => {
      if (error || !data.session) {
        setHasSession(false);
        setCheckingSession(false);
        return;
      }

      const supabase = createClient();
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      setHasSession(!setSessionError);
      setCheckingSession(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErrorMessage(
        error.message === "Password should be at least 6 characters"
          ? "Le mot de passe doit contenir au moins 6 caractères."
          : error.message,
      );
      return;
    }

    setDone(true);
  };

  return (
    <div className="isolate relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#070a12] px-4">
      <div
        aria-hidden
        className="pointer-events-none fixed -right-32 -bottom-32 -z-10 h-[46rem] w-[46rem] rounded-full bg-[#2563eb]/35 blur-[150px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 -left-32 -z-10 h-[24rem] w-[24rem] rounded-full bg-[#38bdf8]/10 blur-[130px]"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-0.5">
          <span className="text-base font-bold tracking-tight text-[#e7ecf5]">Memo</span>
          <span className="text-base font-bold tracking-tight text-[#38bdf8]">flash</span>
        </div>

        {checkingSession ? (
          <p className="text-center text-sm text-[#8b97b0]">Vérification du lien...</p>
        ) : !hasSession ? (
          <div className="text-center">
            <h1 className="mb-2 text-2xl font-bold text-[#e7ecf5]">Lien invalide ou expiré</h1>
            <p className="mb-6 text-base text-[#8b97b0]">
              Redemande un lien de réinitialisation depuis la page de connexion.
            </p>
            <button
              onClick={() => router.push("/login")}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#2563eb] px-8 text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
            >
              Retour à la connexion
            </button>
          </div>
        ) : done ? (
          <div className="text-center">
            <p className="mb-3 text-4xl">✅</p>
            <h1 className="mb-2 text-2xl font-bold text-[#e7ecf5]">Mot de passe mis à jour</h1>
            <p className="mb-6 text-base text-[#8b97b0]">
              Ton nouveau mot de passe est enregistré.
            </p>
            <button
              onClick={() => router.push("/app")}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#2563eb] px-8 text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95"
            >
              Accéder à mon compte
            </button>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-2xl font-bold text-[#e7ecf5]">Nouveau mot de passe</h1>
              <p className="text-base text-[#8b97b0]">Choisis un nouveau mot de passe pour ton compte.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-[#c3cbdc]">
                  Nouveau mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-lg border border-[#2a3552] bg-[#0b1120] px-4 py-3 text-base text-[#e7ecf5] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30"
                  placeholder="6 caractères minimum"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-[#c3cbdc]">
                  Confirme le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-lg border border-[#2a3552] bg-[#0b1120] px-4 py-3 text-base text-[#e7ecf5] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30"
                  placeholder="6 caractères minimum"
                />
              </div>

              {errorMessage && (
                <p className="rounded-lg border border-red-900/50 bg-red-950/50 px-4 py-2.5 text-sm text-red-200">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 rounded-full bg-[#2563eb] px-4 py-3.5 text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Enregistrement..." : "Enregistrer le nouveau mot de passe"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
