import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-white">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-6 py-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Radar AI
        </Link>
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          Voltar ao site
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 px-6 pb-16">{children}</main>
    </div>
  );
}
