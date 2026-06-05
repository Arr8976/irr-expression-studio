import { describe, expect, it } from "vitest";
import { parseGeminiUsage } from "./gemini-usage";

describe("parseGeminiUsage", () => {
  it("computes totals and estimated cost", () => {
    const record = parseGeminiUsage(
      {
        promptTokenCount: 1200,
        candidatesTokenCount: 1290,
        totalTokenCount: 2490,
      },
      "gemini-2.5-flash-image",
    );

    expect(record).not.toBeNull();
    expect(record!.totalTokenCount).toBe(2490);
    expect(record!.estimatedCostUsd).toBeGreaterThan(0);
    expect(record!.estimatedCostUsd).toBeLessThan(0.1);
  });

  it("returns null when metadata missing", () => {
    expect(parseGeminiUsage(undefined, "gemini-2.5-flash-image")).toBeNull();
  });
});
