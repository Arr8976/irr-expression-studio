import { describe, expect, it, beforeEach } from "vitest";
import { buildUserAccountKey } from "./credit-account-keys";
import {
  mergeCreditRows,
  mergeGuestCreditsIntoUser,
} from "./credit-merge";
import {
  readSessionCredits,
  resetCreditStorageForTests,
  writeSessionCredits,
} from "./credit-storage";

describe("credit account keys", () => {
  it("builds stable user account keys", () => {
    expect(buildUserAccountKey("google", "123")).toBe("user:google:123");
    expect(buildUserAccountKey("kakao", "456")).toBe("user:kakao:456");
  });
});

describe("mergeCreditRows", () => {
  it("sums remaining balances and keeps the higher package limit", () => {
    const merged = mergeCreditRows(
      { dateKey: "2026-06-17", dailyLimit: 0, used: 0 },
      { dateKey: "2026-06-17", dailyLimit: 100, used: 80 },
      "2026-06-17",
    );

    expect(merged).toEqual({
      dateKey: "2026-06-17",
      dailyLimit: 100,
      used: 80,
    });
  });

  it("combines two starter-tier rows into 20/20", () => {
    const merged = mergeCreditRows(
      { dateKey: "2026-06-17", dailyLimit: 10, used: 0 },
      { dateKey: "2026-06-17", dailyLimit: 10, used: 0 },
      "2026-06-17",
    );

    expect(merged).toEqual({
      dateKey: "2026-06-17",
      dailyLimit: 20,
      used: 0,
    });
  });
});

describe("mergeGuestCreditsIntoUser", () => {
  beforeEach(async () => {
    process.env.CREDIT_STORE = "memory";
    await resetCreditStorageForTests();
  });

  it("merges guest credits once and clears the guest row", async () => {
    const guestId = "guest-session";
    const userKey = "user:google:abc";

    await writeSessionCredits(guestId, {
      dateKey: "2026-06-17",
      dailyLimit: 100,
      used: 80,
    });

    const merged = await mergeGuestCreditsIntoUser({
      guestSessionId: guestId,
      userAccountKey: userKey,
      now: new Date("2026-06-17T12:00:00+09:00"),
    });

    expect(merged).toBe(true);
    expect(await readSessionCredits(userKey)).toEqual({
      dateKey: "2026-06-17",
      dailyLimit: 100,
      used: 80,
    });
    expect(await readSessionCredits(guestId)).toEqual({
      dateKey: "2026-06-17",
      dailyLimit: 0,
      used: 0,
    });

    const again = await mergeGuestCreditsIntoUser({
      guestSessionId: guestId,
      userAccountKey: userKey,
      now: new Date("2026-06-17T12:00:00+09:00"),
    });

    expect(again).toBe(false);
    expect(await readSessionCredits(userKey)).toEqual({
      dateKey: "2026-06-17",
      dailyLimit: 100,
      used: 80,
    });
  });
});
