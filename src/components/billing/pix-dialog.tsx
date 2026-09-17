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

/** Legado — Pix desativado no trial; mantido só se algum fluxo antigo ainda abrir. */
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

  useEffect(() => {
    if (!open) return;
    setTier(defaultTier);
    setCycle(defaultCycle);
  }, [open, defaultTier, defaultCycle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white text-zinc-950 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Pix não está disponível para assinaturas com teste grátis. Use o
            checkout com cartão de crédito.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Plano selecionado: {PLANS[tier].name} · {CYCLE_LABELS[cycle]} (
          {formatPlanPrice(PLANS[tier].prices[cycle])}).
        </p>
        <Button type="button" onClick={() => onOpenChange(false)}>
          Fechar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
