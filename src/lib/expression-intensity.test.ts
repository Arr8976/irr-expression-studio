import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPRESSION_INTENSITY,
  intensityLabel,
  intensityPromptLine,
  parseExpressionIntensity,
} from "./expression-intensity";

describe("expression intensity", () => {
  it("parses and clamps intensity values", () => {
    expect(parseExpressionIntensity(null)).toBe(DEFAULT_EXPRESSION_INTENSITY);
    expect(parseExpressionIntensity("abc")).toBe(DEFAULT_EXPRESSION_INTENSITY);
    expect(parseExpressionIntensity("150")).toBe(100);
    expect(parseExpressionIntensity("-5")).toBe(0);
    expect(parseExpressionIntensity("72")).toBe(72);
  });

  it("maps intensity to UI labels", () => {
    expect(intensityLabel(10)).toBe("은은하게");
    expect(intensityLabel(40)).toBe("자연스럽게");
    expect(intensityLabel(60)).toBe("뚜렷하게");
    expect(intensityLabel(90)).toBe("강하게");
  });

  it("adds intensity guidance to prompts", () => {
    expect(intensityPromptLine(20)).toContain("subtle");
    expect(intensityPromptLine(65)).toContain("65/100");
    expect(intensityPromptLine(95)).toContain("strong");
  });
});
