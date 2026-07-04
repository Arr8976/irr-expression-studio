import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import {
  buildCustomExpressionPrompt,
  buildPresetExpressionPrompt,
  CUSTOM_EXPRESSION_PRESET,
  CUSTOM_PROMPT_MAX_LENGTH,
  normalizeCustomPrompt,
  resolveExpressionSource,
  validateCustomPrompt,
} from "@/lib/custom-expression-prompt";
import {
  getPresetById,
  type FacsPreset,
} from "@/lib/facs-presets";
import {
  consumeQuota,
  getQuotaStatus,
  quotaExceededMessage,
} from "@/lib/daily-quota";
import {
  consumeCredit,
  getCreditBalance,
  getCreditStatus,
} from "@/lib/user-credits";
import { transformWithGemini } from "@/lib/gemini-transform";
import { GeminiTransformRejectedError } from "@/lib/gemini-safety";
import { applyMockTransform } from "@/lib/mock-transform";
import { transformWithOpenAI } from "@/lib/openai-transform";
import {
  mockModeNote,
  resolveTransformTarget,
  type TransformMode,
} from "@/lib/transform-provider";
import { formatProviderError } from "@/lib/format-provider-error";
import { logGeminiUsage } from "@/lib/gemini-usage";
import {
  quotaScopeId,
  syncCreditAccount,
} from "@/lib/credit-account";
import {
  getClientIp,
  jsonWithSessionCookie,
} from "@/lib/request-quota-context";
import { createTransformSeed, parseTransformSeed } from "@/lib/transform-seed";
import { parseExpressionIntensity } from "@/lib/expression-intensity";

export const runtime = "nodejs";

function isQuotaBypassed() {
  return process.env.SKIP_DAILY_QUOTA === "true";
}

function quotaPayload(status: Awaited<ReturnType<typeof getQuotaStatus>>) {
  return {
    limit: status.limit,
    remaining: status.remaining,
    used: status.used,
  };
}

async function creditsPayload(accountKey: string) {
  return getCreditStatus(accountKey);
}

async function noQuotaMessage(accountKey: string) {
  const credits = await getCreditBalance(accountKey);
  if (credits > 0) {
    return quotaExceededMessage();
  }
  return `${quotaExceededMessage()} 크레딧을 충전하면 오늘도 계속 이용할 수 있습니다.`;
}

async function loadReferenceGrid(): Promise<Buffer | null> {
  const refPath = path.join(process.cwd(), "public", "facs-reference.svg");
  try {
    return await fs.readFile(refPath);
  } catch {
    return null;
  }
}

function responsePreset(
  preset: FacsPreset | null,
  customPrompt: string | null,
): FacsPreset {
  if (customPrompt && !preset) {
    return {
      ...CUSTOM_EXPRESSION_PRESET,
      description:
        customPrompt.length > 80
          ? `${customPrompt.slice(0, 80)}…`
          : customPrompt,
    };
  }

  if (preset) return preset;
  return CUSTOM_EXPRESSION_PRESET;
}

