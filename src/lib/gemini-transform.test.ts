import { describe, expect, it } from "vitest";
import {
  describeGeminiNoImageError,
  extractImageBuffer,
} from "./gemini-transform";

describe("gemini image extraction", () => {
  it("reads inlineData from the first candidate", () => {
    const png = Buffer.from("fake-image").toString("base64");
    const buffer = extractImageBuffer({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { mimeType: "image/png", data: png } }],
          },
        },
      ],
    });

    expect(buffer?.toString()).toBe("fake-image");
  });

  it("uses response.data when present", () => {
    const png = Buffer.from("from-data").toString("base64");
    const buffer = extractImageBuffer({ data: png });
    expect(buffer?.toString()).toBe("from-data");
  });

  it("builds a helpful no-image error", () => {
    const message = describeGeminiNoImageError({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [{ text: "I cannot edit this image." }],
          },
        },
      ],
    });

    expect(message).toContain("Gemini returned no image data");
    expect(message).toContain("I cannot edit this image.");
  });
});
