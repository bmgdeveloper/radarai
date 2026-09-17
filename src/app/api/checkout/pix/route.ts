import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { activateCompanyFromPayment } from "@/lib/billing/activate";
import {
  CYCLE_LABELS,
  isBillingCycle,
  isPlanTier,
  PLANS,
  type BillingCycle,
  type PlanTier,
} from "@/lib/billing/plans";
import { quotePixAmount } from "@/lib/billing/prorata";
import { testCheckoutOverride } from "@/lib/billing/test-mode";
import { createPixPayment } from "@/services/mercadopago/client";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao iniciar o Pix.";
    return Response.json({ error: message }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    planTier?: string;
    plan?: string;
    billingCycle?: string;
    cycle?: string;
  };

  const requestedTier = body.planTier ?? body.plan;
  const billingCycle = body.billingCycle ?? body.cycle;
  const testCheckout = testCheckoutOverride(user.email);
  const planTier = testCheckout?.planTier ?? requestedTier;
  if (!isPlanTier(planTier) || !isBillingCycle(billingCycle)) {
    return Response.json({ error: "Plano ou ciclo inválido." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.company_id) {
    return Response.json(
      { error: "Conclua o cadastro da empresa antes do pagamento." },
      { status: 400 },
    );
  }

  const [{ data: company }, { count: channelCount }] = await Promise.all([
    supabase
      .from("companies")
      .select(
        "id, name, is_active, plan, plan_tier, billing_cycle, current_period_end, subscription_status",
      )
      .eq("id", profile.company_id)
      .maybeSingle(),
    supabase
      .from("monitored_channels")
      .select("id", { count: "exact", head: true })
      .eq("company_id", profile.company_id),
  ]);

  if (!company) {
    return Response.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  if (planTier === "start" && (channelCount ?? 0) > PLANS.start.maxChannels) {
    return Response.json(
      {
        error:
          "O plano Start permite até 2 canais. Remova canais no onboarding ou escolha o Pro.",
      },
      { status: 400 },
    );
  }

  const currentTier = isPlanTier(company.plan_tier)
    ? company.plan_tier
    : isPlanTier(company.plan)
      ? company.plan
      : null;
  const currentCycle = isBillingCycle(company.billing_cycle)
    ? company.billing_cycle
    : "monthly";

  const quote = quotePixAmount({
    targetTier: planTier,
    targetCycle: billingCycle,
    currentTier,
    currentCycle,
    periodEnd: company.current_period_end,
    isActive: company.is_active,
  });
  const amount = testCheckout?.amount ?? quote.amount;

  const description = `Radar AI ${PLANS[planTier].name} ${CYCLE_LABELS[billingCycle]}`;

  if (amount <= 0) {
    await activateCompanyFromPayment({
      companyId: company.id,
      planTier,
      billingCycle,
    }, supabase);
    const { error: insertError } = await supabase.from("payments").insert({
      company_id: company.id,
      amount: 0,
      status: "approved",
      plan_tier: planTier,
      billing_cycle: billingCycle,
      kind: quote.kind,
      description: `${description} (crédito integral)`,
      paid_at: new Date().toISOString(),
    });
    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 });
    }
    return Response.json({
      ok: true,
      amount: 0,
      credit: quote.credit,
      kind: quote.kind,
      activated: true,
    });
  }

  try {
    const pix = await createPixPayment({
      amount,
      description,
      email: user.email ?? "",
      companyId: company.id,
      planTier,
      billingCycle,
      kind: quote.kind,
      idempotencyKey: randomUUID(),
    });

    const { error: insertError } = await supabase.from("payments").insert({
      company_id: company.id,
      mp_payment_id: pix.id,
      amount,
      status: pix.status === "approved" ? "approved" : "pending",
      plan_tier: planTier,
      billing_cycle: billingCycle,
      kind: quote.kind,
      pix_qr_code: pix.qrCode,
      pix_qr_base64: pix.qrCodeBase64,
      description,
    });
    if (insertError) throw new Error(insertError.message);

    if (pix.status === "approved") {
      await activateCompanyFromPayment({
        companyId: company.id,
        planTier,
        billingCycle,
        mpPaymentId: pix.id,
      }, supabase);
    }

    return Response.json({
      ok: true,
      amount,
      credit: quote.credit,
      kind: quote.kind,
      daysLeft: quote.daysLeft,
      qrCode: pix.qrCode,
      qrCodeBase64: pix.qrCodeBase64,
      paymentId: pix.id,
      activated: pix.status === "approved",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao gerar o Pix.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export type { PlanTier, BillingCycle };
