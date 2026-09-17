"use server";

import { redirect } from "next/navigation";
import { getAuthContext, nextAppPath } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://127.0.0.1:3000";
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
      return { error: error.message };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha no login." };
  }

  redirect(nextAppPath(await getAuthContext()));
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

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, company_name: companyName },
        emailRedirectTo: `${appUrl()}/onboarding`,
      },
    });

    if (error) return { error: error.message };
    if (!data.session) {
      return {
        ok: true as const,
        needsEmailConfirmation: true as const,
        email,
        message:
          "Enviamos um e-mail de ativação. Abra a mensagem, clique no link para confirmar o cadastro e depois faça login.",
      };
    }

    const { error: companyError } = await supabase.rpc("create_company", {
      p_name: companyName,
      p_cnpj: null,
    });
    if (companyError && !companyError.message.includes("already belongs")) {
      return { error: companyError.message };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha no cadastro." };
  }

  const params = new URLSearchParams();
  if (plan) params.set("plan", plan);
  if (cycle) params.set("cycle", cycle);
  const next = params.size ? `/onboarding?${params.toString()}` : "/onboarding";
  redirect(next);
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Informe o e-mail." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl()}/reset-password`,
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

  redirect("/dashboard");
}

export async function logoutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Sem Supabase configurado, só encerra a sessão local.
  }
  redirect("/");
}
