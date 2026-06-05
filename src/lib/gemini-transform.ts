import { GoogleGenAI, Modality } from "@google/genai";
import { buildGeminiRejectionError } from "./gemini-safety";
import { parseGeminiUsage } from "./gemini-usage";
import { createTransformSeed } from "./transform-seed";
import type { GeminiResponse, GeminiTransformResult } from "./gemini-transform-types";

export type { GeminiResponse, GeminiTransformResult } from "./gemini-transform-types";

type ContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

function readInlineData(part: {
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mimeType?: string; mime_type?: string; data?: string };
}): string | null {
  const camel = part.inlineData?.data;
  if (typeof camel === "string" && camel.length > 0) return camel;

  const snake = part.inline_data?.data;
  if (typeof snake === "string" && snake.length > 0) return snake;

  return null;
}

export function extractImageBuffer(response: GeminiResponse): Buffer | null {
  if (typeof response.data === "string" && response.data.length > 0) {
    return Buffer.from(response.data, "base64");
  }

  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const data = readInlineData(part);
      if (data) {
        return Buffer.from(data, "base64");
      }
    }
  }

  return null;
}

export function describeGeminiNoImageError(response: GeminiResponse): string {
  const candidate = response.candidates?.[0];
  const parts: string[] = ["Gemini returned no image data"];

  if (response.promptFeedback?.blockReason) {
    parts.push(
      `prompt blocked: ${response.promptFeedback.blockReason}${
        response.promptFeedback.blockReasonMessage
          ? ` (${response.promptFeedback.blockReasonMessage})`
          : ""
      }`,
    );
  }

  if (candidate?.finishReason) {
    parts.push(`finishReason=${candidate.finishReason}`);
  }

  if (candidate?.finishMessage) {
    parts.push(candidate.finishMessage);
  }

  const text =
    typeof response.text === "string" && response.text.trim().length > 0
      ? response.text.trim()
      : candidate?.content?.parts
          ?.map((part) => part.text?.trim())
          .filter(Boolean)
          .join(" ");

  if (text) {
    parts.push(`model text: ${text.slice(0, 280)}${text.length > 280 ? "…" : ""}`);
  }

  return parts.join(" · ");
}

async function requestGeminiImage(input: {
  ai: GoogleGenAI;
  model: string;
  prompt: string;
  imageBuffer: Buffer;
  mimeType: string;
  seed?: number;
}) {
  const parts: ContentPart[] = [
    { text: input.prompt },
    {
      inlineData: {
        mimeType: input.mimeType || "image/png",
        data: input.imageBuffer.toString("base64"),
      },
    },
  ];

  return input.ai.models.generateContent({
    model: input.model,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: [Modality.IMAGE],
      ...(input.seed != null ? { seed: input.seed } : {}),
    },
  });
}

export async function transformWithGemini(
  imageBuffer: Buffer,
  mimeType: string,
  prompt: string,
  reference?: Buffer | null,
  seed?: number,
): Promise<GeminiTransformResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const model = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
  const ai = new GoogleGenAI({ apiKey });
  const usedSeed = seed ?? createTransformSeed();

  const enrichedPrompt = reference
    ? `${prompt}\nUse FACS (Facial Action Coding System) muscle-based expression control. Change only the facial expression. Return only the edited image.`
    : `${prompt}\nReturn only the edited image.`;

  const attempts: Array<{ seed?: number; label: string }> = [
    { seed: usedSeed, label: "seeded" },
    { seed: undefined, label: "retry-without-seed" },
  ];

  let lastResponse: GeminiResponse | null = null;

  for (const attempt of attempts) {
    const response = (await requestGeminiImage({
      ai,
      model,
      prompt:
        attempt.label === "retry-without-seed"
          ? `${enrichedPrompt}\nYou must output one edited image file as the response.`
          : enrichedPrompt,
      imageBuffer,
      mimeType,
      seed: attempt.seed,
    })) as GeminiResponse;

    lastResponse = response;
    const output = extractImageBuffer(response);
    if (output) {
      const usage = parseGeminiUsage(
        response.usageMetadata as Parameters<typeof parseGeminiUsage>[0],
        model,
      );
      return {
        buffer: output,
        model,
        seed: attempt.seed ?? createTransformSeed(),
        usage,
      };
    }
  }

  throw buildGeminiRejectionError(
    lastResponse ?? {},
    describeGeminiNoImageError(lastResponse ?? {}),
  );
}