export async function POST(request: NextRequest) {
  const account = await syncCreditAccount(request);
  const { sessionId, isNewSession: isNew, accountKey } = account;
  const quotaSessionId = quotaScopeId(account);
  const ip = getClientIp(request);
  const quotaBefore = await getQuotaStatus({ ip, sessionId: quotaSessionId });
  const creditsBefore = await getCreditBalance(accountKey);
  let billingSource: "free" | "credit" | null = null;

  try {
    const form = await request.formData();
    const file = form.get("image");
    const presetId = String(form.get("presetId") ?? "").trim();
    const customPrompt = normalizeCustomPrompt(form.get("customPrompt"));
    const requestedSeed = parseTransformSeed(form.get("seed"));
    const intensity = parseExpressionIntensity(form.get("intensity"));
    const expressionSource = resolveExpressionSource({
      customPrompt,
      presetId: presetId || null,
    });

    if (customPrompt) {
      const validation = validateCustomPrompt(customPrompt);
      if (!validation.ok) {
        return jsonWithSessionCookie(
          {
            error: validation.error,
            quota: quotaPayload(quotaBefore),
            credits: await creditsPayload(accountKey),
          },
          { status: 400, sessionId, isNew },
        );
      }

      if (creditsBefore <= 0) {
        return jsonWithSessionCookie(
          {
            error:
              "프롬프트 표정은 오늘 사용 가능한 크레딧이 있을 때만 이용할 수 있습니다.",
            quota: quotaPayload(quotaBefore),
            credits: await creditsPayload(accountKey),
          },
          { status: 403, sessionId, isNew },
        );
      }
    }

    if (!isQuotaBypassed()) {
      if (customPrompt) {
        billingSource = "credit";
      } else if (quotaBefore.allowed) {
        billingSource = "free";
      } else if (creditsBefore > 0) {
        billingSource = "credit";
      } else {
        return jsonWithSessionCookie(
          {
            error: await noQuotaMessage(accountKey),
            quota: quotaPayload(quotaBefore),
            credits: await creditsPayload(accountKey),
          },
          { status: 429, sessionId, isNew },
        );
      }
    }

    if (!(file instanceof File)) {
      return jsonWithSessionCookie(
        { error: "image file is required", quota: quotaPayload(quotaBefore), credits: await creditsPayload(accountKey) },
        { status: 400, sessionId, isNew },
      );
    }

    const preset = presetId ? getPresetById(presetId) ?? null : null;

    if (expressionSource === "preset" && !preset) {
      return jsonWithSessionCookie(
        { error: "invalid presetId", quota: quotaPayload(quotaBefore), credits: await creditsPayload(accountKey) },
        { status: 400, sessionId, isNew },
      );
    }

    if (expressionSource !== "preset" && !customPrompt) {
      return jsonWithSessionCookie(
        {
          error: "표정 프리셋을 선택하거나 프롬프트를 입력해 주세요.",
          quota: quotaPayload(quotaBefore),
          credits: await creditsPayload(accountKey),
        },
        { status: 400, sessionId, isNew },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const maxUploadBytes = 4 * 1024 * 1024;

    if (imageBuffer.length > maxUploadBytes) {
      return jsonWithSessionCookie(
        {
          error:
            "이미지 용량이 너무 큽니다. 4MB 이하 이미지를 사용해 주세요.",
          quota: quotaPayload(quotaBefore),
          credits: await creditsPayload(accountKey),
        },
        { status: 413, sessionId, isNew },
      );
    }

    const mimeType = file.type || "image/png";
    const prompt =
      expressionSource === "preset" && preset
        ? buildPresetExpressionPrompt(preset.auCodes, intensity)
        : buildCustomExpressionPrompt({
            customPrompt: customPrompt!,
            preset,
            intensity,
          });
    const resultPreset = responsePreset(preset, customPrompt);
    const reference = await loadReferenceGrid();
    const { provider } = resolveTransformTarget();

    let outputBuffer: Buffer;
    let mode: TransformMode = "mock";
    let model: string | null = null;
    let seed = requestedSeed ?? createTransformSeed();
    let seedLocked = requestedSeed != null;
    let seedSupported = false;
    let usage = null;

    if (provider) {
      try {
        const result =
          provider === "gemini"
            ? await transformWithGemini(
                imageBuffer,
                mimeType,
                prompt,
                reference,
                requestedSeed,
              )
            : await transformWithOpenAI(
                imageBuffer,
                mimeType,
                prompt,
                reference,
                requestedSeed,
              );

        outputBuffer = result.buffer;
        mode = provider;
        model = result.model;
        seed = result.seed;
        seedSupported = provider === "gemini";

        if (provider === "gemini" && "usage" in result && result.usage) {
          usage = result.usage;
          logGeminiUsage(result.usage, resultPreset.id);
        }
      } catch (error) {
        if (error instanceof GeminiTransformRejectedError) {
          return jsonWithSessionCookie(
            {
              error: error.userMessage,
              code: error.reason,
              quota: quotaPayload(quotaBefore),
              credits: await creditsPayload(accountKey),
            },
            { status: 422, sessionId, isNew },
          );
        }

        const message = formatProviderError(provider, error);
        return jsonWithSessionCookie(
          {
            error: message,
            code: "provider_error",
            quota: quotaPayload(quotaBefore),
            credits: await creditsPayload(accountKey),
          },
          { status: 502, sessionId, isNew },
        );
      }
    } else {
      outputBuffer = await applyMockTransform(
        imageBuffer,
        resultPreset.label,
        resultPreset.auCodes,
        customPrompt ?? `${resultPreset.label} · ${mockModeNote()}`,
      );
    }

    if (!isQuotaBypassed() && billingSource) {
      let billed = true;
      if (billingSource === "free") {
        billed = await consumeQuota({ ip, sessionId: quotaSessionId });
      } else if (billingSource === "credit") {
        billed = await consumeCredit(accountKey);
      }

      if (!billed) {
        return jsonWithSessionCookie(
          {
            error:
              "변환은 완료되었으나 사용 한도 차감에 실패했습니다. 잠시 후 다시 시도해 주세요.",
            code: "billing_failed",
            quota: quotaPayload(
              await getQuotaStatus({ ip, sessionId: quotaSessionId }),
            ),
            credits: await creditsPayload(accountKey),
          },
          { status: 409, sessionId, isNew },
        );
      }
    }

    const quotaAfter = await getQuotaStatus({ ip, sessionId: quotaSessionId });

    return jsonWithSessionCookie(
      {
        mode,
        preset: resultPreset,
        expressionSource,
        customPrompt: customPrompt ?? undefined,
        intensity,
        prompt,
        model,
        seed,
        seedLocked,
        seedSupported: mode === "gemini",
        usage,
        quota: quotaPayload(quotaAfter),
        credits: await creditsPayload(accountKey),
        billingSource,
        imageDataUrl: `data:image/png;base64,${outputBuffer.toString("base64")}`,
        note: mode === "mock" ? mockModeNote() : undefined,
      },
      { sessionId, isNew },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return jsonWithSessionCookie(
      {
        error: message,
        quota: quotaPayload(quotaBefore),
        credits: await creditsPayload(accountKey),
      },
      { status: 500, sessionId, isNew },
    );
  }
}
