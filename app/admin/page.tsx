import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startOfDayParis, startOfMonthParis } from "@/lib/parisDate";
import SocialStatsPanel from "./SocialStatsPanel";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Seul le propriétaire du SaaS voit ce tableau de bord : pas de système de
// rôles complexe nécessaire pour un produit avec un seul administrateur.
const OWNER_EMAIL = "bsn.loan05@gmail.com";

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuit",
  standard: "Standard",
  premium: "Premium",
  trimestriel: "Pro",
  lifetime: "À vie",
};

// "en-CA" donne directement un format YYYY-MM-DD, pratique pour regrouper
// les ventes Stripe par jour en heure de Paris (pas en UTC).
function parisDateKey(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
}

// Première vente connue : le graphique part de ce jour-là plutôt que de
// glisser sur une fenêtre de X jours, pour toujours voir tout l'historique
// depuis le début.
const SALES_START_DATE = "2026-09-23";

// Nombre de ventes par jour : une "vente" = une session Stripe Checkout
// payée (abonnement ou paiement unique confondus), regroupée par jour réel
// (heure de Paris). Limité aux 100 dernières sessions, largement suffisant
// au volume actuel.
async function getDailySales(): Promise<{
  today: number;
  days: { date: string; count: number }[];
}> {
  const sessions = await stripe.checkout.sessions.list({ limit: 100 });
  const paid = sessions.data.filter((s) => s.payment_status === "paid");

  const dayCounts = new Map<string, number>();
  for (const session of paid) {
    const key = parisDateKey(new Date(session.created * 1000));
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }

  const todayKey = parisDateKey(new Date());
  const days: { date: string; count: number }[] = [];
  const cursor = new Date(`${SALES_START_DATE}T12:00:00Z`);
  const end = new Date(`${todayKey}T12:00:00Z`);
  while (cursor.getTime() <= end.getTime()) {
    const key = parisDateKey(cursor);
    days.push({ date: key, count: dayCounts.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { today: dayCounts.get(todayKey) ?? 0, days };
}

// Revenu récurrent mensuel réel : lit les abonnements actifs directement
// sur Stripe (vrai prix payé par chaque client, pas une estimation basée
// sur le prix affiché aujourd'hui) et normalise tout en équivalent mensuel.
async function getRealMrrCents(): Promise<number> {
  const subscriptions = await stripe.subscriptions.list({
    status: "active",
    limit: 100,
  });

  let mrrCents = 0;
  for (const sub of subscriptions.data) {
    for (const item of sub.items.data) {
      const amount = item.price.unit_amount ?? 0;
      const quantity = item.quantity ?? 1;
      const interval = item.price.recurring?.interval;
      const intervalCount = item.price.recurring?.interval_count ?? 1;
      const total = amount * quantity;

      if (interval === "month") mrrCents += total / intervalCount;
      else if (interval === "year") mrrCents += total / (intervalCount * 12);
      else if (interval === "week") mrrCents += (total * 52) / (12 * intervalCount);
      else if (interval === "day") mrrCents += (total * 365) / (12 * intervalCount);
    }
  }
  return mrrCents;
}

// Tous les paiements réussis sur Stripe (abonnements ET paiements uniques
// confondus), récupérés une seule fois et réutilisés pour plusieurs
// statistiques ci-dessous.
async function getSucceededPaymentIntents(): Promise<Stripe.PaymentIntent[]> {
  const paymentIntents = await stripe.paymentIntents.list({ limit: 100 });
  return paymentIntents.data.filter((pi) => pi.status === "succeeded");
}

// Identifiants des paiements liés à une facture d'abonnement (le lien n'est
// plus un simple champ "invoice" sur le paiement depuis les versions
// récentes de l'API Stripe : il faut passer par invoice.payments).
async function getInvoicePaymentIntentIds(): Promise<Set<string>> {
  const invoices = await stripe.invoices.list({
    limit: 100,
    expand: ["data.payments"],
  });

  const ids = new Set<string>();
  for (const invoice of invoices.data) {
    for (const invoicePayment of invoice.payments?.data ?? []) {
      const payment = invoicePayment.payment;
      if (payment.type === "payment_intent" && payment.payment_intent) {
        const pi = payment.payment_intent;
        ids.add(typeof pi === "string" ? pi : pi.id);
      }
    }
  }
  return ids;
}

// Revenu à vie réel : uniquement les paiements uniques (mode "payment",
// forfait "À vie"), pas les paiements automatiques d'abonnement — ceux-là
// sont déjà reflétés dans le revenu récurrent mensuel (MRR).
function getLifetimeRevenueCents(
  succeeded: Stripe.PaymentIntent[],
  invoicePaymentIntentIds: Set<string>,
): number {
  return succeeded
    .filter((pi) => !invoicePaymentIntentIds.has(pi.id))
    .reduce((sum, pi) => sum + pi.amount_received, 0);
}

// Chiffre d'affaires total réel : tout ce qui a été encaissé depuis le
// début (abonnements + paiements uniques confondus), contrairement au
// "Revenu à vie" qui exclut volontairement les abonnements.
function getTotalRevenueCents(succeeded: Stripe.PaymentIntent[]): number {
  return succeeded.reduce((sum, pi) => sum + pi.amount_received, 0);
}

// Panier moyen réel : montant moyen par paiement réussi (abonnement ou
// unique confondus), pas une estimation basée sur les prix affichés.
function getAverageOrderValueCents(succeeded: Stripe.PaymentIntent[]): number {
  if (succeeded.length === 0) return 0;
  const total = succeeded.reduce((sum, pi) => sum + pi.amount_received, 0);
  return total / succeeded.length;
}

// LTV à date : total encaissé jusqu'ici divisé par le nombre de clients
// distincts — pas une projection, juste ce que chaque client a vraiment
// rapporté en moyenne jusqu'à maintenant. Un paiement sans client Stripe
// associé (voir le correctif sur les paiements "À vie") compte comme son
// propre client plutôt que d'être ignoré.
function getLtvToDateCents(succeeded: Stripe.PaymentIntent[]): number {
  if (succeeded.length === 0) return 0;
  const totalsByCustomer = new Map<string, number>();
  for (const pi of succeeded) {
    const key = (pi.customer as string | null) ?? pi.id;
    totalsByCustomer.set(key, (totalsByCustomer.get(key) ?? 0) + pi.amount_received);
  }
  const total = [...totalsByCustomer.values()].reduce((sum, v) => sum + v, 0);
  return total / totalsByCustomer.size;
}

// Supabase limite chaque requête à 1000 lignes par défaut : au-delà de 1000
// comptes, un simple .select() tronquait silencieusement le résultat, ce qui
// figeait "Comptes totaux" et les compteurs d'inscriptions une fois ce cap
// atteint. On va donc chercher toutes les pages, quelle que soit la taille.
async function fetchAllProfiles(
  admin: ReturnType<typeof createAdminClient>,
): Promise<{ id: string; plan: string | null; created_at: string }[]> {
  const pageSize = 1000;
  const all: { id: string; plan: string | null; created_at: string }[] = [];
  let from = 0;

  while (true) {
    const { data } = await admin
      .from("profiles")
      .select("id, plan, created_at")
      .range(from, from + pageSize - 1);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return all;
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== OWNER_EMAIL) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b1120] px-4 text-center">
        <p className="text-sm text-[#8b97b0]">Accès refusé.</p>
      </div>
    );
  }

  const admin = createAdminClient();

  const [
    profiles,
    { count: fichesTotal },
    { count: fichesToday },
    mrrCents,
    succeededPaymentIntents,
    invoicePaymentIntentIds,
    dailySales,
  ] = await Promise.all([
    fetchAllProfiles(admin),
    admin.from("fiches").select("*", { count: "exact", head: true }),
    admin
      .from("fiches")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDayParis()),
    getRealMrrCents(),
    getSucceededPaymentIntents(),
    getInvoicePaymentIntentIds(),
    getDailySales(),
  ]);

  const lifetimeRevenueCents = getLifetimeRevenueCents(
    succeededPaymentIntents,
    invoicePaymentIntentIds,
  );
  const totalRevenueCents = getTotalRevenueCents(succeededPaymentIntents);
  const averageOrderValueCents = getAverageOrderValueCents(succeededPaymentIntents);
  const ltvToDateCents = getLtvToDateCents(succeededPaymentIntents);

  // Le compte du propriétaire (toi) peut avoir un forfait payant sans jamais
  // être passé par Stripe (accès donné manuellement) : l'exclure de toutes
  // les statistiques, sinon il se compte lui-même comme un vrai client.
  const rows = profiles.filter((row) => row.id !== user.id);
  const totalSignups = rows.length;

  const planCounts = new Map<string, number>();
  for (const row of rows) {
    const plan = row.plan ?? "free";
    planCounts.set(plan, (planCounts.get(plan) ?? 0) + 1);
  }

  const todayStart = startOfDayParis();
  const weekStart = startOfDayParis(7);
  const monthStart = startOfMonthParis();

  const signupsToday = rows.filter((r) => r.created_at >= todayStart).length;
  const signupsWeek = rows.filter((r) => r.created_at >= weekStart).length;
  const signupsMonth = rows.filter((r) => r.created_at >= monthStart).length;

  const payingPlans = ["standard", "premium", "trimestriel", "lifetime"];
  const payingCount = payingPlans.reduce((sum, p) => sum + (planCounts.get(p) ?? 0), 0);
  const conversionRate = totalSignups > 0 ? (payingCount / totalSignups) * 100 : 0;

  const mrr = mrrCents / 100;
  const lifetimeRevenue = lifetimeRevenueCents / 100;
  const totalRevenue = totalRevenueCents / 100;
  const averageOrderValue = averageOrderValueCents / 100;
  const ltvToDate = ltvToDateCents / 100;

  const planOrder = ["free", "standard", "trimestriel", "lifetime", "premium"];

  return (
    <div className="dot-grid min-h-screen bg-[#0b1120] px-4 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-8 text-2xl font-bold text-[#e7ecf5]">Tableau de bord</h1>

        <div className="mb-4 rounded-lg border border-[#2563eb]/40 bg-[#2563eb]/10 p-6 text-center">
          <p className="text-xs font-semibold tracking-wide text-[#7dd3fc] uppercase">
            Chiffre d&apos;affaires total encaissé (Stripe)
          </p>
          <p className="mt-2 text-4xl font-bold text-[#e7ecf5]">
            {totalRevenue.toFixed(2)}€
          </p>
          <p className="mt-1 text-xs text-[#8b97b0]">
            Abonnements + paiements uniques (&quot;À vie&quot;) confondus, depuis le début
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Comptes totaux" value={totalSignups.toString()} />
          <StatCard label="Clients payants" value={payingCount.toString()} />
          <StatCard
            label="Taux de conversion"
            value={`${conversionRate.toFixed(2)}%`}
          />
          <StatCard
            label="Revenu récurrent / mois (Stripe)"
            value={`${mrr.toFixed(2)}€`}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Inscriptions aujourd'hui" value={signupsToday.toString()} />
          <StatCard label="Inscriptions cette semaine" value={signupsWeek.toString()} />
          <StatCard label="Inscriptions ce mois-ci" value={signupsMonth.toString()} />
          <StatCard
            label="Revenu à vie encaissé (Stripe)"
            value={`${lifetimeRevenue.toFixed(2)}€`}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Panier moyen" value={`${averageOrderValue.toFixed(2)}€`} />
          <StatCard label="LTV à date (par client)" value={`${ltvToDate.toFixed(2)}€`} />
        </div>

        <div className="mt-8 rounded-lg border border-[#232d45] bg-[#141b2e] p-6">
          <h2 className="mb-4 text-xs font-semibold tracking-wide text-[#8b97b0] uppercase">
            Répartition par forfait
          </h2>
          <div className="flex flex-col gap-3">
            {planOrder.map((plan) => {
              const count = planCounts.get(plan) ?? 0;
              const percent = totalSignups > 0 ? (count / totalSignups) * 100 : 0;
              return (
                <div key={plan}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-[#c3cbdc]">{PLAN_LABELS[plan] ?? plan}</span>
                    <span className="text-[#8b97b0]">
                      {count} ({percent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#232d45]">
                    <div
                      className="h-full rounded-full bg-[#38bdf8]"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-[#232d45] bg-[#141b2e] p-6">
          <h2 className="mb-4 text-xs font-semibold tracking-wide text-[#8b97b0] uppercase">
            Fiches générées
          </h2>
          <div className="flex gap-8">
            <div>
              <p className="text-2xl font-bold text-[#e7ecf5]">{fichesTotal ?? 0}</p>
              <p className="text-xs text-[#8b97b0]">au total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#e7ecf5]">{fichesToday ?? 0}</p>
              <p className="text-xs text-[#8b97b0]">aujourd&apos;hui</p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-[#232d45] bg-[#141b2e] p-6">
          <h2 className="mb-4 text-xs font-semibold tracking-wide text-[#8b97b0] uppercase">
            Ventes par jour (Stripe)
          </h2>
          <p className="mb-4 text-2xl font-bold text-[#e7ecf5]">
            {dailySales.today}{" "}
            <span className="text-xs font-normal text-[#8b97b0]">aujourd&apos;hui</span>
          </p>
          {(() => {
            const max = Math.max(1, ...dailySales.days.map((x) => x.count));
            return (
              <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
                {dailySales.days.map((d) => {
                  const heightPercent = (d.count / max) * 100;
                  const label = new Date(`${d.date}T12:00:00`).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                  });
                  return (
                    <div key={d.date} className="flex w-6 flex-shrink-0 flex-col items-center gap-1">
                      <div className="flex h-16 w-full items-end">
                        <div
                          className="w-full rounded-sm bg-[#38bdf8]"
                          style={{ height: `${Math.max(heightPercent, d.count > 0 ? 8 : 2)}%` }}
                          title={`${label} : ${d.count} vente(s)`}
                        />
                      </div>
                      <span className="text-[9px] text-[#6b7690]">{label}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        <SocialStatsPanel />

        <p className="mt-6 text-xs text-[#6b7690]">
          Revenus lus en direct sur Stripe (abonnements actifs + paiements
          uniques réussis) — limité aux 100 premiers éléments de chaque liste,
          largement suffisant au volume actuel. La LTV est calculée sur
          l&apos;argent déjà encaissé à ce jour (pas une projection). Le taux
          de désabonnement (churn) n&apos;est pas encore suivi dans le temps —
          seul le forfait actuel de chaque compte est connu, pas son
          historique.
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#232d45] bg-[#141b2e] p-4">
      <p className="text-xs text-[#8b97b0]">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#e7ecf5]">{value}</p>
    </div>
  );
}
