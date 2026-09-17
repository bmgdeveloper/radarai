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

async function fetchRequest(opts: BrowserRequestOpts): Promise<BrowserResponse> {
  const cookie = opts.cookie;
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
  return {
    status: response.status,
    data: parseBody(text),
    text,
    setCookie: headerCookies(setCookieHeader),
  };
}

async function scrapingRequest(opts: BrowserRequestOpts): Promise<BrowserResponse> {
  const { gotScraping } = await import("got-scraping");
  const base = {
    url: opts.url,
    method: opts.method ?? "GET",
    throwHttpErrors: false,
    sessionToken: opts.session ?? {},
    form: opts.form,
    timeout: { request: Number(process.env.FEEDBACK_HTTP_TIMEOUT_MS ?? 20000) },
    headerGeneratorOptions: {
      browsers: [{ name: "chrome" as const }],
      devices: ["desktop" as const],
      locales: ["pt-BR", "en-US"],
      operatingSystems: ["macos" as const, "windows" as const],
    },
    headers: {
      Accept: "application/json, text/html;q=0.9, */*;q=0.8",
      Origin: opts.origin,
      Referer: opts.referer,
      ...(opts.cookie ? { Cookie: opts.cookie } : {}),
      ...opts.headers,
    },
  };

  try {
    const response = await gotScraping({ ...base, http2: true });
    return toBrowserResponse(response);
  } catch {
    const response = await gotScraping({ ...base, http2: false });
    return toBrowserResponse(response);
  }
}

function toBrowserResponse(response: {
  statusCode: number;
  body: unknown;
  headers: Record<string, unknown>;
}): BrowserResponse {
  const text = typeof response.body === "string" ? response.body : String(response.body ?? "");
  return {
    status: response.statusCode,
    data: parseBody(text),
    text,
    setCookie: headerCookies(response.headers["set-cookie"]),
  };
}

export async function browserRequest(
  opts: BrowserRequestOpts,
): Promise<BrowserResponse> {
  let cookie = opts.cookie;
  const session = opts.session as { cookie?: string } | undefined;
  if (!cookie && session?.cookie) cookie = session.cookie;

  const requestOpts = { ...opts, cookie };
  let response = await fetchRequest(requestOpts);
  const blocked =
    response.status === 403 || /just a moment|cloudflare/i.test(response.text);
  if (blocked) {
    response = await scrapingRequest(requestOpts);
  }

  if (session) {
    session.cookie = mergeCookies(session.cookie, response.setCookie);
  }
  return response;
}

const reclameAquiSession = {};
let reclameAquiWarmed = false;

async function warmReclameAquiSession() {
  if (reclameAquiWarmed) return;
  await scrapingRequest({
    url: "https://www.reclameaqui.com.br/",
    session: reclameAquiSession,
    origin: "https://www.reclameaqui.com.br",
    referer: "https://www.reclameaqui.com.br/",
  });
  reclameAquiWarmed = true;
}

export const browserJsonGet: JsonGet = async (url) => {
  await warmReclameAquiSession();
  return browserRequest({
    url,
    session: reclameAquiSession,
    origin: "https://www.reclameaqui.com.br",
    referer: "https://www.reclameaqui.com.br/",
    headers: { Accept: "application/json, text/plain, */*" },
  });
};
