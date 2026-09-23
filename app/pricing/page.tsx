"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type PlanKey = "standard" | "premium";

const PLANS: Array<{
  key: PlanKey | "free";
  name: string;
  strikePrice?: string;
  price: string;
  quota: string;
  cta?: string;
}> = [
  { key: "free", name: "Gratuit", price: "0$", quota: "2h de cours / mois" },
  {
    key: "standard",
    name: "Standard",
    strikePrice: "14,99$",
    price: "11,99$",
    quota: "40h de cours / mois",
    cta: "Passer à Standard",
  },
  {
    key: "premium",
    name: "Premium",
    strikePrice: "19,99$",
    price: "16,99$",
    quota: "75h de cours / mois",
    cta: "Passer à Premium",
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
    <div className="dot-grid isolate flex min-h-screen flex-col items-center bg-[#0b1120] px-4 py-16">
      <div className="mb-10 flex w-full max-w-4xl items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium text-[#8b97b0] transition-colors hover:text-[#e7ecf5]"
        >
          ← Retour
        </Link>
        <span className="text-sm font-semibold text-[#e7ecf5]">Elyo</span>
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

      <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className="flex flex-col rounded-lg border border-[#232d45] bg-[#141b2e] p-6"
          >
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
              {plan.key !== "free" && (
                <span className="text-sm text-[#8b97b0]">/mois</span>
              )}
            </div>
            <p className="mb-6 text-sm text-[#8b97b0]">{plan.quota}</p>

            {plan.key === "free" ? (
              <span className="mt-auto rounded-full border border-[#2a3552] px-4 py-2 text-center text-sm font-medium text-[#8b97b0]">
                Forfait actuel par défaut
              </span>
            ) : (
              <button
                onClick={() => handleUpgrade(plan.key as PlanKey)}
                disabled={loadingPlan !== null}
                className="mt-auto rounded-full bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white transition-colors transition-transform duration-150 hover:bg-[#1d4ed8] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingPlan === plan.key ? "Redirection..." : plan.cta}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
