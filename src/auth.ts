import NextAuth from "next-auth";
import { buildUserAccountKey } from "@/lib/credit-account-keys";
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
    jwt({ token, account }) {
      if (account?.provider && account.providerAccountId) {
        token.accountKey = buildUserAccountKey(
          account.provider,
          account.providerAccountId,
        );
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.accountKey =
          typeof token.accountKey === "string" ? token.accountKey : undefined;
      }
      return session;
    },
  },
});
