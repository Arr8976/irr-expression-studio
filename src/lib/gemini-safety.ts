import type { GeminiResponse } from "./gemini-transform-types";

export type GeminiRejectReason = "safety" | "no_image" | "quota";

export class GeminiTransformRejectedError extends Error {
  readonly reason: GeminiRejectReason;
  readonly userMessage: string;

  constructor(input: {
    reason: GeminiRejectReason;
    userMessage: string;
    detail?: string;
  }) {
    super(input.detail ?? input.userMessage);
    this.name = "GeminiTransformRejectedError";
    this.reason = input.reason;
    this.userMessage = input.userMessage;
  }
}

const SAFETY_KEYWORDS = [
  "safety",
  "blocked",
  "block",
  "policy",
  "inappropriate",
  "harm",
  "sexual",
  "nudity",
  "explicit",
  "refuse",
  "cannot",
  "can't",
  "unable",
  "안전",
  "정책",
  "거절",
  "변환할 수 없",
  "지원하지 않",
];

const SAFETY_FINISH_REASONS = new Set([
  "SAFETY",
  "IMAGE_SAFETY",
  "PROHIBITED_CONTENT",
  "BLOCKLIST",
  "SPII",
  "RECITATION",
]);

const SAFETY_BLOCK_REASONS = new Set([
  "SAFETY",
  "BLOCKED_REASON_UNSPECIFIED",
  "PROHIBITED_CONTENT",
  "IMAGE_SAFETY",
]);

function collectModelText(response: GeminiResponse): string {
  const fromGetter =
    typeof response.text === "string" ? response.text.trim() : "";
  const fromParts =
    response.candidates?.[0]?.content?.parts
      ?.map((part) => part.text?.trim())
      .filter(Boolean)
      .join(" ") ?? "";

  return (fromGetter || fromParts).toLowerCase();
}

export function isGeminiSafetyRejection(response: GeminiResponse): boolean {
  const blockReason = response.promptFeedback?.blockReason?.toUpperCase();
  if (blockReason && SAFETY_BLOCK_REASONS.has(blockReason)) {
    return true;
  }

  const finishReason = response.candidates?.[0]?.finishReason?.toUpperCase();
  if (finishReason && SAFETY_FINISH_REASONS.has(finishReason)) {
    return true;
  }

  const haystack = [
    response.promptFeedback?.blockReasonMessage,
    response.candidates?.[0]?.finishMessage,
    collectModelText(response),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return SAFETY_KEYWORDS.some((keyword) => haystack.includes(keyword));
}

export function safetyRejectionUserMessage(): string {
  return [
    "이 이미지는 AI 안전 정책상 변환할 수 없습니다.",
    "",
    "선정적·과도한 노출, 폭력적 연출 등 SFW(전연령) 기준에 맞지 않는 이미지는 Google Gemini에서 거절될 수 있습니다.",
    "",
    "일반적인 얼굴·상반신 사진이나 단정한 캐릭터 이미지로 다시 시도해 주세요.",
    "이번 변환은 무료 횟수·크레딧이 차감되지 않습니다.",
  ].join("\n");
}

export function noImageUserMessage(): string {
  return [
    "AI가 편집된 이미지를 반환하지 않았습니다.",
    "",
    "다른 프리셋·이미지로 다시 시도해 주세요.",
    "이미지가 SFW(전연령) 기준에 맞는지도 함께 확인해 주세요.",
    "이번 변환은 무료 횟수·크레딧이 차감되지 않습니다.",
  ].join("\n");
}

export function buildGeminiRejectionError(
  response: GeminiResponse,
  detail?: string,
): GeminiTransformRejectedError {
  if (isGeminiSafetyRejection(response)) {
    return new GeminiTransformRejectedError({
      reason: "safety",
      userMessage: safetyRejectionUserMessage(),
      detail,
    });
  }

  return new GeminiTransformRejectedError({
    reason: "no_image",
    userMessage: noImageUserMessage(),
    detail,
  });
}

export const SFW_UPLOAD_NOTICE =
  "SFW(전연령) 이미지만 지원합니다. 선정적·과도한 노출 등 AI 안전 정책에 걸리는 이미지는 변환되지 않을 수 있습니다.";
