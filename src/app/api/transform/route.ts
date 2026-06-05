import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import {
  buildFacsPrompt,
  getPresetById,
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
  getClientIp,
  getOrCreateSessionId,
  jsonWithSessionCookie,
} from "@/lib/request-quota-context";
import { createTransformSeed, parseTransformSeed } from "@/lib/transform-seed";

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

async function creditsPayload(sessionId: string) {
  return getCreditStatus(sessionId);
}

async function noQuotaMessage(sessionId: string) {
  const credits = await getCreditBalance(sessionId);
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

export async function POST(request: NextRequest) {
  const { sessionId, isNew } = getOrCreateSessionId(request);
  const ip = getClientIp(request);
  const quotaBefore = await getQuotaStatus({ ip, sessionId });
  const creditsBefore = await getCreditBalance(sessionId);
  let billingSource: "free" | "credit" | null = null;

  try {
    if (!isQuotaBypassed()) {
      if (quotaBefore.allowed) {
        billingSource = "free";
      } else if (creditsBefore > 0) {
        billingSource = "credit";
      } else {
        return jsonWithSessionCookie(
          {
            error: await noQuotaMessage(sessionId),
            quota: quotaPayload(quotaBefore),
            credits: await creditsPayload(sessionId),
          },
          { status: 429, sessionId, isNew },
        );
      }
    }

    const form = await request.formData();
    const file = form.get("image");
    const presetId = String(form.get("presetId") ?? "");
    const requestedSeed = parseTransformSeed(form.get("seed"));

    if (!(file instanceof File)) {
      return jsonWithSessionCookie(
        { error: "image file is required", quota: quotaPayload(quotaBefore), credits: await creditsPayload(sessionId) },
        { status: 400, sessionId, isNew },
      );
    }

    const preset = getPresetById(presetId);
    if (!preset) {
      return jsonWithSessionCookie(
        { error: "invalid presetId", quota: quotaPayload(quotaBefore), credits: await creditsPayload(sessionId) },
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
          credits: await creditsPayload(sessionId),
        },
        { status: 413, sessionId, isNew },
      );
    }

    const mimeType = file.type || "image/png";
    const prompt = buildFacsPrompt(preset.auCodes);
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
          logGeminiUsage(result.usage, presetId);
        }
      } catch (error) {
        if (error instanceof GeminiTransformRejectedError) {
          return jsonWithSessionCookie(
            {
              error: error.userMessage,
              code: error.reason,
              quota: quotaPayload(quotaBefore),
              credits: await creditsPayload(sessionId),
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
            credits: await creditsPayload(sessionId),
          },
          { status: 502, sessionId, isNew },
        );
      }
    } else {
      outputBuffer = await applyMockTransform(
        imageBuffer,
        preset.label,
        preset.auCodes,
        `${preset.label} · ${mockModeNote()}`,
      );
    }

    if (!isQuotaBypassed() && billingSource === "free") {
      await consumeQuota({ ip, sessionId });
    } else if (!isQuotaBypassed() && billingSource === "credit") {
      await consumeCredit(sessionId);
    }

    const quotaAfter = await getQuotaStatus({ ip, sessionId });

    return jsonWithSessionCookie(
      {
        mode,
        preset,
        prompt,
        model,
        seed,
        seedLocked,
        seedSupported: mode === "gemini",
        usage,
        quota: quotaPayload(quotaAfter),
        credits: await creditsPayload(sessionId),
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
        credits: await creditsPayload(sessionId),
      },
      { status: 500, sessionId, isNew },
    );
  }
}
