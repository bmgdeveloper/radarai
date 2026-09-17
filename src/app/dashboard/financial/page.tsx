import { requireCompany } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FinancialClient } from "./financial-client";

export const dynamic = "force-dynamic";

export default async function FinancialPage() {
  const { company } = await requireCompany();
  const supabase = await createClient();
  const [{ data: payments }, { data: subscription }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount, status, plan_tier, billing_cycle, kind, created_at, paid_at")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("subscriptions")
      .select("id, status, plan_tier, billing_cycle, trial_ends_at, amount")
      .eq("company_id", company.id)
      .in("status", ["TRIAL", "ACTIVE"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financeiro & Assinatura</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Teste grátis de 7 dias no cartão e histórico de cobranças recorrentes.
        </p>
      </div>
      <FinancialClient
        company={company}
        payments={payments ?? []}
        subscription={subscription}
      />
    </main>
  );
}
