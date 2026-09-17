"use client";

import { useState } from "react";
import {
  updatePasswordAction,
  updateProfileAction,
} from "@/app/dashboard/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProfileForm({
  name,
  companyName,
  email,
  whatsappNumber,
}: {
  name: string;
  companyName: string;
  email: string;
  whatsappNumber: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveProfile(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await updateProfileAction(formData);
    if (result.error) setError(result.error);
    else setMessage("Perfil atualizado.");
    setPending(false);
  }

  async function savePassword(formData: FormData) {
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await updatePasswordAction(formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div className="grid max-w-xl gap-8">
      <form action={saveProfile} className="grid gap-4 rounded-2xl border border-border/70 bg-card p-4">
        <div className="grid gap-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" required defaultValue={name} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="companyName">Nome da empresa</Label>
          <Input
            id="companyName"
            name="companyName"
            required
            defaultValue={companyName}
          />
        </div>
        <div className="grid gap-2">
          <Label>E-mail</Label>
          <Input value={email} disabled readOnly />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="whatsapp">WhatsApp de alertas</Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            defaultValue={whatsappNumber}
            placeholder="5511999999999"
          />
        </div>
        <Button type="submit" disabled={pending}>
          Salvar perfil
        </Button>
      </form>

      <form action={savePassword} className="grid gap-4 rounded-2xl border border-border/70 bg-card p-4">
        <p className="text-sm font-medium">Alterar senha</p>
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
        <Button type="submit" variant="secondary" disabled={pending}>
          Atualizar senha
        </Button>
      </form>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </div>
  );
}
