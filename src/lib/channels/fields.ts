export const CHANNEL_FIELDS: Record<
  string,
  { label: string; placeholder: string }
> = {
  reclameaqui: {
    label: "Reclame AQUI",
    placeholder: "https://www.reclameaqui.com.br/empresa/...",
  },
  consumidorgov: {
    label: "Consumidor.gov",
    placeholder: "https://www.consumidor.gov.br/pages/empresa/{id}/perfil",
  },
  playstore: {
    label: "Google Play Store",
    placeholder: "com.empresa.app",
  },
  appstore: {
    label: "Apple App Store",
    placeholder: "id123456789",
  },
  google: {
    label: "Google Meu Negócio / Places",
    placeholder: "ChIJ... ou URL do Google Maps",
  },
  ifood: {
    label: "iFood",
    placeholder: "https://www.ifood.com.br/delivery/...",
  },
  mercadolivre: {
    label: "Mercado Livre",
    placeholder: "https://produto.mercadolivre.com.br/MLB-123456789",
  },
  amazon: {
    label: "Amazon",
    placeholder: "https://www.amazon.com.br/dp/...",
  },
  app99: {
    label: "99",
    placeholder: "https://99app.com/... ou link da loja 99Food",
  },
};
