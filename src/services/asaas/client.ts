const SANDBOX_URL = "https://api-sandbox.asaas.com/v3";
const PRODUCTION_URL = "https://api.asaas.com/v3";

export type AsaasCustomer = {
  id: string;
  name?: string;
};

export type AsaasSubscription = {
  id: string;
  customer: string;
  status?: string;
  value?: number;
};

export type AsaasPayment = {
  id: string;
  status?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string | null;
  subscription?: string | null;
  customer?: string;
  billingType?: string;
  value?: number;
};

type AsaasList<T> = {
  data?: T[];
};

function asaasBaseUrl() {
  const env = process.env.ASAAS_ENV?.trim().toLowerCase();
  return env === "production" ? PRODUCTION_URL : SANDBOX_URL;
}

function requireAsaasKey() {
  const key = process.env.ASAAS_API_KEY?.trim();
  if (!key) {
    throw new Error("Asaas não configurado: defina ASAAS_API_KEY.");
  }
  return key;
}

async function asaasRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${asaasBaseUrl()}${path}`, {
    ...init,
    headers: {
      access_token: requireAsaasKey(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as T & {
    errors?: Array<{ description?: string }>;
    error?: string;
  };

  if (!response.ok) {
    const message =
      payload.errors?.[0]?.description ||
      payload.error ||
      `Falha na API Asaas (HTTP ${response.status}).`;
    throw new Error(message);
  }

  return payload;
}

export async function createAsaasCustomer(input: {
  name: string;
  email: string;
  cpfCnpj?: string | null;
  mobilePhone?: string | null;
  externalReference: string;
}) {
  return asaasRequest<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj?.replace(/\D/g, "") || undefined,
      mobilePhone: input.mobilePhone?.replace(/\D/g, "") || undefined,
      externalReference: input.externalReference,
    }),
  });
}

export async function createAsaasSubscription(input: {
  customerId: string;
  value: number;
  description: string;
  externalReference: string;
}) {
  const nextDueDate = new Date().toISOString().slice(0, 10);
  return asaasRequest<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: "UNDEFINED",
      cycle: "MONTHLY",
      value: input.value,
      nextDueDate,
      description: input.description,
      externalReference: input.externalReference,
    }),
  });
}

export async function listSubscriptionPayments(subscriptionId: string) {
  const result = await asaasRequest<AsaasList<AsaasPayment>>(
    `/subscriptions/${subscriptionId}/payments`,
  );
  return result.data ?? [];
}

export async function getAsaasPayment(paymentId: string) {
  return asaasRequest<AsaasPayment>(`/payments/${paymentId}`);
}
