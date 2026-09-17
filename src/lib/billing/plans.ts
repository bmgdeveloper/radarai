import { CHANNEL_PLATFORMS } from "@/services/scrapers/types";

export const PLAN_TIERS = ["start", "pro"] as const;
export const BILLING_CYCLES = ["monthly", "quarterly"] as const;

export type PlanTier = (typeof PLAN_TIERS)[number];
export type BillingCycle = (typeof BILLING_CYCLES)[number];

/** @deprecated Use PlanTier */
export type PlanId = PlanTier;

export const PLANS = {
  start: {
    id: "start" as const,
    name: "Start",
    maxChannels: 2,
    prices: {
      monthly: 40,
      quarterly: 99.9,
    },
    channels: "Até 2 canais, sem repetir a plataforma",
    cadence: {
      monthly: "Coleta 1x/dia",
      quarterly: "Coleta 1x/dia",
    },
    features: [
      "Até 2 canais monitorados",
      "Sem repetir a mesma plataforma",
      "Análise de Sentimento Básica",
      "Notificação por e-mail e WhatsApp",
      "Coleta 1 vez ao dia",
      "Dashboard de reputação",
    ],
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    popular: true,
    maxChannels: CHANNEL_PLATFORMS.length,
    prices: {
      monthly: 70,
      quarterly: 199.9,
    },
    channels: "1 canal de cada plataforma",
    cadence: {
      monthly: "Coleta a cada 2h",
      quarterly: "Coleta a cada 2h",
    },
    features: [
      "1 canal de cada plataforma",
      "Análise Consolidada & Diagnóstico de Bugs por IA",
      "Alertas WhatsApp em tempo real",
      "Respostas sugeridas por IA",
      "Coleta a cada 2 horas",
    ],
  },
} as const;

export const CYCLE_DAYS: Record<BillingCycle, number> = {
  monthly: 30,
  quarterly: 90,
};

export const CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
};

export function isPlanTier(value: string | null | undefined): value is PlanTier {
  return value === "start" || value === "pro";
}

/** @deprecated Use isPlanTier */
export const isPlanId = isPlanTier;

export function isBillingCycle(
  value: string | null | undefined,
): value is BillingCycle {
  return value === "monthly" || value === "quarterly";
}

export function planPrice(tier: PlanTier, cycle: BillingCycle) {
  return PLANS[tier].prices[cycle];
}

export function formatPlanPrice(price: number) {
  return price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export function maxChannelsFor(tier: PlanTier | null | undefined) {
  if (!tier) return PLANS.start.maxChannels;
  return PLANS[tier].maxChannels;
}
