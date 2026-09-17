import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/auth-forms";
import { getAuthContext, nextAppPath } from "@/lib/auth/session";
import { isBillingCycle, isPlanTier } from "@/lib/billing/plans";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; cycle?: string }>;
}) {
  const context = await getAuthContext().catch(() => null);
  if (context?.user) {
    redirect(nextAppPath(context));
  }

  const { plan, cycle } = await searchParams;
  const defaultPlan = isPlanTier(plan) ? plan : undefined;
  const defaultCycle = isBillingCycle(cycle) ? cycle : undefined;

  return (
    <div className="flex w-full flex-col gap-6 rounded-2xl bg-white p-8 text-zinc-950">
      <div>
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          BMG Tech AI
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Criar conta</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Depois de criar a conta, enviamos um e-mail para você ativar o cadastro
          antes do primeiro login.
        </p>
      </div>
      <SignupForm defaultPlan={defaultPlan} defaultCycle={defaultCycle} />
      <p className="text-sm text-zinc-500">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-zinc-950 underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
