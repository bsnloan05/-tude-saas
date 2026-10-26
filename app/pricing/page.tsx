"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EmbeddedCheckoutModal from "@/components/EmbeddedCheckoutModal";

type PlanKey = "standard" | "trimestriel" | "lifetime";

interface Feature {
  text: string;
  // Met en évidence ce qui est en plus par rapport au forfait juste en
  // dessous (Pro vs Standard, À vie vs Pro), plutôt que de re-souligner des
  // avantages déjà acquis à un palier inférieur.
  highlighted?: boolean;
}

// Chaque forfait supérieur inclut toujours les fonctionnalités du précédent :
// on part de la base Standard et on ajoute les avantages propres à chaque palier.
const STANDARD_FEATURES: Feature[] = [
  { text: "Transcription vocale en direct" },
  { text: "Historique de tes fiches (Mes fiches)" },
  { text: "Téléchargement et copie en un clic" },
];

const PLANS: Array<{
  key: PlanKey;
  name: string;
  nameColor: string;
  // Prix pendant les 10 premières minutes sur /pricing (voir PRICING_TIMER_MS
  // plus bas) : c'est ce qui est réellement facturé, pas juste affiché, tant
  // que le cookie posé au premier chargement n'a pas 10 minutes.
  price: string;
  // Prix appliqué une fois le minuteur écoulé — redevient le prix affiché ET
  // facturé pour toute nouvelle souscription, de façon permanente (pas un
  // prix promo du premier mois).
  fullPrice: string;
  discountPercent: string;
  period: string;
  // Mis en avant visuellement (gros chiffre) : le prix ramené à la journée,
  // plus parlant qu'un prix mensuel/trimestriel pour donner une impression
  // d'accessibilité. Pour "à vie", pas de calcul (ça n'a pas de sens vu que
  // c'est un paiement unique) : on affiche "0€" tel quel, complété par
  // perDayNote pour rappeler que ça ne coûte plus jamais rien ensuite.
  perDay: string;
  fullPerDay: string;
  // "/jour" par défaut ; "à vie" précise "ensuite" (comme chez trendsaas.ai)
  // pour bien faire comprendre que le 0€ vient après un paiement unique.
  perDayLabel?: string;
  perDayNote?: string;
  quota: string;
  features: Feature[];
  cta: string;
  popular?: boolean;
}> = [
  {
    key: "standard",
    name: "Standard",
    nameColor: "text-[#c3cbdc]",
    price: "11,99€",
    fullPrice: "24€",
    discountPercent: "-50%",
    period: "/mois",
    perDay: "0,40€",
    fullPerDay: "0,80€",
    quota: "Usage illimité",
    features: STANDARD_FEATURES,
    cta: "Passer à Standard",
  },
  {
    key: "trimestriel",
    name: "Pro",
    nameColor: "text-[#38bdf8]",
    price: "29,99€",
    fullPrice: "75€",
    discountPercent: "-60%",
    period: "/3 mois",
    perDay: "0,33€",
    fullPerDay: "0,83€",
    quota: "Usage illimité",
    features: [
      ...STANDARD_FEATURES,
      { text: "Import de PDF", highlighted: true },
      { text: "Import de fichier audio", highlighted: true },
    ],
    cta: "Passer à Pro",
  },
  {
    key: "lifetime",
    name: "À vie",
    nameColor: "text-amber-400",
    price: "59,99€",
    fullPrice: "200€",
    discountPercent: "-70%",
    period: "une fois",
    perDay: "0€",
    fullPerDay: "0€",
    perDayLabel: "/jour, ensuite",
    perDayNote: "Pour toujours, après ton paiement unique.",
    quota: "Usage illimité, pour toujours",
    features: [
      ...STANDARD_FEATURES,
      { text: "Import de PDF" },
      { text: "Import de fichier audio" },
      { text: "Schémas générés par IA", highlighted: true },
    ],
    cta: "Accès à vie",
    popular: true,
  },
];

// Durée pendant laquelle le prix réduit reste affiché ET facturable, à
// partir de la première arrivée sur /pricing (voir le cookie
// "pricing_timer_start", relu aussi côté serveur dans
// /api/create-checkout-session pour que ce soit le prix réellement payé,
// pas juste ce qui est affiché).
const PRICING_TIMER_MS = 10 * 60 * 1000;
const PRICING_TIMER_COOKIE = "pricing_timer_start";

