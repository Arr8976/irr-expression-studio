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
    const kakaoOptions: Parameters<typeof Kakao>[0] = {
      clientId: process.env.AUTH_KAKAO_ID!.trim(),
      clientSecret: process.env.AUTH_KAKAO_SECRET!.trim(),
      // Kakao OAuth는 PKCE 미지원 — 기본 pkce 사용 시 callback에서 Server error 발생
      checks: ["state"],
    };

    // 카카오 콘솔에서 '카카오계정(이메일)' 동의항목을 켠 뒤에만 설정하세요.
    if (process.env.AUTH_KAKAO_REQUEST_EMAIL === "1") {
      kakaoOptions.authorization = {
        params: {
          scope: "profile_nickname account_email",
        },
      };
    }

    providers.push(Kakao(kakaoOptions));
  }

  return providers;
}
