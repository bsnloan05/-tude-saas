export type PlanId = "free" | "standard" | "premium";

// Quotas mensuels par forfait, en secondes.
export const PLAN_QUOTA_SECONDS: Record<PlanId, number> = {
  free: 2 * 3600,
  standard: 40 * 3600,
  premium: 75 * 3600,
};

export function getQuotaSeconds(plan: string | null | undefined): number {
  return PLAN_QUOTA_SECONDS[plan as PlanId] ?? PLAN_QUOTA_SECONDS.free;
}
