import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PlanId } from "@/lib/billing/plans";

export type CompanyRecord = {
  id: string;
  name: string;
  cnpj: string | null;
  is_active: boolean;
  plan: PlanId | null;
  plan_tier: PlanId | null;
  billing_cycle: string | null;
  current_period_end: string | null;
  subscription_status: string;
};

export type ProfileRecord = {
  id: string;
  name: string | null;
  role: string;
  company_id: string | null;
};

export type AuthContext = {
  user: User;
  profile: ProfileRecord | null;
  company: CompanyRecord | null;
  channelCount: number;
};

type ProfileJoinRow = ProfileRecord & {
  companies:
    | CompanyRecord
    | CompanyRecord[]
    | null;
};

function unwrapCompany(
  relation: ProfileJoinRow["companies"],
): CompanyRecord | null {
  if (!relation) return null;
  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("users")
      .select(
        "id, name, role, company_id, companies:company_id (id, name, cnpj, is_active, plan, plan_tier, billing_cycle, current_period_end, subscription_status)",
      )
      .eq("id", user.id)
      .maybeSingle();

    const row = data as ProfileJoinRow | null;
    const companyId = row?.company_id ?? unwrapCompany(row?.companies ?? null)?.id ?? null;
    let channelCount = 0;
    if (companyId) {
      const { count } = await supabase
        .from("monitored_channels")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);
      channelCount = count ?? 0;
    }

    return {
      user,
      profile: row
        ? {
            id: row.id,
            name: row.name,
            role: row.role,
            company_id: row.company_id,
          }
        : null,
      company: unwrapCompany(row?.companies ?? null),
      channelCount,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Supabase não configurado")
    ) {
      return null;
    }
    throw error;
  }
}

export async function requireUser(): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  return context;
}

export async function requireCompany(): Promise<
  AuthContext & { company: CompanyRecord }
> {
  const context = await requireUser();
  if (!context.company) redirect("/onboarding");
  return { ...context, company: context.company };
}

export function needsOnboarding(context: AuthContext | null) {
  if (!context?.user) return true;
  // Sem empresa ou sem canal: configuração incompleta — login deve retomar /onboarding.
  if (!context.company) return true;
  if (context.channelCount < 1) return true;
  // Sem assinatura/trial ativa ainda precisa concluir o checkout.
  if (!context.company.is_active) return true;
  return false;
}

export function nextAppPath(context: AuthContext | null) {
  if (!context?.user) return "/login";
  if (needsOnboarding(context)) return "/onboarding";
  return "/dashboard";
}
