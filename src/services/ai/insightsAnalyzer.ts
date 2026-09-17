import { createClient } from "@/lib/supabase/server";
import { extractJsonObject, generateText, hasAnyLlm } from "./llm";
import type {
  CategoryShare,
  ConsolidatedInsights,
  CriticalIssue,
  InsightSeverity,
} from "./types";

const SAMPLE_LIMIT = 80;
const CACHE_TTL_MS = 15 * 60 * 1000;

type FeedbackRow = {
  id: string;
  text: string | null;
  rating: number | null;
  sentiment: string | null;
  category: string | null;
  summary: string | null;
  published_at: string | null;
  created_at: string;
};

type IssueBucket = {
  issue: string;
  category: string;
  match: (haystack: string) => boolean;
};

const ISSUE_BUCKETS: IssueBucket[] = [
  {
    issue: "Bug de Login / Autenticação",
    category: "Login",
    match: (haystack) =>
      /login|logar|autentic|senha|entrar no app|n[aã]o (consigo )?entrar|erro ao entrar|acesso (negado|bloqueado)/.test(
        haystack,
      ),
  },
  {
    issue: "Falhas no Pix / Pagamentos",
    category: "Pagamentos",
    match: (haystack) =>
      /pix|pagamento|cobran[cç]a|boleto|estorno|cart[aã]o|checkout financeiro/.test(
        haystack,
      ),
  },
  {
    issue: "Lentidão",
    category: "Lentidão",
    match: (haystack) =>
      /lent|demora|carreg|trav|timeout|demora demais/.test(haystack),
  },
  {
    issue: "Problemas no atendimento",
    category: "Atendimento",
    match: (haystack) =>
      /atend|suporte|n[aã]o respond|ningu[eé]m responde|demora no suporte|whatsapp/.test(
        haystack,
      ),
  },
  {
    issue: "App instável / inoperante",
    category: "App",
    match: (haystack) =>
      /bug|crash|trava|inoper|n[aã]o abre|atualiza[cç][aã]o/.test(haystack),
  },
];

type CacheEntry = { expiresAt: number; value: ConsolidatedInsights };
const insightsCache = new Map<string, CacheEntry>();

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function roundPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function clampPercent(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, roundPercent(n)));
}

function normalizeSeverity(value: unknown): InsightSeverity {
  const raw = String(value ?? "")
    .trim()
    .toUpperCase();
  if (raw === "HIGH" || raw === "ALTA") return "HIGH";
  if (raw === "LOW" || raw === "BAIXA") return "LOW";
  return "MEDIUM";
}

function classifyRow(row: FeedbackRow) {
  const haystack = normalizeText(
    `${row.text ?? ""} ${row.summary ?? ""} ${row.category ?? ""}`,
  );
  const bucket = ISSUE_BUCKETS.find((item) => item.match(haystack));
  const sentiment = String(row.sentiment ?? "").toUpperCase();
  const isPraise =
    sentiment === "POSITIVO" ||
    normalizeText(row.category ?? "").includes("elogio");

  if (isPraise) {
    return { name: "Elogio", issue: null as string | null, isComplaint: false };
  }
  if (bucket) {
    return { name: bucket.category, issue: bucket.issue, isComplaint: true };
  }
  return { name: "Outros", issue: "Outros problemas relatados", isComplaint: true };
}

