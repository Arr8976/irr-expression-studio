import { describe, expect, it } from "vitest";
import { createTransformSeed, parseTransformSeed } from "./transform-seed";

describe("transform seed", () => {
  it("creates positive integer seeds", () => {
    const seed = createTransformSeed();
    expect(seed).toBeGreaterThan(0);
    expect(seed).toBeLessThanOrEqual(2_147_483_647);
  });

  it("parses valid form seed", () => {
    expect(parseTransformSeed("42")).toBe(42);
  });

  it("rejects invalid seeds", () => {
    expect(parseTransformSeed("")).toBeUndefined();
    expect(parseTransformSeed("0")).toBeUndefined();
    expect(parseTransformSeed("abc")).toBeUndefined();
  });
});
