import { getCreditPackageById } from "./credit-packages";
import {
  readPaymentOrder,
  writePaymentOrder,
  resetCreditStorageForTests,
  type PaymentOrderRow,
} from "./credit-storage";

export type PaymentOrderStatus = "pending" | "paid" | "failed";

export type PaymentOrder = PaymentOrderRow;

function randomSuffix() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export async function createPaymentOrder(input: {
  sessionId: string;
  creditAccountKey: string;
  packageId: string;
}): Promise<PaymentOrder> {
  const pkg = getCreditPackageById(input.packageId);
  if (!pkg) {
    throw new Error("invalid packageId");
  }

  const orderId = `irr-${Date.now()}-${randomSuffix()}`;
  const order: PaymentOrder = {
    orderId,
    sessionId: input.sessionId,
    creditAccountKey: input.creditAccountKey,
    packageId: pkg.id,
    amount: pkg.priceKrw,
    credits: pkg.credits,
    orderName: `IRR ${pkg.name} ${pkg.credits}회`,
    status: "pending",
    createdAt: Date.now(),
  };

  await writePaymentOrder(order);
  return order;
}

export async function getPaymentOrder(
  orderId: string,
): Promise<PaymentOrder | null> {
  return readPaymentOrder(orderId);
}

export async function markPaymentOrderPaid(input: {
  orderId: string;
  paymentKey: string;
}): Promise<PaymentOrder | null> {
  const order = await readPaymentOrder(input.orderId);
  if (!order) return null;

  if (order.status === "paid") {
    return order;
  }

  const paid: PaymentOrder = {
    ...order,
    status: "paid",
    paymentKey: input.paymentKey,
  };
  await writePaymentOrder(paid);
  return paid;
}

export async function markPaymentOrderFailed(orderId: string) {
  const order = await readPaymentOrder(orderId);
  if (!order || order.status === "paid") return;

  await writePaymentOrder({ ...order, status: "failed" });
}

export async function resetPaymentOrderStore() {
  await resetCreditStorageForTests();
}
