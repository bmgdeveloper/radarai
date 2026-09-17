import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export default function OnboardingLayout({
  children,
}: LayoutProps<"/onboarding">) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <header className="border-b border-border/80 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-[#22D3EE] to-[#2547A8] text-[11px] font-bold text-[#0B0F19]">
              B
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Radar AI · Onboarding
            </span>
          </Link>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
