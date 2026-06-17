import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { todayKey } from "./daily-quota";
import {
  readSessionCredits,
  writeSessionCredits,
  type SessionCreditsRow,
} from "./credit-storage";
import { getOrCreateSessionId } from "./request-quota-context";

import { buildUserAccountKey } from "./credit-account-keys";

export type CreditAccountContext = {
  sessionId: string;
  isNewSession: boolean;
  accountKey: string;
  isLoggedIn: boolean;
};

export async function resolveCreditAccount(
  request: NextRequest,
): Promise<CreditAccountContext> {
  const authSession = await auth();
  const { sessionId, isNew } = getOrCreateSessionId(request);
  const accountKey = authSession?.user?.accountKey ?? sessionId;

  return {
    sessionId,
    isNewSession: isNew,
    accountKey,
    isLoggedIn: Boolean(authSession?.user?.accountKey),
  };
}

function mergeCreditRows(
  primary: SessionCreditsRow | null,
  secondary: SessionCreditsRow | null,
  dateKey: string,
): SessionCreditsRow | null {
  if (!primary && !secondary) return null;
  if (!primary) return secondary ? { ...secondary, dateKey } : null;
  if (!secondary) return { ...primary, dateKey };

  const primaryBalance = Math.max(0, primary.dailyLimit - primary.used);
  const secondaryBalance = Math.max(0, secondary.dailyLimit - secondary.used);
  const balance = primaryBalance + secondaryBalance;
  const dailyLimit = Math.max(
    primary.dailyLimit,
    secondary.dailyLimit,
    balance,
  );

  return {
    dateKey,
    dailyLimit,
    used: Math.max(0, dailyLimit - balance),
  };
}

/** 로그인 직후 게스트(브라우저) 크레딧을 계정으로 합칩니다. */
export async function mergeGuestCreditsIntoUser(input: {
  guestSessionId: string;
  userAccountKey: string;
  now?: Date;
}) {
  if (input.guestSessionId === input.userAccountKey) return;

  const dateKey = todayKey(input.now);
  const guest = await readSessionCredits(input.guestSessionId);
  const user = await readSessionCredits(input.userAccountKey);

  if (!guest) return;

  const merged = mergeCreditRows(user, guest, dateKey);
  if (!merged) return;

  await writeSessionCredits(input.userAccountKey, merged);
}

export async function syncCreditAccount(request: NextRequest) {
  const account = await resolveCreditAccount(request);
  if (account.isLoggedIn) {
    await mergeGuestCreditsIntoUser({
      guestSessionId: account.sessionId,
      userAccountKey: account.accountKey,
    });
  }
  return account;
}

export function quotaScopeId(account: CreditAccountContext) {
  return account.isLoggedIn ? account.accountKey : account.sessionId;
}
