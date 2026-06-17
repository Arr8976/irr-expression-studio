import { beforeEach, describe, expect, it } from "vitest";
import {
  createPaymentOrder,
  getPaymentOrder,
  markPaymentOrderPaid,
  resetPaymentOrderStore,
} from "./payment-orders";

describe("payment orders", () => {
  beforeEach(async () => {
    await resetPaymentOrderStore();
  });

  it("creates a pending order from package id", async () => {
    const order = await createPaymentOrder({
      sessionId: "session-1",
      creditAccountKey: "session-1",
      packageId: "standard",
    });

    expect(order.status).toBe("pending");
    expect(order.amount).toBe(4900);
    expect(order.credits).toBe(30);
    expect((await getPaymentOrder(order.orderId))?.sessionId).toBe("session-1");
  });

  it("marks an order as paid", async () => {
    const order = await createPaymentOrder({
      sessionId: "session-1",
      creditAccountKey: "session-1",
      packageId: "starter",
    });

    await markPaymentOrderPaid({
      orderId: order.orderId,
      paymentKey: "pay_test",
    });

    expect((await getPaymentOrder(order.orderId))?.status).toBe("paid");
  });
});
