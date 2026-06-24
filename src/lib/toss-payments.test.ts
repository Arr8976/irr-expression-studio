import { afterEach, describe, expect, it } from "vitest";
import { isPaymentMockEnabled } from "./toss-payments";

describe("isPaymentMockEnabled", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("is enabled in non-production when PAYMENT_MOCK=true", () => {
    process.env = { ...originalEnv, NODE_ENV: "test", PAYMENT_MOCK: "true" };
    expect(isPaymentMockEnabled()).toBe(true);
  });

  it("is disabled in production even when PAYMENT_MOCK=true", () => {
    process.env = { ...originalEnv, NODE_ENV: "production", PAYMENT_MOCK: "true" };
    expect(isPaymentMockEnabled()).toBe(false);
  });
});
