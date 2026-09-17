import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/**
 * Pix desativado para planos com trial de 7 dias.
 * Use POST /api/checkout/card (preapproval + cartão).
 */
export async function POST(_request: NextRequest) {
  return Response.json(
    {
      error:
        "Pix não está disponível para assinaturas com teste grátis. Use o checkout com cartão de crédito.",
      code: "PIX_DISABLED_FOR_TRIAL",
    },
    { status: 410 },
  );
}
