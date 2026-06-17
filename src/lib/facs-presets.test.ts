import { describe, expect, it } from "vitest";
import {
  buildFacsPrompt,
  EXPRESSION_PRESETS,
  getPresetById,
} from "./facs-presets";

describe("facs presets", () => {
  it("has 20 expression presets", () => {
    expect(EXPRESSION_PRESETS).toHaveLength(20);
  });

  it("returns preset by id", () => {
    expect(getPresetById("wink")?.auCodes).toEqual(["AU46"]);
  });

  it("marks experimental presets", () => {
    expect(getPresetById("side_eye")?.tier).toBe("beta");
  });

  it("builds FACS prompt with AU codes", () => {
    const prompt = buildFacsPrompt(["AU85"]);
    expect(prompt).toContain("표정 변경 FACS AU85");
    expect(prompt).toContain("Tongue Out");
  });
});
