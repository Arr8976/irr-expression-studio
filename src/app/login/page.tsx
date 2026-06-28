import { AuthBar } from "@/components/AuthBar";
import {
  isGoogleAuthConfigured,
  isKakaoAuthConfigured,
} from "@/lib/auth-providers";
import Link from "next/link";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "로그인 서버 설정 오류입니다. AUTH_URL이 https://jikyu.studio 인지, Google·카카오 Redirect URI가 일치하는지 확인한 뒤 다시 시도해 주세요.",
  AccessDenied: "로그인이 취소되었거나 권한이 거부되었습니다.",
  OAuthSignin: "로그인 요청을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  OAuthCallback: "카카오 인증 후 처리에 실패했습니다. Redirect URI가 일치하는지 확인해 주세요.",
  OAuthCreateAccount: "계정을 만들 수 없습니다.",
  CallbackRouteError: "로그인 처리 중 오류가 발생했습니다.",
  Default: "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const errorMessage = error
    ? (AUTH_ERROR_MESSAGES[error] ?? AUTH_ERROR_MESSAGES.Default)
    : null;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">로그인</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        로그인하면 크레딧과 이용 기록이 브라우저가 아닌 계정에 저장됩니다.
        Chrome·Edge·모바일에서 같은 잔액을 사용할 수 있습니다.
      </p>

      {errorMessage ? (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <AuthBar
          googleEnabled={isGoogleAuthConfigured()}
          kakaoEnabled={isKakaoAuthConfigured()}
        />
      </div>

      <Link
        href="/"
        className="mt-8 text-sm text-emerald-400 transition hover:text-emerald-300"
      >
        ← 변환기로 돌아가기
      </Link>
    </main>
  );
}
