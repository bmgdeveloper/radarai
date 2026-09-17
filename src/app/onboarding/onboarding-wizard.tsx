"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addChannelAction,
  saveCompanyAction,
  saveWhatsAppAction,
  skipPaymentAction,
} from "@/app/onboarding/actions";
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
import { CardCheckoutDialog } from "@/components/billing/card-checkout-dialog";
import { PixCheckoutDialog } from "@/components/billing/pix-dialog";
import { CHANNEL_FIELDS } from "@/lib/channels/fields";
import { unusedPlatforms } from "@/lib/channels/limits";
import {
  CYCLE_LABELS,
  formatPlanPrice,
  isBillingCycle,
  isPlanTier,
  PLANS,
  type BillingCycle,
  type PlanTier,
} from "@/lib/billing/plans";
import type { CompanyRecord } from "@/lib/auth/session";
import type { ChannelPlatform } from "@/services/scrapers/types";

type ChannelRow = {
  id: string;
  platform: ChannelPlatform;
  url_or_app_id: string;
};

const STEPS = [
  "Empresa",
  "Primeiro canal",
  "WhatsApp",
  "Plano",
];

function startingStep(
  company: CompanyRecord | null,
  channels: ChannelRow[],
  whatsappNumber: string | null,
) {
  if (!company?.name) return 0;
  if (channels.length === 0) return 1;
  if (!whatsappNumber) return 2;
  return 3;
}

