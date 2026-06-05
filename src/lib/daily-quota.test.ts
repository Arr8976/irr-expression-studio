import { describe, expect, it, beforeEach } from "vitest";
import {
  consumeQuota,
  getQuotaStatus,
  resetQuotaStore,
} from "./daily-quota";

describe("daily quota", () => {
  const now = new Date("2026-06-06T12:00:00+09:00");

  beforeEach(async () => {
    await resetQuotaStore();
    process.env.DAILY_FREE_LIMIT = "3";
  });

  it("allows up to 3 uses", async () => {
    const ip = "1.1.1.1";
    const sessionId = "session-a";

    for (let i = 0; i < 3; i += 1) {
      const status = await getQuotaStatus({ ip, sessionId, now });
      expect(status.allowed).toBe(true);
      expect(status.remaining).toBe(3 - i);
      await consumeQuota({ ip, sessionId, now });
    }

    const blocked = await getQuotaStatus({ ip, sessionId, now });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("blocks new session when ip is exhausted", async () => {
    const ip = "1.1.1.1";
    await consumeQuota({ ip, sessionId: "old-session", now });
    await consumeQuota({ ip, sessionId: "old-session", now });
    await consumeQuota({ ip, sessionId: "old-session", now });

    const nextSession = await getQuotaStatus({
      ip,
      sessionId: "new-session-after-vpn-cookie-clear",
      now,
    });
    expect(nextSession.allowed).toBe(false);
  });

  it("blocks new ip when session is exhausted", async () => {
    const sessionId = "same-browser";
    await consumeQuota({ ip: "1.1.1.1", sessionId, now });
    await consumeQuota({ ip: "1.1.1.1", sessionId, now });
    await consumeQuota({ ip: "1.1.1.1", sessionId, now });

    const vpnIp = await getQuotaStatus({ ip: "9.9.9.9", sessionId, now });
    expect(vpnIp.allowed).toBe(false);
  });
});
