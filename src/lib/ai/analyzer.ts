import Anthropic from "@anthropic-ai/sdk";
import { parseInsightMetrics, type MetaInsight } from "@/lib/meta/insights";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface CampaignMetricSummary {
  campaignId: string;
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  leads: number;
  mqls: number;
  cpl: number;
  cpmql: number;
  lpConversionRate: number;
  connectRate: number;
  pageView: number;
  buttonClick: number;
}

export interface AISuggestion {
  entityId: string;
  entityType: "campaign" | "adset" | "ad";
  entityName: string;
  type: string;
  title: string;
  reasoning: string;
  currentValue?: string;
  suggestedValue?: string;
  impact: string;
}

export interface AIAnalysisResult {
  summary: string;
  highlights: string[];
  concerns: string[];
  fullAnalysis: string;
  suggestions: AISuggestion[];
  totalSpend: number;
  totalLeads: number;
  totalMqls: number;
  avgCpl: number;
  avgCpmql: number;
}

function buildMetricsSummary(insights: MetaInsight[]): CampaignMetricSummary[] {
  const grouped = new Map<string, MetaInsight[]>();

  for (const insight of insights) {
    const key = insight.campaign_id ?? "unknown";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(insight);
  }

  return Array.from(grouped.entries()).map(([campaignId, rows]) => {
    const totals = rows.reduce(
      (acc, row) => {
        const m = parseInsightMetrics(row);
        acc.spend += m.spend;
        acc.impressions += m.impressions;
        acc.clicks += m.clicks;
        acc.leads += m.leads;
        acc.mqls += m.mqls;
        acc.pageView += m.pageView;
        acc.buttonClick += m.buttonClick;
        return acc;
      },
      {
        spend: 0, impressions: 0, clicks: 0,
        leads: 0, mqls: 0, pageView: 0, buttonClick: 0,
      }
    );

    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
    const cpl = totals.leads > 0 ? totals.spend / totals.leads : 0;
    const cpmql = totals.mqls > 0 ? totals.spend / totals.mqls : 0;
    const lpConversionRate = totals.pageView > 0 ? (totals.leads / totals.pageView) * 100 : 0;
    const connectRate = totals.clicks > 0 ? (totals.leads / totals.clicks) * 100 : 0;

    return {
      campaignId,
      campaignName: rows[0]?.campaign_name ?? campaignId,
      spend: totals.spend,
      impressions: totals.impressions,
      clicks: totals.clicks,
      leads: totals.leads,
      mqls: totals.mqls,
      pageView: totals.pageView,
      buttonClick: totals.buttonClick,
      ctr, cpc, cpm, cpl, cpmql, lpConversionRate, connectRate,
    };
  });
}

export async function analyzePerformance(
  insights: MetaInsight[],
  referenceDate: string
): Promise<AIAnalysisResult> {
  const metrics = buildMetricsSummary(insights);
  const totalSpend = metrics.reduce((s, m) => s + m.spend, 0);
  const totalLeads = metrics.reduce((s, m) => s + m.leads, 0);
  const totalMqls = metrics.reduce((s, m) => s + m.mqls, 0);
  const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const avgCpmql = totalMqls > 0 ? totalSpend / totalMqls : 0;

  const metricsJson = JSON.stringify(metrics, null, 2);

  const prompt = `Você é um especialista em Media Buying e Performance de Tráfego Pago no Meta Ads.
Analise os dados de performance das campanhas do dia ${referenceDate} e forneça:

1. Um RESUMO EXECUTIVO conciso (2-3 parágrafos)
2. PONTOS POSITIVOS (máximo 5 itens)
3. PONTOS DE ATENÇÃO / ALERTAS (máximo 5 itens)
4. ANÁLISE DETALHADA por campanha
5. SUGESTÕES DE OTIMIZAÇÃO com justificativa completa

## KPIs de Referência (benchmarks do setor):
- CTR ideal: > 1.5%
- CPM ideal: < R$ 20
- CPC ideal: < R$ 2
- Taxa de conversão da LP: > 20%
- Connect Rate (lead/clique): > 5%

## Dados das Campanhas:
${metricsJson}

## Totais do dia:
- Investimento total: R$ ${totalSpend.toFixed(2)}
- Total de Leads: ${totalLeads}
- Total de MQLs: ${totalMqls}
- CPL médio: R$ ${avgCpl.toFixed(2)}
- CPMQL médio: R$ ${avgCpmql.toFixed(2)}

Responda APENAS com um JSON válido no seguinte formato:
{
  "summary": "resumo executivo aqui",
  "highlights": ["ponto positivo 1", "ponto positivo 2"],
  "concerns": ["ponto de atenção 1", "ponto de atenção 2"],
  "fullAnalysis": "análise completa em markdown aqui",
  "suggestions": [
    {
      "entityId": "id da campanha/adset/ad",
      "entityType": "campaign",
      "entityName": "nome da entidade",
      "type": "pause_campaign|activate_campaign|increase_budget|decrease_budget|pause_adset|activate_adset|pause_ad|activate_ad|change_bid",
      "title": "título curto da sugestão",
      "reasoning": "explicação detalhada do porquê desta ação",
      "currentValue": "valor atual (ex: R$ 50/dia)",
      "suggestedValue": "valor sugerido (ex: R$ 75/dia)",
      "impact": "impacto esperado desta mudança"
    }
  ]
}`;

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Resposta inesperada da IA");
  }

  // Extrai JSON da resposta
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("IA não retornou JSON válido");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    ...parsed,
    totalSpend,
    totalLeads,
    totalMqls,
    avgCpl,
    avgCpmql,
  } as AIAnalysisResult;
}
