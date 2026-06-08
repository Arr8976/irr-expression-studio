import Link from "next/link";
import type { Metadata } from "next";
import { getDailyFreeLimit } from "@/lib/daily-quota";

export const metadata: Metadata = {
  title: "개인정보·베타 안내 | IRR Expression Studio",
  description: "IRR Expression Studio 베타 서비스 개인정보 및 이용 안내",
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
        개인정보·베타 안내
      </h1>
      <p className="mt-3 text-sm text-amber-200/90">
        IRR Expression Studio는 현재 지인 대상 베타 테스트 중입니다.
      </p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-300">
        <section>
          <h2 className="text-lg font-semibold text-slate-100">서비스 개요</h2>
          <p className="mt-2">
            업로드한 이미지의 표정을 AI로 변환하는 웹 도구입니다. 계정
            가입·로그인 없이 브라우저 쿠키 기반으로 무료 이용 횟수와 크레딧을
            관리합니다.
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
          <h2 className="text-lg font-semibold text-slate-100">베타 이용 안내</h2>
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
              충전한 크레딧은 결제·사용한 브라우저에만 적용됩니다. 다른
              브라우저·기기와 자동 동기화되지 않습니다.
            </li>
            <li>
              AI 변환 결과는 100% 동일하게 재현되지 않을 수 있으며, 일부
              프리셋(예: 시선 이동)은 실험 단계입니다.
            </li>
            <li>
              베타 기간 중 기능·요금·정책이 예고 없이 변경될 수 있습니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-100">문의</h2>
          <p className="mt-2 text-slate-400">
            버그 신고·개선 의견·환불 문의는 베타 테스트 안내를 받은 채널(카카오톡,
            이메일 등)로 보내 주세요.
          </p>
        </section>

        <p className="text-xs text-slate-600">
          최종 업데이트: 2026년 6월 · 베타 버전
        </p>
      </div>
    </main>
  );
}
