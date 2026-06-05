import { NextRequest } from "next/server";
import { getPaymentAvailability } from "@/lib/credit-checkout";
import { createPaymentOrder } from "@/lib/payment-orders";
import { getAppBaseUrl, getTossClientKey } from "@/lib/toss-payments";
import { getCreditStatus } from "@/lib/user-credits";
import {
  getOrCreateSessionId,
  jsonWithSessionCookie,
} from "@/lib/request-quota-context";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { sessionId, isNew } = getOrCreateSessionId(request);
  const body = (await request.json().catch(() => null)) as {
    packageId?: string;
  } | null;

  const availability = getPaymentAvailability();
  if (!availability.ready) {
    return jsonWithSessionCookie(
      {
        error: availability.message,
        ...(await getCreditStatus(sessionId)),
        payment: availability,
      },
      { status: 503, sessionId, isNew },
    );
  }

  try {
    const order = await createPaymentOrder({
      sessionId,
      packageId: String(body?.packageId ?? ""),
    });
    const origin = getAppBaseUrl(request.nextUrl.origin);

    return jsonWithSessionCookie(
      {
        payment: availability,
        checkout: {
          clientKey: getTossClientKey(),
          customerKey: sessionId,
          orderId: order.orderId,
          orderName: order.orderName,
          amount: order.amount,
          successUrl: `${origin}/payment/success`,
          failUrl: `${origin}/payment/fail`,
        },
        ...(await getCreditStatus(sessionId)),
      },
      { sessionId, isNew },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "checkout failed";
    return jsonWithSessionCookie(
      {
        error: message,
        ...(await getCreditStatus(sessionId)),
        payment: availability,
      },
      { status: 400, sessionId, isNew },
    );
  }
}
