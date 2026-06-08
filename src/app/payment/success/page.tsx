import { Suspense } from "react";
import PaymentSuccessClient from "./PaymentSuccessClient";

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
            <h1 className="text-2xl font-bold">결제 확인 중...</h1>
            <p className="mt-3 text-slate-400">잠시만 기다려 주세요.</p>
          </div>
        </main>
      }
    >
      <PaymentSuccessClient />
    </Suspense>
  );
}
