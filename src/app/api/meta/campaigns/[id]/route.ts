import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { updateCampaignStatus, updateCampaignBudget } from "@/lib/meta/campaigns";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (session.role !== "admin") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  try {
    const body = await req.json();
    const { id } = await params;

    if (body.status) {
      await updateCampaignStatus(id, body.status);
    }

    if (body.budget !== undefined && body.budgetType) {
      await updateCampaignBudget(id, body.budget, body.budgetType);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