export function OnboardingWizard({
  company,
  channels,
  whatsappNumber,
  initialPlan,
  initialCycle,
  allowSkipPayment = false,
}: {
  company: CompanyRecord | null;
  channels: ChannelRow[];
  whatsappNumber: string | null;
  initialPlan?: string;
  initialCycle?: string;
  allowSkipPayment?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(() =>
    startingStep(company, channels, whatsappNumber),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const availablePlatforms = unusedPlatforms(channels);
  const [platform, setPlatform] = useState<ChannelPlatform>(
    availablePlatforms[0] ?? "playstore",
  );
  const [plan, setPlan] = useState<PlanTier>(
    isPlanTier(initialPlan) ? initialPlan : "pro",
  );
  const [cycle, setCycle] = useState<BillingCycle>(
    isBillingCycle(initialCycle) ? initialCycle : "monthly",
  );
  const [cardOpen, setCardOpen] = useState(false);
  const [pixOpen, setPixOpen] = useState(false);
  const [companyReady, setCompanyReady] = useState(Boolean(company?.name));
  const [channelReady, setChannelReady] = useState(channels.length > 0);
  const [whatsappReady, setWhatsappReady] = useState(Boolean(whatsappNumber));

  const selectedPlatform = availablePlatforms.includes(platform)
    ? platform
    : (availablePlatforms[0] ?? "playstore");
  const field = CHANNEL_FIELDS[selectedPlatform];
  const platformOptions = availablePlatforms.map((value) => ({
    value,
    label: CHANNEL_FIELDS[value].label,
  }));

  const canGoCheckout = useMemo(
    () => companyReady && channelReady && whatsappReady,
    [companyReady, channelReady, whatsappReady],
  );

  function run(
    action: () => Promise<{ error?: string; ok?: boolean }>,
    onOk?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onOk?.();
    });
  }

  async function startCheckout() {
    setCardOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="grid grid-cols-4 gap-2 text-center text-xs font-medium">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={
              index === step
                ? "rounded-full bg-zinc-950 px-2 py-1 text-white"
                : "rounded-full bg-zinc-100 px-2 py-1 text-zinc-500"
            }
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <form
          className="grid gap-4"
          action={(formData) =>
            run(
              () => saveCompanyAction(formData),
              () => {
                setCompanyReady(true);
                setStep(1);
              },
            )
          }
        >
          <div className="grid gap-2">
            <Label htmlFor="name">Nome da empresa</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={company?.name ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              name="cnpj"
              defaultValue={company?.cnpj ?? ""}
              placeholder="00.000.000/0000-00"
            />
          </div>
          <Button type="submit" disabled={pending}>
            Continuar
          </Button>
        </form>
      ) : null}

      {step === 1 ? (
        <form
          className="grid gap-4"
          action={(formData) =>
            run(
              () => addChannelAction(formData),
              () => {
                setChannelReady(true);
              },
            )
          }
        >
          <p className="rounded-xl border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
            Cadastre os canais que o Radar AI vai monitorar. As regras:
            <br />
            <strong className="text-foreground">Start</strong> — até 2 canais, sem
            repetir a mesma plataforma.
            <br />
            <strong className="text-foreground">Pro</strong> — 1 canal de cada
            plataforma.
            <br />
            Depois do pagamento os canais ficam travados. Inclua agora tudo o que
            precisa acompanhar.
          </p>
          <input type="hidden" name="planTier" value={plan} />
          {availablePlatforms.length > 0 ? (
            <>
          <input type="hidden" name="platform" value={selectedPlatform} />
          <div className="grid gap-2">
            <Label>Fonte de dados</Label>
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
          <div className="grid gap-2">
            <Label htmlFor="urlOrAppId">{field.label}</Label>
            <Input
              id="urlOrAppId"
              name="urlOrAppId"
              required
              placeholder={field.placeholder}
            />
          </div>
            </>
          ) : null}
          {channels.length > 0 ? (
            <ul className="grid gap-2 text-sm">
              {channels.map((channel) => (
                <li
                  key={channel.id}
                  className="rounded-lg border bg-background px-3 py-2"
                >
                  <span className="font-medium">
                    {CHANNEL_FIELDS[channel.platform]?.label ?? channel.platform}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {channel.url_or_app_id}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {channels.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {channels.length} canal(is) cadastrado(s)
              {availablePlatforms.length === 0
                ? ". Todas as plataformas já foram usadas."
                : ". Adicione outra plataforma ou continue."}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(0)}>
              Voltar
            </Button>
            <Button type="submit" disabled={pending || availablePlatforms.length === 0}>
              {pending ? "Salvando e coletando…" : "Salvar canal"}
            </Button>
            {channels.length > 0 ? (
              <Button type="button" variant="secondary" onClick={() => setStep(2)}>
                Continuar
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <form
          className="grid gap-4"
          action={(formData) =>
            run(
              () => saveWhatsAppAction(formData),
              () => {
                setWhatsappReady(true);
                setStep(3);
              },
            )
          }
        >
          <div className="grid gap-2">
            <Label htmlFor="whatsapp">WhatsApp com DDI</Label>
            <Input
              id="whatsapp"
              name="whatsapp"
              required
              defaultValue={whatsappNumber ?? ""}
              placeholder="5511999999999"
            />
          </div>
          <input type="hidden" name="minRating" value="2" />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button type="submit" disabled={pending}>
              Salvar WhatsApp
            </Button>
          </div>
        </form>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-4">
          <div className="inline-flex w-fit rounded-full bg-muted p-1 text-sm">
            {(["monthly", "quarterly"] as BillingCycle[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCycle(item)}
                className={`rounded-full px-3 py-1 ${
                  cycle === item ? "bg-zinc-950 text-white" : "text-zinc-500"
                }`}
              >
                {item === "quarterly" ? "Trimestral — desconto" : "Mensal"}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.values(PLANS) as Array<(typeof PLANS)[PlanTier]>).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPlan(item.id)}
                className={`rounded-xl border p-4 text-left ${
                  plan === item.id
                    ? "border-zinc-950 ring-2 ring-zinc-950"
                    : "border-border"
                }`}
              >
                <p className="font-medium">{item.name}</p>
                <p className="mt-1 text-2xl font-semibold">
                  {formatPlanPrice(item.prices[cycle])}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{CYCLE_LABELS[cycle].toLowerCase()}
                  </span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{item.channels}</p>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Voltar
            </Button>
            <Button
              type="button"
              disabled={pending || !canGoCheckout}
              onClick={startCheckout}
            >
              Começar teste grátis
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending || !canGoCheckout}
              onClick={() => setPixOpen(true)}
            >
              Pagar com Pix
            </Button>
            {allowSkipPayment ? (
              <Button
                type="button"
                variant="outline"
                disabled={pending || !canGoCheckout}
                onClick={() =>
                  run(() => skipPaymentAction(plan, cycle))
                }
              >
                Continuar sem pagar
              </Button>
            ) : null}
          </div>
          {!canGoCheckout ? (
            <p className="text-sm text-muted-foreground">
              Complete empresa, um canal e o WhatsApp para assinar.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <CardCheckoutDialog
        open={cardOpen}
        onOpenChange={setCardOpen}
        defaultTier={plan}
        defaultCycle={cycle}
        title="Teste grátis com cartão"
      />
      <PixCheckoutDialog
        open={pixOpen}
        onOpenChange={setPixOpen}
        defaultTier={plan}
        defaultCycle={cycle}
        title="Pagar com Pix"
      />
    </div>
  );
}
