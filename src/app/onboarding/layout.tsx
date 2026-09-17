import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export default function OnboardingLayout({
  children,
}: LayoutProps<"/onboarding">) {
  return (
    <div className="flex min-h-full flex-col bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Radar AI · Onboarding
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
