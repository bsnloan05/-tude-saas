import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

// Prix mensuels normalisés pour l'estimation du revenu récurrent (le
// forfait Pro est facturé tous les 3 mois, donc divisé par 3 ici).
const MONTHLY_PRICE: Partial<Record<string, number>> = {
  standard: 11.99,
  premium: 0, // forfait legacy, plus vendu, exclu du calcul de revenu
  trimestriel: 29.99 / 3,
};
const LIFETIME_PRICE = 59.99;

function startOfDay(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function startOfWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}
function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
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

  const [{ data: profiles }, { count: fichesTotal }, { count: fichesToday }] =
    await Promise.all([
      admin.from("profiles").select("plan, created_at"),
      admin.from("fiches").select("*", { count: "exact", head: true }),
      admin
        .from("fiches")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfDay()),
    ]);

  const rows = profiles ?? [];
  const totalSignups = rows.length;

  const planCounts = new Map<string, number>();
  for (const row of rows) {
    const plan = row.plan ?? "free";
    planCounts.set(plan, (planCounts.get(plan) ?? 0) + 1);
  }

  const signupsToday = rows.filter((r) => r.created_at >= startOfDay()).length;
  const signupsWeek = rows.filter((r) => r.created_at >= startOfWeek()).length;
  const signupsMonth = rows.filter((r) => r.created_at >= startOfMonth()).length;

  const payingPlans = ["standard", "premium", "trimestriel", "lifetime"];
  const payingCount = payingPlans.reduce((sum, p) => sum + (planCounts.get(p) ?? 0), 0);
  const conversionRate = totalSignups > 0 ? (payingCount / totalSignups) * 100 : 0;

  const mrr = Object.entries(MONTHLY_PRICE).reduce(
    (sum, [plan, price]) => sum + (planCounts.get(plan) ?? 0) * (price ?? 0),
    0,
  );
  const lifetimeRevenue = (planCounts.get("lifetime") ?? 0) * LIFETIME_PRICE;

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
            label="Revenu récurrent / mois"
            value={`${mrr.toFixed(2)}€`}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Inscriptions aujourd'hui" value={signupsToday.toString()} />
          <StatCard label="Inscriptions cette semaine" value={signupsWeek.toString()} />
          <StatCard label="Inscriptions ce mois-ci" value={signupsMonth.toString()} />
          <StatCard label="Revenu à vie encaissé" value={`${lifetimeRevenue.toFixed(2)}€`} />
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

        <p className="mt-6 text-xs text-[#6b7690]">
          Le taux de désabonnement (churn) n&apos;est pas encore suivi dans le
          temps — seul le forfait actuel de chaque compte est connu, pas son
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
