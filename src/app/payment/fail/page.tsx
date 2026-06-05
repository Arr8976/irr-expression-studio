import { Suspense } from "react";
import PaymentFailClient from "./PaymentFailClient";

export default function PaymentFailPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
            <h1 className="text-2xl font-bold text-amber-300">결제 실패</h1>
          </div>
        </main>
      }
    >
      <PaymentFailClient />
    </Suspense>
  );
}
