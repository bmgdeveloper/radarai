import { parseConsumidorGovInput } from "./ids";
import { browserRequest } from "./http";
import {
  cleanText,
  clampRating,
  toIsoDate,
  type RawFeedback,
} from "./types";

const ORIGIN = "https://www.consumidor.gov.br";
const SEARCH_URL = `${ORIGIN}/pages/empresa/listarPorNome.json`;
const PARTICIPANTES_URL = `${ORIGIN}/pages/principal/empresas-participantes`;

type GovFetch = (opts: {
  url: string;
  method?: "GET" | "POST";
  form?: Record<string, string>;
}) => Promise<{ status: number; data: unknown; text: string }>;

type GovCompany = {
  value?: string;
  label?: string;
  assuntos?: string;
};

type PerfilJson = {
  indicadorSolucao?: number;
  indicadorSatisfacaoAtendimento?: number;
  indicadorReclamcoesRespondidas?: number;
  indicadorPrazoMedioRespostas?: number;
  totalReclamacoes?: number;
  prazoResposta?: number;
};

function createGovFetch(): GovFetch {
  const session: { cookie?: string } = {};
  let profileUrl = `${ORIGIN}/`;
  return async ({ url, method, form }) => {
    const isJson = url.includes("perfil.json") || url.includes("listarPorNome.json");
    if (url.includes("/perfil") && !url.includes("perfil.json")) profileUrl = url;
    return browserRequest({
      url,
      method,
      form,
      session,
      origin: ORIGIN,
      referer: isJson && profileUrl.endsWith("/perfil") ? profileUrl : `${ORIGIN}/`,
      headers: isJson
        ? {
            Accept: "application/json, text/javascript, */*; q=0.01",
            "X-Requested-With": "XMLHttpRequest",
          }
        : { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    });
  };
}

function asCompanies(data: unknown): GovCompany[] {
  if (typeof data === "string") {
    try {
      return asCompanies(JSON.parse(data));
    } catch {
      return [];
    }
  }
  return Array.isArray(data) ? (data as GovCompany[]) : [];
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function pickGovCompany(
  companies: GovCompany[],
  query: string,
): GovCompany | undefined {
  const usable = companies.filter((item) => item.value && item.value !== "-1" && item.label);
  if (usable.length === 0) return undefined;
  const needle = normalizeName(query);
  return (
    usable.find((item) => {
      const label = normalizeName(item.label ?? "");
      return label === needle || label.includes(needle) || needle.includes(label);
    }) ?? usable[0]
  );
}

export function extractHddIdFornecedor(html: string): string | undefined {
  const named = html.match(/hddIdFornecedor[^>]*value=["']([^"']+)/i);
  if (named?.[1]) return named[1];
  const reversed = html.match(/value=["']([^"']+)["'][^>]*hddIdFornecedor/i);
  return reversed?.[1];
}

export function findParticipanteId(html: string, label: string): string | undefined {
  const needle = normalizeName(label);
  if (!needle) return undefined;
  const tagged = [...html.matchAll(/href=["']\/pages\/empresa\/(\d+)\/perfil["'][^>]*>([^<]+)</gi)];
  for (const match of tagged) {
    const name = normalizeName(match[2] ?? "");
    if (name === needle || name.includes(needle) || needle.includes(name)) return match[1];
  }
  const ids = [...html.matchAll(/\/pages\/empresa\/(\d+)\/perfil/gi)].map((match) => match[1]);
  const lower = html.toLowerCase();
  for (const id of ids) {
    const idx = lower.indexOf(`/pages/empresa/${id}/perfil`);
    const window = lower.slice(Math.max(0, idx - 400), idx + 400);
    if (window.includes(needle)) return id;
  }
  return undefined;
}

function formatMetric(value: number | undefined, suffix = ""): string {
  if (value === undefined || Number.isNaN(Number(value))) return "n/d";
  return `${value}${suffix}`;
}

function metricsText(params: {
  label: string;
  assuntos?: string;
  aba: string;
  periodo: number;
  metrics: PerfilJson;
}): string {
  const recorte = params.aba === "TODAS" ? "histórico completo" : `${params.periodo} dias`;
  const assuntos = params.assuntos?.trim() ? ` Assuntos: ${params.assuntos.trim()}.` : "";
  return [
    `Indicadores Consumidor.gov (${params.label}) no recorte de ${recorte}:`,
    `- Reclamações: ${formatMetric(params.metrics.totalReclamacoes)}`,
    `- Índice de solução: ${formatMetric(params.metrics.indicadorSolucao, "%")}`,
    `- Satisfação com atendimento: ${formatMetric(params.metrics.indicadorSatisfacaoAtendimento)}`,
    `- Reclamações respondidas: ${formatMetric(params.metrics.indicadorReclamcoesRespondidas, "%")}`,
    `- Prazo médio de resposta: ${formatMetric(params.metrics.indicadorPrazoMedioRespostas, " dias")}`,
    `- Prazo para responder: ${formatMetric(params.metrics.prazoResposta, " dias")}.`,
    `Os relatos individuais das reclamações não são públicos no Consumidor.gov; estes indicadores cobrem o período.${assuntos}`,
  ].join(" ");
}

async function lookupCompany(
  fetchPage: GovFetch,
  query: string,
): Promise<GovCompany | undefined> {
  const response = await fetchPage({
    url: SEARCH_URL,
    method: "POST",
    form: { query },
  });
  if (response.status >= 400) {
    throw new Error(`Consumidor.gov autocomplete HTTP ${response.status}`);
  }
  return pickGovCompany(asCompanies(response.data), query);
}

async function lookupParticipanteId(
  fetchPage: GovFetch,
  label: string,
): Promise<string | undefined> {
  if (!label) return undefined;
  const response = await fetchPage({ url: PARTICIPANTES_URL });
  if (response.status >= 400) return undefined;
  return findParticipanteId(response.text, label);
}

export async function fetchConsumidorGovReviews(
  urlOrId: string,
  fetchPage: GovFetch = createGovFetch(),
): Promise<RawFeedback[]> {
  const parsed = parseConsumidorGovInput(urlOrId);
  const company = parsed.id
    ? undefined
    : await lookupCompany(fetchPage, parsed.query);
  const numericId =
    parsed.id ||
    (company ? await lookupParticipanteId(fetchPage, company.label ?? "") : undefined);

  if (!numericId) {
    throw new Error(
      "Consumidor.gov: não achei o perfil. Use o link https://www.consumidor.gov.br/pages/empresa/{id}/perfil.",
    );
  }

  const profileUrl = `${ORIGIN}/pages/empresa/${numericId}/perfil`;
  const profile = await fetchPage({ url: profileUrl });
  if (profile.status >= 400) {
    throw new Error(`Consumidor.gov perfil HTTP ${profile.status}`);
  }
  const hash = extractHddIdFornecedor(profile.text);
  if (!hash) {
    throw new Error("Consumidor.gov: o perfil não devolveu hddIdFornecedor.");
  }

  const attempts = [
    { aba: "DIAS" as const, periodo: 30 },
    { aba: "DIAS" as const, periodo: 90 },
    { aba: "DIAS" as const, periodo: 180 },
  ];

  let aba = attempts[0].aba;
  let periodo = attempts[0].periodo;
  let metrics: PerfilJson | undefined;
  let lastStatus = 0;
  for (const attempt of attempts) {
    const metricsUrl = `${ORIGIN}/pages/empresa/${hash}/aba/${attempt.aba}/periodo/${attempt.periodo}/perfil.json`;
    const metricsResponse = await fetchPage({ url: metricsUrl });
    lastStatus = metricsResponse.status;
    if (
      metricsResponse.status >= 400 ||
      typeof metricsResponse.data !== "object" ||
      metricsResponse.data === null
    ) {
      continue;
    }
    aba = attempt.aba;
    periodo = attempt.periodo;
    metrics = metricsResponse.data as PerfilJson;
    break;
  }
  if (!metrics) {
    throw new Error(`Consumidor.gov indicadores HTTP ${lastStatus || "sem json"}`);
  }

  const label = cleanText(company?.label) || `empresa ${numericId}`;
  const day = new Date().toISOString().slice(0, 10);

  return [
    {
      externalId: `consumidorgov:${numericId}:${day}:${aba}:${periodo}`,
      author: label,
      rating: clampRating(metrics.indicadorSatisfacaoAtendimento),
      text: metricsText({
        label,
        assuntos: company?.assuntos,
        aba,
        periodo,
        metrics,
      }),
      publishedAt: toIsoDate(new Date()),
    },
  ];
}
