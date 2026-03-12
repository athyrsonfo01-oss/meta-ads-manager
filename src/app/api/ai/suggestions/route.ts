import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";
import { aiSuggestions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const suggestions = await db
    .select()
    .from(aiSuggestions)
    .orderBy(desc(aiSuggestions.createdAt));

  return NextResponse.json(suggestions);
}
