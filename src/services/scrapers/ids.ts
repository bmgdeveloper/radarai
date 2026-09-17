export function parsePlayStoreAppId(urlOrAppId: string): string {
  const trimmed = urlOrAppId.trim();
  if (!trimmed) {
    throw new Error("App ID da Play Store é obrigatório.");
  }

  try {
    const url = new URL(trimmed);
    const id = url.searchParams.get("id")?.trim();
    if (id) return id;
  } catch {
    // valor já é o package name
  }

  const queryMatch = trimmed.match(/[?&]id=([^&]+)/i);
  if (queryMatch?.[1]) {
    return decodeURIComponent(queryMatch[1]);
  }

  return trimmed;
}

export function parseAppStoreAppId(urlOrAppId: string): {
  id?: string;
  appId?: string;
} {
  const trimmed = urlOrAppId.trim();
  if (!trimmed) {
    throw new Error("App ID da App Store é obrigatório.");
  }

  const idFromPath = trimmed.match(/\/id(\d+)/i);
  if (idFromPath?.[1]) {
    return { id: idFromPath[1] };
  }

  if (/^\d+$/.test(trimmed)) {
    return { id: trimmed };
  }

  return { appId: trimmed };
}

export function parseGooglePlaceId(urlOrPlaceId: string): string {
  const trimmed = urlOrPlaceId.trim();
  if (!trimmed) {
    throw new Error("Place ID do Google é obrigatório.");
  }

  try {
    const url = new URL(trimmed);
    const fromQuery =
      url.searchParams.get("place_id") ??
      url.searchParams.get("query_place_id");
    if (fromQuery?.trim()) return fromQuery.trim();
  } catch {
    // valor já é o place_id
  }

  const queryMatch = trimmed.match(/(?:place_id|query_place_id)=([^&]+)/i);
  if (queryMatch?.[1]) {
    return decodeURIComponent(queryMatch[1]);
  }

  const resourceMatch = trimmed.match(/places\/([A-Za-z0-9_-]+)/);
  if (resourceMatch?.[1]) {
    return resourceMatch[1];
  }

  return trimmed.replace(/^places\//, "");
}

export function parseMercadoLivreItemId(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  if (!trimmed) {
    throw new Error("Informe o link do anúncio ou o código MLB do Mercado Livre.");
  }

  const match = trimmed.match(/MLB-?(\d+)/i);
  if (match?.[1]) return `MLB${match[1]}`;

  throw new Error(
    "Não achei o código MLB. Cole o link do anúncio (ex.: https://produto.mercadolivre.com.br/MLB-123456789).",
  );
}

export function parseReclameAquiSlug(urlOrSlug: string): string {
  const trimmed = urlOrSlug.trim();
  if (!trimmed) {
    throw new Error("Informe o link ou o slug da empresa no Reclame AQUI.");
  }

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split("/").filter(Boolean);
    const empresaIdx = parts.findIndex((part) => part.toLowerCase() === "empresa");
    if (empresaIdx >= 0 && parts[empresaIdx + 1]) {
      return decodeURIComponent(parts[empresaIdx + 1]);
    }
  } catch {
    // valor já é o slug
  }

  return trimmed.replace(/^\/+|\/+$/g, "").split("/")[0] ?? trimmed;
}

export function parseConsumidorGovInput(urlOrId: string): {
  id?: string;
  query: string;
} {
  const trimmed = urlOrId.trim();
  if (!trimmed) {
    throw new Error(
      "Informe o link do perfil, o ID ou o nome da empresa no Consumidor.gov.",
    );
  }

  const fromPath = trimmed.match(/\/empresa\/(\d+)(?:\/|$)/i);
  if (fromPath?.[1]) {
    return { id: fromPath[1], query: fromPath[1] };
  }

  if (/^\d{8,}$/.test(trimmed)) {
    return { id: trimmed, query: trimmed };
  }

  return { query: trimmed };
}
