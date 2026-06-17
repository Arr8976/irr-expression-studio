import { describe, expect, it, beforeEach } from "vitest";
import { consumeCredit, addCredits, getCreditBalance } from "./user-credits";
import { resetCreditStorageForTests } from "./credit-storage";

describe("atomic credit consume", () => {
  const dayOne = new Date("2026-06-06T12:00:00+09:00");

  beforeEach(async () => {
    process.env.CREDIT_STORE = "memory";
    await resetCreditStorageForTests();
  });

  it("does not over-consume when called concurrently", async () => {
    await addCredits("session-race", 1, dayOne);
    const results = await Promise.all([
      consumeCredit("session-race", dayOne),
      consumeCredit("session-race", dayOne),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await getCreditBalance("session-race", dayOne)).toBe(0);
  });
});
