import { NextRequest } from "next/server";
import { getPaymentAvailability } from "@/lib/credit-checkout";
import { CREDIT_PACKAGES } from "@/lib/credit-packages";
import { getCreditStorageInfo } from "@/lib/credit-storage";
import { getCreditStatus } from "@/lib/user-credits";
import {
  getOrCreateSessionId,
  jsonWithSessionCookie,
} from "@/lib/request-quota-context";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { sessionId, isNew } = getOrCreateSessionId(request);

  const credits = await getCreditStatus(sessionId);
  const payment = getPaymentAvailability();

  return jsonWithSessionCookie(
    {
      ...credits,
      packages: CREDIT_PACKAGES,
      payment,
      storage: getCreditStorageInfo(),
    },
    { sessionId, isNew },
  );
}

export async function POST(request: NextRequest) {
  const { sessionId, isNew } = getOrCreateSessionId(request);
  const payment = getPaymentAvailability();

  return jsonWithSessionCookie(
    {
      error: "POST /api/credits/checkout 를 사용해 주세요.",
      payment,
      ...(await getCreditStatus(sessionId)),
    },
    { status: 410, sessionId, isNew },
  );
}
