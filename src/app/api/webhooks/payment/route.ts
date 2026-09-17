import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type AsaasWebhookPayload = {
  event?: string;
  payment?: {
    id?: string;
    status?: string;
    customer?: string;
    subscription?: string | null;
    externalReference?: string | null;
  };
  subscription?: {
    id?: string;
    customer?: string;
    status?: string;
    externalReference?: string | null;
  };
};

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function authorize(request: NextRequest) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN?.trim() ?? "";
  if (!expected) {
    return new Response("ASAAS_WEBHOOK_TOKEN não configurado.", { status: 500 });
  }
  const provided = request.headers.get("asaas-access-token")?.trim() ?? "";
  if (!provided || !safeEqual(provided, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

async function findCompanyId(
  supabase: ReturnType<typeof createServiceRoleClient>,
  payload: AsaasWebhookPayload,
) {
  const subscriptionId =
    payload.subscription?.id ?? payload.payment?.subscription ?? null;
  const customerId =
    payload.subscription?.customer ?? payload.payment?.customer ?? null;
  const externalReference =
    payload.subscription?.externalReference ??
    payload.payment?.externalReference ??
    null;

  if (externalReference) {
    const { data } = await supabase
      .from("companies")
      .select("id")
      .eq("id", externalReference)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  if (subscriptionId) {
    const { data } = await supabase
      .from("companies")
      .select("id")
      .eq("asaas_subscription_id", subscriptionId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  if (customerId) {
    const { data } = await supabase
      .from("companies")
      .select("id")
      .eq("asaas_customer_id", customerId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const unauthorized = authorize(request);
  if (unauthorized) return unauthorized;

  const payload = (await request.json().catch(() => ({}))) as AsaasWebhookPayload;
  const event = payload.event ?? "";
  const supabase = createServiceRoleClient();
  const companyId = await findCompanyId(supabase, payload);

  if (!companyId) {
    console.warn("[asaas webhook] empresa não encontrada", { event });
    return Response.json({ ok: true, ignored: true });
  }

  const received = ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"].includes(event);
  const cancelled = [
    "SUBSCRIPTION_DELETED",
    "SUBSCRIPTION_INACTIVATED",
    "SUBSCRIPTION_CANCELLED",
  ].includes(event);
  const overdue = event === "PAYMENT_OVERDUE";

  if (received) {
    await supabase
      .from("companies")
      .update({ is_active: true, subscription_status: "active" })
      .eq("id", companyId);
  } else if (cancelled) {
    await supabase
      .from("companies")
      .update({ is_active: false, subscription_status: "cancelled" })
      .eq("id", companyId);
  } else if (overdue) {
    await supabase
      .from("companies")
      .update({ is_active: false, subscription_status: "past_due" })
      .eq("id", companyId);
  }

  return Response.json({ ok: true, event, companyId });
}
