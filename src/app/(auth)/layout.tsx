import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-[#0B0F19] text-slate-200">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 700px 360px at 20% -10%, rgba(37, 71, 168, 0.35), transparent 60%), radial-gradient(ellipse 500px 300px at 90% 0%, rgba(34, 211, 238, 0.12), transparent 55%)",
        }}
      />
      <header className="relative z-10 mx-auto flex w-full max-w-md items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#22D3EE] to-[#2547A8] text-xs font-bold text-[#0B0F19]">
            B
          </span>
          <span className="text-sm font-semibold tracking-tight text-white">
            Radar AI
          </span>
        </Link>
        <Link href="/" className="text-sm text-slate-400 hover:text-white">
          Voltar ao site
        </Link>
      </header>
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 px-6 pb-16">
        {children}
      </main>
    </div>
  );
}
