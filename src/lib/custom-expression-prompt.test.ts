import { describe, expect, it } from "vitest";
import {
  buildCustomExpressionPrompt,
  normalizeCustomPrompt,
  resolveExpressionSource,
  validateCustomPrompt,
} from "./custom-expression-prompt";

describe("custom expression prompt", () => {
  it("normalizes whitespace", () => {
    expect(normalizeCustomPrompt("  살짝   웃음  ")).toBe("살짝 웃음");
    expect(normalizeCustomPrompt("   ")).toBeNull();
  });

  it("rejects blocked terms", () => {
    const result = validateCustomPrompt("nsfw expression");
    expect(result.ok).toBe(false);
  });

  it("builds hybrid prompt with preset AU hints", () => {
    const prompt = buildCustomExpressionPrompt({
      customPrompt: "미소인데 눈썹은 화난 것처럼",
      preset: {
        label: "미소",
        auCodes: ["AU6", "AU12"],
      },
    });

    expect(prompt).toContain("User-requested expression");
    expect(prompt).toContain("AU6");
    expect(prompt).toContain("미소인데 눈썹은 화난 것처럼");
  });

  it("resolves expression source", () => {
    expect(
      resolveExpressionSource({ customPrompt: "웃음", presetId: "smile" }),
    ).toBe("hybrid");
    expect(resolveExpressionSource({ customPrompt: "웃음", presetId: null })).toBe(
      "custom",
    );
    expect(resolveExpressionSource({ customPrompt: null, presetId: "smile" })).toBe(
      "preset",
    );
  });
});
