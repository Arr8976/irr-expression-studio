export type TransformMode = "openai" | "gemini" | "mock";
export type ImageProvider = "openai" | "gemini";

export function resolveTransformTarget(): {
  provider: ImageProvider | null;
  mode: TransformMode;
} {
  if (process.env.FORCE_MOCK === "true") {
    return { provider: null, mode: "mock" };
  }

  const preference = (process.env.IMAGE_PROVIDER ?? "auto").toLowerCase();

  if (preference === "gemini") {
    if (process.env.GEMINI_API_KEY) {
      return { provider: "gemini", mode: "gemini" };
    }
    return { provider: null, mode: "mock" };
  }

  if (preference === "openai") {
    if (process.env.OPENAI_API_KEY) {
      return { provider: "openai", mode: "openai" };
    }
    return { provider: null, mode: "mock" };
  }

  if (process.env.GEMINI_API_KEY) {
    return { provider: "gemini", mode: "gemini" };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai", mode: "openai" };
  }

  return { provider: null, mode: "mock" };
}

export function mockModeNote(): string {
  const preference = (process.env.IMAGE_PROVIDER ?? "auto").toLowerCase();

  if (preference === "gemini") {
    return "GEMINI_API_KEY가 없어 데모 오버레이 모드로 실행되었습니다. .env.local에 키를 넣으면 Gemini로 FACS 표정 변환이 시도됩니다.";
  }
  if (preference === "openai") {
    return "OPENAI_API_KEY가 없어 데모 오버레이 모드로 실행되었습니다. .env.local에 키를 넣으면 OpenAI로 FACS 표정 변환이 시도됩니다.";
  }

  return "API 키가 없어 데모 오버레이 모드로 실행되었습니다. .env.local에 GEMINI_API_KEY 또는 OPENAI_API_KEY를 넣으면 실제 FACS 표정 변환이 시도됩니다.";
}
