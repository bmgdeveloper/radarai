import { ListChecks } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function RecommendedActionsCard({ actions }: { actions: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="size-4" />
          Plano de ação recomendado
        </CardTitle>
        <CardDescription>
          Sugestões práticas para estancar as reclamações e atacar a causa raiz.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {actions.length ? (
          <ol className="space-y-3">
            {actions.map((action, index) => (
              <li
                key={`${index}-${action.slice(0, 24)}`}
                className="flex gap-3 rounded-xl border bg-muted/30 p-4"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                  {index + 1}
                </span>
                <p className="text-sm leading-relaxed">{action}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sem ações recomendadas no momento.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
