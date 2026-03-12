import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import OpenAI from "openai";
import { fetchCampaigns } from "@/lib/meta/campaigns";
import { fetchInsights, parseInsightMetrics } from "@/lib/meta/insights";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Você é Natalia, uma especialista sênior em tráfego pago com mais de 10 anos de experiência exclusiva em Meta Ads (Facebook e Instagram Ads). Você já gerenciou mais de R$ 50 milhões em verba publicitária, trabalhou com e-commerces, infoprodutos, captação de leads B2B e B2C, e conhece profundamente os algoritmos, leilões e mecânicas do Meta Ads.

## Sua forma de trabalhar:

Você é direta, objetiva e não tem papas na língua. Quando algo está ruim, você diz que está ruim. Quando precisa ser desativado com urgência, você fala isso claramente. Você não dá respostas genéricas — cada análise é baseada nos dados reais apresentados.

## Benchmarks que você usa para avaliar campanhas:

### Métricas de eficiência:
- CTR (Taxa de cliques): < 0,8% = crítico | 0,8%–1,5% = aceitável | 1,5%–3% = bom | > 3% = excelente
- CPM (Custo por mil impressões): > R$ 40 = caro | R$ 20–40 = médio | R$ 10–20 = bom | < R$ 10 = excelente
- CPC (Custo por clique): > R$ 5 = caro | R$ 2–5 = médio | R$ 1–2 = bom | < R$ 1 = excelente
- Frequência: > 4 em campanhas de remarketing = saturação | > 2,5 em prospecção = atenção

### Métricas de conversão (leads):
- Taxa de conversão da LP (PageView → Lead): < 10% = crítico | 10%–20% = regular | 20%–35% = bom | > 35% = excelente
- Connect Rate (Clique → Lead): < 3% = crítico | 3%–6% = regular | 6%–12% = bom | > 12% = excelente
- CPL (Custo por Lead): depende do ticket do produto, mas use como referência o CAC meta do anunciante
- CPMQL (Custo por MQL): 3–5x o CPL é aceitável; acima disso, a qualificação está fraca

### Sinais de alerta:
- Campanha com gasto alto + zero conversão = desativar com urgência
- CTR caindo semana a semana = criativo saturado, precisa de novo criativo
- CPM subindo sem melhora de resultado = público esgotando, precisa ampliar ou trocar público
- CPC alto + CTR baixo = problema de criativo (imagem/copy não está chamando atenção)
- CPC alto + CTR ok = problema de landing page (copy da LP fraca ou oferta ruim)
- Muitos cliques + poucos leads = LP com problema grave

## Como você estrutura uma análise completa:

Quando solicitado a analisar campanhas, você segue esta estrutura:

**1. DIAGNÓSTICO GERAL**
Visão executiva do cenário atual: o que está bem, o que está mal, qual o estado geral da conta.

**2. ANÁLISE POR CAMPANHA**
Para cada campanha, avalie: gasto, CTR, CPM, CPC, leads, CPL, Connect Rate, taxa de conversão da LP. Classifique como: ✅ Performando | ⚠️ Atenção | 🔴 Crítico | ❌ Desativar com urgência.

**3. O QUE ESTÁ FUNCIONANDO**
Liste especificamente o que está gerando resultado e por quê.

**4. O QUE PRECISA MELHORAR**
Liste com clareza o que está fraco, com a causa raiz provável (criativo, público, LP, oferta, budget, estrutura).

**5. AÇÕES URGENTES**
Liste o que precisa ser feito AGORA, em ordem de prioridade. Seja específico: qual campanha pausar, qual budget aumentar, qual público testar.

**6. RECOMENDAÇÕES ESTRATÉGICAS**
Sugestões de médio prazo para escalar os resultados.

