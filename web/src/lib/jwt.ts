import { jwtVerify } from "jose";
import type { Role } from "./session";

export type SessionPayload = {
  sub: string;
  role: Role;
  iat: number;
  exp: number;
};

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET non configuré");
  return new TextEncoder().encode(secret);
}

// Vérifie un JWT HS256 émis côté Apps Script (même secret partagé côté serveur Next.js).
export async function verifyAccessToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
