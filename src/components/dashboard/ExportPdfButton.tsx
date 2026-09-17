"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { PLATFORM_LABELS } from "@/lib/dashboard/types";
import type { DashboardFeedback, DashboardKpis } from "@/lib/dashboard/types";
import type { ConsolidatedInsights } from "@/services/ai/types";

type Props = {
  companyName: string;
  kpis: DashboardKpis;
  insights: ConsolidatedInsights | null;
  feedbacks: DashboardFeedback[];
};

export function ExportPdfButton({
  companyName,
  kpis,
  insights,
  feedbacks,
}: Props) {
  const [busy, setBusy] = useState(false);

  function exportPdf() {
    setBusy(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      let y = margin;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(11, 15, 25);
      doc.text("Radar AI / BMG Tech AI", margin, y);
      y += 22;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(91, 101, 122);
      doc.text(`Relatório de reputação · ${companyName}`, margin, y);
      y += 16;
      doc.text(
        `Gerado em ${new Date().toLocaleString("pt-BR")}`,
        margin,
        y,
      );
      y += 28;

      doc.setDrawColor(34, 211, 238);
      doc.setLineWidth(2);
      doc.line(margin, y, 547, y);
      y += 24;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(11, 15, 25);
      doc.text("Indicadores", margin, y);
      y += 18;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(37, 71, 168);
      const kpiLines = [
        `Nota média: ${kpis.averageRating?.toFixed(1) ?? "—"}`,
        `Feedbacks no período: ${kpis.monthCount}`,
        `Negativos: ${kpis.negativePercent.toFixed(0)}%`,
        `Alertas: ${kpis.alertCount}`,
      ];
      for (const line of kpiLines) {
        doc.text(line, margin, y);
        y += 16;
      }
      y += 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(11, 15, 25);
      doc.text("Diagnóstico de IA", margin, y);
      y += 18;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(30, 40, 60);
      const summary =
        insights?.alert_summary ??
        "Sem diagnóstico consolidado no momento. Colete feedbacks e tente novamente.";
      const summaryLines = doc.splitTextToSize(summary, 500);
      doc.text(summaryLines, margin, y);
      y += summaryLines.length * 14 + 12;

      if (insights?.critical_issues?.length) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Falhas críticas", margin, y);
        y += 16;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        for (const issue of insights.critical_issues.slice(0, 5)) {
          const line = doc.splitTextToSize(
            `• ${issue.issue} (${issue.percentage.toFixed(0)}% · ${issue.severity})`,
            500,
          );
          if (y + line.length * 12 > 780) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += line.length * 12 + 4;
        }
        y += 8;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(11, 15, 25);
      if (y > 720) {
        doc.addPage();
        y = margin;
      }
      doc.text("Histórico recente", margin, y);
      y += 18;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(40, 50, 70);
      const recent = feedbacks.slice(0, 12);
      if (recent.length === 0) {
        doc.text("Nenhum feedback recente no filtro atual.", margin, y);
      } else {
        for (const item of recent) {
          const platform = PLATFORM_LABELS[item.platform] ?? item.platform;
          const rating = item.rating != null ? `${item.rating}★` : "—";
          const when = item.publishedAt
            ? new Date(item.publishedAt).toLocaleDateString("pt-BR")
            : "—";
          const body = (item.summary || item.text || "Sem texto").replace(
            /\s+/g,
            " ",
          );
          const block = doc.splitTextToSize(
            `[${when}] ${platform} · ${rating} · ${body}`,
            500,
          );
          if (y + block.length * 11 > 800) {
            doc.addPage();
            y = margin;
          }
          doc.text(block, margin, y);
          y += block.length * 11 + 8;
        }
      }

      doc.setFontSize(8);
      doc.setTextColor(120, 130, 145);
      doc.text(
        "Radar AI · BMG Tech AI — relatório confidencial",
        margin,
        820,
      );

      const safeName = companyName.replace(/[^\w\-]+/g, "_").slice(0, 40);
      doc.save(`radar-ai-${safeName}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={busy}
      onClick={exportPdf}
    >
      <FileDown />
      {busy ? "Gerando PDF…" : "Exportar PDF"}
    </Button>
  );
}