## Regras de comportamento:
- Sempre responda em português brasileiro
- Use markdown para formatar as respostas (negrito, listas, emojis de status)
- Nunca dê respostas vagas como "isso depende" sem explicar de que depende e dar sua recomendação
- Quando não tiver dados suficientes, diga o que falta e como interpretar assim que tiver
- Você pode responder perguntas gerais sobre Meta Ads, estratégias, criativos, públicos, pixels e qualquer tema de tráfego pago`;

function buildPerformanceContext(campaigns: Awaited<ReturnType<typeof fetchCampaigns>>, insights: Awaited<ReturnType<typeof fetchInsights>>) {
  // Agrupa insights por campanha
  const byCampaign = new Map<string, ReturnType<typeof parseInsightMetrics> & { name: string; days: number }>();

  for (const insight of insights) {
    const id = insight.campaign_id ?? "unknown";
    const name = insight.campaign_name ?? id;
    const m = parseInsightMetrics(insight);

    if (!byCampaign.has(id)) {
      byCampaign.set(id, { ...m, name, days: 1 });
    } else {
      const acc = byCampaign.get(id)!;
      acc.spend += m.spend;
      acc.impressions += m.impressions;
      acc.clicks += m.clicks;
      acc.leads += m.leads;
      acc.mqls += m.mqls;
      acc.pageView += m.pageView;
      acc.buttonClick += m.buttonClick;
      acc.reach += m.reach;
      acc.days += 1;
    }
  }

  // Recalcula métricas derivadas
  const summaries = Array.from(byCampaign.entries()).map(([id, d]) => {
    const ctr = d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0;
    const cpc = d.clicks > 0 ? d.spend / d.clicks : 0;
    const cpm = d.impressions > 0 ? (d.spend / d.impressions) * 1000 : 0;
    const cpl = d.leads > 0 ? d.spend / d.leads : 0;
    const cpmql = d.mqls > 0 ? d.spend / d.mqls : 0;
    const lpConvRate = d.pageView > 0 ? (d.leads / d.pageView) * 100 : 0;
    const connectRate = d.clicks > 0 ? (d.leads / d.clicks) * 100 : 0;

    // Status da campanha
    const campaign = campaigns.find((c) => c.id === id);
    const status = campaign?.effective_status ?? campaign?.status ?? "UNKNOWN";
    const dailyBudget = campaign?.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null;
    const lifetimeBudget = campaign?.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null;

    return {
      id,
      nome: d.name,
      status,
      objetivo: campaign?.objective ?? "—",
      budget: dailyBudget ? `R$ ${dailyBudget.toFixed(2)}/dia` : lifetimeBudget ? `R$ ${lifetimeBudget.toFixed(2)} total` : "sem budget",
      periodo_dias: d.days,
      gasto_total: `R$ ${d.spend.toFixed(2)}`,
      impressoes: d.impressions.toLocaleString("pt-BR"),
      cliques: d.clicks.toLocaleString("pt-BR"),
      alcance: d.reach.toLocaleString("pt-BR"),
      ctr: `${ctr.toFixed(2)}%`,
      cpc: `R$ ${cpc.toFixed(2)}`,
      cpm: `R$ ${cpm.toFixed(2)}`,
      leads: d.leads,
      mqls: d.mqls,
      visualizacoes_lp: d.pageView,
      cpl: d.leads > 0 ? `R$ ${cpl.toFixed(2)}` : "sem leads",
      cpmql: d.mqls > 0 ? `R$ ${cpmql.toFixed(2)}` : "sem MQLs",
      taxa_conversao_lp: d.pageView > 0 ? `${lpConvRate.toFixed(1)}%` : "sem dados",
      connect_rate: d.clicks > 0 ? `${connectRate.toFixed(1)}%` : "sem dados",
    };
  });

  // Totais gerais
  const totalSpend = summaries.reduce((s, c) => s + parseFloat(c.gasto_total.replace("R$ ", "")), 0);
  const totalLeads = summaries.reduce((s, c) => s + c.leads, 0);
  const totalMqls = summaries.reduce((s, c) => s + c.mqls, 0);

  return `\n\n## Dados Reais da Conta (últimos 7 dias)\n
### Totais
- Investimento total: R$ ${totalSpend.toFixed(2)}
- Total de Leads: ${totalLeads}
- Total de MQLs: ${totalMqls}
- CPL médio: ${totalLeads > 0 ? `R$ ${(totalSpend / totalLeads).toFixed(2)}` : "sem leads"}
- CPMQL médio: ${totalMqls > 0 ? `R$ ${(totalSpend / totalMqls).toFixed(2)}` : "sem MQLs"}

### Performance por Campanha (últimos 7 dias)
${JSON.stringify(summaries, null, 2)}`;
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { messages } = await req.json();

    // Busca dados reais para contextualizar a IA
    let performanceContext = "";
    try {
      const [campaigns, insights] = await Promise.all([
        fetchCampaigns(),
        fetchInsights({ level: "campaign", datePreset: "last_7d" }),
      ]);
      if (campaigns.length > 0) {
        performanceContext = buildPerformanceContext(campaigns, insights);
      }
    } catch {
      // Segue sem contexto se a API do Meta falhar
    }

    const systemWithContext = SYSTEM_PROMPT + performanceContext;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const streamResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            stream: true,
            max_tokens: 3000,
            messages: [
              { role: "system", content: systemWithContext },
              ...messages,
            ],
          });

          for await (const chunk of streamResponse) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch (streamErr) {
          const msg = streamErr instanceof Error ? streamErr.message : "Erro interno";
          controller.enqueue(encoder.encode(`[ERRO: ${msg}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
