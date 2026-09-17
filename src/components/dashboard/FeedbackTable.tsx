"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Copy, Star } from "lucide-react";
import { generateSuggestedResponseAction } from "@/app/dashboard/actions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  dashboardHref,
  PLATFORM_LABELS,
  SENTIMENT_LABELS,
  type DashboardFeedback,
  type DashboardFilters,
} from "@/lib/dashboard/types";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StarRating({ value }: { value: number | null }) {
  if (value === null || !Number.isFinite(value)) {
    return <span className="text-muted-foreground">—</span>;
  }
  const rating = Math.round(value);
  return (
    <span
      className="inline-flex items-center gap-0.5 text-amber-500"
      aria-label={`${rating} de 5`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={cn(
            "size-3.5",
            index < rating ? "fill-current" : "text-muted-foreground/30",
          )}
        />
      ))}
    </span>
  );
}

function sentimentVariant(sentiment: DashboardFeedback["sentiment"]) {
  if (sentiment === "POSITIVO") return "secondary" as const;
  if (sentiment === "NEGATIVO") return "destructive" as const;
  return "outline" as const;
}

export function FeedbackTable({
  feedbacks,
  filters,
  total,
  page,
  pageSize,
}: {
  feedbacks: DashboardFeedback[];
  filters: DashboardFilters;
  total: number;
  page: number;
  pageSize: number;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<DashboardFeedback | null>(null);
  const [suggestion, setSuggestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  function openComment(feedback: DashboardFeedback) {
    setActive(feedback);
    setSuggestion("");
    setError(null);
    setCopied(false);
    setOpen(true);
  }

  function generateSuggestion() {
    if (!active) return;
    setError(null);
    startTransition(async () => {
      try {
        const text = await generateSuggestedResponseAction(active.id);
        setSuggestion(text);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Não foi possível gerar a sugestão.",
        );
      }
    });
  }

  async function copySuggestion() {
    if (!suggestion) return;
    await navigator.clipboard.writeText(suggestion);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <>
    <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plataforma</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Sentimento</TableHead>
              <TableHead className="w-36 text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feedbacks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhum feedback encontrado para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              feedbacks.map((feedback) => (
                <TableRow key={feedback.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {PLATFORM_LABELS[feedback.platform]}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(feedback.publishedAt)}</TableCell>
                  <TableCell className="max-w-32 truncate font-medium">
                    {feedback.author || "Anônimo"}
                  </TableCell>
                  <TableCell>
                    <StarRating value={feedback.rating} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={sentimentVariant(feedback.sentiment)}>
                      {feedback.sentiment
                        ? SENTIMENT_LABELS[feedback.sentiment]
                        : "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openComment(feedback)}
                    >
                      Ver comentário
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
          <p>
            {total === 0
              ? "Nenhum comentário"
              : `${from}–${to} de ${total.toLocaleString("pt-BR")}`}
          </p>
          <div className="flex items-center gap-2">
            {safePage <= 1 ? (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft />
                Anterior
              </Button>
            ) : (
              <Link
                href={dashboardHref({
                  platform: filters.platform,
                  sentiment: filters.sentiment,
                  period: filters.period,
                  from: filters.from,
                  to: filters.to,
                  page: safePage - 1,
                })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <ChevronLeft />
                Anterior
              </Link>
            )}
            <span>
              Página {safePage} de {pageCount}
            </span>
            {safePage >= pageCount ? (
              <Button variant="outline" size="sm" disabled>
                Próxima
                <ChevronRight />
              </Button>
            ) : (
              <Link
                href={dashboardHref({
                  platform: filters.platform,
                  sentiment: filters.sentiment,
                  period: filters.period,
                  from: filters.from,
                  to: filters.to,
                  page: safePage + 1,
                })}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Próxima
                <ChevronRight />
              </Link>
            )}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Comentário do cliente</DialogTitle>
            <DialogDescription>
              {active
                ? `${active.author || "Anônimo"} · ${PLATFORM_LABELS[active.platform]} · ${formatDate(active.publishedAt)}`
                : "Detalhe do feedback."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            {active?.category ? (
              <p className="text-xs text-muted-foreground">
                Categoria: {active.category}
              </p>
            ) : null}
            <div className="max-h-56 overflow-y-auto rounded-lg bg-muted/60 p-3 text-sm leading-6 whitespace-pre-wrap">
              {active?.text || "Este feedback não veio com texto."}
            </div>
            {active?.summary ? (
              <p className="text-sm text-muted-foreground">
                Resumo da IA: {active.summary}
              </p>
            ) : null}
            {suggestion || pending || error ? (
              <div className="max-h-40 overflow-y-auto rounded-lg border p-3 text-sm leading-6 whitespace-pre-wrap">
                {pending
                  ? "Gerando sugestão…"
                  : error
                    ? error
                    : suggestion}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !active}
              onClick={generateSuggestion}
            >
              {pending ? "Gerando…" : "Sugerir resposta"}
            </Button>
            <Button
              type="button"
              disabled={pending || !suggestion}
              onClick={copySuggestion}
            >
              {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
              {copied ? "Copiado" : "Copiar resposta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
