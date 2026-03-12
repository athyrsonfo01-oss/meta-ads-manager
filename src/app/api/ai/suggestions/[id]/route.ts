import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { executeSuggestion, rejectSuggestion } from "@/lib/ai/optimizer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { action, reason } = body;

    if (action === "approve") {
      const result = await executeSuggestion(id);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    if (action === "reject") {
      await rejectSuggestion(id, reason);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
