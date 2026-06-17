export function buildProviderAccountKey(
  provider: string,
  providerAccountId: string,
) {
  return `user:${provider}:${providerAccountId}`;
}

/** @deprecated buildProviderAccountKey 사용 */
export function buildUserAccountKey(
  provider: string,
  providerAccountId: string,
) {
  return buildProviderAccountKey(provider, providerAccountId);
}

export function normalizeAccountEmail(email: string) {
  return email.trim().toLowerCase();
}

export function buildEmailAccountKey(email: string) {
  return `user:email:${normalizeAccountEmail(email)}`;
}

/** OAuth 로그인 시 이메일이 있으면 제공자 간 동일 계정 키를 씁니다. */
export function resolveUserAccountKeys(input: {
  provider: string;
  providerAccountId: string;
  email?: string | null;
}) {
  const providerKey = buildProviderAccountKey(
    input.provider,
    input.providerAccountId,
  );
  const email = input.email?.trim();
  if (email) {
    return {
      accountKey: buildEmailAccountKey(email),
      legacyAccountKey:
        providerKey !== buildEmailAccountKey(email) ? providerKey : undefined,
    };
  }

  return { accountKey: providerKey, legacyAccountKey: undefined };
}
