"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { skipPaymentAction } from "@/app/onboarding/actions";
import {
  CYCLE_LABELS,
  formatPlanPrice,
  PLANS,
  type BillingCycle,
  type PlanTier,
} from "@/lib/billing/plans";

export type PixPayload = {
  amount: number;
  credit?: number;
  kind?: string;
  qrCode?: string | null;
  qrCodeBase64?: string | null;
  paymentId?: string;
  activated?: boolean;
  error?: string;
};

export function PixCheckoutDialog({
  open,
  onOpenChange,
  defaultTier,
  defaultCycle,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTier: PlanTier;
  defaultCycle: BillingCycle;
  title: string;
}) {
  const [tier, setTier] = useState<PlanTier>(defaultTier);
  const [cycle, setCycle] = useState<BillingCycle>(defaultCycle);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pix, setPix] = useState<PixPayload | null>(null);

  useEffect(() => {
    if (!open) return;
    setTier(defaultTier);
    setCycle(defaultCycle);
    setPix(null);
    setError(null);
  }, [open, defaultTier, defaultCycle]);

  async function generate() {
    setPending(true);
    setError(null);
    setPix(null);
    try {
      const response = await fetch("/api/checkout/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier: tier, billingCycle: cycle }),
      });
      const payload = (await response.json()) as PixPayload;
      if (!response.ok || payload.error) {
        setError(payload.error || "Não foi possível gerar o Pix.");
        return;
      }
      setPix(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha no checkout.");
    } finally {
      setPending(false);
    }
  }

  async function skipPayment() {
    setPending(true);
    setError(null);
    const result = await skipPaymentAction(tier, cycle);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white text-zinc-950 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Pagamento via Pix no Mercado Pago. O plano é liberado quando o
            pagamento for aprovado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            {(Object.values(PLANS) as Array<(typeof PLANS)[PlanTier]>).map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setTier(plan.id)}
                className={`rounded-xl border p-3 text-left ${
                  tier === plan.id
                    ? "border-[#22D3EE] ring-2 ring-[#22D3EE]/40"
                    : "border-border"
                }`}
              >
                <p className="font-medium">{plan.name}</p>
                <p className="text-xs text-muted-foreground">{plan.channels}</p>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["monthly", "quarterly"] as BillingCycle[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCycle(item)}
                className={`rounded-xl border p-3 text-sm ${
                  cycle === item
                    ? "border-[#2547A8] ring-2 ring-[#2547A8]/30"
                    : "border-border"
                }`}
              >
                {CYCLE_LABELS[item]} · {formatPlanPrice(PLANS[tier].prices[item])}
              </button>
            ))}
          </div>
          <Button type="button" disabled={pending} onClick={generate}>
            {pending ? "Gerando Pix…" : "Gerar Pix"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={skipPayment}
          >
            Continuar sem pagar (teste)
          </Button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {pix?.activated ? (
          <p className="text-sm text-emerald-700">
            Assinatura ativada. O crédito do plano anterior cobriu o valor.
          </p>
        ) : null}

        {pix?.qrCodeBase64 ? (
          <div className="grid justify-items-center gap-3 rounded-xl bg-slate-50 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${pix.qrCodeBase64}`}
              alt="QR Code Pix"
              className="size-48 rounded-lg bg-white"
            />
            <p className="text-center text-sm font-medium">
              {formatPlanPrice(pix.amount)}
              {pix.credit ? ` · crédito ${formatPlanPrice(pix.credit)}` : ""}
            </p>
            {pix.qrCode ? (
              <textarea
                readOnly
                value={pix.qrCode}
                className="h-20 w-full rounded-lg border bg-white p-2 font-mono text-[11px]"
              />
            ) : null}
            <p className="text-center text-xs text-muted-foreground">
              Pix copia e cola. Após o pagamento, o webhook libera a assinatura.
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
