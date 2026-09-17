/**
 * Traduz códigos/mensagens do Mercado Pago (SDK + API) para PT-BR amigável.
 */
export function mapMercadoPagoError(code: string | number | null | undefined): string {
  if (code === null || code === undefined || code === "") {
    return "Não foi possível processar o cartão. Confira os dados e tente novamente.";
  }

  const key = String(code).trim();
  const normalized = key.toLowerCase();

  const errors: Record<string, string> = {
    // Validação de campos (SDK / card form)
    "205": "Digite o número do seu cartão de crédito.",
    "208": "Escolha o mês de vencimento do cartão.",
    "209": "Escolha o ano de vencimento do cartão.",
    "212": "Informe o tipo de documento do titular.",
    "213": "Informe o documento do titular do cartão.",
    "214": "Informe o CPF do titular do cartão.",
    "220": "Informe o banco emissor do cartão.",
    "221": "Digite o nome impresso no cartão.",
    "224": "Digite o código de segurança (CVV).",
    e301: "Número de cartão inválido. Por favor, confira os dígitos digitados.",
    e302: "Verifique o código de segurança (CVV).",
    "316": "Nome do titular inválido. Use o nome impresso no cartão.",
    "322": "Tipo de documento inválido.",
    "323": "Verifique o CPF informado.",
    "324": "CPF inválido. Confira os dígitos.",
    "325": "Mês de vencimento inválido.",
    "326": "Ano de vencimento inválido.",
    cc_val_433: "Número de cartão inválido. Por favor, confira os dígitos digitados.",
    "cc_val_433": "Número de cartão inválido. Por favor, confira os dígitos digitados.",

    // Recusas comuns de pagamento / assinatura
    "106": "Não foi possível processar o pagamento. Tente outro cartão.",
    "109": "Este cartão não pode ser usado nesta operação. Tente outro cartão.",
    "126": "Não conseguimos processar o pagamento. Tente novamente em instantes.",
    "129": "O valor da operação não é aceito para este cartão.",
    "145": "Uma das partes da operação está inválida. Tente novamente.",
    "150": "O titular do cartão não pode realizar pagamentos.",
    "151": "Cartão sem limite suficiente para esta operação.",
    "160": "Não foi possível processar o pagamento. Tente outro cartão.",
    "204": "Meio de pagamento indisponível. Tente outro cartão.",
    "801": "Já existe um pagamento em andamento. Aguarde alguns minutos.",

    // Status / mensagens frequentes em inglês
    rejected: "Pagamento recusado pelo emissor. Tente outro cartão ou fale com o banco.",
    "cc_rejected_bad_filled_card_number":
      "Número de cartão inválido. Confira os dígitos digitados.",
    "cc_rejected_bad_filled_date": "Data de validade incorreta.",
    "cc_rejected_bad_filled_security_code": "CVV incorreto. Verifique o código de segurança.",
    "cc_rejected_bad_filled_other":
      "Dados do cartão incorretos. Revise as informações e tente novamente.",
    "cc_rejected_blacklist": "Não foi possível processar este cartão. Tente outro.",
    "cc_rejected_call_for_authorize":
      "Seu banco pediu autorização. Ligue para o banco e tente novamente.",
    "cc_rejected_card_disabled": "Cartão desabilitado. Entre em contato com o banco.",
    "cc_rejected_duplicated_payment":
      "Pagamento duplicado detectado. Aguarde ou use outro cartão.",
    "cc_rejected_high_risk":
      "Pagamento recusado por segurança. Tente outro cartão.",
    "cc_rejected_insufficient_amount": "Cartão sem limite suficiente.",
    "cc_rejected_invalid_installments": "Parcelamento inválido para este cartão.",
    "cc_rejected_max_attempts":
      "Muitas tentativas. Aguarde alguns minutos ou use outro cartão.",
    "cc_rejected_other_reason":
      "Pagamento recusado pelo emissor. Tente outro cartão.",
  };

  if (errors[key]) return errors[key];
  if (errors[normalized]) return errors[normalized];

  // Fallbacks por trecho da mensagem
  if (/invalid card number|card number/i.test(key)) {
    return "Número de cartão inválido. Por favor, confira os dígitos digitados.";
  }
  if (/security code|cvv|cvc/i.test(key)) {
    return "Verifique o código de segurança (CVV).";
  }
  if (/expiration|expiry|validat/i.test(key)) {
    return "Data de validade inválida. Confira mês e ano.";
  }
  if (/insufficient/i.test(key)) {
    return "Cartão sem limite suficiente.";
  }
  if (/unauthorized|not authorized/i.test(key)) {
    return "Não autenticado. Faça login novamente e tente o checkout.";
  }

  // Evita jogar inglês cru na tela
  if (/^[a-z0-9_ .-]+$/i.test(key) && /[a-z]/i.test(key) && !/[à-ú]/i.test(key)) {
    return "Não foi possível processar o cartão. Confira os dados e tente novamente.";
  }

  return key;
}

type MpCause = {
  code?: string | number;
  description?: string;
  message?: string;
};

/** Extrai a melhor mensagem PT-BR de um erro do SDK/API do Mercado Pago. */
export function friendlyMercadoPagoError(input: unknown): string {
  if (input == null) {
    return mapMercadoPagoError(null);
  }

  if (typeof input === "string" || typeof input === "number") {
    return mapMercadoPagoError(input);
  }

  if (input instanceof Error) {
    return friendlyMercadoPagoError(input.message);
  }

  if (typeof input === "object") {
    const record = input as Record<string, unknown>;
    const causes = record.cause;
    if (Array.isArray(causes) && causes.length > 0) {
      const first = causes[0] as MpCause;
      if (first?.code != null) return mapMercadoPagoError(first.code);
      if (first?.description) return mapMercadoPagoError(first.description);
      if (first?.message) return mapMercadoPagoError(first.message);
    }
    if (record.error != null) return mapMercadoPagoError(String(record.error));
    if (record.message != null) return mapMercadoPagoError(String(record.message));
    if (record.code != null) return mapMercadoPagoError(String(record.code));
  }

  return mapMercadoPagoError(null);
}
