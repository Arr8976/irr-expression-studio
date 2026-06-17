import Link from "next/link";
import { AuthBar } from "@/components/AuthBar";

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">로그인</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        로그인하면 크레딧과 이용 기록이 브라우저가 아닌 계정에 저장됩니다.
        Chrome·Edge·모바일에서 같은 잔액을 사용할 수 있습니다.
      </p>

      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <AuthBar />
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
