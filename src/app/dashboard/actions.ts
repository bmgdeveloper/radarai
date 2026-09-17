"use server";

import { requireCompany } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { generateSuggestedResponse } from "@/services/ai/feedbackAnalyzer";

export async function generateSuggestedResponseAction(feedbackId: string) {
  const id = feedbackId.trim();
  if (!id) {
    throw new Error("Feedback inválido.");
  }

  const { company } = await requireCompany();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedbacks")
    .select("text, category")
    .eq("id", id)
    .eq("company_id", company.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao buscar feedback: ${error.message}`);
  }
  if (!data) {
    throw new Error("Feedback não encontrado.");
  }

  return generateSuggestedResponse(data.text ?? "", data.category ?? "Outros");
}
