"use client";

import { useEffect, useState } from "react";
import { CreditCardForm } from "@/components/financial/CreditCardForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CYCLE_LABELS,
  formatPlanPrice,
  PLANS,
  type BillingCycle,
  type PlanTier,
} from "@/lib/billing/plans";

export function CardCheckoutDialog({
  open,
  onOpenChange,
  defaultTier,
  defaultCycle,
  title = "Assinar com cartão",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTier: PlanTier;
  defaultCycle: BillingCycle;
  title?: string;
}) {
  const [tier, setTier] = useState<PlanTier>(defaultTier);
  const [cycle, setCycle] = useState<BillingCycle>(defaultCycle);
  const [trialEligible, setTrialEligible] = useState(true);

  useEffect(() => {
    if (!open) return;
    setTier(defaultTier);
    setCycle(defaultCycle);
    let cancelled = false;
    fetch("/api/checkout/card")
      .then(async (response) => {
        const payload = (await response.json()) as { trialEligible?: boolean };
        if (!cancelled && typeof payload.trialEligible === "boolean") {
          setTrialEligible(payload.trialEligible);
        }
      })
      .catch(() => {
        if (!cancelled) setTrialEligible(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, defaultTier, defaultCycle]);

  const amount = PLANS[tier].prices[cycle];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto bg-white text-zinc-950 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {trialEligible ? title : "Assinar com cartão"}
          </DialogTitle>
          <DialogDescription>
            {trialEligible
              ? "Cartão de crédito com 7 dias de teste grátis via Mercado Pago."
              : "Este e-mail e empresa já usaram o teste grátis. A assinatura segue com cobrança do plano."}
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
              <Button
                key={item}
                type="button"
                variant={cycle === item ? "default" : "outline"}
                onClick={() => setCycle(item)}
                className="h-auto justify-start rounded-xl px-3 py-3 text-left text-sm"
              >
                {CYCLE_LABELS[item]} · {formatPlanPrice(PLANS[tier].prices[item])}
              </Button>
            ))}
          </div>
        </div>

        <CreditCardForm
          planTier={tier}
          billingCycle={cycle}
          planAmount={amount}
          trialEligible={trialEligible}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
