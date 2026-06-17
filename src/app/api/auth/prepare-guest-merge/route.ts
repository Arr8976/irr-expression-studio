import { NextRequest, NextResponse } from "next/server";
import { GUEST_MERGE_COOKIE, readGuestSessionIdForMerge } from "@/lib/credit-account";
import { getOrCreateSessionId } from "@/lib/request-quota-context";

export const runtime = "nodejs";

/** OAuth 리다이렉트 전에 현재 게스트 세션 ID를 보존합니다. */
export async function POST(request: NextRequest) {
  const fromCookie = readGuestSessionIdForMerge(request);
  const { sessionId } = getOrCreateSessionId(request);
  const guestSessionId =
    fromCookie.length >= 8 ? fromCookie : sessionId;

  const response = NextResponse.json({ ok: true, guestSessionId });
  if (guestSessionId.length >= 8) {
    response.cookies.set(GUEST_MERGE_COOKIE, guestSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 15,
      path: "/",
    });
  }
  return response;
}
