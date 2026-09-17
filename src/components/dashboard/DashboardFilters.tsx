"use client";

import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addDays,
  clampDateRange,
  dashboardHref,
  defaultCustomRange,
  formatDateInput,
  parseDateInput,
  PERIOD_LABELS,
  PLATFORM_LABELS,
  SENTIMENT_LABELS,
  todayInputValue,
  type DashboardFilters,
  type DashboardPeriod,
} from "@/lib/dashboard/types";
import type { ChannelPlatform } from "@/services/scrapers/types";
import type { FeedbackSentiment } from "@/services/ai/types";

const SENTIMENT_OPTIONS: Array<{ value: "all" | FeedbackSentiment; label: string }> = [
  { value: "all", label: "Todos os sentimentos" },
  { value: "POSITIVO", label: SENTIMENT_LABELS.POSITIVO },
  { value: "NEUTRO", label: SENTIMENT_LABELS.NEUTRO },
  { value: "NEGATIVO", label: SENTIMENT_LABELS.NEGATIVO },
];

const PERIOD_OPTIONS: DashboardPeriod[] = ["7d", "30d", "month", "year", "custom"];

export function DashboardFilters({
  filters,
  platforms,
}: {
  filters: DashboardFilters;
  platforms: ChannelPlatform[];
}) {
  const router = useRouter();
  const today = todayInputValue();
  const custom = filters.period === "custom" ? defaultCustomRange() : null;
  const fromValue = filters.from ?? custom?.from ?? "";
  const toValue = filters.to ?? custom?.to ?? "";
  const minFrom = formatDateInput(addDays(parseDateInput(toValue) ?? new Date(), -365));
  const platformOptions: Array<{ value: "all" | ChannelPlatform; label: string }> = [
    { value: "all", label: "Todas as plataformas" },
    ...platforms.map((value) => ({
      value,
      label: PLATFORM_LABELS[value],
    })),
  ];

  function push(next: {
    platform?: string;
    sentiment?: string;
    period?: DashboardPeriod;
    from?: string;
    to?: string;
  }) {
    const period = next.period ?? filters.period;
    const range =
      period === "custom"
        ? clampDateRange(
            parseDateInput(next.from ?? filters.from) ?? parseDateInput(defaultCustomRange().from)!,
            parseDateInput(next.to ?? filters.to) ?? parseDateInput(defaultCustomRange().to)!,
          )
        : null;

    router.push(
      dashboardHref({
        platform: next.platform ?? filters.platform ?? "all",
        sentiment: next.sentiment ?? filters.sentiment ?? "all",
        period,
        from: range ? formatDateInput(range.start) : undefined,
        to: range ? formatDateInput(range.end) : undefined,
        page: 1,
      }),
    );
  }

  return (
    <section className="grid gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 md:grid-cols-3">
      <div className="grid gap-2">
        <Label htmlFor="platform-filter">Plataforma</Label>
        <Select
          value={filters.platform ?? "all"}
          items={platformOptions}
          onValueChange={(value) => push({ platform: value ?? "all" })}
        >
          <SelectTrigger id="platform-filter" className="w-full min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {platformOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sentiment-filter">Sentimento</Label>
        <Select
          value={filters.sentiment ?? "all"}
          items={SENTIMENT_OPTIONS}
          onValueChange={(value) => push({ sentiment: value ?? "all" })}
        >
          <SelectTrigger id="sentiment-filter" className="w-full min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SENTIMENT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="period-filter">Período</Label>
        <Select
          value={filters.period}
          items={PERIOD_OPTIONS.map((option) => ({
            value: option,
            label: PERIOD_LABELS[option],
          }))}
          onValueChange={(value) => {
            const period = (value as DashboardPeriod | null) ?? "month";
            if (period === "custom") {
              const range = defaultCustomRange();
              push({ period, from: range.from, to: range.to });
              return;
            }
            push({ period });
          }}
        >
          <SelectTrigger id="period-filter" className="w-full min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {PERIOD_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filters.period === "custom" ? (
        <div className="grid gap-4 md:col-span-3 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="period-from">Data inicial</Label>
            <Input
              id="period-from"
              type="date"
              value={fromValue}
              min={minFrom}
              max={toValue || today}
              onChange={(event) =>
                push({ period: "custom", from: event.currentTarget.value, to: toValue })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="period-to">Data final</Label>
            <Input
              id="period-to"
              type="date"
              value={toValue}
              min={fromValue || minFrom}
              max={today}
              onChange={(event) =>
                push({ period: "custom", from: fromValue, to: event.currentTarget.value })
              }
            />
          </div>
          <p className="text-xs text-muted-foreground md:col-span-2">
            O intervalo máximo é de 1 ano.
          </p>
        </div>
      ) : null}
    </section>
  );
}
