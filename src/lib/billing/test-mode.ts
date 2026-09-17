import { createServiceRoleClient } from "@/lib/supabase/server";
import type { PlanTier } from "@/lib/billing/plans";

export function isTestBillingBypass() {
  return (
    process.env.ALLOW_SKIP_PAYMENT === "true" ||
    process.env.NODE_ENV !== "production"
  );
}

export function areChannelsLocked(isActive: boolean) {
  return isActive && !isTestBillingBypass();
}

const TEST_PIX_AMOUNT = 0.1;

const TEST_CHECKOUT_ACCOUNTS: Record<string, PlanTier> = {
  "bmgdeveloper@gmail.com": "pro",
  "macedo1987@hotmail.com": "start",
};

export function testCheckoutOverride(email: string | null | undefined): {
  amount: number;
  planTier: PlanTier;
} | null {
  const normalized = (email ?? "").trim().toLowerCase();
  const planTier = TEST_CHECKOUT_ACCOUNTS[normalized];
  if (!planTier) return null;
  return { amount: TEST_PIX_AMOUNT, planTier };
}

export async function ensureTestProCompany<
  T extends { id: string; plan: string | null; plan_tier: string | null },
>(company: T): Promise<T> {
  if (!isTestBillingBypass()) return company;
  if (company.plan === "pro" && company.plan_tier === "pro") return company;

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("companies")
    .update({ plan: "pro", plan_tier: "pro" })
    .eq("id", company.id);
  if (error) return company;
  return { ...company, plan: "pro", plan_tier: "pro" };
}
