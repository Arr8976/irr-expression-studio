import { auth } from "@/auth";
import type { CreditAccountContext } from "@/lib/credit-account";

export async function getAuthUserSummary() {
  const session = await auth();
  if (!session?.user?.accountKey) {
    return { loggedIn: false as const };
  }

  return {
    loggedIn: true as const,
    accountKey: session.user.accountKey,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
  };
}

export function authPayloadFromAccount(account: CreditAccountContext) {
  return {
    loggedIn: account.isLoggedIn,
  };
}
