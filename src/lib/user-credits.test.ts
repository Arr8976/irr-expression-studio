import { beforeEach, describe, expect, it } from "vitest";
import {
  addCredits,
  consumeCredit,
  getCreditBalance,
  getCreditStatus,
  resetCreditStore,
} from "./user-credits";

describe("user credits", () => {
  const dayOne = new Date("2026-06-06T12:00:00+09:00");
  const dayTwo = new Date("2026-06-07T01:00:00+09:00");

  beforeEach(async () => {
    await resetCreditStore();
    delete process.env.GRANT_DAILY_CREDITS;
  });

  it("starts at zero and consumes one credit", async () => {
    await addCredits("session-1", 3, dayOne);
    expect(await getCreditBalance("session-1", dayOne)).toBe(3);
    expect(await consumeCredit("session-1", dayOne)).toBe(true);
    expect(await getCreditBalance("session-1", dayOne)).toBe(2);
  });

  it("returns false when empty", async () => {
    expect(await consumeCredit("session-1", dayOne)).toBe(false);
  });

  it("resets used count at KST midnight while keeping daily limit", async () => {
    await addCredits("session-1", 10, dayOne);
    await consumeCredit("session-1", dayOne);
    await consumeCredit("session-1", dayOne);
    expect(await getCreditBalance("session-1", dayOne)).toBe(8);

    expect(await getCreditBalance("session-1", dayTwo)).toBe(10);
    expect((await getCreditStatus("session-1", dayTwo)).used).toBe(0);
    expect((await getCreditStatus("session-1", dayTwo)).dailyLimit).toBe(10);
  });

  it("upgrades daily limit when purchasing a larger package", async () => {
    await addCredits("session-1", 10, dayOne);
    await consumeCredit("session-1", dayOne);
    await addCredits("session-1", 30, dayOne);

    const status = await getCreditStatus("session-1", dayOne);
    expect(status.dailyLimit).toBe(30);
    expect(status.balance).toBe(29);
  });

  it("applies GRANT_DAILY_CREDITS for local testing", async () => {
    process.env.GRANT_DAILY_CREDITS = "5";
    expect(await getCreditBalance("session-dev", dayOne)).toBe(5);
  });
});
