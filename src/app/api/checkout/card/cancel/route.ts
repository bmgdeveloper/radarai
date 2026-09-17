import type { NextRequest } from "next/server";
import { cancelCompanyTrial } from "@/lib/billing/activate";
import { cancelMercadoPagoPreapproval } from "@/services/mercadopago/client";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(_request: NextRequest) {
  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao cancelar o trial.";
    return Response.json({ error: message }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.company_id) {
    return Response.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  if (profile.role !== "admin") {
    return Response.json(
      { error: "Apenas administradores podem cancelar o trial." },
      { status: 403 },
    );
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, status, mp_preapproval_id")
    .eq("company_id", profile.company_id)
    .eq("status", "TRIAL")
    .maybeSingle();

  if (!subscription) {
    return Response.json(
      { error: "Nenhum teste grátis ativo para cancelar." },
      { status: 404 },
    );
  }

  try {
    if (subscription.mp_preapproval_id) {
      await cancelMercadoPagoPreapproval(subscription.mp_preapproval_id);
    }

    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    if (updateError) throw new Error(updateError.message);

    await cancelCompanyTrial({ companyId: profile.company_id }, supabase);

    return Response.json({ ok: true, status: "CANCELLED" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao cancelar no Mercado Pago.";
    return Response.json({ error: message }, { status: 500 });
  }
}
