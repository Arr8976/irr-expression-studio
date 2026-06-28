import { afterEach, describe, expect, it } from "vitest";
import { getAppBaseUrl, isPaymentMockEnabled } from "./toss-payments";

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

describe("getAppBaseUrl", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("falls back to jikyu.studio in production when env is unset", () => {
    process.env = { ...originalEnv, NODE_ENV: "production" };
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getAppBaseUrl()).toBe("https://jikyu.studio");
  });

  it("prefers NEXT_PUBLIC_APP_URL when set", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://jikyu.studio",
    };
    expect(getAppBaseUrl()).toBe("https://jikyu.studio");
  });
});
