import type { ChannelPlatform } from "@/services/scrapers/types";

export type ChannelAuthType = "link" | "oauth";

export const CHANNEL_FIELDS: Record<
  string,
  {
    label: string;
    placeholder: string;
    authType: ChannelAuthType;
  }
> = {
  reclameaqui: {
    label: "Reclame AQUI",
    placeholder: "https://www.reclameaqui.com.br/empresa/...",
    authType: "link",
  },
  consumidorgov: {
    label: "Consumidor.gov",
    placeholder: "https://www.consumidor.gov.br/pages/empresa/{id}/perfil",
    authType: "link",
  },
  playstore: {
    label: "Google Play Store",
    placeholder: "com.empresa.app",
    authType: "link",
  },
  appstore: {
    label: "Apple App Store",
    placeholder: "id123456789",
    authType: "link",
  },
  google: {
    label: "Google Meu Negócio / Places",
    placeholder: "ChIJ... ou URL do Google Maps",
    authType: "link",
  },
  ifood: {
    label: "iFood",
    placeholder: "Conecte a conta oficial do iFood",
    authType: "oauth",
  },
  mercadolivre: {
    label: "Mercado Livre",
    placeholder: "Conecte a conta oficial do Mercado Livre",
    authType: "oauth",
  },
  amazon: {
    label: "Amazon",
    placeholder: "https://www.amazon.com.br/dp/...",
    authType: "link",
  },
  app99: {
    label: "99",
    placeholder: "https://99app.com/... ou link da loja 99Food",
    authType: "link",
  },
};

export function isOAuthPlatform(platform: ChannelPlatform | string): boolean {
  return CHANNEL_FIELDS[platform]?.authType === "oauth";
}

export function oauthConnectPath(platform: "ifood" | "mercadolivre") {
  return `/api/integrations/${platform}/connect`;
}
