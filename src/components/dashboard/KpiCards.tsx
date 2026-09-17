import { Bell, MessageSquare, Star, ThumbsDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardKpis } from "@/lib/dashboard/types";

function formatAverage(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function formatPercent(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })}%`;
}

const CARDS = [
  {
    key: "average" as const,
    title: "Média geral",
    description: "Nota média das avaliações",
    icon: Star,
  },
  {
    key: "month" as const,
    title: "Feedbacks no mês",
    description: "Volume no mês corrente",
    icon: MessageSquare,
  },
  {
    key: "negative" as const,
    title: "Insatisfação",
    description: "Percentual de negativos",
    icon: ThumbsDown,
  },
  {
    key: "alerts" as const,
    title: "Alertas WhatsApp",
    description: "Feedbacks com alerta disparado",
    icon: Bell,
  },
];

export function KpiCards({ kpis }: { kpis: DashboardKpis }) {
  const values = {
    average: formatAverage(kpis.averageRating),
    month: kpis.monthCount.toLocaleString("pt-BR"),
    negative: formatPercent(kpis.negativePercent),
    alerts: kpis.alertCount.toLocaleString("pt-BR"),
  };

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.key}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardDescription>{card.title}</CardDescription>
                <CardTitle className="mt-1 text-2xl">{values[card.key]}</CardTitle>
              </div>
              <span className="rounded-lg bg-muted p-2 text-muted-foreground">
                <Icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
