"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDailyCredits } from "@/lib/credit-packages";

type ConfirmResponse = {
  ok?: boolean;
  error?: string;
  balance?: number;
  dailyLimit?: number;
  packageId?: string;
  mode?: "toss" | "mock";
};

export default function PaymentSuccessClient() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [credits, setCredits] = useState<{ balance?: number; dailyLimit?: number }>(
    {},
  );

  useEffect(() => {
    async function confirmPayment() {
      const paymentKey = searchParams.get("paymentKey") ?? undefined;
      const orderId = searchParams.get("orderId");
      const amount = Number(searchParams.get("amount"));

      if (!orderId || !Number.isFinite(amount)) {
        setStatus("error");
        setMessage("결제 정보가 올바르지 않습니다.");
        return;
      }

      try {
        const res = await fetch("/api/credits/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });
        const data = (await res.json()) as ConfirmResponse;

        if (!res.ok) {
          throw new Error(data.error ?? "결제 승인에 실패했습니다.");
        }

        setCredits({ balance: data.balance, dailyLimit: data.dailyLimit });
        setStatus("success");
        setMessage(
          data.mode === "mock"
            ? "테스트 결제로 크레딧이 충전되었습니다."
            : "결제가 완료되어 크레딧이 충전되었습니다.",
        );
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "결제 승인에 실패했습니다.",
        );
      }
    }

    confirmPayment();
  }, [searchParams]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
        {status === "loading" && (
          <>
            <h1 className="text-2xl font-bold">결제 확인 중...</h1>
            <p className="mt-3 text-slate-400">잠시만 기다려 주세요.</p>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-2xl font-bold text-emerald-300">충전 완료</h1>
            <p className="mt-3 text-slate-300">{message}</p>
            {typeof credits.dailyLimit === "number" && credits.dailyLimit > 0 && (
              <p className="mt-4 rounded-lg bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                오늘 사용 가능: {formatDailyCredits(credits.dailyLimit)} (잔액{" "}
                {credits.balance ?? 0}회)
              </p>
            )}
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-2xl font-bold text-rose-300">결제 처리 실패</h1>
            <p className="mt-3 text-slate-300">{message}</p>
          </>
        )}

        <Link
          href="/"
          className="mt-8 inline-flex rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400"
        >
          변환기로 돌아가기
        </Link>
      </div>
    </main>
  );
}
