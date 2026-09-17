import { requireCompany } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user, profile, company } = await requireCompany();
  const supabase = await createClient();
  const { data: alerts } = await supabase
    .from("alert_settings")
    .select("whatsapp_number")
    .eq("company_id", company.id)
    .maybeSingle();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Você pode alterar nome, empresa, WhatsApp de alertas e senha.
        </p>
      </div>
      <ProfileForm
        name={profile?.name ?? ""}
        companyName={company.name}
        email={user.email ?? ""}
        whatsappNumber={alerts?.whatsapp_number ?? ""}
      />
    </main>
  );
}
