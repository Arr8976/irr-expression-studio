import { NextRequest } from "next/server";
import { fulfillCreditPurchase } from "@/lib/credit-checkout";
import { markPaymentOrderFailed } from "@/lib/payment-orders";
import {
  getOrCreateSessionId,
  jsonWithSessionCookie,
} from "@/lib/request-quota-context";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { sessionId, isNew } = getOrCreateSessionId(request);
  const body = (await request.json().catch(() => null)) as {
    paymentKey?: string;
    orderId?: string;
    amount?: number;
  } | null;

  const orderId = String(body?.orderId ?? "");
  const amount = Number(body?.amount);
  const paymentKey = body?.paymentKey?.trim();

  if (!orderId || !Number.isFinite(amount)) {
    return jsonWithSessionCookie(
      { error: "orderId and amount are required" },
      { status: 400, sessionId, isNew },
    );
  }

  try {
    const result = await fulfillCreditPurchase({
      sessionId,
      orderId,
      amount,
      paymentKey,
    });

    return jsonWithSessionCookie(
      {
        ok: true,
        mode: result.mode,
        orderId: result.order.orderId,
        packageId: result.order.packageId,
        ...result.credits,
      },
      { sessionId, isNew },
    );
  } catch (error) {
    await markPaymentOrderFailed(orderId);
    const message =
      error instanceof Error ? error.message : "payment confirmation failed";
    return jsonWithSessionCookie(
      { error: message },
      { status: 400, sessionId, isNew },
    );
  }
}
