import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

// Le serveur (Vercel) tourne en UTC, mais "aujourd'hui" doit correspondre à
// la journée en heure de Paris, pas à la journée UTC (qui ne change pas à
// minuit heure française) — sinon le compteur du jour inclut encore une
// bonne partie de la veille après minuit (ou l'inverse selon l'heure).
function parisOffsetMinutes(date: Date): number {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const paris = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  return (paris.getTime() - utc.getTime()) / 60000;
}

function startOfDayParis(daysAgo = 0): string {
  const now = new Date();
  const offsetMin = parisOffsetMinutes(now);
  const shifted = new Date(now.getTime() + offsetMin * 60000);
  shifted.setUTCDate(shifted.getUTCDate() - daysAgo);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - offsetMin * 60000).toISOString();
}

function startOfMonthParis(): string {
  const now = new Date();
  const offsetMin = parisOffsetMinutes(now);
  const shifted = new Date(now.getTime() + offsetMin * 60000);
  shifted.setUTCDate(1);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - offsetMin * 60000).toISOString();
}

// "en-CA" donne directement un format YYYY-MM-DD, pratique pour regrouper
// les ventes Stripe par jour en heure de Paris (pas en UTC).
function parisDateKey(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
}

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

  const days: { date: string; count: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = parisDateKey(d);
    days.push({ date: key, count: dayCounts.get(key) ?? 0 });
  }

  const todayKey = parisDateKey(new Date());
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

// Revenu à vie réel : somme des paiements uniques (mode "payment", pas
// abonnement) réussis sur Stripe.
async function getRealLifetimeRevenueCents(): Promise<number> {
  const paymentIntents = await stripe.paymentIntents.list({ limit: 100 });
  return paymentIntents.data
    .filter((pi) => pi.status === "succeeded")
    .reduce((sum, pi) => sum + pi.amount_received, 0);
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
    { data: profiles },
    { count: fichesTotal },
    { count: fichesToday },
    mrrCents,
    lifetimeRevenueCents,
    dailySales,
  ] = await Promise.all([
    admin.from("profiles").select("plan, created_at"),
    admin.from("fiches").select("*", { count: "exact", head: true }),
    admin
      .from("fiches")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startOfDayParis()),
    getRealMrrCents(),
    getRealLifetimeRevenueCents(),
    getDailySales(),
  ]);

  const rows = profiles ?? [];
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

  const planOrder = ["free", "standard", "trimestriel", "lifetime", "premium"];

  return (
    <div className="dot-grid min-h-screen bg-[#0b1120] px-4 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-8 text-2xl font-bold text-[#e7ecf5]">Tableau de bord</h1>

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
          <div className="flex items-end gap-1.5">
            {dailySales.days.map((d) => {
              const max = Math.max(1, ...dailySales.days.map((x) => x.count));
              const heightPercent = (d.count / max) * 100;
              const label = new Date(`${d.date}T12:00:00`).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
              });
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
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
        </div>

        <SocialStatsPanel />

        <p className="mt-6 text-xs text-[#6b7690]">
          Revenus lus en direct sur Stripe (abonnements actifs + paiements
          uniques réussis) — limité aux 100 premiers éléments de chaque liste,
          largement suffisant au volume actuel. Le taux de désabonnement
          (churn) n&apos;est pas encore suivi dans le temps — seul le forfait
          actuel de chaque compte est connu, pas son historique.
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
