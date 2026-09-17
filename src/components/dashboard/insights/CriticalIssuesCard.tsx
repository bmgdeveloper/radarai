import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CriticalIssue, InsightSeverity } from "@/services/ai/types";

const SEVERITY_LABEL: Record<InsightSeverity, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

const SEVERITY_CLASS: Record<InsightSeverity, string> = {
  HIGH: "border-transparent bg-destructive/15 text-destructive",
  MEDIUM: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
  LOW: "border-transparent bg-muted text-muted-foreground",
};

export function CriticalIssuesCard({ issues }: { issues: CriticalIssue[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Falhas críticas e tendências</CardTitle>
        <CardDescription>
          Gargalos agrupados pela IA a partir dos comentários mais recentes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {issues.length ? (
          issues.map((issue) => (
            <div
              key={issue.issue}
              className="rounded-xl border bg-muted/30 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{issue.issue}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Categoria: {issue.category}
                  </p>
                </div>
                <Badge className={SEVERITY_CLASS[issue.severity]}>
                  {SEVERITY_LABEL[issue.severity]}
                </Badge>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Recorrência nas queixas</span>
                  <span>{issue.percentage.toLocaleString("pt-BR")}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-cyan-500"
                    style={{ width: `${Math.min(issue.percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma falha crítica agrupada nesta amostra.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
