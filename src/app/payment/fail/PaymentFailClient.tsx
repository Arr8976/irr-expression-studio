"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function PaymentFailClient() {
  const searchParams = useSearchParams();
  const message =
    searchParams.get("message") ??
    searchParams.get("code") ??
    "결제가 취소되었거나 실패했습니다.";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
        <h1 className="text-2xl font-bold text-amber-300">결제 실패</h1>
        <p className="mt-3 text-slate-300">{message}</p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 transition hover:border-emerald-500/50 hover:text-emerald-200"
        >
          다시 시도하기
        </Link>
      </div>
    </main>
  );
}
