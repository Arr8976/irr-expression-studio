import { afterEach, describe, expect, it } from "vitest";
import { mockModeNote, resolveTransformTarget } from "./transform-provider";

const env = process.env;

afterEach(() => {
  process.env = { ...env };
});

describe("transform provider", () => {
  it("prefers gemini in auto mode when gemini key exists", () => {
    process.env.GEMINI_API_KEY = "test";
    delete process.env.OPENAI_API_KEY;
    expect(resolveTransformTarget()).toEqual({ provider: "gemini", mode: "gemini" });
  });

  it("falls back to openai in auto mode", () => {
    delete process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = "test";
    expect(resolveTransformTarget()).toEqual({ provider: "openai", mode: "openai" });
  });

  it("respects IMAGE_PROVIDER=openai", () => {
    process.env.IMAGE_PROVIDER = "openai";
    process.env.GEMINI_API_KEY = "gemini";
    process.env.OPENAI_API_KEY = "openai";
    expect(resolveTransformTarget()).toEqual({ provider: "openai", mode: "openai" });
  });

  it("returns mock when force mock is enabled", () => {
    process.env.FORCE_MOCK = "true";
    process.env.GEMINI_API_KEY = "test";
    expect(resolveTransformTarget()).toEqual({ provider: null, mode: "mock" });
  });

  it("mentions gemini in mock note when provider is gemini", () => {
    process.env.IMAGE_PROVIDER = "gemini";
    expect(mockModeNote()).toContain("GEMINI_API_KEY");
  });
});
