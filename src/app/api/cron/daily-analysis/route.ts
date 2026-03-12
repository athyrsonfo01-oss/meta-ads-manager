import { NextRequest, NextResponse } from "next/server";
import { fetchYesterdayInsights } from "@/lib/meta/insights";
import { analyzePerformance } from "@/lib/ai/analyzer";
import { db } from "@/lib/db";
import { aiReports, aiSuggestions } from "@/lib/db/schema";
import { format, subDays } from "date-fns";
import { nanoid } from "nanoid";

// Protege o endpoint do cron com secret
function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

    // 1. Busca insights do dia anterior no Meta
    const insights = await fetchYesterdayInsights("campaign");

    if (insights.length === 0) {
      return NextResponse.json({ message: "Nenhum dado para analisar" });
    }

    // 2. Envia para o Claude analisar
    const analysis = await analyzePerformance(insights, yesterday);

    // 3. Salva relatório no banco
    const reportId = nanoid();
    await db.insert(aiReports).values({
      id: reportId,
      date: yesterday,
      summary: analysis.summary,
      highlights: analysis.highlights,
      concerns: analysis.concerns,
      fullAnalysis: analysis.fullAnalysis,
      totalSpend: analysis.totalSpend,
      totalLeads: analysis.totalLeads,
      totalMqls: analysis.totalMqls,
      avgCpl: analysis.avgCpl,
      avgCpmql: analysis.avgCpmql,
    });

    // 4. Salva sugestões de otimização
    for (const suggestion of analysis.suggestions) {
      await db.insert(aiSuggestions).values({
        id: nanoid(),
        entityId: suggestion.entityId,
        entityType: suggestion.entityType,
        entityName: suggestion.entityName,
        type: suggestion.type as never,
        title: suggestion.title,
        reasoning: suggestion.reasoning,
        currentValue: suggestion.currentValue,
        suggestedValue: suggestion.suggestedValue,
        impact: suggestion.impact,
        status: "pending",
        reportId,
      });
    }

    return NextResponse.json({
      success: true,
      reportId,
      suggestionsCreated: analysis.suggestions.length,
      date: yesterday,
    });
  } catch (error) {
    console.error("[CRON] Erro na análise diária:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
