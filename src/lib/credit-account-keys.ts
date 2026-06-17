export function buildUserAccountKey(
  provider: string,
  providerAccountId: string,
) {
  return `user:${provider}:${providerAccountId}`;
}
