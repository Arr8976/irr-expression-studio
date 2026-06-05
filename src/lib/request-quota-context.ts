import { NextRequest, NextResponse } from "next/server";

export const QUOTA_SESSION_COOKIE = "irr_sid";

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

export function getOrCreateSessionId(request: NextRequest): {
  sessionId: string;
  isNew: boolean;
} {
  const existing = request.cookies.get(QUOTA_SESSION_COOKIE)?.value?.trim();
  if (existing && existing.length >= 8) {
    return { sessionId: existing, isNew: false };
  }

  return { sessionId: crypto.randomUUID(), isNew: true };
}

export function attachSessionCookie(
  response: NextResponse,
  sessionId: string,
  isNew: boolean,
) {
  if (!isNew) return;

  response.cookies.set(QUOTA_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export function jsonWithSessionCookie<T>(
  body: T,
  init: { status?: number; sessionId: string; isNew: boolean },
) {
  const response = NextResponse.json(body, { status: init.status ?? 200 });
  attachSessionCookie(response, init.sessionId, init.isNew);
  return response;
}
