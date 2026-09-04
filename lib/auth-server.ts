import { adminAuth } from "@/lib/firebase-admin";
import type { DecodedIdToken } from "firebase-admin/auth";

export async function verifyBearerToken(
  request: Request
): Promise<DecodedIdToken> {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    throw new Error("Missing authentication token.");
  }

  const token = header.slice("Bearer ".length).trim();

  if (!token) {
    throw new Error("Missing authentication token.");
  }

  return adminAuth.verifyIdToken(token);
}

export function isAllowedRole(
  role: unknown,
  allowed: string[]
): boolean {
  return typeof role === "string" && allowed.includes(role);
}
