import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import {
  activateCompanyFromPayment,
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
import { friendlyMercadoPagoError } from "@/lib/billing/mercadopago-errors";
import {
  hasUsedTrialClaim,
  recordTrialClaim,
} from "@/lib/billing/trial-claims";
import { createCardSubscription } from "@/services/mercadopago/client";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao consultar elegibilidade.";
    return Response.json({ error: message }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.company_id) {
    return Response.json({ trialEligible: true, reason: "no_company" });
  }

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", profile.company_id)
    .maybeSingle();

  if (!company) {
    return Response.json({ trialEligible: true, reason: "no_company" });
  }

  const claim = await hasUsedTrialClaim({
    email: user.email,
    companyName: company.name,
    companyId: company.id,
    supabase: createServiceRoleClient(),
  });

  return Response.json({
    trialEligible: !claim.used,
    companyName: company.name,
  });
}

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
  if (!user.email) {
    return Response.json(
      { error: "Sua conta precisa de um e-mail válido para assinar." },
      { status: 400 },
    );
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

  const planTier = body.planTier ?? body.plan;
  const billingCycle = body.billingCycle ?? body.cycle;

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

  const admin = createServiceRoleClient();

  const [{ data: company }, { count: channelCount }, { data: existingSub }] =
    await Promise.all([
      admin
        .from("companies")
        .select("id, name, is_active, subscription_status")
        .eq("id", profile.company_id)
        .maybeSingle(),
      admin
        .from("monitored_channels")
        .select("id", { count: "exact", head: true })
        .eq("company_id", profile.company_id),
      admin
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

  const claim = await hasUsedTrialClaim({
    email: user.email,
    companyName: company.name,
    companyId: company.id,
    supabase: admin,
  });
  const trialEligible = !claim.used;

  const amount = planPrice(planTier, billingCycle);
  const description = `Radar AI ${PLANS[planTier].name} ${CYCLE_LABELS[billingCycle]}`;
  const startDate = trialEligible ? trialEndsAtFrom() : new Date();

  try {
    const subscription = await createCardSubscription({
      amount,
      description,
      email: user.email,
      cardTokenId: cardToken,
      companyId: company.id,
      planTier,
      billingCycle,
      startDate,
      idempotencyKey: randomUUID(),
    });

    const status = trialEligible ? "TRIAL" : "ACTIVE";
    const { error: insertError } = await admin.from("subscriptions").insert({
      company_id: company.id,
      plan_tier: planTier,
      billing_cycle: billingCycle,
      status,
      trial_ends_at: trialEligible ? startDate.toISOString() : null,
      mp_preapproval_id: subscription.id,
      amount,
      currency: "BRL",
      payer_email: user.email,
      company_name_snapshot: company.name,
      updated_at: new Date().toISOString(),
    });

    if (insertError) throw new Error(insertError.message);

    if (trialEligible) {
      await activateCompanyFromTrial(
        {
          companyId: company.id,
          planTier,
          billingCycle,
          trialEndsAt: startDate,
        },
        admin,
      );
      await recordTrialClaim({
        email: user.email,
        companyName: company.name,
        companyId: company.id,
        userId: user.id,
        supabase: admin,
      });
    } else {
      await activateCompanyFromPayment(
        {
          companyId: company.id,
          planTier,
          billingCycle,
          paidAt: new Date(),
        },
        admin,
      );
      // Garante claim mesmo se veio de path pago (evita trial futuro)
      await recordTrialClaim({
        email: user.email,
        companyName: company.name,
        companyId: company.id,
        userId: user.id,
        supabase: admin,
      });
    }

    return Response.json({
      ok: true,
      status,
      trialEligible,
      planTier,
      billingCycle,
      amount,
      trialEndsAt: trialEligible ? startDate.toISOString() : null,
      preapprovalId: subscription.id,
      activated: true,
      message: trialEligible
        ? "Teste grátis de 7 dias ativado."
        : "Assinatura ativada. Este e-mail e empresa já usaram o teste grátis — a cobrança segue a recorrência do plano.",
    });
  } catch (error) {
    const message = friendlyMercadoPagoError(error);
    const raw = error instanceof Error ? error.message : "";
    const codeMatch = raw.match(/\b(cc_[a-z0-9_]+|\d{3}|e\d{3})\b/i);
    return Response.json(
      {
        error: message,
        code: codeMatch?.[1] ?? undefined,
      },
      { status: 500 },
    );
  }
}

export type { PlanTier, BillingCycle };
