import Link from "next/link";
import { BrainCircuit, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { primaryCriticalIssue } from "@/services/ai/insightsAnalyzer";
import type { ConsolidatedInsights } from "@/services/ai/types";

const SEVERITY_LABEL: Record<string, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

export function AIInsightBanner({ insights }: { insights: ConsolidatedInsights }) {
  const topIssue = primaryCriticalIssue(insights);
  const empty = insights.sample_count === 0;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-[#0B0F19] via-[#0f2744] to-[#083344] p-5 text-slate-100 shadow-sm sm:p-6">
      <div className="pointer-events-none absolute -top-16 -right-10 size-44 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-300/30">
            <BrainCircuit className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-cyan-300 uppercase">
              <Sparkles className="size-3.5" />
              Diagnóstico de IA
            </p>
            <p className="mt-2 text-base leading-relaxed text-slate-100 sm:text-lg">
              {insights.alert_summary}
            </p>
            {topIssue ? (
              <p className="mt-3 text-sm text-slate-300">
                Principal falha crítica:{" "}
                <span className="font-semibold text-white">{topIssue.issue}</span>
                {" · "}
                {topIssue.percentage.toLocaleString("pt-BR")}% das queixas
                {" · "}
                severidade {SEVERITY_LABEL[topIssue.severity] ?? topIssue.severity}
              </p>
            ) : null}
            {empty ? (
              <p className="mt-3 text-sm text-slate-400">
                Colete feedbacks nos canais ativos para consolidar o diagnóstico.
              </p>
            ) : null}
          </div>
        </div>
        <Link
          href="/dashboard/insights"
          className={cn(
            buttonVariants({ variant: "default" }),
            "shrink-0 bg-cyan-400 text-slate-950 hover:bg-cyan-300",
          )}
        >
          Ver Análise Detalhada
        </Link>
      </div>
    </section>
  );
}
