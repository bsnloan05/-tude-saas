export type PlanId = "free" | "standard" | "premium" | "lifetime";

// Quotas mensuels par forfait, en secondes. `null` = usage illimité.
// "premium" est conservé uniquement pour la cliente existante sur ce forfait
// (plus proposé à l'achat) tant qu'elle n'est pas basculée manuellement sur
// Standard à son renouvellement.
export const PLAN_QUOTA_SECONDS: Record<PlanId, number | null> = {
  free: 0,
  standard: null,
  premium: 75 * 3600,
  lifetime: null,
};

export function getQuotaSeconds(plan: string | null | undefined): number | null {
  if (plan && plan in PLAN_QUOTA_SECONDS) {
    return PLAN_QUOTA_SECONDS[plan as PlanId];
  }
  return PLAN_QUOTA_SECONDS.free;
}
