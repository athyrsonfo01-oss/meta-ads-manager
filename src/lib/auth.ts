import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "meta-ads-manager-secret-fallback"
);

export interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function validateCredentials(
  email: string,
  password: string
): Promise<SessionPayload | null> {
  // Tenta autenticar pelo banco de dados primeiro
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user?.password && await bcrypt.compare(password, user.password)) {
      return {
        id: user.id,
        email: user.email!,
        name: user.name ?? user.email!,
        role: user.role,
      };
    }
  } catch {
    // Banco indisponível, usa fallback
  }

  // Fallback: admin via env (garante acesso mesmo antes do banco estar migrado)
  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    return { id: "admin", email, name: "Admin", role: "admin" };
  }

  return null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
