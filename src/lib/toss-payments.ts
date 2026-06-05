const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

export type TossPaymentResult = {
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  status: string;
  method?: string;
};

export function isTossPaymentsConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() &&
      process.env.TOSS_SECRET_KEY?.trim(),
  );
}

export function isPaymentMockEnabled() {
  return process.env.PAYMENT_MOCK === "true";
}

export function getTossClientKey() {
  return process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.trim() ?? "";
}

export function getAppBaseUrl(fallbackOrigin?: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (fallbackOrigin) return fallbackOrigin.replace(/\/$/, "");
  return "http://localhost:3000";
}

function tossAuthHeader(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

export async function confirmTossPayment(input: {
  paymentKey: string;
  orderId: string;
  amount: number;
}): Promise<TossPaymentResult> {
  const secretKey = process.env.TOSS_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("TOSS_SECRET_KEY is not configured");
  }

  const response = await fetch(TOSS_CONFIRM_URL, {
    method: "POST",
    headers: {
      Authorization: tossAuthHeader(secretKey),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentKey: input.paymentKey,
      orderId: input.orderId,
      amount: input.amount,
    }),
  });

  const data = (await response.json()) as TossPaymentResult & {
    message?: string;
    code?: string;
  };

  if (!response.ok) {
    throw new Error(data.message ?? "Toss payment confirmation failed");
  }

  return data;
}
