import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/** Checkout legado Asaas. Use POST /api/checkout/pix. */
export async function POST(_request: NextRequest) {
  return Response.json(
    {
      error: "Este endpoint foi substituído por /api/checkout/pix (Mercado Pago).",
    },
    { status: 410 },
  );
}
