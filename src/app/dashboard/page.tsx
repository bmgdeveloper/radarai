import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { AIInsightBanner } from "@/components/dashboard/AIInsightBanner";
import { CollectNowButton } from "@/components/dashboard/CollectNowButton";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { ExportPdfButton } from "@/components/dashboard/ExportPdfButton";
import { FeedbackTable } from "@/components/dashboard/FeedbackTable";
import { KpiCards } from "@/components/dashboard/KpiCards";
import { requireCompany } from "@/lib/auth/session";
import { loadDashboardData } from "@/lib/dashboard/queries";
import { usedPlatforms } from "@/lib/channels/limits";
import { DASHBOARD_PAGE_SIZE, parseDashboardFilters } from "@/lib/dashboard/types";
import { createClient } from "@/lib/supabase/server";
import { generateConsolidatedInsights } from "@/services/ai/insightsAnalyzer";
import type { ConsolidatedInsights } from "@/services/ai/types";
import type { ChannelPlatform } from "@/services/scrapers/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { company } = await requireCompany();
  const params = await searchParams;
  const filters = parseDashboardFilters(params);

  let setupMessage: string | null = null;
  let platforms: ChannelPlatform[] = [];
  let kpis = {
    averageRating: null as number | null,
    monthCount: 0,
    negativePercent: 0,
    alertCount: 0,
  };
  let feedbacks: Awaited<ReturnType<typeof loadDashboardData>>["feedbacks"] = [];
  let total = 0;
  let page = filters.page;
  let pageSize = DASHBOARD_PAGE_SIZE;
  let insights: ConsolidatedInsights | null = null;

  try {
    const supabase = await createClient();
    const { data: channelRows } = await supabase
      .from("monitored_channels")
      .select("platform")
      .eq("company_id", company.id)
      .eq("is_active", true);
    platforms = usedPlatforms(channelRows ?? []);
    if (filters.platform && !platforms.includes(filters.platform)) {
      filters.platform = undefined;
    }
    const loaded = await loadDashboardData(supabase, filters, company.id);
    kpis = loaded.kpis;
    feedbacks = loaded.feedbacks;
    total = loaded.total;
    page = loaded.page;
    pageSize = loaded.pageSize;
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error ? error.message : "Falha ao carregar o dashboard.";
    setupMessage = message.includes("não configurado")
      ? "Configure o Supabase no .env.local para carregar os feedbacks da empresa."
      : message;
  }

  try {
    insights = await generateConsolidatedInsights(company.id, { timeoutMs: 4000 });
  } catch (error) {
    unstable_rethrow(error);
    console.error("[dashboard] falha ao gerar insights", error);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Análise de reputação, categorias geradas por IA e alertas de insatisfação.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportPdfButton
            companyName={company.name}
            kpis={kpis}
            insights={insights}
            feedbacks={feedbacks}
          />
          <CollectNowButton />
        </div>
      </div>

      {!company.is_active ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Assinatura pendente. A coleta automática é liberada após o cartão com
          teste grátis.{" "}
          <Link href="/dashboard/financial" className="font-medium underline underline-offset-4">
            Ir para o financeiro
          </Link>
        </p>
      ) : null}

      {setupMessage ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {setupMessage}
        </p>
      ) : null}

      {insights ? <AIInsightBanner insights={insights} /> : null}

      <KpiCards kpis={kpis} />
      <DashboardFilters filters={filters} platforms={platforms} />
      <FeedbackTable
        feedbacks={feedbacks}
        filters={filters}
        total={total}
        page={page}
        pageSize={pageSize}
      />
    </main>
  );
}
