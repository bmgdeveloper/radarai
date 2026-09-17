import { daysRemaining } from "@/lib/billing/prorata";
import { CYCLE_LABELS, PLANS, isPlanTier, type BillingCycle } from "@/lib/billing/plans";

export type SubscriptionDisplayStatus =
  | "Ativo"
  | "Teste grátis"
  | "A Vencer"
  | "Suspenso"
  | "Pendente";

export function subscriptionDisplayStatus(input: {
  isActive: boolean;
  subscriptionStatus: string | null | undefined;
  periodEnd: string | Date | null | undefined;
}): SubscriptionDisplayStatus {
  const status = (input.subscriptionStatus ?? "").toLowerCase();
  if (status === "pending" && !input.isActive) return "Pendente";
  if (status === "trial") return "Teste grátis";
  if (
    !input.isActive ||
    status === "suspended" ||
    status === "cancelled" ||
    status === "past_due"
  ) {
    return "Suspenso";
  }
  const remaining = daysRemaining(input.periodEnd);
  if (remaining <= 0) return "Suspenso";
  if (remaining <= 5) return "A Vencer";
  return "Ativo";
}

export function shouldShowRenewalBanner(input: {
  isActive: boolean;
  subscriptionStatus: string | null | undefined;
  periodEnd: string | Date | null | undefined;
}) {
  const display = subscriptionDisplayStatus(input);
  return display === "A Vencer" || display === "Suspenso";
}

export function planLabel(tier: string | null | undefined) {
  return isPlanTier(tier) ? PLANS[tier].name : "Sem plano";
}

export function cycleLabel(cycle: string | null | undefined) {
  if (cycle === "monthly" || cycle === "quarterly") {
    return CYCLE_LABELS[cycle as BillingCycle];
  }
  return "—";
}
