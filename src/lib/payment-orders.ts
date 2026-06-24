import { APP_NAME } from "@/lib/brand";
import { getCreditPackageById } from "./credit-packages";
import {
  readPaymentOrder,
  writePaymentOrder,
  resetCreditStorageForTests,
  tryClaimPaymentOrder,
  type PaymentClaimResult,
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
    orderName: `${APP_NAME} ${pkg.name} ${pkg.credits}회`,
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
  const claim = await tryClaimPaymentOrder(input);
  if (claim === "not_found") return null;
  if (claim === "not_pending") return null;
  return readPaymentOrder(input.orderId);
}

export { type PaymentClaimResult };

export async function claimPaymentOrder(input: {
  orderId: string;
  paymentKey: string;
}): Promise<PaymentClaimResult> {
  return tryClaimPaymentOrder(input);
}

export async function markPaymentOrderFailed(orderId: string) {
  const order = await readPaymentOrder(orderId);
  if (!order || order.status === "paid") return;

  await writePaymentOrder({ ...order, status: "failed" });
}

export async function resetPaymentOrderStore() {
  await resetCreditStorageForTests();
}
