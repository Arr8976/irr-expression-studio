import { NextRequest } from "next/server";
import { getPaymentAvailability } from "@/lib/credit-checkout";
import { syncCreditAccount } from "@/lib/credit-account";
import { createPaymentOrder } from "@/lib/payment-orders";
import { getAppBaseUrl, getTossClientKey } from "@/lib/toss-payments";
import { getCreditStatus } from "@/lib/user-credits";
import { jsonWithSessionCookie } from "@/lib/request-quota-context";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const account = await syncCreditAccount(request);
  const body = (await request.json().catch(() => null)) as {
    packageId?: string;
  } | null;

  const availability = getPaymentAvailability();
  if (!availability.ready) {
    return jsonWithSessionCookie(
      {
        error: availability.message,
        ...(await getCreditStatus(account.accountKey)),
        payment: availability,
      },
      {
        status: 503,
        sessionId: account.sessionId,
        isNew: account.isNewSession,
      },
    );
  }

  try {
    const order = await createPaymentOrder({
      sessionId: account.sessionId,
      creditAccountKey: account.accountKey,
      packageId: String(body?.packageId ?? ""),
    });
    const baseUrl = getAppBaseUrl(request.nextUrl.origin);

    return jsonWithSessionCookie(
      {
        payment: availability,
        checkout: {
          clientKey: getTossClientKey(),
          customerKey: account.accountKey,
          orderId: order.orderId,
          orderName: order.orderName,
          amount: order.amount,
          successUrl: `${baseUrl}/payment/success`,
          failUrl: `${baseUrl}/payment/fail`,
        },
        ...(await getCreditStatus(account.accountKey)),
      },
      {
        sessionId: account.sessionId,
        isNew: account.isNewSession,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "checkout failed";
    return jsonWithSessionCookie(
      {
        error: message,
        ...(await getCreditStatus(account.accountKey)),
        payment: availability,
      },
      {
        status: 400,
        sessionId: account.sessionId,
        isNew: account.isNewSession,
      },
    );
  }
}
