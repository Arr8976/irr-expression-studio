import NextAuth from "next-auth";
import { resolveUserAccountKeys } from "@/lib/credit-account-keys";
import { buildAuthProviders } from "@/lib/auth-providers";

const providers = buildAuthProviders();

if (providers.length === 0) {
  console.warn(
    "[auth] No OAuth providers configured. Set AUTH_GOOGLE_* or AUTH_KAKAO_* in .env.local",
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  logger: {
    error(error) {
      console.error("[auth]", error);
    },
  },
  callbacks: {
    jwt({ token, account, user, profile }) {
      if (account?.provider && account.providerAccountId) {
        const email =
          user?.email ??
          (typeof profile === "object" &&
          profile &&
          "email" in profile &&
          typeof profile.email === "string"
            ? profile.email
            : undefined) ??
          (typeof token.email === "string" ? token.email : undefined);

        const keys = resolveUserAccountKeys({
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          email,
        });
        token.accountKey = keys.accountKey;
        token.legacyAccountKey = keys.legacyAccountKey;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.accountKey =
          typeof token.accountKey === "string" ? token.accountKey : undefined;
        session.user.legacyAccountKey =
          typeof token.legacyAccountKey === "string"
            ? token.legacyAccountKey
            : undefined;
      }
      return session;
    },
  },
});
