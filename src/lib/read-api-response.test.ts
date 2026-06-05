import { describe, expect, it } from "vitest";
import { readApiJson } from "./read-api-response";

describe("readApiJson", () => {
  it("parses json responses", async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

    await expect(readApiJson<{ ok: boolean }>(response)).resolves.toEqual({
      ok: true,
    });
  });

  it("maps request entity too large to a friendly message", async () => {
    const response = new Response("Request Entity Too Large", { status: 413 });

    await expect(readApiJson(response)).rejects.toThrow(
      "이미지 용량이 너무 큽니다",
    );
  });

  it("returns plain text server errors", async () => {
    const response = new Response("Gateway Timeout", { status: 504 });

    await expect(readApiJson(response)).rejects.toThrow("Gateway Timeout");
  });
});
