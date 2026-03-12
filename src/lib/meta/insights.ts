import { metaFetch, META_AD_ACCOUNT_ID } from "./client";
import { format, subDays } from "date-fns";

export interface MetaInsight {
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  campaign_name?: string;
  adset_name?: string;
  ad_name?: string;
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  clicks: string;
  ctr: string;
  cpc: string;
  cpm: string;
  reach: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
}

export type InsightLevel = "campaign" | "adset" | "ad";
export type DatePreset =
  | "today"
  | "yesterday"
  | "last_7d"
  | "last_14d"
  | "last_30d"
  | "this_month"
  | "last_month";

const BASE_FIELDS = [
  "campaign_id",
  "campaign_name",
  "adset_id",
  "adset_name",
  "ad_id",
  "ad_name",
  "spend",
  "impressions",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "reach",
  "actions",
  "action_values",
  "date_start",
  "date_stop",
].join(",");

export async function fetchInsights(params: {
  level: InsightLevel;
  datePreset?: DatePreset;
  since?: string;
  until?: string;
  entityId?: string;
}): Promise<MetaInsight[]> {
  const endpoint = params.entityId
    ? `/${params.entityId}/insights`
    : `/${META_AD_ACCOUNT_ID}/insights`;

  const queryParams: Record<string, string> = {
    level: params.level,
    fields: BASE_FIELDS,
    time_increment: "1", // por dia
  };

  if (params.datePreset) {
    queryParams.date_preset = params.datePreset;
  } else if (params.since && params.until) {
    queryParams.time_range = JSON.stringify({
      since: params.since,
      until: params.until,
    });
  }

  const result = await metaFetch<{
    data: MetaInsight[];
    paging?: { next?: string };
  }>(endpoint, queryParams);

  return result.data;
}

export async function fetchYesterdayInsights(
  level: InsightLevel = "campaign"
): Promise<MetaInsight[]> {
  return fetchInsights({ level, datePreset: "yesterday" });
}

export async function fetchLast30DaysInsights(
  level: InsightLevel = "campaign"
): Promise<MetaInsight[]> {
  const until = format(new Date(), "yyyy-MM-dd");
  const since = format(subDays(new Date(), 30), "yyyy-MM-dd");
  return fetchInsights({ level, since, until });
}

// ─── Helpers para extrair eventos do pixel ───────────────────────────────────

export function getActionValue(
  actions: MetaInsight["actions"],
  actionType: string
): number {
  const action = actions?.find((a) => a.action_type === actionType);
  return action ? parseInt(action.value, 10) : 0;
}

export function parseInsightMetrics(insight: MetaInsight) {
  const actions = insight.actions ?? [];
  const spend = parseFloat(insight.spend ?? "0");
  const leads = getActionValue(actions, "lead") + getActionValue(actions, "onsite_conversion.lead_grouped");
  const mqls = getActionValue(actions, "offsite_conversion.fb_pixel_custom.MQL");
  const pageView = getActionValue(actions, "landing_page_view");
  const buttonClick = getActionValue(actions, "offsite_conversion.fb_pixel_custom.ButtonClick");
  const clicks = parseInt(insight.clicks ?? "0", 10);
  const impressions = parseInt(insight.impressions ?? "0", 10);

  return {
    spend,
    impressions,
    clicks,
    ctr: parseFloat(insight.ctr ?? "0"),
    cpc: parseFloat(insight.cpc ?? "0"),
    cpm: parseFloat(insight.cpm ?? "0"),
    reach: parseInt(insight.reach ?? "0", 10),
    pageView,
    buttonClick,
    leads,
    mqls,
    cpl: leads > 0 ? spend / leads : 0,
    cpmql: mqls > 0 ? spend / mqls : 0,
    lpConversionRate: pageView > 0 ? (leads / pageView) * 100 : 0,
    connectRate: clicks > 0 ? (leads / clicks) * 100 : 0,
  };
}
