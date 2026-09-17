import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

type WhatsAppStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
};

type WhatsAppInboundMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
};

type WhatsAppChangeValue = {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  statuses?: WhatsAppStatus[];
  messages?: WhatsAppInboundMessage[];
};

type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: WhatsAppChangeValue;
    }>;
  }>;
};

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token") ?? "";
  const challenge = request.nextUrl.searchParams.get("hub.challenge");
  const verifyToken = process.env.META_WA_VERIFY_TOKEN?.trim() ?? "";

  if (!verifyToken) {
    return new Response("META_WA_VERIFY_TOKEN não configurado.", {
      status: 500,
    });
  }

  if (mode === "subscribe" && challenge && safeEqual(token, verifyToken)) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const body = payload as WhatsAppWebhookPayload;

  if (body.object !== "whatsapp_business_account") {
    return new Response("Not Found", { status: 404 });
  }

  const statuses: WhatsAppStatus[] = [];
  const messages: WhatsAppInboundMessage[] = [];

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field && change.field !== "messages") continue;
      statuses.push(...(change.value?.statuses ?? []));
      messages.push(...(change.value?.messages ?? []));
    }
  }

  console.info("[whatsapp webhook]", {
    statuses: statuses.map((item) => ({
      id: item.id,
      status: item.status,
      recipientId: item.recipient_id,
    })),
    messages: messages.map((item) => ({
      id: item.id,
      from: item.from,
      type: item.type,
    })),
  });

  // Estrutura base: a Meta exige 200 rápido.
  // Próximo passo: persistir status de entrega e respostas inbound.
  return Response.json({
    ok: true,
    received: {
      statuses: statuses.length,
      messages: messages.length,
    },
  });
}
