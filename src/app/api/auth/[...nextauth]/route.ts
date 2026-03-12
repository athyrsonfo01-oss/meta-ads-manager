import { NextResponse } from "next/server";

// next-auth replaced by custom JWT auth — this route is no longer used
export async function GET() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
