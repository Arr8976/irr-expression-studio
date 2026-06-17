import { NextRequest } from "next/server";
import { getAuthUserSummary } from "@/lib/auth-session";
import { getPaymentAvailability } from "@/lib/credit-checkout";
import {
  GUEST_MERGE_COOKIE,
  syncCreditAccount,
} from "@/lib/credit-account";
import {
  isGoogleAuthConfigured,
  isKakaoAuthConfigured,
} from "@/lib/auth-providers";
import { CREDIT_PACKAGES } from "@/lib/credit-packages";
import { getCreditStorageInfo } from "@/lib/credit-storage";
import { getCreditStatus } from "@/lib/user-credits";
import {
  clearCookie,
  jsonWithSessionCookie,
} from "@/lib/request-quota-context";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const account = await syncCreditAccount(request);
  const authUser = await getAuthUserSummary();

  const credits = await getCreditStatus(account.accountKey);
  const payment = getPaymentAvailability();

  const response = jsonWithSessionCookie(
    {
      ...credits,
      packages: CREDIT_PACKAGES,
      payment,
      storage: getCreditStorageInfo(),
      auth: {
        ...authUser,
        providers: {
          google: isGoogleAuthConfigured(),
          kakao: isKakaoAuthConfigured(),
        },
      },
    },
    {
      sessionId: account.sessionId,
      isNew: account.isNewSession,
    },
  );

  if (account.isLoggedIn) {
    clearCookie(response, GUEST_MERGE_COOKIE);
  }

  return response;
}

export async function POST(request: NextRequest) {
  const account = await syncCreditAccount(request);
  const payment = getPaymentAvailability();

  return jsonWithSessionCookie(
    {
      error: "POST /api/credits/checkout 를 사용해 주세요.",
      payment,
      ...(await getCreditStatus(account.accountKey)),
    },
    {
      status: 410,
      sessionId: account.sessionId,
      isNew: account.isNewSession,
    },
  );
}
