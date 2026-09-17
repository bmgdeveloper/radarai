"use server";

import { revalidatePath } from "next/cache";
import { updatePasswordAction } from "@/lib/auth/actions";
import { requireCompany } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export { updatePasswordAction };

export async function updateProfileAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const companyName = String(formData.get("companyName") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").replace(/\D/g, "");

  if (!name || !companyName) {
    return { error: "Informe seu nome e o nome da empresa." };
  }
  if (whatsapp && whatsapp.length < 10) {
    return { error: "Informe o WhatsApp com DDI, DDD e número." };
  }

  const { user, company } = await requireCompany();
  const supabase = await createClient();

  const [{ error: userError }, { error: companyError }] = await Promise.all([
    supabase.from("users").update({ name }).eq("id", user.id),
    supabase.from("companies").update({ name: companyName }).eq("id", company.id),
  ]);
  if (userError) return { error: userError.message };
  if (companyError) return { error: companyError.message };

  if (whatsapp) {
    const { error: alertError } = await supabase.from("alert_settings").upsert(
      { company_id: company.id, whatsapp_number: whatsapp },
      { onConflict: "company_id" },
    );
    if (alertError) return { error: alertError.message };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/settings");
  return { ok: true as const };
}
