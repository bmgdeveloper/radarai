import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="flex w-full flex-col gap-6 rounded-2xl bg-white p-8 text-zinc-950">
      <div>
        <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          BMG Tech AI
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Redefinir senha
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Informe o e-mail da conta. Se você veio do link do e-mail, defina a nova
          senha abaixo.
        </p>
      </div>
      <ResetPasswordForm />
      <p className="text-sm text-zinc-500">
        Lembrou a senha?{" "}
        <Link href="/login" className="font-medium text-zinc-950 underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
