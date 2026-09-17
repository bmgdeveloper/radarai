import type { NextRequest } from "next/server";
import { cancelCompanyTrial } from "@/lib/billing/activate";
import { cancelMercadoPagoPreapproval } from "@/services/mercadopago/client";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

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

  // create_company define role = owner; admin também pode cancelar
  if (profile.role !== "owner" && profile.role !== "admin") {
    return Response.json(
      { error: "Apenas o responsável pela conta pode cancelar o teste grátis." },
      { status: 403 },
    );
  }

  const admin = createServiceRoleClient();

  const { data: subscription } = await admin
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

  let mpWarning: string | null = null;
  try {
    if (subscription.mp_preapproval_id) {
      await cancelMercadoPagoPreapproval(subscription.mp_preapproval_id);
    }
  } catch (error) {
    mpWarning =
      error instanceof Error
        ? error.message
        : "Falha ao cancelar no Mercado Pago.";
    console.error("[cancel trial] MP", mpWarning);
  }

  try {
    const { error: updateError } = await admin
      .from("subscriptions")
      .update({
        status: "CANCELLED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    if (updateError) throw new Error(updateError.message);

    await cancelCompanyTrial({ companyId: profile.company_id }, admin);

    return Response.json({
      ok: true,
      status: "CANCELLED",
      message:
        "Teste grátis cancelado. Nenhuma cobrança será feita. O teste de 7 dias não pode ser usado novamente com este e-mail e empresa.",
      mpWarning,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao atualizar a assinatura.";
    return Response.json({ error: message }, { status: 500 });
  }
}
