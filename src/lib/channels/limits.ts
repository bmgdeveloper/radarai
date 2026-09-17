import { CHANNEL_FIELDS } from "@/lib/channels/fields";
import { PLANS, type PlanTier } from "@/lib/billing/plans";
import {
  CHANNEL_PLATFORMS,
  isChannelPlatform,
  type ChannelPlatform,
} from "@/services/scrapers/types";

export function usedPlatforms(
  channels: Array<{ platform: string }>,
): ChannelPlatform[] {
  const seen = new Set<ChannelPlatform>();
  for (const row of channels) {
    if (isChannelPlatform(row.platform)) seen.add(row.platform);
  }
  return CHANNEL_PLATFORMS.filter((platform) => seen.has(platform));
}

export function unusedPlatforms(
  channels: Array<{ platform: string }>,
): ChannelPlatform[] {
  const used = new Set(usedPlatforms(channels));
  return CHANNEL_PLATFORMS.filter((platform) => !used.has(platform));
}

export function channelLimitError(
  tier: PlanTier,
  existing: Array<{ platform: string }>,
  platform: ChannelPlatform,
): string | null {
  if (usedPlatforms(existing).includes(platform)) {
    const label = CHANNEL_FIELDS[platform]?.label ?? platform;
    return `Já existe um canal de ${label}. Só é permitido 1 de cada plataforma.`;
  }
  if (existing.length >= PLANS[tier].maxChannels) {
    return tier === "start"
      ? "Limite do plano Start atingido (até 2 canais). Faça upgrade para o Pro."
      : "Todas as plataformas já estão cadastradas. Faça upgrade se precisar de mais canais.";
  }
  return null;
}

export function planChannelLimitMessage(tier: PlanTier, atLimit: boolean) {
  if (!atLimit) {
    return tier === "start"
      ? "Plano Start: até 2 canais, sem repetir a mesma plataforma."
      : "Plano Pro: 1 canal de cada plataforma disponível.";
  }
  return tier === "start"
    ? "Limite de 2 canais do plano Start atingido. Faça upgrade para o Pro."
    : "Todas as plataformas já estão cadastradas.";
}
