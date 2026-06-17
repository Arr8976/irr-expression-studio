import { describe, expect, it, beforeEach } from "vitest";
import {
  buildProviderAccountKey,
  buildEmailAccountKey,
  resolveUserAccountKeys,
} from "./credit-account-keys";
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
  it("builds stable provider account keys", () => {
    expect(buildProviderAccountKey("google", "123")).toBe("user:google:123");
    expect(buildProviderAccountKey("kakao", "456")).toBe("user:kakao:456");
  });

  it("uses email as the shared account key across providers", () => {
    expect(resolveUserAccountKeys({
      provider: "google",
      providerAccountId: "123",
      email: "User@Example.com",
    })).toEqual({
      accountKey: buildEmailAccountKey("user@example.com"),
      legacyAccountKey: "user:google:123",
    });

    expect(resolveUserAccountKeys({
      provider: "kakao",
      providerAccountId: "456",
      email: "user@example.com",
    })).toEqual({
      accountKey: buildEmailAccountKey("user@example.com"),
      legacyAccountKey: "user:kakao:456",
    });
  });

  it("falls back to provider keys when email is missing", () => {
    expect(resolveUserAccountKeys({
      provider: "kakao",
      providerAccountId: "456",
    })).toEqual({
      accountKey: "user:kakao:456",
      legacyAccountKey: undefined,
    });
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
