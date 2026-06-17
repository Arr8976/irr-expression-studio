"use client";

import { signIn, signOut, useSession } from "next-auth/react";

type AuthBarProps = {
  googleEnabled?: boolean;
  kakaoEnabled?: boolean;
};

async function prepareGuestMerge() {
  try {
    await fetch("/api/auth/prepare-guest-merge", { method: "POST" });
  } catch {
    // OAuth는 병합 쿠키 없이도 현재 irr_sid로 시도합니다.
  }
}

async function signInWithGuestMerge(provider: "google" | "kakao") {
  await prepareGuestMerge();
  await signIn(provider, { callbackUrl: "/" });
}

export function AuthBar({
  googleEnabled = true,
  kakaoEnabled = false,
}: AuthBarProps) {
  const { data: session, status } = useSession();
  const loading = status === "loading";

  if (loading) {
    return (
      <div className="text-xs text-slate-500">로그인 상태 확인 중...</div>
    );
  }

  if (session?.user) {
    const label = session.user.name ?? session.user.email ?? "로그인됨";
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
          {label}
        </span>
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-300 transition hover:border-slate-400"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {googleEnabled && (
        <button
          type="button"
          onClick={() => signInWithGuestMerge("google")}
          className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 transition hover:border-emerald-500/50 hover:text-emerald-200"
        >
          Google 로그인
        </button>
      )}
      {kakaoEnabled && (
        <button
          type="button"
          onClick={() => signInWithGuestMerge("kakao")}
          className="rounded-lg border border-amber-500/40 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-100 transition hover:bg-amber-400/20"
        >
          카카오 로그인
        </button>
      )}
      {!googleEnabled && !kakaoEnabled && (
        <span className="text-xs text-slate-500">
          {process.env.NODE_ENV === "development"
            ? "로그인 설정 필요 (.env.local의 AUTH_GOOGLE_* 확인)"
            : "로그인 준비 중입니다 (Vercel 환경변수 설정 필요)"}
        </span>
      )}
    </div>
  );
}
