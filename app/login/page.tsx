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
  const [errorMessage, setErrorMessage] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");
    setInfoMessage("");
    setLoading(true);

    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setErrorMessage(translateAuthError(error.message));
      } else {
        setInfoMessage(
          "Compte créé. Vérifie ta boîte mail si une confirmation est demandée, sinon tu peux te connecter directement.",
        );
        setMode("signin");
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

  return (
    <div className="dot-grid isolate relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0b1120] px-4">
      <div
        aria-hidden
        className="-z-10 pointer-events-none absolute -top-32 left-1/2 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-[#2563eb]/25 blur-[100px]"
      />

      <svg
        aria-hidden
        className="big-bg-icon pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 text-[#38bdf8]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.6"
      >
        <path d="M4 5c3-1.5 6-1.5 8 0v14c-2-1.5-5-1.5-8 0V5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 5c-3-1.5-6-1.5-8 0v14c2-1.5 5-1.5 8 0V5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div aria-hidden className="-z-10 pointer-events-none absolute inset-0 overflow-hidden">
        <svg
          className="float-icon absolute top-[10%] left-[6%] h-11 w-11 text-[#38bdf8]/20"
          style={{ animationDelay: "0s" }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg
          className="float-icon absolute top-[62%] left-[88%] h-12 w-12 text-[#38bdf8]/20"
          style={{ animationDelay: "1.6s" }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 5c3-1.5 6-1.5 8 0v14c-2-1.5-5-1.5-8 0V5z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M20 5c-3-1.5-6-1.5-8 0v14c2-1.5 5-1.5 8 0V5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg
          className="float-icon absolute top-[82%] left-[12%] h-10 w-10 text-[#38bdf8]/20"
          style={{ animationDelay: "3.2s" }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M12 3l10 5-10 5L2 8l10-5z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 10.5V16c0 1.5 2.5 3 6 3s6-1.5 6-3v-5.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg
          className="float-icon absolute top-[22%] left-[92%] h-11 w-11 text-[#38bdf8]/20"
          style={{ animationDelay: "4.8s" }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="3" y="9" width="18" height="6" rx="1" transform="rotate(-15 12 12)" />
          <path d="M7 10.5v2M10 10v2.5M13 10.5v2M16 10v2.5" transform="rotate(-15 12 12)" strokeLinecap="round" />
        </svg>
        <svg
          className="float-icon absolute top-[45%] left-[3%] h-9 w-9 text-[#38bdf8]/20"
          style={{ animationDelay: "2.4s" }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="13" r="7" strokeLinecap="round" />
          <path d="M12 6c0-1.5.8-2.5 2-3" strokeLinecap="round" />
          <path d="M14 4c.6-.4 1.4-.5 2-.2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="relative w-full max-w-sm rounded-lg border border-[#232d45] bg-[#141b2e] p-7 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#2563eb] text-white">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
              <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.93V20H9a1 1 0 100 2h6a1 1 0 100-2h-2v-2.07A7 7 0 0019 11z" />
            </svg>
          </span>
          <span className="text-sm font-semibold text-[#e7ecf5]">Memoflash</span>
        </div>

        <h1 className="mb-1 text-xl font-bold text-[#e7ecf5]">
          {mode === "signin" ? "Connexion" : "Créer un compte"}
        </h1>
        <p className="mb-6 text-sm text-[#8b97b0]">
          {mode === "signin"
            ? "Connecte-toi pour accéder à tes fiches."
            : "Crée un compte pour commencer à générer tes fiches."}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-[#c3cbdc]">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-[#2a3552] bg-[#0b1120] px-3 py-2 text-sm text-[#e7ecf5] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-[#2a3552] bg-[#0b1120] px-3 py-2 text-sm text-[#e7ecf5] outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/30"
              placeholder="6 caractères minimum"
            />
          </div>

          {errorMessage && (
            <p className="rounded-md border border-red-900/50 bg-red-950/50 px-3 py-2 text-sm text-red-200">
              {errorMessage}
            </p>
          )}
          {infoMessage && (
            <p className="rounded-md border border-emerald-900/50 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-200">
              {infoMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-full bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Chargement..."
              : mode === "signin"
                ? "Se connecter"
                : "Créer mon compte"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setErrorMessage("");
            setInfoMessage("");
          }}
          className="mt-4 w-full text-center text-sm text-[#8b97b0] transition-transform duration-150 hover:text-[#e7ecf5] active:scale-95"
        >
          {mode === "signin"
            ? "Pas encore de compte ? Inscris-toi"
            : "Déjà un compte ? Connecte-toi"}
        </button>
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
