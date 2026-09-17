import { RenewalBanner } from "@/components/dashboard/RenewalBanner";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { requireCompany } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const { company, channelCount } = await requireCompany();
  if (channelCount < 1) redirect("/onboarding");

  return (
    <div className="flex min-h-svh flex-col bg-background md:h-svh md:flex-row md:overflow-hidden">
      <Sidebar company={company} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-background">
        <RenewalBanner company={company} />
        {children}
      </div>
    </div>
  );
}
