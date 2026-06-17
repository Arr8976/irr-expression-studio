import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Kakao from "next-auth/providers/kakao";

export function isGoogleAuthConfigured() {
  return Boolean(
    process.env.AUTH_GOOGLE_ID?.trim() &&
      process.env.AUTH_GOOGLE_SECRET?.trim(),
  );
}

export function isKakaoAuthConfigured() {
  return Boolean(
    process.env.AUTH_KAKAO_ID?.trim() && process.env.AUTH_KAKAO_SECRET?.trim(),
  );
}

export function buildAuthProviders(): Provider[] {
  const providers: Provider[] = [];

  if (isGoogleAuthConfigured()) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID!,
        clientSecret: process.env.AUTH_GOOGLE_SECRET!,
      }),
    );
  }

  if (isKakaoAuthConfigured()) {
    providers.push(
      Kakao({
        clientId: process.env.AUTH_KAKAO_ID!.trim(),
        clientSecret: process.env.AUTH_KAKAO_SECRET!.trim(),
        // Kakao OAuth는 PKCE 미지원 — 기본 pkce 사용 시 callback에서 Server error 발생
        checks: ["state"],
        authorization: {
          params: {
            scope: "profile_nickname account_email",
          },
        },
      }),
    );
  }

  return providers;
}
