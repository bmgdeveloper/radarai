"use client";

import { useEffect, useState } from "react";
import {
  requestPasswordResetAction,
  updatePasswordAction,
} from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const [mode, setMode] = useState<"request" | "update">("request");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    try {
      const supabase = createClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") setMode("update");
      });
      return () => subscription.unsubscribe();
    } catch {
      return undefined;
    }
  }, []);

  async function requestReset(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await requestPasswordResetAction(formData);
    if (result.error) setError(result.error);
    else setMessage(result.message ?? "E-mail enviado.");
    setPending(false);
  }

  async function updatePassword(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await updatePasswordAction(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  if (mode === "update") {
    return (
      <form action={updatePassword} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="password">Nova senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirm">Confirmar senha</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Redefinir senha"}
        </Button>
      </form>
    );
  }

  return (
    <form action={requestReset} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar link de redefinição"}
      </Button>
    </form>
  );
}
