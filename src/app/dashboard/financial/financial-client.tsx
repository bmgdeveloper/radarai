"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CardCheckoutDialog } from "@/components/billing/card-checkout-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cycleLabel, planLabel, subscriptionDisplayStatus } from "@/lib/billing/status";
import { daysRemaining } from "@/lib/billing/prorata";
import { formatPlanPrice, isPlanTier, type BillingCycle, type PlanTier } from "@/lib/billing/plans";

type PaymentRow = {
  id: string;
  amount: number;
  status: string;
  plan_tier: string | null;
  billing_cycle: string | null;
  kind: string;
  created_at: string;
  paid_at: string | null;
};

type SubscriptionRow = {
  id: string;
  status: string;
  plan_tier: string;
  billing_cycle: string;
  trial_ends_at: string | null;
  amount: number;
} | null;

export function FinancialClient({
  company,
  payments,
  subscription,
}: {
  company: {
    is_active: boolean;
    plan: string | null;
    plan_tier: string | null;
    billing_cycle: string | null;
    current_period_end: string | null;
    subscription_status: string;
  };
  payments: PaymentRow[];
  subscription: SubscriptionRow;
}) {
  const router = useRouter();
  const [cardOpen, setCardOpen] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelOk, setCancelOk] = useState<string | null>(null);

  const tier: PlanTier = isPlanTier(company.plan_tier)
    ? company.plan_tier
    : isPlanTier(company.plan)
      ? company.plan
      : "start";
  const cycle = (company.billing_cycle as BillingCycle | null) ?? "monthly";
  const display = subscriptionDisplayStatus({
    isActive: company.is_active,
    subscriptionStatus: company.subscription_status,
    periodEnd: company.current_period_end,
  });
  const remaining = daysRemaining(company.current_period_end);
  const dueDate = company.current_period_end
    ? new Date(company.current_period_end).toLocaleDateString("pt-BR")
    : "—";
  const isTrial =
    subscription?.status === "TRIAL" ||
    company.subscription_status?.toLowerCase() === "trial";

  const cta = useMemo(() => {
    if (isTrial) return "Gerenciar teste";
    if (!company.is_active) return "Começar teste grátis";
    if (tier === "start") return "Fazer Upgrade";
    return "Renovar Assinatura";
  }, [company.is_active, isTrial, tier]);

  async function cancelTrial() {
    const confirmed = window.confirm(
      "Cancelar o teste grátis agora? Nenhuma cobrança será feita, e este e-mail + empresa não poderão usar os 7 dias grátis novamente.",
    );
    if (!confirmed) return;

    setCancelPending(true);
    setCancelError(null);
    setCancelOk(null);
    try {
      const response = await fetch("/api/checkout/card/cancel", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Não foi possível cancelar o teste.");
      }
      setCancelOk(
        payload.message ||
          "Teste grátis cancelado. Nenhuma cobrança será feita.",
      );
      router.refresh();
    } catch (cause) {
      setCancelError(
        cause instanceof Error ? cause.message : "Falha ao cancelar o teste.",
      );
    } finally {
      setCancelPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-2xl border border-border/70 bg-card p-5 md:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Plano atual</p>
          <p className="mt-1 text-lg font-semibold">{planLabel(tier)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ciclo</p>
          <p className="mt-1 text-lg font-semibold">{cycleLabel(cycle)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <Badge
            className="mt-2"
            variant={display === "Ativo" || display === "Teste grátis" ? "secondary" : "outline"}
          >
            {display}
          </Badge>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {isTrial ? "Fim do teste" : "Vencimento"}
          </p>
          <p className="mt-1 text-lg font-semibold">{dueDate}</p>
          <p className="text-xs text-muted-foreground">
            {remaining > 0 ? `${remaining} dia(s) restantes` : "Período encerrado"}
          </p>
        </div>
      </section>

      {isTrial ? (
        <section className="grid gap-3 rounded-2xl border border-[#22D3EE]/25 bg-[#0B0F19] p-5 text-white">
          <p className="text-sm font-medium leading-relaxed text-slate-200">
            Você está no teste grátis. A primeira cobrança de{" "}
            {formatPlanPrice(Number(subscription?.amount ?? 0))} acontece no 8º dia.
            Cancele antes disso sem custos.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-[#22D3EE] text-[#0B0F19] hover:bg-[#67E8F9]"
              disabled={cancelPending}
              onClick={cancelTrial}
            >
              {cancelPending ? "Cancelando…" : "Cancelar Teste Grátis"}
            </Button>
          </div>
          {cancelError ? (
            <p className="text-sm text-red-300">{cancelError}</p>
          ) : null}
          {cancelOk ? (
            <p className="text-sm text-emerald-300">{cancelOk}</p>
          ) : null}
        </section>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setCardOpen(true)}>
            {cta}
          </Button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
        <div className="border-b px-4 py-3 text-sm font-medium">
          Histórico de cobranças
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 font-medium">Plano</th>
                <th className="px-4 py-2 font-medium">Valor</th>
                <th className="px-4 py-2 font-medium">Tipo</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                    Nenhuma fatura ainda.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id} className="border-t">
                    <td className="px-4 py-3">
                      {new Date(payment.paid_at ?? payment.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      {planLabel(payment.plan_tier)} · {cycleLabel(payment.billing_cycle)}
                    </td>
                    <td className="px-4 py-3">{formatPlanPrice(Number(payment.amount))}</td>
                    <td className="px-4 py-3 capitalize">{payment.kind}</td>
                    <td className="px-4 py-3">{payment.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CardCheckoutDialog
        open={cardOpen}
        onOpenChange={setCardOpen}
        defaultTier={tier === "start" ? "pro" : tier}
        defaultCycle={cycle}
        title={cta}
      />
    </div>
  );
}
