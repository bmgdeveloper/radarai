"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { loginAction, signupAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isBillingCycle, isPlanTier } from "@/lib/billing/plans";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function action(formData: FormData) {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
        setIsLoading(false);
      }
      // Em sucesso o server action faz redirect — mantém loading.
    } catch {
      setError("Falha no login. Tente novamente.");
      setIsLoading(false);
    }
  }

  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={isLoading}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          disabled={isLoading}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 data-icon="inline-start" className="animate-spin" />
            Carregando…
          </>
        ) : (
          "Entrar"
        )}
      </Button>
      <Link
        href="/reset-password"
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Esqueci minha senha
      </Link>
    </form>
  );
}

export function SignupForm({
  defaultPlan,
  defaultCycle,
}: {
  defaultPlan?: string;
  defaultCycle?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    email: string;
    message: string;
  } | null>(null);

  async function action(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await signupAction(formData);
    if (result?.needsEmailConfirmation) {
      setConfirmation({
        email: result.email,
        message: result.message,
      });
      setPending(false);
      return;
    }
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  if (confirmation) {
    return (
      <div className="grid gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        <p className="font-semibold">Ative sua conta pelo e-mail</p>
        <p>
          Conta criada para <strong>{confirmation.email}</strong>. {confirmation.message}
        </p>
        <p className="text-emerald-900/80">
          Se o e-mail não aparecer em alguns minutos, confira a caixa de spam ou o
          lixo eletrônico.
        </p>
        <Link
          href="/login"
          className="font-medium text-emerald-950 underline-offset-4 hover:underline"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      {isPlanTier(defaultPlan ?? "") ? (
        <input type="hidden" name="plan" value={defaultPlan} />
      ) : null}
      {isBillingCycle(defaultCycle ?? "") ? (
        <input type="hidden" name="cycle" value={defaultCycle} />
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="name">Seu nome</Label>
        <Input id="name" name="name" required autoComplete="name" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="companyName">Nome da empresa</Label>
        <Input id="companyName" name="companyName" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-zinc-600">
        <input
          type="checkbox"
          name="acceptTerms"
          required
          className="mt-1 size-4 rounded border-zinc-300"
        />
        <span>
          Li e aceito os{" "}
          <Link
            href="/termos"
            target="_blank"
            className="font-medium text-zinc-950 underline-offset-4 hover:underline"
          >
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link
            href="/privacidade"
            target="_blank"
            className="font-medium text-zinc-950 underline-offset-4 hover:underline"
          >
            Política de Privacidade (LGPD)
          </Link>
          .
        </span>
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Criando conta…" : "Criar conta"}
      </Button>
    </form>
  );
}
