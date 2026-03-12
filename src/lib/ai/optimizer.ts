import {
  updateCampaignStatus,
  updateCampaignBudget,
  updateAdSetStatus,
  updateAdSetBudget,
  updateAdStatus,
} from "@/lib/meta/campaigns";
import { db } from "@/lib/db";
import { aiSuggestions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export type OptimizationAction =
  | "pause_campaign"
  | "activate_campaign"
  | "increase_budget"
  | "decrease_budget"
  | "pause_adset"
  | "activate_adset"
  | "pause_ad"
  | "activate_ad"
  | "change_bid"
  | "duplicate_adset";

export async function executeSuggestion(suggestionId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const [suggestion] = await db
    .select()
    .from(aiSuggestions)
    .where(eq(aiSuggestions.id, suggestionId));

  if (!suggestion) {
    return { success: false, message: "Sugestão não encontrada" };
  }

  if (suggestion.status !== "pending") {
    return { success: false, message: "Sugestão já foi processada" };
  }

  try {
    const { entityId, entityType, type, suggestedValue } = suggestion;

    switch (type) {
      case "pause_campaign":
        await updateCampaignStatus(entityId, "PAUSED");
        break;

      case "activate_campaign":
        await updateCampaignStatus(entityId, "ACTIVE");
        break;

      case "increase_budget":
      case "decrease_budget": {
        const budget = parseBudgetValue(suggestedValue);
        if (entityType === "campaign") {
          await updateCampaignBudget(entityId, budget, "daily");
        } else if (entityType === "adset") {
          await updateAdSetBudget(entityId, budget, "daily");
        }
        break;
      }

      case "pause_adset":
        await updateAdSetStatus(entityId, "PAUSED");
        break;

      case "activate_adset":
        await updateAdSetStatus(entityId, "ACTIVE");
        break;

      case "pause_ad":
        await updateAdStatus(entityId, "PAUSED");
        break;

      case "activate_ad":
        await updateAdStatus(entityId, "ACTIVE");
        break;

      default:
        return { success: false, message: `Ação '${type}' não suportada automaticamente` };
    }

    await db
      .update(aiSuggestions)
      .set({ status: "executed", executedAt: new Date() })
      .where(eq(aiSuggestions.id, suggestionId));

    return { success: true, message: "Otimização executada com sucesso" };
  } catch (error) {
    return {
      success: false,
      message: `Erro ao executar: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
    };
  }
}

export async function rejectSuggestion(
  suggestionId: string,
  reason?: string
): Promise<void> {
  await db
    .update(aiSuggestions)
    .set({
      status: "rejected",
      rejectedReason: reason ?? "Rejeitado pelo usuário",
    })
    .where(eq(aiSuggestions.id, suggestionId));
}

function parseBudgetValue(value: string | null): number {
  if (!value) return 0;
  const match = value.match(/[\d.,]+/);
  if (!match) return 0;
  return parseFloat(match[0].replace(",", "."));
}
