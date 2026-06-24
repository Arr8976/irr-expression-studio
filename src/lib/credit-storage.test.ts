import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  closeCreditStorageForTests,
  incrementQuotaUsed,
  readPaymentOrder,
  readQuotaUsed,
  readSessionCredits,
  resetCreditStorageForTests,
  resolveCreditStorageBackend,
  writePaymentOrder,
  writeSessionCredits,
} from "./credit-storage";

describe("credit storage sqlite", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "irr-credits-"));
    delete process.env.CREDIT_STORE;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    process.env.CREDIT_DB_PATH = path.join(tempDir, "credits.db");
    await resetCreditStorageForTests();
  });

  afterEach(async () => {
    await resetCreditStorageForTests();
    closeCreditStorageForTests();
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("uses sqlite by default in non-test memory mode", () => {
    expect(resolveCreditStorageBackend()).toBe("sqlite");
  });

  it("persists session credits across reads", async () => {
    await writeSessionCredits("session-persist", {
      dateKey: "2026-06-06",
      dailyLimit: 10,
      used: 2,
    });

    closeCreditStorageForTests();

    const row = await readSessionCredits("session-persist");
    expect(row).toEqual({
      dateKey: "2026-06-06",
      dailyLimit: 10,
      used: 2,
    });
  });

  it("persists payment orders across reads", async () => {
    await writePaymentOrder({
      orderId: "irr-test-order",
      sessionId: "session-1",
      creditAccountKey: "session-1",
      packageId: "starter",
      amount: 1990,
      credits: 10,
      orderName: "JIKYU Starter",
      status: "paid",
      paymentKey: "pay_123",
      createdAt: Date.now(),
    });

    closeCreditStorageForTests();

    const order = await readPaymentOrder("irr-test-order");
    expect(order?.status).toBe("paid");
    expect(order?.paymentKey).toBe("pay_123");
  });

  it("persists daily free quota counts across reads", async () => {
    await incrementQuotaUsed({
      scopeType: "session",
      dateKey: "2026-06-06",
      scopeId: "session-quota",
    });
    await incrementQuotaUsed({
      scopeType: "ip",
      dateKey: "2026-06-06",
      scopeId: "127.0.0.1",
    });

    closeCreditStorageForTests();

    expect(
      await readQuotaUsed({
        scopeType: "session",
        dateKey: "2026-06-06",
        scopeId: "session-quota",
      }),
    ).toBe(1);
    expect(
      await readQuotaUsed({
        scopeType: "ip",
        dateKey: "2026-06-06",
        scopeId: "127.0.0.1",
      }),
    ).toBe(1);
  });
});
