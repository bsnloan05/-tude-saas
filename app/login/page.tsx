"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

function translateAuthError(message: string): string {
  const known: Record<string, string> = {
    "Invalid login credentials": "Email ou mot de passe incorrect.",
    "User already registered": "Un compte existe déjà avec cet email.",
    "Password should be at least 6 characters":
      "Le mot de passe doit contenir au moins 6 caractères.",
    "Unable to validate email address: invalid format":
      "Adresse email invalide.",
    "Email not confirmed": "Confirme ton email avant de te connecter.",
  };
  return known[message] ?? message;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [errorMessage, setErrorMessage] = useState(searchParams.get("error") ?? "");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setInfoMessage("");
    setLoading(true);

    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: firstName } },
      });
      if (error) {
        setErrorMessage(translateAuthError(error.message));
      } else if (data.user) {
        await supabase
          .from("profiles")
          .update({ has_password: true })
          .eq("id", data.user.id);

        if (data.session) {
          // Confirmation par email désactivée : le compte est déjà actif,
          // on connecte directement plutôt que de renvoyer vers un message
          // qui parlerait d'un email de confirmation qui n'existe pas.
          router.push("/app");
          router.refresh();
        } else {
          setInfoMessage("Compte créé. Vérifie ta boîte mail pour confirmer ton adresse.");
          setMode("signin");
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setErrorMessage(translateAuthError(error.message));
      } else {
        router.push("/app");
        router.refresh();
      }
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
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

        {mode === "signup" ? (
          <div className="mb-8 text-center">
            <p className="mb-3 text-4xl">🎉</p>
            <h1 className="mb-2 text-balance text-2xl font-bold text-[#e7ecf5] sm:text-3xl">
              Ton plan est prêt.
            </h1>
            <p className="mb-4 text-base text-[#8b97b0]">
              Crée ton compte pour y accéder, ta première fiche n&apos;est plus très loin.
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-300">
              ⏱️ Ta fiche de révision, prête en 2 minutes chrono
            </span>
          </div>
        ) : (
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold text-[#e7ecf5]">Connexion</h1>
            <p className="text-base text-[#8b97b0]">Connecte-toi pour accéder à tes fiches.</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[#2a3552] bg-[#0b1120] px-4 py-3.5 text-base font-medium text-[#e7ecf5] transition-colors transition-transform duration-150 hover:bg-[#1b2440] active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5">
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.47a5.54 5.54 0 01-2.4 3.64v3h3.88c2.27-2.09 3.54-5.17 3.54-8.67z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.07 7.93-2.9l-3.88-3a7.4 7.4 0 01-11-3.9H1.08v3.1A12 12 0 0012 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.05 14.2a7.2 7.2 0 010-4.4v-3.1H1.08a12 12 0 000 10.6l3.97-3.1z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.08 6.7l3.97 3.1A7.18 7.18 0 0112 4.75z"
            />
          </svg>
          Continuer avec Google
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#232d45]" />
          <span className="text-xs text-[#6b7690]">ou</span>
          <div className="h-px flex-1 bg-[#232d45]" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-[#c3cbdc]">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-[#2a3552] bg-[#0b1120] px-4 py-3 text-base text-[#e7ecf5] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30"
              placeholder="toi@exemple.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-[#c3cbdc]">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-[#2a3552] bg-[#0b1120] px-4 py-3 text-base text-[#e7ecf5] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30"
              placeholder="6 caractères minimum"
            />
          </div>

          {mode === "signup" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="firstName" className="text-sm font-medium text-[#c3cbdc]">
                Ton prénom
              </label>
              <input
                id="firstName"
                type="text"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="rounded-lg border border-[#2a3552] bg-[#0b1120] px-4 py-3 text-base text-[#e7ecf5] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30"
                placeholder="Camille"
              />
            </div>
          )}

          {errorMessage && (
            <p className="rounded-lg border border-red-900/50 bg-red-950/50 px-4 py-2.5 text-sm text-red-200">
              {errorMessage}
            </p>
          )}
          {infoMessage && (
            <p className="rounded-lg border border-emerald-900/50 bg-emerald-950/50 px-4 py-2.5 text-sm text-emerald-200">
              {infoMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-full bg-[#2563eb] px-4 py-3.5 text-base font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Chargement..."
              : mode === "signin"
                ? "Se connecter"
                : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-[#8b97b0]">
          {mode === "signin" ? "Pas encore de compte ? " : "Déjà un compte ? "}
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setErrorMessage("");
              setInfoMessage("");
            }}
            className="font-semibold text-[#38bdf8] transition-transform duration-150 hover:text-[#60c8fb] active:scale-95"
          >
            {mode === "signin" ? "Inscris-toi" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
