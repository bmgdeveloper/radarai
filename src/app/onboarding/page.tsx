import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/app/onboarding/onboarding-wizard";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isBillingCycle, isPlanTier } from "@/lib/billing/plans";
import { isTestBillingBypass } from "@/lib/billing/test-mode";
import type { ChannelPlatform } from "@/services/scrapers/types";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; cycle?: string }>;
}) {
  const context = await requireUser();
  const supabase = await createClient();
  const { plan, cycle } = await searchParams;

  let channels: Array<{
    id: string;
    platform: ChannelPlatform;
    url_or_app_id: string;
  }> = [];
  let whatsappNumber: string | null = null;

  if (context.company) {
    const [{ data: channelRows }, { data: alerts }] = await Promise.all([
      supabase
        .from("monitored_channels")
        .select("id, platform, url_or_app_id")
        .eq("company_id", context.company.id),
      supabase
        .from("alert_settings")
        .select("whatsapp_number")
        .eq("company_id", context.company.id)
        .maybeSingle(),
    ]);
    channels = (channelRows ?? []) as typeof channels;
    whatsappNumber = alerts?.whatsapp_number ?? null;

    if (
      context.company.is_active &&
      channels.length > 0 &&
      whatsappNumber
    ) {
      redirect("/dashboard");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Configure o monitoramento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Quatro passos para começar a receber alertas no WhatsApp. Você pode sair e
          voltar depois — o progresso fica salvo na sua conta.
        </p>
      </div>
      <OnboardingWizard
        company={context.company}
        channels={channels}
        whatsappNumber={whatsappNumber}
        initialPlan={isPlanTier(plan) ? plan : context.company?.plan_tier ?? context.company?.plan ?? undefined}
        initialCycle={isBillingCycle(cycle) ? cycle : context.company?.billing_cycle ?? undefined}
        allowSkipPayment={isTestBillingBypass()}
      />
    </main>
  );
}
