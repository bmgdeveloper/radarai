import { sendWhatsAppTemplateNotification } from "@/services/meta/whatsappService";

const DEFAULT_ALERT_TEMPLATE = "radar_alert";

function alertTemplateName() {
  return process.env.META_WA_ALERT_TEMPLATE?.trim() || DEFAULT_ALERT_TEMPLATE;
}

function truncate(value: string, max = 80) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export async function notifyNegativeFeedback(options: {
  companyName: string;
  whatsappNumber: string | null | undefined;
  author: string | null;
  rating: number | null;
  text: string | null;
  summary?: string | null;
}): Promise<boolean> {
  if (!options.whatsappNumber?.trim()) {
    console.warn("[whatsapp-alert] alerta sem whatsapp_number", {
      companyName: options.companyName,
    });
    return false;
  }

  try {
    await sendWhatsAppTemplateNotification(
      options.whatsappNumber,
      alertTemplateName(),
      [
        options.companyName,
        String(options.rating ?? "-"),
        options.author ?? "Cliente",
        truncate(options.summary || options.text || "sem comentário"),
      ],
    );
    return true;
  } catch (error) {
    console.error("[whatsapp-alert] falha ao enviar WhatsApp", {
      companyName: options.companyName,
      message: error instanceof Error ? error.message : "erro desconhecido",
    });
    return false;
  }
}
