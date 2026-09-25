"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type PlanKey = "standard" | "premium";

const PLANS: Array<{
  key: PlanKey;
  name: string;
  strikePrice?: string;
  price: string;
  quota: string;
  cta: string;
  popular?: boolean;
}> = [
  {
    key: "standard",
    name: "Standard",
    strikePrice: "14,99€",
    price: "11,99€",
    quota: "40h de cours / mois",
    cta: "Passer à Standard",
  },
  {
    key: "premium",
    name: "Premium",
    strikePrice: "19,99€",
    price: "16,99€",
    quota: "75h de cours / mois",
    cta: "Passer à Premium",
    popular: true,
  },
];

const FAQ = [
  {
    question: "Puis-je annuler à tout moment ?",
    answer:
      "Oui, sans engagement. Tu peux annuler ton abonnement quand tu veux depuis ton espace Stripe, il restera actif jusqu'à la fin de la période déjà payée.",
  },
  {
    question: "Mes données et l'audio de mes cours sont-ils sécurisés ?",
    answer:
      "Les paiements passent uniquement par Stripe (jamais tes coordonnées bancaires chez nous), et tes fiches sont liées uniquement à ton compte.",
  },
  {
    question: "Est-ce que ça fonctionne sur téléphone ?",
    answer:
      "Oui, Memoflash fonctionne directement dans le navigateur de ton téléphone, sans rien à installer.",
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleUpgrade = async (plan: PlanKey) => {
    setErrorMessage("");
    setLoadingPlan(plan);
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (response.status === 401) {
        router.push("/login?mode=signup");
        return;
      }

      if (!response.ok) {
        throw new Error("La création du paiement a échoué.");
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Une erreur est survenue.",
      );
      setLoadingPlan(null);
    }
  };

  return (
    <div className="dot-grid isolate relative flex min-h-screen flex-col items-center overflow-hidden bg-[#0b1120] px-4 py-16">
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

      <div className="mb-10 flex w-full max-w-4xl items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium text-[#8b97b0] transition-colors transition-transform duration-150 hover:text-[#e7ecf5] active:scale-95"
        >
          ← Retour
        </Link>
        <span className="text-sm font-semibold text-[#e7ecf5]">Memoflash</span>
      </div>

      <h1 className="mb-2 text-center text-3xl font-bold text-[#e7ecf5]">
        Choisis ton forfait
      </h1>
      <p className="mb-10 text-center text-[#8b97b0]">
        Sans engagement, résiliable à tout moment.
      </p>

      {errorMessage && (
        <p className="mb-6 rounded-md border border-red-900/50 bg-red-950/50 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </p>
      )}

      <div className="grid w-full max-w-2xl gap-6 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className={`relative flex flex-col rounded-lg border p-6 ${
              plan.popular
                ? "border-[#2563eb] bg-[#141b2e] shadow-[0_0_0_1px_rgba(37,99,235,0.4)]"
                : "border-[#232d45] bg-[#141b2e]"
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2563eb] px-3 py-1 text-xs font-semibold text-white">
                Le plus populaire
              </span>
            )}
            <h2 className="mb-4 text-sm font-semibold tracking-wide text-[#8b97b0] uppercase">
              {plan.name}
            </h2>
            <div className="mb-1 flex items-baseline gap-2">
              {plan.strikePrice && (
                <span className="text-lg text-[#8b97b0] line-through">
                  {plan.strikePrice}
                </span>
              )}
              <span className="text-3xl font-bold text-[#e7ecf5]">{plan.price}</span>
              <span className="text-sm text-[#8b97b0]">/mois</span>
            </div>
            <p className="mb-6 text-sm text-[#8b97b0]">{plan.quota}</p>

            <button
              onClick={() => handleUpgrade(plan.key)}
              disabled={loadingPlan !== null}
              className={`mt-auto rounded-full px-4 py-2.5 text-sm font-semibold text-white transition-colors transition-transform duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                plan.popular
                  ? "bg-[#2563eb] hover:bg-[#1d4ed8]"
                  : "bg-[#2a3552] hover:bg-[#33406b]"
              }`}
            >
              {loadingPlan === plan.key ? "Redirection..." : plan.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-[#6b7690]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        Paiement sécurisé par Stripe — aucune donnée bancaire stockée par Memoflash
      </div>

      <div className="mt-20 w-full max-w-2xl border-t border-[#232d45] pt-12">
        <h2 className="mb-8 text-center text-xl font-bold text-[#e7ecf5]">
          Questions fréquentes
        </h2>
        <div className="flex flex-col gap-6">
          {FAQ.map((item) => (
            <div key={item.question}>
              <h3 className="mb-1.5 text-sm font-semibold text-[#e7ecf5]">
                {item.question}
              </h3>
              <p className="text-sm text-[#8b97b0]">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
