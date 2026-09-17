import Link from "next/link";
import { LoginForm } from "@/components/auth/auth-forms";
import { getAuthContext, nextAppPath } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const context = await getAuthContext().catch(() => null);
  if (context?.user) {
    redirect(nextAppPath(context));
  }

  return (
    <div className="flex w-full flex-col gap-6 rounded-2xl bg-white p-8 text-zinc-950">
      <div>
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          BMG Tech AI
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Entrar</h1>
      </div>
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
