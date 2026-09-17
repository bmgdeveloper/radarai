import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import {
  activateCompanyFromTrial,
  trialEndsAtFrom,
} from "@/lib/billing/activate";
import {
  CYCLE_LABELS,
  isBillingCycle,
  isPlanTier,
  planPrice,
  PLANS,
  type BillingCycle,
  type PlanTier,
} from "@/lib/billing/plans";
import { testCheckoutOverride } from "@/lib/billing/test-mode";
import { createCardSubscription } from "@/services/mercadopago/client";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao iniciar o checkout.";
    return Response.json({ error: message }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    cardToken?: string;
    planTier?: string;
    plan?: string;
    billingCycle?: string;
    cycle?: string;
  };

  const cardToken = body.cardToken?.trim();
  if (!cardToken) {
    return Response.json({ error: "Token do cartão ausente." }, { status: 400 });
  }

  const requestedTier = body.planTier ?? body.plan;
  const billingCycle = (body.billingCycle ?? body.cycle) as string | undefined;
  const testCheckout = testCheckoutOverride(user.email);
  const planTier = (testCheckout?.planTier ?? requestedTier) as string | undefined;

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

  const [{ data: company }, { count: channelCount }, { data: existingSub }] =
    await Promise.all([
      supabase
        .from("companies")
        .select("id, name, is_active, subscription_status")
        .eq("id", profile.company_id)
        .maybeSingle(),
      supabase
        .from("monitored_channels")
        .select("id", { count: "exact", head: true })
        .eq("company_id", profile.company_id),
      supabase
        .from("subscriptions")
        .select("id, status")
        .eq("company_id", profile.company_id)
        .in("status", ["TRIAL", "ACTIVE"])
        .maybeSingle(),
    ]);

  if (!company) {
    return Response.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  if (existingSub) {
    return Response.json(
      { error: "Já existe uma assinatura ativa ou em teste para esta empresa." },
      { status: 409 },
    );
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

  const amount = testCheckout?.amount ?? planPrice(planTier, billingCycle);
  const description = `Radar AI ${PLANS[planTier].name} ${CYCLE_LABELS[billingCycle]}`;
  const trialEndsAt = trialEndsAtFrom();

  try {
    const subscription = await createCardSubscription({
      amount,
      description,
      email: user.email ?? "",
      cardTokenId: cardToken,
      companyId: company.id,
      planTier,
      billingCycle,
      startDate: trialEndsAt,
      idempotencyKey: randomUUID(),
    });

    const { error: insertError } = await supabase.from("subscriptions").insert({
      company_id: company.id,
      plan_tier: planTier,
      billing_cycle: billingCycle,
      status: "TRIAL",
      trial_ends_at: trialEndsAt.toISOString(),
      mp_preapproval_id: subscription.id,
      amount,
      currency: "BRL",
      updated_at: new Date().toISOString(),
    });

    if (insertError) throw new Error(insertError.message);

    await activateCompanyFromTrial(
      {
        companyId: company.id,
        planTier,
        billingCycle,
        trialEndsAt,
      },
      supabase,
    );

    return Response.json({
      ok: true,
      status: "TRIAL",
      planTier,
      billingCycle,
      amount,
      trialEndsAt: trialEndsAt.toISOString(),
      preapprovalId: subscription.id,
      activated: true,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao criar assinatura com cartão.";
    return Response.json({ error: message }, { status: 500 });
  }
}

export type { PlanTier, BillingCycle };
