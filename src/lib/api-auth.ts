import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Role = "ADMIN" | "ORGANIZER" | "COMPETITOR";

type AuthResult =
  | { session: { user: { id: string; email: string; name: string; role: string } }; response?: never }
  | { session?: never; response: NextResponse };

/**
 * Require an authenticated session. Returns 401 if not logged in.
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { response: NextResponse.json({ error: "Autentimata" }, { status: 401 }) };
  }
  return { session };
}

/**
 * Require an authenticated session with one of the specified roles.
 * Returns 401 if not logged in, 403 if role doesn't match.
 */
export async function requireRole(...roles: Role[]): Promise<AuthResult> {
  const result = await requireAuth();
  if (result.response) return result;

  if (!roles.includes(result.session.user.role as Role)) {
    return { response: NextResponse.json({ error: "Keelatud" }, { status: 403 }) };
  }
  return result;
}

/**
 * Check if a session user is an organizer or admin.
 */
export function isOrganizerOrAdmin(session: { user: { role: string } }): boolean {
  return session.user.role === "ORGANIZER" || session.user.role === "ADMIN";
}
