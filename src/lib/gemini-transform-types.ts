export type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: { mimeType?: string; data?: string };
        inline_data?: { mimeType?: string; mime_type?: string; data?: string };
        text?: string;
        thought?: boolean;
      }>;
    };
    finishReason?: string;
    finishMessage?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
    blockReasonMessage?: string;
  };
  usageMetadata?: unknown;
  data?: string;
  text?: string;
};

export type GeminiTransformResult = {
  buffer: Buffer;
  model: string;
  seed: number;
  usage: import("./gemini-usage").GeminiUsageRecord | null;
};
