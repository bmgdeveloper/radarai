import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/session";
import { channelLimitError } from "@/lib/channels/limits";
import { isPlanTier } from "@/lib/billing/plans";
import {
  appBaseUrl,
  createOAuthState,
  ifoodAuthUrl,
} from "@/lib/integrations/oauth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { company, user } = await requireCompany();
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from("monitored_channels")
      .select("id, platform")
      .eq("company_id", company.id);

    const tier = isPlanTier(company.plan_tier)
      ? company.plan_tier
      : isPlanTier(company.plan)
        ? company.plan
        : "start";
    const limitError = channelLimitError(tier, existing ?? [], "ifood");
    if (limitError) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?error=${encodeURIComponent(limitError)}`,
          appBaseUrl(),
        ),
      );
    }

    const state = createOAuthState({
      companyId: company.id,
      platform: "ifood",
      userId: user.id,
    });
    return NextResponse.redirect(ifoodAuthUrl(state));
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Falha ao iniciar OAuth iFood.";
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?error=${encodeURIComponent(message)}`,
        appBaseUrl(),
      ),
    );
  }
}
