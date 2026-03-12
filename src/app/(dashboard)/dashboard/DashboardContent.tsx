import {
  DollarSign,
  Eye,
  MousePointerClick,
  Users,
  UserCheck,
  BarChart3,
  TrendingUp,
  Activity,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/KPICard";
import { CampaignTable } from "@/components/dashboard/CampaignTable";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import {
  fetchInsights,
  parseInsightMetrics,
  type DatePreset,
} from "@/lib/meta/insights";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

async function getDashboardData(period: string, since?: string, until?: string) {
  const isCustom = !!since && !!until;
  const datePreset = isCustom ? undefined : (period as DatePreset);

  const insights = await fetchInsights({
    level: "campaign",
    ...(isCustom ? { since, until } : { datePreset }),
  });

  // Totais agregados do período
  const totals = insights.reduce(
    (acc, insight) => {
      const m = parseInsightMetrics(insight);
      acc.spend += m.spend;
      acc.impressions += m.impressions;
      acc.clicks += m.clicks;
      acc.leads += m.leads;
      acc.mqls += m.mqls;
      acc.pageView += m.pageView;
      acc.buttonClick += m.buttonClick;
      return acc;
    },
    { spend: 0, impressions: 0, clicks: 0, leads: 0, mqls: 0, pageView: 0, buttonClick: 0 }
  );

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const cpl = totals.leads > 0 ? totals.spend / totals.leads : 0;
  const cpmql = totals.mqls > 0 ? totals.spend / totals.mqls : 0;
  const lpConvRate = totals.pageView > 0 ? (totals.leads / totals.pageView) * 100 : 0;
  const connectRate = totals.clicks > 0 ? (totals.leads / totals.clicks) * 100 : 0;

  // Dados por campanha para a tabela (agrega por campaign_id)
  const campaignMap = new Map<string, any>();
  for (const insight of insights) {
    const id = insight.campaign_id ?? "unknown";
    const m = parseInsightMetrics(insight);
    const existing = campaignMap.get(id);
    if (existing) {
      campaignMap.set(id, {
        ...existing,
        spend: existing.spend + m.spend,
        impressions: existing.impressions + m.impressions,
        clicks: existing.clicks + m.clicks,
        leads: existing.leads + m.leads,
        mqls: existing.mqls + m.mqls,
        pageView: existing.pageView + m.pageView,
      });
    } else {
      campaignMap.set(id, { ...m, id, name: insight.campaign_name ?? id, status: "ACTIVE" });
    }
  }

  const campaigns = Array.from(campaignMap.values()).map((c: any) => ({
    ...c,
    ctr: c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0,
    cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
    cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
    cpl: c.leads > 0 ? c.spend / c.leads : 0,
    cpmql: c.mqls > 0 ? c.spend / c.mqls : 0,
    lpConversionRate: c.pageView > 0 ? (c.leads / c.pageView) * 100 : 0,
    connectRate: c.clicks > 0 ? (c.leads / c.clicks) * 100 : 0,
  }));

  // Série temporal para o gráfico
  const dailyMap = new Map<string, { spend: number; leads: number; mqls: number }>();
  for (const insight of insights) {
    const date = insight.date_start;
    const m = parseInsightMetrics(insight);
    const prev = dailyMap.get(date) ?? { spend: 0, leads: 0, mqls: 0 };
    dailyMap.set(date, {
      spend: prev.spend + m.spend,
      leads: prev.leads + m.leads,
      mqls: prev.mqls + m.mqls,
    });
  }

  const chartData = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({
      date: date.slice(5),
      spend: parseFloat(values.spend.toFixed(2)),
      leads: values.leads,
      mqls: values.mqls,
      cpl: values.leads > 0 ? parseFloat((values.spend / values.leads).toFixed(2)) : 0,
    }));

  return {
    totals: { ...totals, ctr, cpc, cpm, cpl, cpmql, lpConvRate, connectRate },
    campaigns,
    chartData,
  };
}

export async function DashboardContent({ period, since, until }: { period: string; since?: string; until?: string }) {
  const { totals, campaigns, chartData } = await getDashboardData(period, since, until);

  const kpis = [
    { title: "Investimento Total", value: formatCurrency(totals.spend), icon: DollarSign, colorClass: "text-blue-400 bg-blue-400/10" },
    { title: "Impressões", value: formatNumber(totals.impressions), icon: Eye, colorClass: "text-purple-400 bg-purple-400/10" },
    { title: "Cliques no Link", value: formatNumber(totals.clicks), icon: MousePointerClick, colorClass: "text-cyan-400 bg-cyan-400/10" },
    { title: "Pageviews", value: formatNumber(totals.pageView), icon: Activity, colorClass: "text-indigo-400 bg-indigo-400/10" },
    { title: "Leads", value: formatNumber(totals.leads), icon: Users, colorClass: "text-emerald-400 bg-emerald-400/10" },
    { title: "MQLs", value: formatNumber(totals.mqls), icon: UserCheck, colorClass: "text-teal-400 bg-teal-400/10" },
    { title: "CTR", value: formatPercent(totals.ctr), icon: BarChart3, colorClass: "text-amber-400 bg-amber-400/10" },
    { title: "CPL", value: totals.leads > 0 ? formatCurrency(totals.cpl) : "-", icon: TrendingUp, colorClass: "text-orange-400 bg-orange-400/10" },
    { title: "CPMQL", value: totals.mqls > 0 ? formatCurrency(totals.cpmql) : "-", icon: TrendingUp, colorClass: "text-rose-400 bg-rose-400/10" },
    { title: "CPM", value: formatCurrency(totals.cpm), icon: DollarSign, colorClass: "text-slate-400 bg-slate-400/10" },
    { title: "CPC", value: formatCurrency(totals.cpc), icon: MousePointerClick, colorClass: "text-violet-400 bg-violet-400/10" },
    { title: "Conv. LP", value: formatPercent(totals.lpConvRate), subtitle: "Leads / Pageviews", icon: BarChart3, colorClass: "text-green-400 bg-green-400/10" },
    { title: "Connect Rate", value: formatPercent(totals.connectRate), subtitle: "Leads / Cliques", icon: TrendingUp, colorClass: "text-pink-400 bg-pink-400/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PerformanceChart
          title="Investimento vs Leads"
          data={chartData}
          metrics={[
            { key: "spend", label: "Investimento (R$)", color: "#3b82f6" },
            { key: "leads", label: "Leads", color: "#10b981" },
          ]}
        />
        <PerformanceChart
          title="CPL e MQLs"
          data={chartData}
          metrics={[
            { key: "cpl", label: "CPL (R$)", color: "#f59e0b" },
            { key: "mqls", label: "MQLs", color: "#8b5cf6" },
          ]}
        />
      </div>

      <div>
        <h2 className="text-base font-semibold mb-3">Performance por Campanha</h2>
        <CampaignTable campaigns={campaigns} />
      </div>
    </div>
  );
}
