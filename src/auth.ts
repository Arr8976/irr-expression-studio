import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";
import { buildUserAccountKey } from "@/lib/credit-account-keys";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google, Kakao],
  trustHost: true,
  pages: {
    signIn: "/login",
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
