import Link from "next/link";
import type { Metadata } from "next";
import { APP_NAME } from "@/lib/brand";
import { getDailyFreeLimit } from "@/lib/daily-quota";

export const metadata: Metadata = {
  title: `개인정보·이용 안내`,
  description: `${APP_NAME} 개인정보 및 이용 안내`,
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  const freeLimit = getDailyFreeLimit();

  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
      <Link
        href="/"
        className="text-sm text-emerald-400 transition hover:text-emerald-300"
      >
        ← 변환기로 돌아가기
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight">
        개인정보·이용 안내
      </h1>
      <p className="mt-3 text-sm text-slate-400">
        {APP_NAME} 서비스 이용과 관련한 안내입니다.
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-300">
        <section>
          <h2 className="text-lg font-semibold text-slate-100">서비스 개요</h2>
          <p className="mt-2">
            {APP_NAME}는 업로드한 이미지의 표정을 AI로 변환하는 웹 서비스입니다.
            Google·카카오 로그인 시 크레딧과 이용 기록이 계정에 저장되며, 비로그인
            시에는 브라우저 쿠키로 무료 이용 횟수와 크레딧을 관리합니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100">
            처리하는 정보
          </h2>
          <ul className="mt-2 list-inside list-disc space-y-2 text-slate-400">
            <li>
              <strong className="text-slate-300">업로드 이미지</strong> — 표정
              변환을 위해 일시적으로 처리합니다. 변환 완료 후 서버에 영구
              저장하지 않습니다.
            </li>
            <li>
              <strong className="text-slate-300">세션 쿠키 (`irr_sid`)</strong>{" "}
              — 무료 이용 횟수·크레딧 잔액·결제 주문 연결에 사용합니다.
            </li>
            <li>
              <strong className="text-slate-300">로그인 계정</strong> — Google
              또는 카카오 OAuth로 식별하며, 크레딧 잔액 동기화에 사용합니다.
            </li>
            <li>
              <strong className="text-slate-300">IP 주소</strong> — 하루 무료
              변환 {freeLimit}회 제한 집계에 사용합니다.
            </li>
            <li>
              <strong className="text-slate-300">결제 정보</strong> — 크레딧
              구매 시 토스페이먼츠를 통해 처리하며, 카드 정보는 본 서비스
              서버에 저장하지 않습니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100">
            외부 AI 처리
          </h2>
          <p className="mt-2 text-slate-400">
            변환 요청 시 업로드 이미지와 표정 지시 프롬프트가{" "}
            <strong className="text-slate-300">Google Gemini</strong> API로
            전송됩니다. Google의 데이터 처리 정책이 별도로 적용될 수
            있습니다. 선정적·과도한 노출 등 안전 정책에 해당하는 이미지는
            변환되지 않을 수 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100">이용 안내</h2>
          <ul className="mt-2 list-inside list-disc space-y-2 text-slate-400">
            <li>
              무료 변환은 하루 {freeLimit}회이며, KST(한국 표준시) 자정에
              초기화됩니다.
            </li>
            <li>
              같은 Wi‑Fi·PC에서 Edge와 Chrome 등 브라우저를 바꿔도 IP 기준
              무료 횟수는 공유될 수 있습니다.
            </li>
            <li>
              로그인 시 크레딧은 계정에 저장되며, 같은 이메일로 연동된
              제공자(Google·카카오) 간 잔액이 공유될 수 있습니다.
            </li>
            <li>
              AI 변환 결과는 100% 동일하게 재현되지 않을 수 있으며, 일부
              프리셋(예: 시선 이동)은 실험 단계입니다.
            </li>
            <li>서비스 기능·요금·정책은 사전 고지 후 변경될 수 있습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100">문의</h2>
          <p className="mt-2 text-slate-400">
            버그 신고·개선 의견·환불 문의는 안내를 받은 채널(카카오톡, 이메일
            등)로 보내 주세요.
          </p>
        </section>

        <p className="text-xs text-slate-600">
          최종 업데이트: 2026년 6월 · {APP_NAME}
        </p>
      </div>
    </main>
  );
}
