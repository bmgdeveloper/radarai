import { NextResponse, type NextRequest } from "next/server";
import { ensureUserCompany } from "@/lib/auth/ensure-company";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/onboarding";
  }
  return value;
}

/** Troca o code do e-mail (confirm/reset) por sessão e retoma o onboarding. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
      );
    }

    try {
      await ensureUserCompany(supabase);
    } catch {
      // Empresa pode ser criada no onboarding; sessão já está ok.
    }

    return NextResponse.redirect(new URL(next, url.origin));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao confirmar sessão.";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, url.origin),
    );
  }
}
