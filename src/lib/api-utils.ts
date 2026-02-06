import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return null;
  }
  return session.user as { id: string; name: string; email: string };
}

export function isRbacEnabled() {
  return process.env.ENABLE_RBAC === 'true';
}

export async function getAuthContext() {
  const rbac = isRbacEnabled();
  let userId = '1';

  if (rbac) {
    const user = await getSessionUser();
    if (!user) {
      return { authorized: false as const };
    }
    userId = user.id;
  }

  return { authorized: true as const, userId, rbac };
}

export function apiError(message: string, status: number = 500, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export function apiSuccess(data: unknown) {
  return NextResponse.json(data);
}
