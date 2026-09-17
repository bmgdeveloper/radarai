export const FEEDBACK_CATEGORIES = [
  "App / Inoperante",
  "Atendimento",
  "Cobrança / Financeiro",
  "Elogio",
  "Outros",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export type FeedbackSentiment = "POSITIVO" | "NEUTRO" | "NEGATIVO";

export type FeedbackAnalysis = {
  sentiment: FeedbackSentiment;
  category: FeedbackCategory;
  summary: string;
  needs_alert: boolean;
};

export type InsightSeverity = "HIGH" | "MEDIUM" | "LOW";

export type CriticalIssue = {
  issue: string;
  percentage: number;
  severity: InsightSeverity;
  category: string;
};

export type CategoryShare = {
  name: string;
  count: number;
  percentage: number;
};

export type ConsolidatedInsights = {
  critical_issues: CriticalIssue[];
  alert_summary: string;
  recommended_actions: string[];
  category_distribution: CategoryShare[];
  sample_count: number;
  source: "ai" | "heuristic";
};
