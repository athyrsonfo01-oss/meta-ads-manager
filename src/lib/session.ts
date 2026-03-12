import { cookies } from "next/headers";
import { verifySession, type SessionPayload } from "@/lib/auth";

export const SESSION_COOKIE = "ads-session";

export async function requireAuth(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
