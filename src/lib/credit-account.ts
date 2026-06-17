import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  mergeGuestCreditsIntoUser,
} from "./credit-merge";
import {
  getOrCreateSessionId,
  QUOTA_SESSION_COOKIE,
} from "./request-quota-context";

import { buildUserAccountKey } from "./credit-account-keys";

export { mergeCreditRows, mergeGuestCreditsIntoUser } from "./credit-merge";

export const GUEST_MERGE_COOKIE = "irr_merge_sid";

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

function guestSessionIdsToMerge(request: NextRequest, sessionId: string) {
  const pending = request.cookies.get(GUEST_MERGE_COOKIE)?.value?.trim();
  const ids = new Set<string>();
  if (sessionId.length >= 8) ids.add(sessionId);
  if (pending && pending.length >= 8 && pending !== sessionId) {
    ids.add(pending);
  }
  return [...ids];
}

export async function syncCreditAccount(request: NextRequest) {
  const account = await resolveCreditAccount(request);
  if (account.isLoggedIn) {
    const guestIds = guestSessionIdsToMerge(request, account.sessionId);
    for (const guestSessionId of guestIds) {
      await mergeGuestCreditsIntoUser({
        guestSessionId,
        userAccountKey: account.accountKey,
      });
    }
  }
  return account;
}

export function quotaScopeId(account: CreditAccountContext) {
  return account.isLoggedIn ? account.accountKey : account.sessionId;
}

export function readGuestSessionIdForMerge(request: NextRequest) {
  return request.cookies.get(QUOTA_SESSION_COOKIE)?.value?.trim() ?? "";
}
