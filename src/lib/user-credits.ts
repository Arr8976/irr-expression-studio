import { todayKey } from "./daily-quota";
import {
  readSessionCredits,
  writeSessionCredits,
  resetCreditStorageForTests,
  tryAtomicConsumeCredit,
} from "./credit-storage";

type SessionCredits = {
  dateKey: string;
  dailyLimit: number;
  used: number;
};

function devGrantLimit(): number {
  const parsed = Number(process.env.GRANT_DAILY_CREDITS ?? 0);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;
  return Math.floor(parsed);
}

async function loadSession(
  sessionId: string,
  now = new Date(),
): Promise<SessionCredits> {
  const dateKey = todayKey(now);
  const existing = await readSessionCredits(sessionId);

  let session: SessionCredits = existing ?? {
    dateKey,
    dailyLimit: 0,
    used: 0,
  };

  if (session.dateKey !== dateKey) {
    session = {
      dateKey,
      dailyLimit: session.dailyLimit,
      used: 0,
    };
  }

  const grant = devGrantLimit();
  if (grant > 0 && session.dailyLimit < grant) {
    session.dailyLimit = grant;
  }

  await writeSessionCredits(sessionId, session);
  return session;
}

export type CreditStatus = {
  dateKey: string;
  dailyLimit: number;
  used: number;
  balance: number;
};

export async function getCreditStatus(
  sessionId: string,
  now = new Date(),
): Promise<CreditStatus> {
  const session = await loadSession(sessionId, now);
  const balance = Math.max(0, session.dailyLimit - session.used);

  return {
    dateKey: session.dateKey,
    dailyLimit: session.dailyLimit,
    used: session.used,
    balance,
  };
}

export async function getCreditBalance(
  sessionId: string,
  now = new Date(),
): Promise<number> {
  return (await getCreditStatus(sessionId, now)).balance;
}

/** 패키지 구매 시 오늘 하루 사용 가능한 변환 한도를 설정합니다. */
export async function setDailyCreditLimit(
  sessionId: string,
  limit: number,
  now = new Date(),
): Promise<number> {
  if (limit < 1) return getCreditBalance(sessionId, now);

  const session = await loadSession(sessionId, now);
  session.dailyLimit = Math.max(session.dailyLimit, Math.floor(limit));
  await writeSessionCredits(sessionId, session);
  return Math.max(0, session.dailyLimit - session.used);
}

/** @deprecated setDailyCreditLimit 사용 — 테스트·결제 연동용 별칭 */
export async function addCredits(
  sessionId: string,
  amount: number,
  now = new Date(),
): Promise<number> {
  return setDailyCreditLimit(sessionId, amount, now);
}

export async function consumeCredit(
  sessionId: string,
  now = new Date(),
): Promise<boolean> {
  const session = await loadSession(sessionId, now);
  return tryAtomicConsumeCredit({
    sessionId,
    dateKey: session.dateKey,
    dailyLimit: session.dailyLimit,
  });
}

export async function resetCreditStore() {
  await resetCreditStorageForTests();
}
