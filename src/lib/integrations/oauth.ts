import { createHash, randomBytes } from "node:crypto";

export type OAuthPlatform = "ifood" | "mercadolivre";

export function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3000"
  );
}

export function oauthRedirectUri(platform: OAuthPlatform) {
  return `${appBaseUrl()}/api/integrations/${platform}/callback`;
}

export function createOAuthState(payload: {
  companyId: string;
  platform: OAuthPlatform;
  userId: string;
}) {
  const nonce = randomBytes(16).toString("hex");
  const body = Buffer.from(
    JSON.stringify({ ...payload, nonce, ts: Date.now() }),
    "utf8",
  ).toString("base64url");
  const sig = createHash("sha256")
    .update(`${body}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? "radar"}`)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function parseOAuthState(state: string): {
  companyId: string;
  platform: OAuthPlatform;
  userId: string;
} | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHash("sha256")
    .update(`${body}:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? "radar"}`)
    .digest("base64url");
  if (expected !== sig) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as {
      companyId?: string;
      platform?: string;
      userId?: string;
      ts?: number;
    };
    if (
      !parsed.companyId ||
      !parsed.userId ||
      (parsed.platform !== "ifood" && parsed.platform !== "mercadolivre")
    ) {
      return null;
    }
    if (parsed.ts && Date.now() - parsed.ts > 1000 * 60 * 30) return null;
    return {
      companyId: parsed.companyId,
      platform: parsed.platform,
      userId: parsed.userId,
    };
  } catch {
    return null;
  }
}

export function mercadolivreAuthUrl(state: string) {
  const clientId = process.env.MERCADOLIVRE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error(
      "Mercado Livre OAuth não configurado. Defina MERCADOLIVRE_CLIENT_ID.",
    );
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: oauthRedirectUri("mercadolivre"),
    state,
  });
  return `https://auth.mercadolivre.com.br/authorization?${params.toString()}`;
}

export async function exchangeMercadoLivreCode(code: string) {
  const clientId = process.env.MERCADOLIVRE_CLIENT_ID?.trim();
  const clientSecret = process.env.MERCADOLIVRE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Mercado Livre OAuth não configurado. Defina MERCADOLIVRE_CLIENT_ID e MERCADOLIVRE_CLIENT_SECRET.",
    );
  }

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: oauthRedirectUri("mercadolivre"),
    }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    user_id?: number | string;
    error?: string;
    message?: string;
  };
  if (!response.ok || !data.access_token) {
    throw new Error(
      data.message || data.error || `Falha OAuth Mercado Livre (${response.status})`,
    );
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    merchantId: data.user_id != null ? String(data.user_id) : null,
  };
}

export function ifoodAuthUrl(state: string) {
  const clientId = process.env.IFOOD_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("iFood OAuth não configurado. Defina IFOOD_CLIENT_ID.");
  }
  const params = new URLSearchParams({
    response_type: "code",
    clientId,
    redirectUri: oauthRedirectUri("ifood"),
    state,
  });
  // Portal de desenvolvedores iFood — fluxo authorization code.
  return `https://portal.ifood.com.br/oauth/authorize?${params.toString()}`;
}

export async function exchangeIfoodCode(code: string) {
  const clientId = process.env.IFOOD_CLIENT_ID?.trim();
  const clientSecret = process.env.IFOOD_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "iFood OAuth não configurado. Defina IFOOD_CLIENT_ID e IFOOD_CLIENT_SECRET.",
    );
  }

  const response = await fetch("https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grantType: "authorization_code",
      clientId,
      clientSecret,
      authorizationCode: code,
      authorizationCodeVerifier: process.env.IFOOD_CODE_VERIFIER?.trim() || "",
    }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    accessToken?: string;
    refreshToken?: string;
    merchantId?: string;
    error?: string;
    message?: string;
  };
  if (!response.ok || !data.accessToken) {
    throw new Error(
      data.message || data.error || `Falha OAuth iFood (${response.status})`,
    );
  }
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? null,
    merchantId: data.merchantId ?? null,
  };
}
