import type { NextRequest } from "next/server";
import {
  activateCompanyFromPayment,
  cancelCompanyTrial,
  parseExternalReference,
  parsePlanFromMetadata,
} from "@/lib/billing/activate";
import { isBillingCycle, isPlanTier } from "@/lib/billing/plans";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  getMercadoPagoPayment,
  getMercadoPagoPreapproval,
} from "@/services/mercadopago/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 26;

type MpWebhookBody = {
  action?: string;
  type?: string;
  topic?: string;
  data?: { id?: string | number };
};

function extractId(request: NextRequest, body: MpWebhookBody) {
  const queryId =
    request.nextUrl.searchParams.get("data.id") ??
    request.nextUrl.searchParams.get("id");
  if (body.data?.id) return String(body.data.id);
  if (queryId) return queryId;
  return null;
}

function isPreapprovalEvent(request: NextRequest, body: MpWebhookBody) {
  const type = `${
    body.type ??
    body.topic ??
    request.nextUrl.searchParams.get("type") ??
    request.nextUrl.searchParams.get("topic") ??
    ""
  }`.toLowerCase();
  const action = `${body.action ?? ""}`.toLowerCase();
  return (
    type.includes("subscription_preapproval") ||
    type.includes("preapproval") ||
    action.includes("subscription_preapproval")
  );
}

/** Resposta rápida 200 — o MP marca 5xx (ex.: 503) como notificação com erro. */
function ok(payload: Record<string, unknown> = {}) {
  return Response.json({ ok: true, ...payload }, { status: 200 });
}

export async function GET() {
  return ok({ ping: true });
}

async function handlePreapproval(preapprovalId: string) {
  const preapproval = await getMercadoPagoPreapproval(preapprovalId);
  const supabase = createServiceRoleClient();
  const status = (preapproval.status ?? "").toLowerCase();
  const fromRef = parseExternalReference(preapproval.external_reference);

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, company_id, plan_tier, billing_cycle, status")
    .eq("mp_preapproval_id", String(preapproval.id ?? preapprovalId))
    .maybeSingle();

  const companyId = fromRef.companyId ?? existing?.company_id ?? null;
  const planTier =
    fromRef.planTier ??
    (isPlanTier(existing?.plan_tier) ? existing.plan_tier : null);
  const billingCycle =
    fromRef.billingCycle ??
    (isBillingCycle(existing?.billing_cycle) ? existing.billing_cycle : null);

  if (!existing && !companyId) {
    return { ignored: true as const, preapprovalId };
  }

  if (status === "cancelled" || status === "canceled") {
    if (existing) {
      await supabase
        .from("subscriptions")
        .update({
          status: "CANCELLED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
    if (companyId) {
      await cancelCompanyTrial({ companyId });
    }
    return { preapprovalId, status: "CANCELLED" };
  }

  if (status === "paused") {
    if (existing) {
      await supabase
        .from("subscriptions")
        .update({
          status: "PAUSED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
    if (companyId) {
      await supabase
        .from("companies")
        .update({
          is_active: false,
          subscription_status: "past_due",
        })
        .eq("id", companyId);
    }
    return { preapprovalId, status: "PAUSED" };
  }

  if (status === "authorized" || status === "active") {
    if (existing?.status === "TRIAL") {
      return { preapprovalId, status: existing.status };
    }
    if (existing && planTier && billingCycle) {
      await supabase
        .from("subscriptions")
        .update({
          status: "ACTIVE",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (companyId) {
        await activateCompanyFromPayment({
          companyId,
          planTier,
          billingCycle,
        });
      }
    }
  }

  return { preapprovalId, status };
}

async function handlePayment(paymentId: string, event: string) {
  const payment = await getMercadoPagoPayment(paymentId);
  const status = payment.status ?? "pending";
  const supabase = createServiceRoleClient();
  const meta = parsePlanFromMetadata(payment.metadata);

  const { data: existing } = await supabase
    .from("payments")
    .select("id, company_id, plan_tier, billing_cycle")
    .eq("mp_payment_id", String(payment.id ?? paymentId))
    .maybeSingle();

  const companyId = meta.companyId ?? existing?.company_id ?? null;
  const planTier =
    meta.planTier ??
    (isPlanTier(existing?.plan_tier) ? existing.plan_tier : null);
  const billingCycle =
    meta.billingCycle ??
    (isBillingCycle(existing?.billing_cycle) ? existing.billing_cycle : null);

  if (existing) {
    await supabase
      .from("payments")
      .update({
        status: status === "approved" ? "approved" : status,
        paid_at: status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", existing.id);
  }

  const approved = status === "approved" || event.includes("approved");

  if (approved && companyId && planTier && billingCycle) {
    await activateCompanyFromPayment({
      companyId,
      planTier,
      billingCycle,
      mpPaymentId: String(payment.id ?? paymentId),
    });

    await supabase
      .from("subscriptions")
      .update({
        status: "ACTIVE",
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .in("status", ["TRIAL", "PAST_DUE", "PAUSED"]);
  }

  const failed =
    status === "rejected" ||
    status === "cancelled" ||
    status === "canceled" ||
    status === "refunded";

  if (failed && companyId) {
    await supabase
      .from("subscriptions")
      .update({
        status: "PAST_DUE",
        updated_at: new Date().toISOString(),
      })
      .eq("company_id", companyId)
      .in("status", ["TRIAL", "ACTIVE"]);

    await supabase
      .from("companies")
      .update({
        is_active: false,
        subscription_status: "past_due",
      })
      .eq("id", companyId);
  }

  return {
    paymentId,
    status,
    companyId,
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as MpWebhookBody;
  const event = `${body.action ?? body.type ?? body.topic ?? ""}`.toLowerCase();
  const id = extractId(request, body);

  // Handshake / ping do painel sem id → sempre 200
  if (!id) {
    return ok({ ignored: true, reason: "missing_id" });
  }

  // Sem Access Token no Netlify o MP recebe 5xx e marca "errado"
  if (!process.env.MP_ACCESS_TOKEN?.trim()) {
    console.error("[mercadopago webhook] MP_ACCESS_TOKEN ausente no runtime");
    return ok({
      received: true,
      processed: false,
      error: "MP_ACCESS_TOKEN não configurado no Netlify",
    });
  }

  try {
    if (isPreapprovalEvent(request, body)) {
      const result = await handlePreapproval(id);
      return ok(result);
    }

    const result = await handlePayment(id, event);
    return ok(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha no webhook Mercado Pago.";
    console.error("[mercadopago webhook]", message);
    // 200 evita 503 no painel do MP; o erro fica no log do Netlify
    return ok({
      received: true,
      processed: false,
      error: message,
      id,
    });
  }
}
