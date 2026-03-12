import { metaFetch, metaFetchAll, metaPost, META_AD_ACCOUNT_ID } from "./client";

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
  effective_status: string;
}

export interface MetaAdSet {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  optimization_goal: string;
  billing_event: string;
  bid_amount?: number;
  targeting?: Record<string, unknown>;
  effective_status: string;
}

export interface MetaAd {
  id: string;
  adset_id: string;
  campaign_id: string;
  name: string;
  status: string;
  creative?: Record<string, unknown>;
  effective_status: string;
}

// ─── Campanhas ────────────────────────────────────────────────────────────────

export async function fetchCampaigns(): Promise<MetaCampaign[]> {
  return metaFetchAll<MetaCampaign>(`/${META_AD_ACCOUNT_ID}/campaigns`, {
    fields:
      "id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,effective_status",
  });
}

export async function createCampaign(params: {
  name: string;
  objective: string;
  status?: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
}): Promise<{ id: string }> {
  const body: Record<string, unknown> = {
    name: params.name,
    objective: params.objective,
    status: params.status ?? "PAUSED",
    special_ad_categories: [],
  };

  if (params.dailyBudget) body.daily_budget = Math.round(params.dailyBudget * 100);
  if (params.lifetimeBudget) body.lifetime_budget = Math.round(params.lifetimeBudget * 100);

  return metaPost(`/${META_AD_ACCOUNT_ID}/campaigns`, body);
}

export async function updateCampaignStatus(
  campaignId: string,
  status: "ACTIVE" | "PAUSED"
): Promise<{ success: boolean }> {
  return metaPost(`/${campaignId}`, { status });
}

export async function updateCampaignBudget(
  campaignId: string,
  budget: number,
  type: "daily" | "lifetime"
): Promise<{ success: boolean }> {
  const key = type === "daily" ? "daily_budget" : "lifetime_budget";
  return metaPost(`/${campaignId}`, { [key]: Math.round(budget * 100) });
}

// ─── Ad Sets ──────────────────────────────────────────────────────────────────

export async function fetchAdSets(campaignId?: string): Promise<MetaAdSet[]> {
  const endpoint = campaignId
    ? `/${campaignId}/adsets`
    : `/${META_AD_ACCOUNT_ID}/adsets`;

  return metaFetchAll<MetaAdSet>(endpoint, {
    fields:
      "id,campaign_id,name,status,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_amount,targeting,effective_status",
  });
}

export async function updateAdSetStatus(
  adSetId: string,
  status: "ACTIVE" | "PAUSED"
): Promise<{ success: boolean }> {
  return metaPost(`/${adSetId}`, { status });
}

export async function updateAdSetBudget(
  adSetId: string,
  budget: number,
  type: "daily" | "lifetime"
): Promise<{ success: boolean }> {
  const key = type === "daily" ? "daily_budget" : "lifetime_budget";
  return metaPost(`/${adSetId}`, { [key]: Math.round(budget * 100) });
}

// ─── Ads ──────────────────────────────────────────────────────────────────────

export async function fetchAds(adSetId?: string): Promise<MetaAd[]> {
  const endpoint = adSetId
    ? `/${adSetId}/ads`
    : `/${META_AD_ACCOUNT_ID}/ads`;

  return metaFetchAll<MetaAd>(endpoint, {
    fields: "id,adset_id,campaign_id,name,status,creative,effective_status",
  });
}

export async function updateAdStatus(
  adId: string,
  status: "ACTIVE" | "PAUSED"
): Promise<{ success: boolean }> {
  return metaPost(`/${adId}`, { status });
}
