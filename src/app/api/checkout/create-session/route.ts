import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/** Checkout legado Asaas / Pix. Use POST /api/checkout/card (trial 7 dias). */
export async function POST(_request: NextRequest) {
  return Response.json(
    {
      error:
        "Este endpoint foi substituído por /api/checkout/card (cartão + trial Mercado Pago).",
    },
    { status: 410 },
  );
}
