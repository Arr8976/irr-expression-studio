import { getCreditPackageById } from "./credit-packages";
import {
  getPaymentOrder,
  claimPaymentOrder,
  type PaymentOrder,
} from "./payment-orders";
import {
  confirmTossPayment,
  isPaymentMockEnabled,
  isTossPaymentsConfigured,
} from "./toss-payments";
import {
  getCreditStatus,
  setDailyCreditLimit,
  type CreditStatus,
} from "./user-credits";

export type FulfillPaymentInput = {
  sessionId: string;
  orderId: string;
  amount: number;
  paymentKey?: string;
};

export type FulfillPaymentResult = {
  order: PaymentOrder;
  credits: CreditStatus;
  mode: "toss" | "mock";
};

function assertOrderMatchesSession(order: PaymentOrder, sessionId: string) {
  if (order.sessionId !== sessionId) {
    throw new Error("order does not belong to this session");
  }
}

function assertOrderAmount(order: PaymentOrder, amount: number) {
  if (order.amount !== amount) {
    throw new Error("payment amount mismatch");
  }
}

async function grantCredits(
  accountKey: string,
  packageId: string,
): Promise<CreditStatus> {
  const pkg = getCreditPackageById(packageId);
  if (!pkg) {
    throw new Error("invalid packageId");
  }

  await setDailyCreditLimit(accountKey, pkg.credits);
  return getCreditStatus(accountKey);
}

export async function fulfillCreditPurchase(
  input: FulfillPaymentInput,
): Promise<FulfillPaymentResult> {
  const order = await getPaymentOrder(input.orderId);
  if (!order) {
    throw new Error("order not found");
  }

  assertOrderAmount(order, input.amount);

  const creditAccountKey = order.creditAccountKey || order.sessionId;

  if (order.status === "paid") {
    return {
      order,
      credits: await getCreditStatus(creditAccountKey),
      mode: isPaymentMockEnabled() ? "mock" : "toss",
    };
  }

  if (order.status !== "pending") {
    throw new Error("order is not payable");
  }

  async function claimAndGrant(paymentKey: string) {
    const claim = await claimPaymentOrder({
      orderId: order.orderId,
      paymentKey,
    });

    if (claim === "already_paid") {
      const paidOrder = await getPaymentOrder(order.orderId);
      if (!paidOrder) throw new Error("order not found");
      return {
        order: paidOrder,
        credits: await getCreditStatus(creditAccountKey),
        mode: (isPaymentMockEnabled() ? "mock" : "toss") as "mock" | "toss",
      };
    }

    if (claim !== "claimed") {
      throw new Error("order is not payable");
    }

    const credits = await grantCredits(creditAccountKey, order.packageId);
    const paidOrder = await getPaymentOrder(order.orderId);
    if (!paidOrder) throw new Error("order not found after payment");

    return {
      order: paidOrder,
      credits,
      mode: (isPaymentMockEnabled() ? "mock" : "toss") as "mock" | "toss",
    };
  }

  if (isPaymentMockEnabled() && !isTossPaymentsConfigured()) {
    assertOrderMatchesSession(order, input.sessionId);
    return claimAndGrant(input.paymentKey ?? "mock-payment");
  }

  if (!input.paymentKey) {
    throw new Error("paymentKey is required");
  }

  const payment = await confirmTossPayment({
    paymentKey: input.paymentKey,
    orderId: input.orderId,
    amount: input.amount,
  });

  if (payment.orderId !== order.orderId || payment.totalAmount !== order.amount) {
    throw new Error("confirmed payment does not match order");
  }

  return claimAndGrant(payment.paymentKey);
}

export function getPaymentAvailability() {
  if (isTossPaymentsConfigured()) {
    return {
      ready: true,
      mode: "toss" as const,
      message: null,
    };
  }

  if (isPaymentMockEnabled()) {
    return {
      ready: true,
      mode: "mock" as const,
      message: "PAYMENT_MOCK=true — 테스트 결제 모드입니다.",
    };
  }

  return {
    ready: false,
    mode: "disabled" as const,
    message:
      "토스페이먼츠 키가 설정되지 않았습니다. NEXT_PUBLIC_TOSS_CLIENT_KEY와 TOSS_SECRET_KEY를 추가해 주세요.",
  };
}
