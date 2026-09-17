import {
  CYCLE_DAYS,
  isBillingCycle,
  isPlanTier,
  planPrice,
  type BillingCycle,
  type PlanTier,
} from "@/lib/billing/plans";

export function daysBetween(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function daysRemaining(periodEnd: string | Date | null | undefined) {
  if (!periodEnd) return 0;
  const end = periodEnd instanceof Date ? periodEnd : new Date(periodEnd);
  return Math.max(0, daysBetween(new Date(), end));
}

export function cycleLength(cycle: BillingCycle | null | undefined) {
  return CYCLE_DAYS[cycle && isBillingCycle(cycle) ? cycle : "monthly"];
}

export function unusedCredit(input: {
  currentTier: PlanTier | null | undefined;
  currentCycle: BillingCycle | null | undefined;
  periodEnd: string | Date | null | undefined;
  isActive: boolean;
}) {
  if (!input.isActive || !isPlanTier(input.currentTier)) return 0;
  const remaining = daysRemaining(input.periodEnd);
  if (remaining <= 0) return 0;
  const total = cycleLength(input.currentCycle);
  const currentPrice = planPrice(
    input.currentTier,
    input.currentCycle && isBillingCycle(input.currentCycle)
      ? input.currentCycle
      : "monthly",
  );
  return remaining * (currentPrice / total);
}

export function quotePixAmount(input: {
  targetTier: PlanTier;
  targetCycle: BillingCycle;
  currentTier: PlanTier | null | undefined;
  currentCycle: BillingCycle | null | undefined;
  periodEnd: string | Date | null | undefined;
  isActive: boolean;
}) {
  const targetAmount = planPrice(input.targetTier, input.targetCycle);
  const isUpgrade =
    input.isActive &&
    isPlanTier(input.currentTier) &&
    input.currentTier === "start" &&
    input.targetTier === "pro";

  const credit = isUpgrade ? unusedCredit(input) : 0;
  const amount = Number(Math.max(targetAmount - credit, 0).toFixed(2));

  return {
    targetAmount,
    credit: Number(credit.toFixed(2)),
    amount,
    kind: (isUpgrade ? "upgrade" : input.isActive ? "renew" : "new") as
      | "upgrade"
      | "renew"
      | "new",
    daysLeft: daysRemaining(input.periodEnd),
  };
}

export function nextPeriodEnd(cycle: BillingCycle, from = new Date()) {
  const end = new Date(from);
  end.setDate(end.getDate() + CYCLE_DAYS[cycle]);
  return end;
}
