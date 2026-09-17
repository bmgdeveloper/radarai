import { unstable_rethrow } from "next/navigation";
import { CategoryDistributionChart } from "@/components/dashboard/insights/CategoryDistributionChart";
import { CriticalIssuesCard } from "@/components/dashboard/insights/CriticalIssuesCard";
import { RecommendedActionsCard } from "@/components/dashboard/insights/RecommendedActionsCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireCompany } from "@/lib/auth/session";
import { generateConsolidatedInsights } from "@/services/ai/insightsAnalyzer";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const { company } = await requireCompany();

  let errorMessage: string | null = null;
  let insights = await generateConsolidatedInsights(company.id).catch((error) => {
    unstable_rethrow(error);
    errorMessage =
      error instanceof Error
        ? error.message
        : "Falha ao gerar o diagnóstico de IA.";
    return null;
  });

  if (!insights && !errorMessage) {
    errorMessage = "Falha ao gerar o diagnóstico de IA.";
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights de IA</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Diagnóstico consolidado das queixas recentes, com tendências e plano de ação.
        </p>
      </div>

      {errorMessage ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {errorMessage}
        </p>
      ) : null}

      {insights ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Resumo diagnóstico</CardTitle>
              <CardDescription>
                {insights.sample_count
                  ? `${insights.sample_count} feedbacks analisados · origem ${
                      insights.source === "ai" ? "modelo de IA" : "consolidação heurística"
                    }`
                  : "Aguardando volume mínimo de feedbacks"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed sm:text-base">
                {insights.alert_summary}
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Categoria de queixas</CardTitle>
                <CardDescription>
                  Distribuição percentual dos problemas detectados na amostra recente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryDistributionChart data={insights.category_distribution} />
              </CardContent>
            </Card>
            <CriticalIssuesCard issues={insights.critical_issues} />
          </div>

          <RecommendedActionsCard actions={insights.recommended_actions} />
        </>
      ) : null}
    </main>
  );
}
