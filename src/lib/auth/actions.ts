"use server";

import { redirect } from "next/navigation";
import { ensureUserCompany } from "@/lib/auth/ensure-company";
import { getAuthContext, nextAppPath } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://127.0.0.1:3000";
}

function authCallbackUrl(next = "/onboarding") {
  const path = next.startsWith("/") ? next : `/${next}`;
  return `${appUrl()}/auth/callback?next=${encodeURIComponent(path)}`;
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const raw = error.message.toLowerCase();
      if (raw.includes("email not confirmed") || raw.includes("email_not_confirmed")) {
        return {
          error:
            "Seu cadastro ainda não foi ativado. Abra o e-mail que enviamos, clique no link de confirmação e tente entrar de novo.",
        };
      }
      if (
        raw.includes("invalid login") ||
        raw.includes("invalid credentials") ||
        raw.includes("invalid_credentials")
      ) {
        return { error: "E-mail ou senha incorretos." };
      }
      if (raw.includes("too many requests") || raw.includes("rate limit")) {
        return {
          error: "Muitas tentativas de login. Aguarde um momento e tente de novo.",
        };
      }
      if (raw.includes("user banned") || raw.includes("banned")) {
        return { error: "Esta conta está temporariamente bloqueada." };
      }
      if (raw.includes("network") || raw.includes("fetch")) {
        return {
          error: "Falha de conexão. Verifique sua internet e tente novamente.",
        };
      }
      // Evita códigos/inglês cru na UI
      if (/^[a-z0-9_ .-]+$/i.test(error.message) && /[a-z]/i.test(error.message)) {
        return {
          error:
            "Não foi possível entrar. Confira e-mail e senha ou recupere a senha.",
        };
      }
      return { error: error.message };
    }

    try {
      await ensureUserCompany(supabase);
    } catch {
      // Onboarding cobre a criação da empresa se necessário.
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha no login." };
  }

  const context = await getAuthContext().catch(() => null);
  redirect(nextAppPath(context) || "/onboarding");
}

export async function signupAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("companyName") ?? "").trim();
  const plan = String(formData.get("plan") ?? "").trim();
  const cycle = String(formData.get("cycle") ?? "").trim();

  const acceptedTerms = formData.get("acceptTerms") === "on";

  if (!name || !email || !password || !companyName) {
    return { error: "Preencha nome, e-mail, senha e empresa." };
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (!acceptedTerms) {
    return {
      error: "Para criar a conta, aceite os Termos de Uso e Prestação de Serviços.",
    };
  }

  const params = new URLSearchParams();
  if (plan) params.set("plan", plan);
  if (cycle) params.set("cycle", cycle);
  const onboardingPath = params.size
    ? `/onboarding?${params.toString()}`
    : "/onboarding";

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, company_name: companyName },
        emailRedirectTo: authCallbackUrl(onboardingPath),
      },
    });

    if (error) return { error: error.message };

    // Conta já existente: Supabase pode devolver user sem identities novas.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      return {
        error:
          "Este e-mail já possui conta. Faça login para continuar a configuração de onde parou.",
      };
    }

    if (!data.session) {
      return {
        ok: true as const,
        needsEmailConfirmation: true as const,
        email,
        message:
          "Enviamos um e-mail de ativação. Abra a mensagem, clique no link para confirmar o cadastro e depois faça login — você volta de onde parou no onboarding.",
      };
    }

    try {
      await ensureUserCompany(supabase);
    } catch (companyError) {
      const message =
        companyError instanceof Error
          ? companyError.message
          : "Falha ao criar a empresa.";
      if (!/already belongs/i.test(message)) {
        return { error: message };
      }
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha no cadastro." };
  }

  redirect(onboardingPath);
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Informe o e-mail." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl("/reset-password"),
    });
    if (error) return { error: error.message };
    return { ok: true as const, message: "Se o e-mail existir, enviamos o link de redefinição." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao enviar o e-mail." };
  }
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." };
  }
  if (password !== confirm) {
    return { error: "As senhas não conferem." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao atualizar a senha." };
  }

  const context = await getAuthContext().catch(() => null);
  redirect(nextAppPath(context) || "/onboarding");
}

export async function logoutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Sem Supabase configurado, só encerra a sessão local.
  }
  redirect("/login");
}