function toShares(
  counts: Map<string, number>,
  total: number,
): CategoryShare[] {
  if (total <= 0) return [];
  return [...counts.entries()]
    .map(([name, count]) => ({
      name,
      count,
      percentage: roundPercent((count / total) * 100),
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

function emptyInsights(reason: string): ConsolidatedInsights {
  return {
    critical_issues: [],
    alert_summary: reason,
    recommended_actions: [
      "Cadastre canais ativos e rode uma coleta para gerar o diagnóstico automático.",
    ],
    category_distribution: [],
    sample_count: 0,
    source: "heuristic",
  };
}

function heuristicInsights(rows: FeedbackRow[]): ConsolidatedInsights {
  if (!rows.length) {
    return emptyInsights(
      "Ainda não há feedbacks suficientes para um diagnóstico consolidado da reputação.",
    );
  }

  const complaintRows = rows.filter((row) => classifyRow(row).isComplaint);
  const distributionCounts = new Map<string, number>();
  const issueCounts = new Map<string, { count: number; category: string }>();

  for (const row of rows) {
    const classified = classifyRow(row);
    distributionCounts.set(
      classified.name,
      (distributionCounts.get(classified.name) ?? 0) + 1,
    );
    if (!classified.isComplaint || !classified.issue) continue;
    const current = issueCounts.get(classified.issue) ?? {
      count: 0,
      category: classified.name,
    };
    current.count += 1;
    issueCounts.set(classified.issue, current);
  }

  const complaintTotal = Math.max(complaintRows.length, 1);
  const critical_issues: CriticalIssue[] = [...issueCounts.entries()]
    .map(([issue, meta]) => {
      const percentage = roundPercent((meta.count / complaintTotal) * 100);
      const severity: InsightSeverity =
        percentage >= 30 || meta.count >= 4
          ? "HIGH"
          : percentage >= 15
            ? "MEDIUM"
            : "LOW";
      return {
        issue,
        percentage,
        severity,
        category: meta.category,
      };
    })
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5);

  const top = critical_issues[0];
  const negativeShare = roundPercent(
    (rows.filter((row) => String(row.sentiment ?? "").toUpperCase() === "NEGATIVO")
      .length /
      rows.length) *
      100,
  );

  const alert_summary = top
    ? `${top.issue} concentra ${top.percentage}% das queixas recentes e puxa a insatisfação para ${negativeShare}%. A reputação do produto precisa de ação imediata nesse gargalo antes que o volume vire surto público.`
    : `A amostra recente está equilibrada, com ${negativeShare}% de avaliações negativas. Continue monitorando categorias emergentes para evitar um surto de reclamações.`;

  const recommended_actions = top
    ? [
        `Priorize um war room técnico para ${top.issue.toLowerCase()} e publique um status público enquanto o hotfix não sobe.`,
        "Reproduza os relatos mais repetidos (texto + nota 1–2) e abra um ticket único de causa raiz, sem tratar cada reclamação isolada.",
        "Ative um roteiro de atendimento com mensagem padrão, prazo de retorno e canal de escalação para os casos já abertos.",
        "Depois do deploy, recorte o período no dashboard e confirme a queda percentual da categoria crítica.",
      ]
    : [
        "Mantenha a coleta ativa nos canais cadastrados e revise os alertas de nota baixa semanalmente.",
        "Use o filtro de período do dashboard para comparar a semana atual com a anterior.",
      ];

  return {
    critical_issues,
    alert_summary,
    recommended_actions,
    category_distribution: toShares(distributionCounts, rows.length),
    sample_count: rows.length,
    source: "heuristic",
  };
}

function insightsPrompt(rows: FeedbackRow[]) {
  const compact = rows.slice(0, SAMPLE_LIMIT).map((row, index) => ({
    n: index + 1,
    nota: row.rating,
    sentimento: row.sentiment,
    categoria: row.category,
    texto: (row.text || row.summary || "").slice(0, 280),
  }));

  return `Você é um analista sênior de reputação digital para empresas brasileiras.
Consolide os feedbacks abaixo em um diagnóstico executivo. Agrupe reclamações semanticamente iguais (ex: "não entra", "erro ao logar" e "bug de login" = um único problema).
Responda APENAS um JSON válido, sem markdown, neste formato:
{
  "critical_issues": [
    { "issue": "Bug de Login / Autenticação", "percentage": 42, "severity": "HIGH", "category": "Login" }
  ],
  "alert_summary": "duas frases diretas sobre a saúde atual da reputação/produto",
  "recommended_actions": ["ação prática 1", "ação prática 2", "ação prática 3"],
  "category_distribution": [
    { "name": "Login", "percentage": 40 },
    { "name": "Atendimento", "percentage": 30 },
    { "name": "Pagamentos", "percentage": 20 },
    { "name": "Outros", "percentage": 10 }
  ]
}

Regras:
- percentage é 0 a 100, relativo às queixas (não elogie como falha crítica).
- severity: HIGH | MEDIUM | LOW.
- no máximo 5 critical_issues, ordenados do mais grave/recorrente.
- recommended_actions: 3 a 5 itens acionáveis para time técnico/operacional.
- category_distribution deve somar cerca de 100 e usar nomes curtos (Login, Atendimento, Pagamentos, Lentidão, App, Elogio, Outros).
- escreva tudo em português brasileiro.

Feedbacks:
${JSON.stringify(compact)}`;
}

function parseAiInsights(
  payload: Record<string, unknown>,
  fallback: ConsolidatedInsights,
): ConsolidatedInsights {
  const issuesRaw = Array.isArray(payload.critical_issues)
    ? payload.critical_issues
    : [];
  const actionsRaw = Array.isArray(payload.recommended_actions)
    ? payload.recommended_actions
    : [];
  const distRaw = Array.isArray(payload.category_distribution)
    ? payload.category_distribution
    : [];

  const critical_issues: CriticalIssue[] = issuesRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const issue = String(row.issue ?? "").trim();
      if (!issue) return null;
      return {
        issue,
        percentage: clampPercent(row.percentage),
        severity: normalizeSeverity(row.severity),
        category: String(row.category ?? "Outros").trim() || "Outros",
      };
    })
    .filter((item): item is CriticalIssue => item !== null)
    .slice(0, 5);

  const recommended_actions = actionsRaw
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .slice(0, 6);

  const category_distribution: CategoryShare[] = distRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const name = String(row.name ?? "").trim();
      if (!name) return null;
      return {
        name,
        count: Number(row.count) || 0,
        percentage: clampPercent(row.percentage),
      };
    })
    .filter((item): item is CategoryShare => item !== null);

  const alert_summary =
    String(payload.alert_summary ?? "")
      .trim()
      .slice(0, 480) || fallback.alert_summary;

  return {
    critical_issues: critical_issues.length ? critical_issues : fallback.critical_issues,
    alert_summary,
    recommended_actions: recommended_actions.length
      ? recommended_actions
      : fallback.recommended_actions,
    category_distribution: category_distribution.length
      ? category_distribution
      : fallback.category_distribution,
    sample_count: fallback.sample_count,
    source: "ai",
  };
}