function readPricingTimerStart(): number {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${PRICING_TIMER_COOKIE}=([^;]*)`),
  );
  if (match) {
    const existing = Number(decodeURIComponent(match[1]));
    if (Number.isFinite(existing)) return existing;
  }
  const now = Date.now();
  // 1 an : une fois posé, le cookie ne doit plus jamais redémarrer le
  // minuteur, même si le visiteur revient sur /pricing des jours après.
  document.cookie = `${PRICING_TIMER_COOKIE}=${now}; path=/; max-age=31536000`;
  return now;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const TESTIMONIALS = [
  {
    name: "Eliot",
    quote:
      "Je comprends beaucoup mieux les cours : j'écoute le prof, et en rentrant, je relis directement ma fiche.",
  },
  {
    name: "Chloé",
    quote:
      "Mes cours sont bien mieux structurés grâce à l'option où j'ai accès à toutes mes fiches.",
  },
  {
    name: "Bilel",
    quote: "Je gagne beaucoup de temps dans mes révisions.",
  },
  {
    name: "Dounia",
    quote: "Je comprends beaucoup mieux mes cours.",
  },
  {
    name: "Clara",
    quote: "Mes cours sont beaucoup plus structurés.",
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
  const [fromTranscription, setFromTranscription] = useState(false);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);
  // Initialisé à la durée pleine (pas 0) pour éviter un flash vers le tarif
  // normal avant que l'effet ci-dessous n'ait lu le cookie.
  const [remainingMs, setRemainingMs] = useState(PRICING_TIMER_MS);
  // Un compte déjà payant (abonné ou à vie) ne doit jamais voir le minuteur
  // ni le tarif gonflé — seulement les prix de base, en permanence.
  const [isPaidCustomer, setIsPaidCustomer] = useState(false);

  useEffect(() => {
    // Lu via window.location plutôt que useSearchParams() pour ne pas avoir
    // besoin d'un Suspense boundary : purement cosmétique, pas critique au
    // premier rendu.
    setFromTranscription(
      new URLSearchParams(window.location.search).get("from") === "transcription",
    );
  }, []);

  useEffect(() => {
    const startedAt = readPricingTimerStart();
    const tick = () => {
      setRemainingMs(Math.max(0, PRICING_TIMER_MS - (Date.now() - startedAt)));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // 401 (pas connecté) ou erreur réseau : on laisse simplement
    // isPaidCustomer à false, comme pour un visiteur anonyme classique.
    fetch("/api/usage")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.plan && data.plan !== "free") setIsPaidCustomer(true);
      })
      .catch(() => {});
  }, []);

  const discountActive = !isPaidCustomer && remainingMs > 0;
  // Prix de base (11,99€/29,99€/59,99€) affiché soit pendant le minuteur,
  // soit en permanence pour un client déjà payant ; le tarif gonflé
  // (fullPrice) n'apparaît que pour un visiteur non-payant dont le minuteur
  // est écoulé.
  const showBasePrice = isPaidCustomer || discountActive;

  const handleUpgrade = async (plan: PlanKey) => {
    window.posthog?.capture("checkout_started", { plan });
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
      // Ouvre le paiement dans une fenêtre intégrée sur place plutôt que de
      // rediriger vers checkout.stripe.com : on ne quitte jamais memoflash.io.
      setCheckoutClientSecret(data.clientSecret);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Une erreur est survenue.",
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="isolate relative flex min-h-screen flex-col items-center overflow-hidden bg-[#070a12] px-4 py-6 sm:py-16">
      <div
        aria-hidden
        className="pointer-events-none fixed -right-32 -bottom-32 -z-10 h-[46rem] w-[46rem] rounded-full bg-[#2563eb]/35 blur-[150px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -top-32 -left-32 -z-10 h-[24rem] w-[24rem] rounded-full bg-[#38bdf8]/10 blur-[130px]"
      />

      <div className="mb-4 flex w-full max-w-4xl items-center justify-between sm:mb-10">
        <Link
          href="/"
          className="text-sm font-medium text-[#8b97b0] transition-colors transition-transform duration-150 hover:text-[#e7ecf5] active:scale-95"
        >
          ← Retour
        </Link>
        <span className="text-sm font-semibold text-[#e7ecf5]">Memoflash</span>
      </div>

      <h1 className="mb-1 text-center text-xl font-bold text-[#e7ecf5] sm:mb-2 sm:text-3xl">
        Choisis ton forfait
      </h1>
      <p className="mb-4 text-center text-xs text-[#8b97b0] sm:mb-10 sm:text-base">
        Sans engagement, résiliable à tout moment.
      </p>

      {fromTranscription && (
        <p className="mb-4 rounded-md border border-[#2563eb]/40 bg-[#2563eb]/10 px-3 py-2 text-center text-sm text-[#7dd3fc] sm:mb-6">
          Ton cours est bien enregistré — choisis un forfait pour générer ta fiche, rien n&apos;est perdu.
        </p>
      )}

      {errorMessage && (
        <p className="mb-4 rounded-md border border-red-900/50 bg-red-950/50 px-3 py-2 text-sm text-red-200 sm:mb-6">
          {errorMessage}
        </p>
      )}

      {!isPaidCustomer && (
        <div
          className={`mb-4 flex w-full max-w-4xl items-center justify-between rounded-md border px-4 py-3 sm:mb-6 ${
            discountActive
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-[#232d45] bg-[#0d1424]/60"
          }`}
        >
          {discountActive ? (
            <>
              <span className="flex items-center gap-2 sm:gap-3">
                <span className="text-xl font-extrabold text-emerald-400 sm:text-2xl">
                  {PLANS.find((p) => p.popular)?.discountPercent}
                </span>
                <span className="text-xs text-[#c3cbdc] sm:text-sm">
                  Ta réduction est réservée
                </span>
              </span>
              <span className="font-mono text-lg font-bold text-[#e7ecf5] tabular-nums sm:text-xl">
                {formatCountdown(remainingMs)}
              </span>
            </>
          ) : (
            <span className="text-xs text-[#8b97b0] sm:text-sm">
              Réduction expirée — tarif normal appliqué
            </span>
          )}
        </div>
      )}

      <div className="grid w-full max-w-4xl gap-3 sm:grid-cols-3 sm:gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className={`relative flex flex-col rounded-lg border p-3 backdrop-blur-sm sm:p-6 ${
              plan.popular
                ? "border-[#2563eb] bg-[#0d1424]/60 shadow-[0_0_0_1px_rgba(37,99,235,0.4)]"
                : "border-[#232d45] bg-[#0d1424]/60"
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#2563eb] px-3 py-1 text-xs font-semibold text-white">
                Le plus populaire
              </span>
            )}
            <h2 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase sm:mb-4 sm:text-sm">
              <span
                className={`name-glow inline-block rounded-full px-3 py-1 ${plan.nameColor}`}
              >
                {plan.name}
              </span>
              {discountActive && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 normal-case sm:text-xs">
                  {plan.discountPercent}
                </span>
              )}
            </h2>
            <div className="mb-0.5 flex items-center gap-1.5 text-xs font-semibold text-[#c3cbdc] sm:mb-1 sm:text-base">
              {discountActive && (
                <span className="text-xs font-normal text-[#6b7690] line-through">{plan.fullPrice}</span>
              )}
              <span>
                {showBasePrice ? plan.price : plan.fullPrice} {plan.period}
              </span>
            </div>
            <div className="mb-0.5 flex items-baseline gap-2 sm:mb-1">
              <span className="text-2xl font-bold text-[#e7ecf5] sm:text-4xl">
                {showBasePrice ? plan.perDay : plan.fullPerDay}
              </span>
              <span className="text-xs text-[#8b97b0] sm:text-sm">{plan.perDayLabel ?? "/jour"}</span>
            </div>
            {plan.perDayNote && (
              <p className="mb-0.5 text-xs text-[#6b7690] sm:mb-1">{plan.perDayNote}</p>
            )}
            <p className="mb-1.5 text-xs text-[#8b97b0] sm:mb-3 sm:text-sm">{plan.quota}</p>
            {plan.features && (
              <ul className="mb-3 flex flex-col gap-0.5 sm:mb-6 sm:gap-1.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature.text}
                    className={`flex items-center gap-1.5 rounded-md text-xs sm:text-sm ${
                      feature.highlighted
                        ? "highlight-glow -mx-1.5 px-1.5 py-0.5 font-semibold text-[#7dd3fc]"
                        : "text-[#c3cbdc]"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5 ${
                        feature.highlighted ? "text-[#7dd3fc]" : "text-[#38bdf8]"
                      }`}
                    >
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {feature.text === "Transcription vocale en direct" ? (
                      <strong className="font-black text-white underline decoration-2 underline-offset-2">
                        {feature.text}
                      </strong>
                    ) : (
                      feature.text
                    )}
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => handleUpgrade(plan.key)}
              disabled={loadingPlan !== null}
              className={`mt-auto rounded-full px-4 py-2 text-xs font-semibold text-white transition-colors transition-transform duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2.5 sm:text-sm ${
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

      <div className="mt-6 flex flex-col items-center gap-2 text-xs text-[#6b7690] sm:mt-8 sm:flex-row sm:gap-5">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          Paiement sécurisé par Stripe — aucune donnée bancaire stockée par Memoflash
        </div>
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          Satisfait ou remboursé
        </div>
      </div>

      <div className="mt-12 w-full max-w-4xl border-t border-[#232d45] pt-8 sm:mt-20 sm:pt-12">
        <h2 className="mb-5 text-center text-lg font-bold text-[#e7ecf5] sm:mb-8 sm:text-xl">
          Ce qu&apos;en disent nos étudiants
        </h2>
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="animate-marquee flex w-max gap-4">
            {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
              <div
                key={i}
                className="w-72 shrink-0 rounded-lg border border-[#232d45] bg-[#0d1424]/60 p-5 backdrop-blur-sm"
              >
                <p className="text-sm text-[#c3cbdc]">
                  &laquo;&nbsp;{t.quote}&nbsp;&raquo;
                </p>
                <p className="mt-3 text-sm font-semibold text-[#38bdf8]">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 w-full max-w-2xl border-t border-[#232d45] pt-8 sm:mt-20 sm:pt-12">
        <h2 className="mb-5 text-center text-lg font-bold text-[#e7ecf5] sm:mb-8 sm:text-xl">
          Questions fréquentes
        </h2>
        <div className="flex flex-col gap-4 sm:gap-6">
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

      {checkoutClientSecret && (
        <EmbeddedCheckoutModal
          clientSecret={checkoutClientSecret}
          onClose={() => setCheckoutClientSecret(null)}
        />
      )}
    </div>
  );
}
