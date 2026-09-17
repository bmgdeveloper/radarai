import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { collectAndStoreFeedbacks } from "@/services/ingestion/collectFeedbacks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function extractCronToken(request: NextRequest) {
  const headerToken = request.headers.get("x-cron-secret")?.trim() ?? "";
  if (headerToken) return headerToken;

  const authorization = request.headers.get("authorization")?.trim() ?? "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return "";
}

function authorizeCron(request: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim() ?? "";
  if (!expected) {
    return new Response("CRON_SECRET não configurado.", { status: 500 });
  }

  const provided = extractCronToken(request);
  if (!provided || !safeEqual(provided, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  return null;
}

async function handleCollect(request: NextRequest) {
  const unauthorized = authorizeCron(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await collectAndStoreFeedbacks();
    return Response.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha na coleta de feedbacks.";
    console.error("[collect-feedbacks]", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleCollect(request);
}

export async function POST(request: NextRequest) {
  return handleCollect(request);
}
