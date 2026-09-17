const GRAPH_API_VERSION = "v19.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

type GraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
};

type GraphMessageSuccess = {
  messaging_product?: string;
  contacts?: Array<{ input?: string; wa_id?: string }>;
  messages?: Array<{ id?: string; message_status?: string }>;
};

export type WhatsAppTemplateResult = {
  messageId: string;
  waId?: string;
  raw: GraphMessageSuccess;
};

function requireMetaEnv() {
  const token = process.env.META_WA_TOKEN?.trim();
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID?.trim();

  if (!token || !phoneNumberId) {
    throw new Error(
      "Meta WhatsApp não configurado: defina META_WA_TOKEN e META_WA_PHONE_NUMBER_ID.",
    );
  }

  return { token, phoneNumberId };
}

function normalizeWaNumber(to: string) {
  const digits = to.replace(/\D/g, "");
  if (!digits) {
    throw new Error("Número de WhatsApp inválido.");
  }
  return digits;
}

export async function sendWhatsAppTemplateNotification(
  to: string,
  templateName: string,
  parameters: string[],
): Promise<WhatsAppTemplateResult> {
  const { token, phoneNumberId } = requireMetaEnv();
  const recipient = normalizeWaNumber(to);
  const name = templateName.trim();

  if (!name) {
    throw new Error("Nome do template WhatsApp é obrigatório.");
  }

  const bodyParameters = parameters
    .map((value) => value.trim())
    .filter(Boolean)
    .map((text) => ({ type: "text" as const, text }));

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template: {
      name,
      language: { code: "pt_BR" },
      ...(bodyParameters.length > 0
        ? {
            components: [
              {
                type: "body",
                parameters: bodyParameters,
              },
            ],
          }
        : {}),
    },
  };

  const response = await fetch(
    `${GRAPH_API_BASE}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const data = (await response.json().catch(() => ({}))) as
    | GraphMessageSuccess
    | GraphErrorBody;

  if (!response.ok) {
    const graphError = "error" in data ? data.error : undefined;
    const message =
      graphError?.message ||
      `Falha ao enviar template WhatsApp (HTTP ${response.status}).`;
    throw new Error(message);
  }

  const success = data as GraphMessageSuccess;
  const messageId = success.messages?.[0]?.id?.trim() ?? "";

  if (!messageId) {
    throw new Error("A Meta não retornou o ID da mensagem WhatsApp.");
  }

  return {
    messageId,
    waId: success.contacts?.[0]?.wa_id,
    raw: success,
  };
}
