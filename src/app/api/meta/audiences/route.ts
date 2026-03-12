import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { fetchAudiences, fetchSavedAudiences } from "@/lib/meta/audiences";
import { db } from "@/lib/db";
import { audiences } from "@/lib/db/schema";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const [customAudiences, savedAudiences] = await Promise.all([
      fetchAudiences(),
      fetchSavedAudiences(),
    ]);

    const allAudiences = [
      ...customAudiences.map((a) => ({ ...a, type: "CUSTOM" })),
      ...savedAudiences.map((a) => ({ ...a, subtype: "SAVED", type: "SAVED" })),
    ];

    // Sincroniza com banco local
    for (const a of customAudiences) {
      await db
        .insert(audiences)
        .values({
          id: a.id,
          name: a.name,
          type: a.subtype?.includes("LOOKALIKE") ? "LOOKALIKE" : "CUSTOM",
          subtype: a.subtype,
          approximateCount: a.approximate_count_lower_bound,
          description: a.description,
        })
        .onConflictDoUpdate({
          target: audiences.id,
          set: { name: a.name, syncedAt: new Date() },
        });
    }

    return NextResponse.json(allAudiences);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
