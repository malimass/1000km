import { SignJWT, jwtVerify } from "jose";
import type { VercelRequest } from "@vercel/node";

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET non impostata");
  return new TextEncoder().encode(s);
}

export interface TokenPayload {
  sub: string;   // user UUID
  email: string;
  role: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export function extractToken(req: VercelRequest): string | null {
  const auth = req.headers["authorization"] ?? "";
  if (typeof auth === "string" && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function requireAuth(
  req: VercelRequest
): Promise<TokenPayload | null> {
  const token = extractToken(req);
  if (!token) return null;
  return verifyToken(token);
}
