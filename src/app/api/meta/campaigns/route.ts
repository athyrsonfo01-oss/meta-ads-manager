import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import {
  fetchCampaigns,
  fetchAdSets,
  fetchAds,
  createCampaign,
} from "@/lib/meta/campaigns";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level") ?? "campaign";

    if (level === "campaign") {
      const data = await fetchCampaigns();
      // Sincroniza com banco local em background (não bloqueia resposta)
      Promise.all(
        data.map((c) =>
          db
            .insert(campaigns)
            .values({
              id: c.id,
              name: c.name,
              status: c.effective_status ?? c.status,
              objective: c.objective,
              dailyBudget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
              lifetimeBudget: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : null,
            })
            .onConflictDoUpdate({
              target: campaigns.id,
              set: {
                name: c.name,
                status: c.effective_status ?? c.status,
                objective: c.objective,
                dailyBudget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
                syncedAt: new Date(),
              },
            })
        )
      ).catch(console.error);
      return NextResponse.json(data);
    }

    if (level === "adset") {
      const campaignId = searchParams.get("campaignId") ?? undefined;
      const data = await fetchAdSets(campaignId);
      return NextResponse.json(data);
    }

    if (level === "ad") {
      const adSetId = searchParams.get("adSetId") ?? undefined;
      const data = await fetchAds(adSetId);
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Nível inválido" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const body = await req.json();
    const result = await createCampaign(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
