import { todayKey } from "./daily-quota";
import {
  readSessionCredits,
  writeSessionCredits,
  tryAcquireMergeLock,
  releaseMergeLock,
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

  const acquired = await tryAcquireMergeLock({
    userAccountKey: input.userAccountKey,
    guestSessionId: input.guestSessionId,
  });
  if (!acquired) return false;

  try {
    const guest = await readSessionCredits(input.guestSessionId);
    if (!guest) {
      await releaseMergeLock({
        userAccountKey: input.userAccountKey,
        guestSessionId: input.guestSessionId,
      });
      return false;
    }

    const guestBalance = Math.max(0, guest.dailyLimit - guest.used);
    if (guestBalance <= 0 && guest.dailyLimit <= 0) {
      await releaseMergeLock({
        userAccountKey: input.userAccountKey,
        guestSessionId: input.guestSessionId,
      });
      return false;
    }

    const user = await readSessionCredits(input.userAccountKey);
    const merged = mergeCreditRows(user, guest, dateKey);
    if (!merged) {
      await releaseMergeLock({
        userAccountKey: input.userAccountKey,
        guestSessionId: input.guestSessionId,
      });
      return false;
    }

    await writeSessionCredits(input.userAccountKey, merged);
    await clearGuestCredits(input.guestSessionId, dateKey);
    return true;
  } catch (error) {
    await releaseMergeLock({
      userAccountKey: input.userAccountKey,
      guestSessionId: input.guestSessionId,
    });
    throw error;
  }
}
