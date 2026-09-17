import Link from "next/link";
import { LoginForm } from "@/components/auth/auth-forms";
import { getAuthContext, nextAppPath } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const context = await getAuthContext().catch(() => null);
  if (context?.user) {
    redirect(nextAppPath(context));
  }

  const { error } = await searchParams;

  return (
    <div className="flex w-full flex-col gap-6 rounded-2xl bg-white p-8 text-zinc-950">
      <div>
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          BMG Tech AI
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Se o cadastro ficou pela metade, entre com o mesmo e-mail — você retoma o
          onboarding de onde parou.
        </p>
      </div>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error === "auth"
            ? "Não foi possível validar o link. Faça login normalmente."
            : error}
        </p>
      ) : null}
      <LoginForm />
      <p className="text-sm text-zinc-500">
        Ainda não tem conta?{" "}
        <Link href="/signup" className="font-medium text-zinc-950 underline-offset-4 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
