import Link from "next/link";
import { getDailyFreeLimit } from "@/lib/daily-quota";

export function SiteFooter() {
  const freeLimit = getDailyFreeLimit();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-800 bg-slate-950/90">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-200">
            베타 테스트
          </span>
          <span className="text-sm font-medium text-slate-300">
            IRR Expression Studio
          </span>
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
          AI 표정 변환 베타 서비스입니다. 결과 품질·속도는 이미지와 프리셋마다
          달라질 수 있습니다. SFW(전연령) 이미지만 업로드해 주세요.
        </p>

        <ul className="mt-4 space-y-1.5 text-sm text-slate-500">
          <li>
            · 무료 변환 하루 {freeLimit}회 (KST 자정 초기화, 같은 Wi‑Fi/IP는
            공유)
          </li>
          <li>· 로그인 시 크레딧·이용 기록이 계정에 저장됩니다</li>
          <li>· 비로그인 시 브라우저 쿠키로 이용 횟수를 관리합니다</li>
          <li>
            · 업로드 이미지는 변환 처리 후 서버에 영구 저장하지 않습니다
          </li>
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link
            href="/privacy"
            className="text-emerald-400 transition hover:text-emerald-300"
          >
            개인정보·베타 안내
          </Link>
          <Link href="/" className="text-slate-400 transition hover:text-slate-300">
            변환기 홈
          </Link>
        </div>

        <p className="mt-5 text-xs text-slate-600">
          © {year} IRR Expression Studio · 베타 · 버그·의견은 안내받은 채널로
          보내 주세요
        </p>
      </div>
    </footer>
  );
}
