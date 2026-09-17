import { extractJsonObject, generateText, hasAnyLlm } from "./llm";
import {
  FEEDBACK_CATEGORIES,
  type FeedbackAnalysis,
  type FeedbackCategory,
  type FeedbackSentiment,
} from "./types";

export type { FeedbackAnalysis, FeedbackCategory, FeedbackSentiment };

const ANALYSIS_CATEGORIES = FEEDBACK_CATEGORIES.join(", ");

function normalizeSentiment(value: unknown): FeedbackSentiment {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if (normalized === "POSITIVO" || normalized === "NEUTRO" || normalized === "NEGATIVO") {
    return normalized;
  }
  return "NEUTRO";
}

function normalizeCategory(value: unknown): FeedbackCategory {
  const raw = String(value ?? "").trim();
  const match = FEEDBACK_CATEGORIES.find(
    (category) => category.toLowerCase() === raw.toLowerCase(),
  );
  if (match) return match;

  const lowered = raw.toLowerCase();
  if (lowered.includes("inoper") || lowered.includes("app")) return "App / Inoperante";
  if (lowered.includes("atend")) return "Atendimento";
  if (lowered.includes("cobran") || lowered.includes("financ")) {
    return "Cobrança / Financeiro";
  }
  if (lowered.includes("elog")) return "Elogio";
  return "Outros";
}

function toAnalysis(
  payload: Record<string, unknown>,
  rating: number,
): FeedbackAnalysis {
  const sentiment = normalizeSentiment(payload.sentiment);
  const category = normalizeCategory(payload.category);
  const summary =
    String(payload.summary ?? "")
      .trim()
      .slice(0, 220) || heuristicSummary("", rating);
  const aiAlert = payload.needs_alert === true || payload.needs_alert === "true";
  const financialUrgent = category === "Cobrança / Financeiro" && sentiment === "NEGATIVO";

  return {
    sentiment,
    category,
    summary,
    needs_alert: aiAlert || rating <= 2 || financialUrgent,
  };
}

function heuristicSummary(text: string, rating: number) {
  if (rating <= 2) return "Cliente relatou uma experiência negativa que merece atenção.";
  if (rating >= 4) return "Cliente elogiou a experiência.";
  const snippet = text.trim().slice(0, 120);
  return snippet || "Feedback sem comentário detalhado.";
}

export function heuristicAnalysis(text: string, rating: number): FeedbackAnalysis {
  const lowered = text.toLowerCase();
  let category: FeedbackCategory = "Outros";
  if (
    lowered.includes("elogio") ||
    lowered.includes("ótimo") ||
    lowered.includes("otimo") ||
    lowered.includes("excelente") ||
    lowered.includes("adorei")
  ) {
    category = "Elogio";
  } else if (
    lowered.includes("cobran") ||
    lowered.includes("pix") ||
    lowered.includes("boleto") ||
    lowered.includes("estorno") ||
    lowered.includes("pagamento")
  ) {
    category = "Cobrança / Financeiro";
  } else if (
    lowered.includes("atendent") ||
    lowered.includes("suporte") ||
    lowered.includes("demora") ||
    lowered.includes("não respond")
  ) {
    category = "Atendimento";
  } else if (
    lowered.includes("trav") ||
    lowered.includes("bug") ||
    lowered.includes("crash") ||
    lowered.includes("login") ||
    lowered.includes("entrar no app") ||
    lowered.includes("autentic") ||
    lowered.includes("não abre") ||
    lowered.includes("inoper")
  ) {
    category = "App / Inoperante";
  } else if (rating >= 4) {
    category = "Elogio";
  }

  const sentiment: FeedbackSentiment =
    rating <= 2 ? "NEGATIVO" : rating >= 4 ? "POSITIVO" : "NEUTRO";

  return {
    sentiment,
    category,
    summary: heuristicSummary(text, rating),
    needs_alert:
      rating <= 2 ||
      (category === "Cobrança / Financeiro" && sentiment !== "POSITIVO"),
  };
}

function analysisPrompt(text: string, rating: number) {
  return `Você é um analista de reputação para empresas brasileiras.
Classifique o feedback abaixo e responda APENAS um JSON válido, sem markdown, no formato:
{
  "sentiment": "POSITIVO" | "NEUTRO" | "NEGATIVO",
  "category": uma de [${ANALYSIS_CATEGORIES}],
  "summary": "resumo em 1 frase curta em português",
  "needs_alert": true | false
}

Regras para needs_alert=true:
- crítica grave
- nota <= 2
- falha financeira, cobrança indevida, golpe, urgência ou risco de dano à reputação

Nota do cliente: ${rating}
Feedback:
"""${text.slice(0, 4000)}"""`;
}

function suggestionPrompt(feedbackText: string, category: string) {
  return `Escreva uma resposta profissional, empática e objetiva em português brasileiro para a empresa publicar na loja/site de avaliações.
Categoria: ${category}
Não invente compensações financeiras. Não use emojis. No máximo 90 palavras. Apenas o texto da resposta.

Feedback do cliente:
"""${feedbackText.slice(0, 4000)}"""`;
}

export async function analyzeFeedbackText(
  text: string,
  rating: number,
): Promise<FeedbackAnalysis> {
  const safeRating = Number.isFinite(rating) ? rating : 0;
  const content = text.trim();

  if (!content) {
    return heuristicAnalysis("", safeRating);
  }

  if (!hasAnyLlm()) {
    return heuristicAnalysis(content, safeRating);
  }

  try {
    const raw = await generateText(analysisPrompt(content, safeRating), true);
    return toAnalysis(extractJsonObject(raw), safeRating);
  } catch (error) {
    console.error("[feedbackAnalyzer] falha na análise, usando heurística", {
      message: error instanceof Error ? error.message : "erro desconhecido",
    });
    return heuristicAnalysis(content, safeRating);
  }
}

export async function generateSuggestedResponse(
  feedbackText: string,
  category: string,
): Promise<string> {
  const content = feedbackText.trim();
  const fallback =
    "Olá! Agradecemos o seu retorno. Já registramos o ocorrido e nossa equipe vai analisar o caso com prioridade. Se puder, envie mais detalhes para acelerarmos o atendimento.";

  if (!content) return fallback;

  if (!hasAnyLlm()) {
    return fallback;
  }

  try {
    const suggestion = await generateText(
      suggestionPrompt(content, category || "Outros"),
      false,
    );
    return suggestion.replace(/^["'\s]+|["'\s]+$/g, "").trim() || fallback;
  } catch (error) {
    console.error("[feedbackAnalyzer] falha ao gerar resposta", {
      message: error instanceof Error ? error.message : "erro desconhecido",
    });
    return fallback;
  }
}
