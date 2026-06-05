import { describe, expect, it } from "vitest";
import {
  buildGeminiRejectionError,
  isGeminiSafetyRejection,
  safetyRejectionUserMessage,
} from "./gemini-safety";

describe("gemini safety rejection", () => {
  it("detects prompt safety blocks", () => {
    expect(
      isGeminiSafetyRejection({
        promptFeedback: {
          blockReason: "SAFETY",
          blockReasonMessage: "Prompt blocked for safety reasons.",
        },
      }),
    ).toBe(true);
  });

  it("detects safety finish reasons", () => {
    expect(
      isGeminiSafetyRejection({
        candidates: [{ finishReason: "IMAGE_SAFETY" }],
      }),
    ).toBe(true);
  });

  it("builds a user-facing safety message", () => {
    const error = buildGeminiRejectionError({
      promptFeedback: { blockReason: "SAFETY" },
    });

    expect(error.reason).toBe("safety");
    expect(error.userMessage).toContain("SFW");
    expect(error.userMessage).toContain("차감되지 않습니다");
    expect(safetyRejectionUserMessage()).toContain("Google Gemini");
  });
});
