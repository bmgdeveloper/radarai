import { MercadoPagoConfig, Payment, PreApproval } from "mercadopago";
import type { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import type { PreApprovalResponse } from "mercadopago/dist/clients/preApproval/commonTypes";

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://127.0.0.1:3000";
}

function requireAccessToken() {
  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("Mercado Pago não configurado: defina MP_ACCESS_TOKEN.");
  }
  return token;
}

export function mercadoPagoClient() {
  return new MercadoPagoConfig({
    accessToken: requireAccessToken(),
    options: { timeout: 8000 },
  });
}

export type PixChargeResult = {
  id: string;
  status: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
};

function toPixCharge(payment: PaymentResponse): PixChargeResult {
  const tx = payment.point_of_interaction?.transaction_data;
  return {
    id: String(payment.id ?? ""),
    status: payment.status ?? "pending",
    qrCode: tx?.qr_code ?? null,
    qrCodeBase64: tx?.qr_code_base64 ?? null,
  };
}

export async function createPixPayment(input: {
  amount: number;
  description: string;
  email: string;
  companyId: string;
  planTier: string;
  billingCycle: string;
  kind: string;
  idempotencyKey: string;
}) {
  const api = new Payment(mercadoPagoClient());
  const payment = await api.create({
    body: {
      transaction_amount: Number(input.amount.toFixed(2)),
      description: input.description,
      payment_method_id: "pix",
      payer: { email: input.email },
      metadata: {
        company_id: input.companyId,
        plan_tier: input.planTier,
        billing_cycle: input.billingCycle,
        kind: input.kind,
      },
      notification_url: `${appUrl()}/api/webhooks/mercadopago`,
    },
    requestOptions: { idempotencyKey: input.idempotencyKey },
  });
  return toPixCharge(payment);
}

export async function getMercadoPagoPayment(id: string) {
  const api = new Payment(mercadoPagoClient());
  return api.get({ id });
}

export type CardSubscriptionResult = {
  id: string;
  status: string;
  nextPaymentDate: string | null;
};

function toCardSubscription(preapproval: PreApprovalResponse): CardSubscriptionResult {
  return {
    id: String(preapproval.id ?? ""),
    status: preapproval.status ?? "pending",
    nextPaymentDate: preapproval.next_payment_date ?? null,
  };
}

/** Cria assinatura (preapproval) com cartão e 1ª cobrança em startDate (trial). */
export async function createCardSubscription(input: {
  amount: number;
  description: string;
  email: string;
  cardTokenId: string;
  companyId: string;
  planTier: string;
  billingCycle: "monthly" | "quarterly";
  startDate: Date;
  idempotencyKey: string;
}) {
  const api = new PreApproval(mercadoPagoClient());
  const frequencyMonths = input.billingCycle === "quarterly" ? 3 : 1;
  const preapproval = await api.create({
    body: {
      reason: input.description,
      external_reference: `${input.companyId}:${input.planTier}:${input.billingCycle}`,
      payer_email: input.email,
      card_token_id: input.cardTokenId,
      back_url: `${appUrl()}/dashboard/financial`,
      status: "authorized",
      auto_recurring: {
        frequency: frequencyMonths,
        frequency_type: "months",
        start_date: input.startDate.toISOString(),
        transaction_amount: Number(input.amount.toFixed(2)),
        currency_id: "BRL",
      },
    },
    requestOptions: { idempotencyKey: input.idempotencyKey },
  });
  return toCardSubscription(preapproval);
}

export async function getMercadoPagoPreapproval(id: string) {
  const api = new PreApproval(mercadoPagoClient());
  return api.get({ id });
}

export async function cancelMercadoPagoPreapproval(id: string) {
  const api = new PreApproval(mercadoPagoClient());
  return api.update({
    id,
    body: { status: "cancelled" },
  });
}
