import OpenAI, { toFile } from "openai";
import { createTransformSeed } from "./transform-seed";

export type OpenAITransformResult = {
  buffer: Buffer;
  model: string;
  seed: number;
  seedApplied: boolean;
};

export async function transformWithOpenAI(
  imageBuffer: Buffer,
  mimeType: string,
  prompt: string,
  reference?: Buffer | null,
  seed?: number,
): Promise<OpenAITransformResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const client = new OpenAI({ apiKey });
  const ext = mimeType.includes("png") ? "png" : "jpg";
  const imageFile = await toFile(imageBuffer, `source.${ext}`, {
    type: mimeType,
  });

  const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
  const enrichedPrompt = reference
    ? `${prompt}\nUse the FACS reference grid concepts for precise muscle-based expression control.`
    : prompt;

  const result = await client.images.edit({
    model,
    image: imageFile,
    prompt: enrichedPrompt,
    size: "1024x1024",
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI returned no image data");
  }

  return {
    buffer: Buffer.from(b64, "base64"),
    model,
    seed: seed ?? createTransformSeed(),
    seedApplied: false,
  };
}
