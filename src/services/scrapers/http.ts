export type JsonGet = (
  url: string,
) => Promise<{ status: number; data: unknown; text: string }>;

export type BrowserRequestOpts = {
  url: string;
  method?: "GET" | "POST";
  form?: Record<string, string>;
  origin: string;
  referer: string;
  session?: object;
  cookie?: string;
  headers?: Record<string, string>;
};

export type BrowserResponse = {
  status: number;
  data: unknown;
  text: string;
  setCookie: string[];
};

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function parseBody(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export function mergeCookies(prev: string | undefined, setCookie: string[]): string {
  const map = new Map<string, string>();
  for (const part of (prev ?? "").split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) map.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  for (const raw of setCookie) {
    const nv = String(raw).split(";")[0] ?? "";
    const eq = nv.indexOf("=");
    if (eq > 0) map.set(nv.slice(0, eq).trim(), nv.slice(eq + 1));
  }
  return [...map.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

function headerCookies(value: unknown): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

export async function browserRequest(
  opts: BrowserRequestOpts,
): Promise<BrowserResponse> {
  let cookie = opts.cookie;
  const session = opts.session as { cookie?: string } | undefined;
  if (!cookie && session?.cookie) cookie = session.cookie;

  const body = opts.form ? new URLSearchParams(opts.form).toString() : undefined;
  const response = await fetch(opts.url, {
    method: opts.method ?? "GET",
    headers: {
      Accept: "application/json, text/html;q=0.9, */*;q=0.8",
      "User-Agent": CHROME_UA,
      Origin: opts.origin,
      Referer: opts.referer,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...opts.headers,
    },
    body,
    cache: "no-store",
    redirect: "follow",
  });
  const text = await response.text();
  const setCookieHeader =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : response.headers.get("set-cookie");
  const result: BrowserResponse = {
    status: response.status,
    data: parseBody(text),
    text,
    setCookie: headerCookies(setCookieHeader),
  };

  if (session) {
    session.cookie = mergeCookies(session.cookie, result.setCookie);
  }
  return result;
}

export const browserJsonGet: JsonGet = async (url) => {
  return browserRequest({
    url,
    origin: "https://www.reclameaqui.com.br",
    referer: "https://www.reclameaqui.com.br/",
    headers: { Accept: "application/json, text/plain, */*" },
  });
};

/** Fetch JSON com headers de navegador (sem got-scraping). */
export async function nativeJsonGet(url: string): Promise<{
  status: number;
  data: unknown;
  text: string;
}> {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    redirect: "follow",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": CHROME_UA,
      Origin: "https://www.reclameaqui.com.br",
      Referer: "https://www.reclameaqui.com.br/",
    },
  });
  const text = await response.text();
  return {
    status: response.status,
    data: parseBody(text),
    text,
  };
}
