import { createServiceRoleClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeCompanyName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export async function hasUsedTrialClaim(input: {
  email: string;
  companyName: string;
  companyId?: string | null;
  supabase?: SupabaseClient;
}) {
  const supabase = input.supabase ?? createServiceRoleClient();
  const emailNormalized = normalizeEmail(input.email);
  const companyNormalized = normalizeCompanyName(input.companyName);

  if (!emailNormalized || !companyNormalized) {
    return { used: false as const, emailNormalized, companyNormalized };
  }

  const { data: byPair } = await supabase
    .from("trial_claims")
    .select("id")
    .eq("email_normalized", emailNormalized)
    .eq("company_name_normalized", companyNormalized)
    .maybeSingle();

  if (byPair) {
    return { used: true as const, emailNormalized, companyNormalized };
  }

  // Mesma empresa já teve trial (mesmo após cancelamento)
  if (input.companyId) {
    const { data: pastTrial } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("company_id", input.companyId)
      .not("trial_ends_at", "is", null)
      .limit(1)
      .maybeSingle();

    if (pastTrial) {
      return { used: true as const, emailNormalized, companyNormalized };
    }
  }

  return { used: false as const, emailNormalized, companyNormalized };
}

export async function recordTrialClaim(input: {
  email: string;
  companyName: string;
  companyId: string;
  userId: string;
  supabase?: SupabaseClient;
}) {
  const supabase = input.supabase ?? createServiceRoleClient();
  const emailNormalized = normalizeEmail(input.email);
  const companyNormalized = normalizeCompanyName(input.companyName);

  const { error } = await supabase.from("trial_claims").upsert(
    {
      email_normalized: emailNormalized,
      company_name_normalized: companyNormalized,
      company_id: input.companyId,
      user_id: input.userId,
      claimed_at: new Date().toISOString(),
    },
    { onConflict: "email_normalized,company_name_normalized" },
  );

  if (error && !/duplicate|unique/i.test(error.message)) {
    throw new Error(error.message);
  }
}
