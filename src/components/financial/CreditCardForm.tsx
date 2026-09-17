"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPlanPrice, type BillingCycle, type PlanTier } from "@/lib/billing/plans";

type MpCardTokenResponse = {
  id?: string;
  error?: string;
  message?: string;
  cause?: Array<{ description?: string }>;
};

type MercadoPagoInstance = {
  createCardToken: (data: {
    cardNumber: string;
    cardholderName: string;
    cardExpirationMonth: string;
    cardExpirationYear: string;
    securityCode: string;
    identificationType: string;
    identificationNumber: string;
  }) => Promise<MpCardTokenResponse>;
};

declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: { locale?: string },
    ) => MercadoPagoInstance;
  }
}

const MP_SDK_URL = "https://sdk.mercadopago.com/js/v2";

function loadMercadoPagoSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.MercadoPago) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${MP_SDK_URL}"]`,
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Falha ao carregar SDK Mercado Pago.")),
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = MP_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Falha ao carregar SDK Mercado Pago."));
    document.head.appendChild(script);
  });
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCardNumber(value: string) {
  return onlyDigits(value)
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function CreditCardForm({
  planTier,
  billingCycle,
  planAmount,
  onSuccess,
}: {
  planTier: PlanTier;
  billingCycle: BillingCycle;
  planAmount: number;
  onSuccess?: () => void;
}) {
  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY?.trim() ?? "";
  const [sdkReady, setSdkReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [cpf, setCpf] = useState("");

  const trialCopy = useMemo(
    () =>
      `R$ 0,00 HOJE — Teste grátis por 7 dias. Primeira cobrança de ${formatPlanPrice(planAmount)} no 8º dia. Cancele a qualquer momento antes do 8º dia sem custos.`,
    [planAmount],
  );

  useEffect(() => {
    let cancelled = false;
    loadMercadoPagoSdk()
      .then(() => {
        if (!cancelled) setSdkReady(true);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar o checkout de cartão.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!publicKey) {
      setError("Chave pública do Mercado Pago não configurada (NEXT_PUBLIC_MP_PUBLIC_KEY).");
      return;
    }
    if (!window.MercadoPago || !sdkReady) {
      setError("SDK do Mercado Pago ainda não carregou. Tente novamente.");
      return;
    }

    const digits = onlyDigits(cardNumber);
    const expiryDigits = onlyDigits(expiry);
    const month = expiryDigits.slice(0, 2);
    const year = expiryDigits.slice(2, 4);
    const doc = onlyDigits(cpf);

    if (digits.length < 13 || !cardholderName.trim() || month.length !== 2 || year.length !== 2) {
      setError("Preencha os dados do cartão corretamente.");
      return;
    }
    if (onlyDigits(securityCode).length < 3) {
      setError("Informe o CVV.");
      return;
    }
    if (doc.length !== 11) {
      setError("Informe um CPF válido.");
      return;
    }

    setPending(true);
    try {
      const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
      const tokenResponse = await mp.createCardToken({
        cardNumber: digits,
        cardholderName: cardholderName.trim(),
        cardExpirationMonth: month,
        cardExpirationYear: year,
        securityCode: onlyDigits(securityCode),
        identificationType: "CPF",
        identificationNumber: doc,
      });

      const cardToken = tokenResponse.id;
      if (!cardToken) {
        const cause =
          tokenResponse.cause?.[0]?.description ||
          tokenResponse.message ||
          tokenResponse.error ||
          "Não foi possível tokenizar o cartão.";
        throw new Error(cause);
      }

      const response = await fetch("/api/checkout/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardToken,
          planTier,
          billingCycle,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        activated?: boolean;
      };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "Falha ao ativar o teste grátis.");
      }

      setDone(true);
      onSuccess?.();
      if (typeof window !== "undefined") {
        window.location.assign("/dashboard");
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Falha no checkout com cartão.",
      );
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
        Teste grátis ativado. Você já pode usar o Radar AI.
      </p>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="rounded-2xl border border-[#22D3EE]/30 bg-[#0B0F19] px-4 py-3 text-sm font-medium leading-relaxed text-slate-100">
        {trialCopy}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="card-number">Número do cartão</Label>
        <Input
          id="card-number"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="•••• •••• •••• ••••"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          disabled={pending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="card-name">Nome impresso no cartão</Label>
        <Input
          id="card-name"
          autoComplete="cc-name"
          placeholder="Como está no cartão"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
          disabled={pending}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="card-expiry">Validade</Label>
          <Input
            id="card-expiry"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            disabled={pending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="card-cvv">CVV</Label>
          <Input
            id="card-cvv"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="•••"
            value={securityCode}
            onChange={(e) =>
              setSecurityCode(onlyDigits(e.target.value).slice(0, 4))
            }
            disabled={pending}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="card-cpf">CPF do titular</Label>
        <Input
          id="card-cpf"
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(formatCpf(e.target.value))}
          disabled={pending}
        />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={pending || !sdkReady}>
        {pending
          ? "Ativando teste…"
          : !sdkReady
            ? "Carregando checkout…"
            : "Começar teste grátis de 7 dias"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Seus dados de cartão são tokenizados no navegador pelo Mercado Pago. Não
        armazenamos o número completo do cartão.
      </p>
    </form>
  );
}