async function withTimeout<T>(promise: Promise<T>, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Tempo esgotado na IA.")), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function cacheKey(companyId: string, rows: FeedbackRow[]) {
  const newest = rows[0]?.id ?? "none";
  return `${companyId}:${rows.length}:${newest}`;
}

export async function generateConsolidatedInsights(
  companyId: string,
  options?: { timeoutMs?: number },
): Promise<ConsolidatedInsights> {
  if (!companyId) {
    return emptyInsights("Empresa inválida para gerar insights.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedbacks")
    .select("id, text, rating, sentiment, category, summary, published_at, created_at")
    .eq("company_id", companyId)
    .order("published_at", { ascending: false })
    .limit(SAMPLE_LIMIT);

  if (error) {
    console.error("[insightsAnalyzer] falha ao buscar feedbacks", {
      message: error.message,
    });
    return emptyInsights(
      "Não foi possível carregar os feedbacks para o diagnóstico de IA.",
    );
  }

  const rows = (data ?? []) as FeedbackRow[];
  const key = cacheKey(companyId, rows);
  const cached = insightsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const fallback = heuristicInsights(rows);
  let result = fallback;

  if (rows.length && hasAnyLlm()) {
    try {
      const raw = await withTimeout(
        generateText(insightsPrompt(rows), true),
        options?.timeoutMs ?? 12_000,
      );
      result = parseAiInsights(extractJsonObject(raw), fallback);
    } catch (error) {
      console.error("[insightsAnalyzer] falha na IA, usando heurística", {
        message: error instanceof Error ? error.message : "erro desconhecido",
      });
    }
  }

  insightsCache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

export function primaryCriticalIssue(insights: ConsolidatedInsights) {
  return insights.critical_issues[0] ?? null;
}
