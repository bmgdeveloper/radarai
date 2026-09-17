import { isBillingCycle, isPlanTier, type BillingCycle, type PlanTier } from "@/lib/billing/plans";
import { nextPeriodEnd } from "@/lib/billing/prorata";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function activateCompanyFromPayment(
  input: {
    companyId: string;
    planTier: PlanTier;
    billingCycle: BillingCycle;
    mpPaymentId?: string | null;
    paidAt?: Date;
  },
  supabase: SupabaseClient = createServiceRoleClient(),
) {
  const paidAt = input.paidAt ?? new Date();
  const periodEnd = nextPeriodEnd(input.billingCycle, paidAt);

  const { error } = await supabase
    .from("companies")
    .update({
      is_active: true,
      plan: input.planTier,
      plan_tier: input.planTier,
      billing_cycle: input.billingCycle,
      subscription_status: "active",
      current_period_end: periodEnd.toISOString(),
    })
    .eq("id", input.companyId);

  if (error) throw new Error(error.message);

  if (input.mpPaymentId) {
    await supabase
      .from("payments")
      .update({
        status: "approved",
        paid_at: paidAt.toISOString(),
        plan_tier: input.planTier,
        billing_cycle: input.billingCycle,
      })
      .eq("mp_payment_id", input.mpPaymentId);
  }

  return { periodEnd };
}

/** Libera o produto no trial (R$ 0 hoje); 1ª cobrança no 8º dia via preapproval. */
export async function activateCompanyFromTrial(
  input: {
    companyId: string;
    planTier: PlanTier;
    billingCycle: BillingCycle;
    trialEndsAt: Date;
  },
  supabase: SupabaseClient = createServiceRoleClient(),
) {
  const { error } = await supabase
    .from("companies")
    .update({
      is_active: true,
      plan: input.planTier,
      plan_tier: input.planTier,
      billing_cycle: input.billingCycle,
      subscription_status: "trial",
      current_period_end: input.trialEndsAt.toISOString(),
    })
    .eq("id", input.companyId);

  if (error) throw new Error(error.message);
  return { trialEndsAt: input.trialEndsAt };
}

export async function cancelCompanyTrial(
  input: { companyId: string },
  supabase: SupabaseClient = createServiceRoleClient(),
) {
  const { error } = await supabase
    .from("companies")
    .update({
      is_active: false,
      subscription_status: "cancelled",
    })
    .eq("id", input.companyId);

  if (error) throw new Error(error.message);
}

export function parsePlanFromMetadata(metadata: unknown) {
  const record =
    metadata && typeof metadata === "object"
      ? (metadata as Record<string, unknown>)
      : {};
  const planTier = String(record.plan_tier ?? "");
  const billingCycle = String(record.billing_cycle ?? "");
  const companyId = String(record.company_id ?? "");
  return {
    companyId: companyId || null,
    planTier: isPlanTier(planTier) ? planTier : null,
    billingCycle: isBillingCycle(billingCycle) ? billingCycle : null,
  };
}

export function parseExternalReference(ref: string | null | undefined) {
  if (!ref) return { companyId: null, planTier: null, billingCycle: null };
  const [companyId, planTier, billingCycle] = ref.split(":");
  return {
    companyId: companyId || null,
    planTier: isPlanTier(planTier) ? planTier : null,
    billingCycle: isBillingCycle(billingCycle) ? billingCycle : null,
  };
}

export const TRIAL_DAYS = 7;

export function trialEndsAtFrom(now = new Date()) {
  const end = new Date(now);
  end.setDate(end.getDate() + TRIAL_DAYS);
  return end;
}
