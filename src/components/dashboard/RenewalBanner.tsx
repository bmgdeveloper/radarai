import Link from "next/link";
import { daysRemaining } from "@/lib/billing/prorata";
import { shouldShowRenewalBanner, subscriptionDisplayStatus } from "@/lib/billing/status";
import type { CompanyRecord } from "@/lib/auth/session";

export function RenewalBanner({ company }: { company: CompanyRecord }) {
  if (
    !shouldShowRenewalBanner({
      isActive: company.is_active,
      subscriptionStatus: company.subscription_status,
      periodEnd: company.current_period_end,
    })
  ) {
    return null;
  }

  const remaining = daysRemaining(company.current_period_end);
  const display = subscriptionDisplayStatus({
    isActive: company.is_active,
    subscriptionStatus: company.subscription_status,
    periodEnd: company.current_period_end,
  });

  const message =
    display === "Suspenso"
      ? "Assinatura suspensa. Renove no Financeiro para retomar a coleta e os alertas."
      : `Sua assinatura vence em ${remaining} dia(s). Renove agora para não interromper o Radar AI.`;

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-6 py-3 text-sm text-amber-950">
      {message}{" "}
      <Link href="/dashboard/financial" className="font-semibold underline underline-offset-4">
        Ir para Financeiro & Assinatura
      </Link>
    </div>
  );
}
