import { NextResponse, type NextRequest } from "next/server";
import {
  appBaseUrl,
  exchangeMercadoLivreCode,
  parseOAuthState,
} from "@/lib/integrations/oauth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const settingsUrl = new URL("/dashboard/settings", appBaseUrl());
  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    if (!code || !state) {
      settingsUrl.searchParams.set("error", "Autorização Mercado Livre incompleta.");
      return NextResponse.redirect(settingsUrl);
    }

    const parsed = parseOAuthState(state);
    if (!parsed || parsed.platform !== "mercadolivre") {
      settingsUrl.searchParams.set("error", "Estado OAuth inválido ou expirado.");
      return NextResponse.redirect(settingsUrl);
    }

    const tokens = await exchangeMercadoLivreCode(code);
    const supabase = createServiceRoleClient();
    const label = tokens.merchantId
      ? `meli:${tokens.merchantId}`
      : "meli:connected";

    const { error } = await supabase.from("monitored_channels").upsert(
      {
        company_id: parsed.companyId,
        platform: "mercadolivre",
        url_or_app_id: label,
        is_active: true,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        merchant_id: tokens.merchantId,
        auth_type: "oauth",
      },
      { onConflict: "company_id,platform" },
    );
    if (error) {
      settingsUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(settingsUrl);
    }

    settingsUrl.searchParams.set(
      "message",
      "Conta Mercado Livre conectada com sucesso.",
    );
    return NextResponse.redirect(settingsUrl);
  } catch (cause) {
    settingsUrl.searchParams.set(
      "error",
      cause instanceof Error ? cause.message : "Falha no callback Mercado Livre.",
    );
    return NextResponse.redirect(settingsUrl);
  }
}
