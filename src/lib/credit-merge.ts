import { todayKey } from "./daily-quota";
import {
  readSessionCredits,
  writeSessionCredits,
  type SessionCreditsRow,
} from "./credit-storage";

export const MERGE_FLAG_PREFIX = "irr:merged:";

export function mergeCreditRows(
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

async function readMergeFlag(
  userAccountKey: string,
  guestSessionId: string,
): Promise<boolean> {
  const flagKey = `${MERGE_FLAG_PREFIX}${userAccountKey}:${guestSessionId}`;
  const row = await readSessionCredits(flagKey);
  return row?.used === 1;
}

async function writeMergeFlag(
  userAccountKey: string,
  guestSessionId: string,
  dateKey: string,
) {
  const flagKey = `${MERGE_FLAG_PREFIX}${userAccountKey}:${guestSessionId}`;
  await writeSessionCredits(flagKey, { dateKey, dailyLimit: 1, used: 1 });
}

async function clearGuestCredits(guestSessionId: string, dateKey: string) {
  await writeSessionCredits(guestSessionId, {
    dateKey,
    dailyLimit: 0,
    used: 0,
  });
}

/** 로그인 직후 게스트(브라우저) 크레딧을 계정으로 합칩니다. */
export async function mergeGuestCreditsIntoUser(input: {
  guestSessionId: string;
  userAccountKey: string;
  now?: Date;
  skipIfMerged?: boolean;
}) {
  if (input.guestSessionId === input.userAccountKey) return false;

  const dateKey = todayKey(input.now);

  if (input.skipIfMerged !== false) {
    const alreadyMerged = await readMergeFlag(
      input.userAccountKey,
      input.guestSessionId,
    );
    if (alreadyMerged) return false;
  }

  const guest = await readSessionCredits(input.guestSessionId);
  if (!guest) return false;

  const guestBalance = Math.max(0, guest.dailyLimit - guest.used);
  if (guestBalance <= 0 && guest.dailyLimit <= 0) return false;

  const user = await readSessionCredits(input.userAccountKey);
  const merged = mergeCreditRows(user, guest, dateKey);
  if (!merged) return false;

  await writeSessionCredits(input.userAccountKey, merged);
  await clearGuestCredits(input.guestSessionId, dateKey);
  await writeMergeFlag(input.userAccountKey, input.guestSessionId, dateKey);
  return true;
}
