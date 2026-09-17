"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  addChannelAction,
  deleteChannelAction,
  saveWhatsAppAction,
} from "@/app/dashboard/settings/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CHANNEL_FIELDS, isOAuthPlatform, oauthConnectPath } from "@/lib/channels/fields";
import { planChannelLimitMessage, unusedPlatforms } from "@/lib/channels/limits";
import { PLATFORM_LABELS } from "@/lib/dashboard/types";
import { PLANS, type PlanTier } from "@/lib/billing/plans";
import type { ChannelPlatform } from "@/services/scrapers/types";

type ChannelRow = {
  id: string;
  platform: ChannelPlatform;
  url_or_app_id: string;
  is_active: boolean;
  auth_type?: "link" | "oauth" | null;
};

export function SettingsClient({
  channels,
  whatsappNumber,
  minRatingTrigger,
  canManageChannels,
  planTier,
}: {
  channels: ChannelRow[];
  whatsappNumber: string | null;
  minRatingTrigger: number;
  canManageChannels: boolean;
  planTier: PlanTier;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const available = unusedPlatforms(channels);
  const atLimit = channels.length >= PLANS[planTier].maxChannels;
  const canAdd = canManageChannels && available.length > 0 && !atLimit;
  const [platform, setPlatform] = useState<ChannelPlatform>(
    available[0] ?? "playstore",
  );
  const selectedPlatform = available.includes(platform)
    ? platform
    : (available[0] ?? "playstore");
  const field = CHANNEL_FIELDS[selectedPlatform];
  const oauthSelected = isOAuthPlatform(selectedPlatform);
  const platformOptions = available.map((value) => ({
    value,
    label: CHANNEL_FIELDS[value].label,
  }));

  useEffect(() => {
    const nextError = searchParams.get("error");
    const nextMessage = searchParams.get("message");
    if (nextError) setError(nextError);
    if (nextMessage) setMessage(nextMessage);
  }, [searchParams]);

  function run(action: () => Promise<{ error?: string; message?: string; ok?: boolean }>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Salvo.");
      router.refresh();
    });
  }

  return (
    <Tabs defaultValue="channels" className="gap-4">
      <TabsList>
        <TabsTrigger value="channels">Canais monitorados</TabsTrigger>
        <TabsTrigger value="alerts">Alertas WhatsApp</TabsTrigger>
      </TabsList>

      <TabsContent value="channels" className="grid gap-4">
        <p className="rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
          {planChannelLimitMessage(planTier, false)}
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          <ul className="divide-y">
            {channels.length === 0 ? (
              <li className="p-4 text-sm text-muted-foreground">
                Nenhum canal cadastrado.
              </li>
            ) : (
              channels.map((channel) => (
                <li
                  key={channel.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {PLATFORM_LABELS[channel.platform]}
                      </Badge>
                      <Badge variant={channel.is_active ? "secondary" : "outline"}>
                        {channel.is_active ? "Ativo" : "Pausado"}
                      </Badge>
                      {channel.auth_type === "oauth" || isOAuthPlatform(channel.platform) ? (
                        <Badge variant="outline">Conta oficial</Badge>
                      ) : null}
                    </div>
                    <Input
                      readOnly
                      value={
                        channel.auth_type === "oauth" || isOAuthPlatform(channel.platform)
                          ? "Conta conectada via OAuth"
                          : channel.url_or_app_id
                      }
                      className="mt-2 bg-muted"
                    />
                  </div>
                  <div className="flex gap-2">
                    {canManageChannels ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => run(() => deleteChannelAction(channel.id))}
                      >
                        Remover
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
        {canAdd ? (
          <form
            className="grid max-w-xl gap-4 rounded-2xl border border-border/70 bg-card p-4"
            action={(formData) => {
              if (oauthSelected) return;
              run(() => addChannelAction(formData));
            }}
          >
            <input type="hidden" name="platform" value={selectedPlatform} />
            <div className="grid gap-2">
              <Label>Nova fonte</Label>
              <Select
                value={selectedPlatform}
                items={platformOptions}
                onValueChange={(value) =>
                  setPlatform((value as ChannelPlatform | null) ?? selectedPlatform)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {platformOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {oauthSelected ? (
              <div className="grid gap-3">
                <p className="text-sm text-muted-foreground">
                  {field.label} exige autorização oficial. Conecte a conta da loja
                  para liberar a coleta via API.
                </p>
                <a
                  href={oauthConnectPath(
                    selectedPlatform as "ifood" | "mercadolivre",
                  )}
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"
                >
                  Conectar Conta Oficial
                </a>
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="urlOrAppId">URL / Link da empresa</Label>
                  <Input
                    id="urlOrAppId"
                    name="urlOrAppId"
                    required
                    placeholder={field.placeholder}
                  />
                </div>
                <Button type="submit" disabled={pending}>
                  {pending ? "Adicionando e coletando…" : "Adicionar canal"}
                </Button>
              </>
            )}
          </form>
        ) : canManageChannels ? (
          <div className="grid gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p>{planChannelLimitMessage(planTier, true)}</p>
            {atLimit && planTier === "start" ? (
              <Link
                href="/dashboard/financial"
                className="font-medium underline underline-offset-4"
              >
                Fazer upgrade para o Pro
              </Link>
            ) : null}
            <Button type="button" disabled className="w-fit">
              Adicionar canal
            </Button>
          </div>
        ) : null}
      </TabsContent>

      <TabsContent value="alerts">
        <form
          className="grid max-w-xl gap-4 rounded-2xl border border-border/70 bg-card p-4"
          action={(formData) => run(() => saveWhatsAppAction(formData))}
        >
          <div className="grid gap-2">
            <Label htmlFor="whatsapp">WhatsApp (formato internacional)</Label>
            <Input
              id="whatsapp"
              name="whatsapp"
              required
              defaultValue={whatsappNumber ?? ""}
              placeholder="5511999999999"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="minRating">Disparar alerta quando</Label>
            <select
              id="minRating"
              name="minRating"
              defaultValue={String(minRatingTrigger)}
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            >
              <option value="1">Apenas nota 1</option>
              <option value="2">Notas ≤ 2</option>
              <option value="3">Todas as reclamações negativas (≤ 3)</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              Salvar alertas
            </Button>
          </div>
        </form>
      </TabsContent>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
    </Tabs>
  );
}
