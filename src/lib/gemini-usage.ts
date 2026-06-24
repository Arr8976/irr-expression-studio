import fs from "fs";
import path from "path";

export type GeminiUsageRecord = {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  thoughtsTokenCount: number;
  cachedContentTokenCount: number;
  estimatedCostUsd: number;
  model: string;
};

type ModalityDetail = {
  modality?: string;
  tokenCount?: number;
};

type UsageMetadataLike = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  thoughtsTokenCount?: number;
  cachedContentTokenCount?: number;
  promptTokensDetails?: ModalityDetail[];
  candidatesTokensDetails?: ModalityDetail[];
};

/** gemini-2.5-flash-image paid tier (verify on ai.google.dev/pricing) */
const INPUT_USD_PER_MILLION = 0.3;
const OUTPUT_USD_PER_MILLION = 30;

export function parseGeminiUsage(
  usage: UsageMetadataLike | undefined,
  model: string,
): GeminiUsageRecord | null {
  if (!usage) return null;

  const promptTokenCount = usage.promptTokenCount ?? 0;
  const candidatesTokenCount = usage.candidatesTokenCount ?? 0;
  const totalTokenCount =
    usage.totalTokenCount ?? promptTokenCount + candidatesTokenCount;

  const billableInput = Math.max(
    0,
    promptTokenCount - (usage.cachedContentTokenCount ?? 0),
  );

  const estimatedCostUsd =
    (billableInput / 1_000_000) * INPUT_USD_PER_MILLION +
    (candidatesTokenCount / 1_000_000) * OUTPUT_USD_PER_MILLION;

  return {
    promptTokenCount,
    candidatesTokenCount,
    totalTokenCount,
    thoughtsTokenCount: usage.thoughtsTokenCount ?? 0,
    cachedContentTokenCount: usage.cachedContentTokenCount ?? 0,
    estimatedCostUsd: Math.round(estimatedCostUsd * 1_000_000) / 1_000_000,
    model,
  };
}

export function logGeminiUsage(record: GeminiUsageRecord, presetId: string) {
  const payload = {
    event: "gemini_transform_usage",
    at: new Date().toISOString(),
    presetId,
    ...record,
    estimatedCostKrw: Math.round(record.estimatedCostUsd * 1400),
  };

  console.info("[JIKYU Usage]", JSON.stringify(payload));

  if (process.env.LOG_USAGE_JSONL === "true") {
    try {
      const logDir = path.join(process.cwd(), "logs");
      fs.mkdirSync(logDir, { recursive: true });
      fs.appendFileSync(
        path.join(logDir, "usage.jsonl"),
        `${JSON.stringify(payload)}\n`,
        "utf8",
      );
    } catch (error) {
      console.warn("[JIKYU Usage] failed to write usage.jsonl", error);
    }
  }
}
