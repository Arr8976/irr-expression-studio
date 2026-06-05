export function formatProviderError(provider: "gemini" | "openai", error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  if (
    provider === "gemini" &&
    (raw.includes("429") ||
      raw.includes("RESOURCE_EXHAUSTED") ||
      raw.includes("quota") ||
      raw.includes("free_tier"))
  ) {
    return [
      "Gemini API 할당량 문제(429)입니다. 앱 연동은 정상이며, Google 쪽 과금/할당량 설정이 필요합니다.",
      "",
      "확인 순서:",
      "1) AI Studio 키가 연결된 Google Cloud 프로젝트에 Billing(결제) 연결",
      "2) gemini.google.com 유료 구독 ≠ API 과금 (별도 설정)",
      "3) 이미지 모델(나노바나나)은 무료 한도 0인 경우가 많음 → Billing 후 키 재발급",
      "4) 사용량: https://ai.dev/rate-limit",
      "",
      "모델 변경(.env.local): GEMINI_IMAGE_MODEL=gemini-3.1-flash-image",
    ].join("\n");
  }

  if (raw.length > 400) {
    return `${provider} failed: ${raw.slice(0, 400)}…`;
  }

  return `${provider} failed: ${raw}`;
}
