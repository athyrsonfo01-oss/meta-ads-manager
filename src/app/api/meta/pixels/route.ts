import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { fetchPixels, fetchPixelEvents } from "@/lib/meta/pixels";
import { db } from "@/lib/db";
import { pixels } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const pixelId = searchParams.get("pixelId");

    if (pixelId) {
      const since = searchParams.get("since") ?? undefined;
      const until = searchParams.get("until") ?? undefined;
      const events = await fetchPixelEvents(pixelId, since, until);
      return NextResponse.json(events);
    }

    const data = await fetchPixels();

    // Sincroniza com banco local
    for (const p of data) {
      await db
        .insert(pixels)
        .values({ id: p.id, name: p.name, code: p.code })
        .onConflictDoUpdate({
          target: pixels.id,
          set: { name: p.name, syncedAt: new Date() },
        });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
