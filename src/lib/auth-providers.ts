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
        clientId: process.env.AUTH_KAKAO_ID!,
        clientSecret: process.env.AUTH_KAKAO_SECRET!,
      }),
    );
  }

  return providers;
}
