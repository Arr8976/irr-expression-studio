import {
  readQuotaUsed,
  resetCreditStorageForTests,
  tryAtomicConsumeFreeQuota,
} from "./credit-storage";

const DEFAULT_DAILY_FREE_LIMIT = 3;
const TIMEZONE = "Asia/Seoul";

type QuotaSnapshot = {
  dateKey: string;
  ip: string;
  sessionId: string;
  ipUsed: number;
  sessionUsed: number;
  limit: number;
};

export function getDailyFreeLimit(): number {
  const parsed = Number(process.env.DAILY_FREE_LIMIT ?? DEFAULT_DAILY_FREE_LIMIT);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_DAILY_FREE_LIMIT;
  }
  return Math.floor(parsed);
}

export function todayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(now);
}

export async function getQuotaStatus(input: {
  ip: string;
  sessionId: string;
  now?: Date;
}): Promise<
  QuotaSnapshot & {
    allowed: boolean;
    remaining: number;
    used: number;
  }
> {
  const limit = getDailyFreeLimit();
  const dateKey = todayKey(input.now);
  const ipUsed = await readQuotaUsed({
    scopeType: "ip",
    dateKey,
    scopeId: input.ip,
  });
  const sessionUsed = await readQuotaUsed({
    scopeType: "session",
    dateKey,
    scopeId: input.sessionId,
  });
  const used = Math.max(ipUsed, sessionUsed);
  const remaining = Math.max(0, limit - used);

  return {
    dateKey,
    ip: input.ip,
    sessionId: input.sessionId,
    ipUsed,
    sessionUsed,
    limit,
    used,
    remaining,
    allowed: ipUsed < limit && sessionUsed < limit,
  };
}

export async function consumeQuota(input: {
  ip: string;
  sessionId: string;
  now?: Date;
}): Promise<boolean> {
  const limit = getDailyFreeLimit();
  const dateKey = todayKey(input.now);
  return tryAtomicConsumeFreeQuota({
    ip: input.ip,
    sessionId: input.sessionId,
    dateKey,
    limit,
  });
}

export async function resetQuotaStore() {
  await resetCreditStorageForTests();
}

export function quotaExceededMessage(): string {
  const limit = getDailyFreeLimit();
  return `오늘 무료 변환 ${limit}회를 모두 사용했습니다. 내일 다시 이용해 주세요.`;
}
