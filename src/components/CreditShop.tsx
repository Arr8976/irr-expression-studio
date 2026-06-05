"use client";

import { useEffect, useState } from "react";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import {
  CREDIT_PACKAGES,
  formatDailyCredits,
  formatKrw,
  type CreditPackage,
} from "@/lib/credit-packages";
import { readApiJson } from "@/lib/read-api-response";

type PaymentAvailability = {
  ready: boolean;
  mode: "toss" | "mock" | "disabled";
  message: string | null;
};

type CheckoutPayload = {
  clientKey: string;
  customerKey: string;
  orderId: string;
  orderName: string;
  amount: number;
  successUrl: string;
  failUrl: string;
};

type CreditShopProps = {
  balance: number;
  dailyLimit?: number;
  onCreditsChange?: (credits: { balance: number; dailyLimit?: number }) => void;
};

function formatTodayBalance(balance: number, dailyLimit?: number) {
  if (dailyLimit != null && dailyLimit > 0) {
    return `오늘 ${balance}/${dailyLimit}회`;
  }
  return `오늘 ${balance}회`;
}

export function CreditShop({
  balance,
  dailyLimit = 0,
  onCreditsChange,
}: CreditShopProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentAvailability>({
    ready: false,
    mode: "disabled",
    message: null,
  });

  useEffect(() => {
    async function loadPaymentStatus() {
      try {
        const res = await fetch("/api/credits");
        const data = await readApiJson<{ payment?: PaymentAvailability }>(res);
        if (data.payment) {
          setPayment(data.payment);
          if (data.payment.message && data.payment.mode === "mock") {
            setNotice(data.payment.message);
          }
        }
      } catch {
        // ignore
      }
    }

    loadPaymentStatus();
  }, []);

  async function onPurchase(packageItem: CreditPackage) {
    setLoadingId(packageItem.id);
    setNotice(null);

    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: packageItem.id }),
      });
      const data = await readApiJson<{
        error?: string;
        payment?: PaymentAvailability;
        checkout?: CheckoutPayload;
        balance?: number;
        dailyLimit?: number;
      }>(res);

      if (typeof data.balance === "number") {
        onCreditsChange?.({
          balance: data.balance,
          dailyLimit: data.dailyLimit,
        });
      }

      if (!res.ok || !data.checkout) {
        setNotice(
          data.error ??
            data.payment?.message ??
            "결제를 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        );
        return;
      }

      if (data.payment?.mode === "mock") {
        const confirmRes = await fetch("/api/credits/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: data.checkout.orderId,
            amount: data.checkout.amount,
          }),
        });
        const confirmData = await readApiJson<{
          error?: string;
          balance?: number;
          dailyLimit?: number;
        }>(confirmRes);

        if (!confirmRes.ok) {
          throw new Error(confirmData.error ?? "테스트 결제에 실패했습니다.");
        }

        onCreditsChange?.({
          balance: confirmData.balance ?? balance,
          dailyLimit: confirmData.dailyLimit ?? dailyLimit,
        });
        setNotice("테스트 결제로 크레딧이 충전되었습니다.");
        return;
      }

      const tossPayments = await loadTossPayments(data.checkout.clientKey);
      const paymentWidget = tossPayments.payment({
        customerKey: data.checkout.customerKey,
      });

      await paymentWidget.requestPayment({
        method: "CARD",
        amount: {
          currency: "KRW",
          value: data.checkout.amount,
        },
        orderId: data.checkout.orderId,
        orderName: data.checkout.orderName,
        successUrl: data.checkout.successUrl,
        failUrl: data.checkout.failUrl,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("USER_CANCEL")) {
        setNotice("결제가 취소되었습니다.");
      } else {
        setNotice(
          error instanceof Error
            ? error.message
            : "결제를 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        );
      }
    } finally {
      setLoadingId(null);
    }
  }

  const purchaseLabel = payment.ready ? "구매하기" : "결제 준비 중";

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">크레딧</h2>
          <p className="mt-1 text-sm text-slate-400">
            무료 3회 이후에는 하루 단위 크레딧 패키지로 변환할 수 있습니다. 매일
            자정(KST)에 크레딧이 초기화됩니다. 크레딧은 이 브라우저에 저장됩니다.
          </p>
        </div>
        <div className="rounded-full bg-emerald-500/10 px-4 py-2 text-sm">
          <span className="text-slate-400">오늘 잔액 </span>
          <span className="font-semibold text-emerald-300">
            {formatTodayBalance(balance, dailyLimit)}
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {CREDIT_PACKAGES.map((pkg) => (
          <article
            key={pkg.id}
            className="relative rounded-xl border border-slate-700 bg-slate-950/60 p-4"
          >
            {pkg.badge && (
              <span className="absolute right-3 top-3 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                {pkg.badge}
              </span>
            )}
            <p className="text-sm text-slate-400">{pkg.name}</p>
            <p className="mt-1 text-2xl font-bold">{formatDailyCredits(pkg.credits)}</p>
            <p className="mt-1 text-sm text-slate-300">₩{formatKrw(pkg.priceKrw)}</p>
            <p className="mt-1 text-xs text-slate-500">
              변환 1회 ₩{formatKrw(Math.round(pkg.priceKrw / pkg.credits))}
            </p>
            <button
              type="button"
              disabled={!payment.ready || loadingId === pkg.id}
              onClick={() => onPurchase(pkg)}
              className="mt-4 w-full rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 transition hover:border-emerald-500/50 hover:text-emerald-200 disabled:opacity-60"
            >
              {loadingId === pkg.id ? "처리 중..." : purchaseLabel}
            </button>
          </article>
        ))}
      </div>

      {notice && (
        <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {notice}
        </p>
      )}
    </section>
  );
}
