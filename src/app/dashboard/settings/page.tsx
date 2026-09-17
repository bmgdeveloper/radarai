import { requireCompany } from "@/lib/auth/session";
import { isPlanTier } from "@/lib/billing/plans";
import { areChannelsLocked, isTestBillingBypass } from "@/lib/billing/test-mode";
import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";
import type { ChannelPlatform } from "@/services/scrapers/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { company } = await requireCompany();
  const supabase = await createClient();

  const [{ data: channels }, { data: alerts }] = await Promise.all([
    supabase
      .from("monitored_channels")
      .select("id, platform, url_or_app_id, is_active")
      .eq("company_id", company.id)
      .order("platform"),
    supabase
      .from("alert_settings")
      .select("whatsapp_number, min_rating_trigger")
      .eq("company_id", company.id)
      .maybeSingle(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fontes monitoradas e número que recebe os alertas do Radar AI.
        </p>
      </div>
      <SettingsClient
        channels={(channels ?? []) as Array<{
          id: string;
          platform: ChannelPlatform;
          url_or_app_id: string;
          is_active: boolean;
        }>}
        whatsappNumber={alerts?.whatsapp_number ?? null}
        minRatingTrigger={alerts?.min_rating_trigger ?? 2}
        canManageChannels={!areChannelsLocked(company.is_active)}
        planTier={
          isTestBillingBypass()
            ? "pro"
            : isPlanTier(company.plan_tier)
              ? company.plan_tier
              : isPlanTier(company.plan)
                ? company.plan
                : "start"
        }
      />
    </main>
  );
}
