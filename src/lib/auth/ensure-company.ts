import type { SupabaseClient, User } from "@supabase/supabase-js";

function companyNameFromUser(user: User) {
  const meta = user.user_metadata ?? {};
  const fromMeta =
    String(meta.company_name ?? meta.companyName ?? "").trim() ||
    String(meta.name ?? "").trim();
  if (fromMeta) return fromMeta;
  const emailLocal = user.email?.split("@")[0]?.trim();
  return emailLocal || "Minha empresa";
}

/** Garante perfil/empresa após login ou confirmação de e-mail (cadastro incompleto). */
export async function ensureUserCompany(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { created: false as const };

  const { data: profile } = await supabase
    .from("users")
    .select("id, company_id, name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.company_id) {
    return { created: false as const, companyId: profile.company_id };
  }

  const { error } = await supabase.rpc("create_company", {
    p_name: companyNameFromUser(user),
    p_cnpj: null,
  });

  if (error && !/already belongs/i.test(error.message)) {
    throw new Error(error.message);
  }

  const { data: refreshed } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .maybeSingle();

  return {
    created: true as const,
    companyId: refreshed?.company_id ?? null,
  };
}
