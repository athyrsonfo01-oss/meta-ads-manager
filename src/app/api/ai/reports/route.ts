import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";
import { aiReports } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const reports = await db
    .select()
    .from(aiReports)
    .orderBy(desc(aiReports.createdAt))
    .limit(30);

  return NextResponse.json(reports);
}
