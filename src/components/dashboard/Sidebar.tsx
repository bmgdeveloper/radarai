"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu, Settings, Sparkles, UserRound, Wallet, X } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import type { CompanyRecord } from "@/lib/auth/session";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/insights", label: "Insights de IA", icon: Sparkles },
  { href: "/dashboard/settings", label: "Configurações", icon: Settings },
  { href: "/dashboard/profile", label: "Perfil", icon: UserRound },
  { href: "/dashboard/financial", label: "Financeiro & Assinatura", icon: Wallet },
];

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 p-3 text-sm">
      {LINKS.map((link) => {
        const active =
          pathname === link.href ||
          (link.href !== "/dashboard" && pathname.startsWith(link.href));
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={
              active
                ? "flex items-center gap-2 rounded-lg bg-[#22D3EE]/15 px-3 py-2 font-medium text-[#67E8F9]"
                : "flex items-center gap-2 rounded-lg px-3 py-2 text-slate-300 hover:bg-white/5 hover:text-white"
            }
          >
            <Icon className="size-4 shrink-0 opacity-80" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ company }: { company: CompanyRecord }) {
  return (
    <div className="border-b border-white/10 px-5 py-5">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-[#67E8F9] uppercase">
        BMG Tech AI
      </p>
      <p className="mt-1 font-[family-name:var(--font-heading)] text-lg font-semibold">
        Radar AI
      </p>
      <p className="mt-2 truncate text-xs text-slate-400">{company.name}</p>
    </div>
  );
}

function LogoutForm() {
  return (
    <form action={logoutAction} className="border-t border-white/10 p-3">
      <Button
        type="submit"
        variant="ghost"
        className="w-full justify-start text-slate-300 hover:bg-white/5 hover:text-white"
      >
        Sair
      </Button>
    </form>
  );
}

export function Sidebar({ company }: { company: CompanyRecord }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between bg-[#0B0F19] px-4 py-3 text-slate-200 md:hidden">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-heading)] text-sm font-semibold">
            Radar AI
          </p>
          <p className="truncate text-xs text-slate-400">{company.name}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-slate-200 hover:bg-white/10 hover:text-white"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu />
        </Button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-[#0B0F19] text-slate-200">
            <div className="flex items-start justify-between">
              <Brand company={company} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-3 mr-3 text-slate-200 hover:bg-white/10 hover:text-white"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
              >
                <X />
              </Button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            <LogoutForm />
          </aside>
        </div>
      ) : null}

      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col overflow-y-auto bg-[#0B0F19] text-slate-200 md:flex">
        <Brand company={company} />
        <NavLinks pathname={pathname} />
        <LogoutForm />
      </aside>
    </>
  );
}
