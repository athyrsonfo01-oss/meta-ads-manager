import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { fetchInsights, type InsightLevel, type DatePreset } from "@/lib/meta/insights";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const level = (searchParams.get("level") ?? "campaign") as InsightLevel;
    const datePreset = searchParams.get("datePreset") as DatePreset | null;
    const since = searchParams.get("since") ?? undefined;
    const until = searchParams.get("until") ?? undefined;
    const entityId = searchParams.get("entityId") ?? undefined;

    const data = await fetchInsights({
      level,
      datePreset: datePreset ?? undefined,
      since,
      until,
      entityId,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
