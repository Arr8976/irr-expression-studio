import { beforeEach, describe, expect, it } from "vitest";
import { fulfillCreditPurchase } from "./credit-checkout";
import {
  createPaymentOrder,
  resetPaymentOrderStore,
} from "./payment-orders";
import { resetCreditStore } from "./user-credits";

describe("credit checkout", () => {
  beforeEach(async () => {
    await resetPaymentOrderStore();
    await resetCreditStore();
    delete process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    delete process.env.TOSS_SECRET_KEY;
    process.env.PAYMENT_MOCK = "true";
  });

  it("grants daily credits after mock payment confirmation", async () => {
    const order = await createPaymentOrder({
      sessionId: "session-1",
      packageId: "starter",
    });

    const result = await fulfillCreditPurchase({
      sessionId: "session-1",
      orderId: order.orderId,
      amount: order.amount,
    });

    expect(result.mode).toBe("mock");
    expect(result.credits.dailyLimit).toBe(10);
    expect(result.credits.balance).toBe(10);
    expect(result.order.status).toBe("paid");
  });

  it("rejects mismatched session", async () => {
    const order = await createPaymentOrder({
      sessionId: "session-1",
      packageId: "starter",
    });

    await expect(
      fulfillCreditPurchase({
        sessionId: "session-2",
        orderId: order.orderId,
        amount: order.amount,
      }),
    ).rejects.toThrow("order does not belong to this session");
  });

  it("is idempotent for already paid orders", async () => {
    const order = await createPaymentOrder({
      sessionId: "session-1",
      packageId: "starter",
    });

    await fulfillCreditPurchase({
      sessionId: "session-1",
      orderId: order.orderId,
      amount: order.amount,
    });

    const again = await fulfillCreditPurchase({
      sessionId: "session-1",
      orderId: order.orderId,
      amount: order.amount,
    });

    expect(again.order.status).toBe("paid");
    expect(again.credits.dailyLimit).toBe(10);
  });
});
