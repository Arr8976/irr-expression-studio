import fs from "fs";
import path from "path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "scripts", "output");
fs.mkdirSync(outDir, { recursive: true });

const samplePath = path.join(outDir, "sample-face.png");
await sharp({
  create: {
    width: 256,
    height: 256,
    channels: 3,
    background: { r: 240, g: 200, b: 180 },
  },
})
  .png()
  .toFile(samplePath);

const form = new FormData();
form.append("presetId", "wink");
form.append(
  "image",
  new Blob([fs.readFileSync(samplePath)], { type: "image/png" }),
  "sample-face.png",
);

const base = process.argv[2] ?? "http://localhost:3000";
const res = await fetch(`${base}/api/transform`, { method: "POST", body: form });
const json = await res.json();
const reportPath = path.join(outDir, "api-response.json");

if (!res.ok) {
  console.error("API failed:", res.status, json);
  process.exit(1);
}

const dataUrl = json.imageDataUrl ?? "";
const b64 = dataUrl.startsWith("data:")
  ? dataUrl.split(",")[1]
  : json.imageBase64;

if (b64) {
  const resultPath = path.join(outDir, "result-wink.png");
  fs.writeFileSync(resultPath, Buffer.from(b64, "base64"));
  console.log("OK mode:", json.mode);
  console.log("Result saved:", resultPath);

  if (json.usage) {
    console.log("--- Usage (1 request) ---");
    console.log("  input tokens :", json.usage.promptTokenCount);
    console.log("  output tokens:", json.usage.candidatesTokenCount);
    console.log("  total tokens :", json.usage.totalTokenCount);
    console.log("  est. USD     :", json.usage.estimatedCostUsd);
    const usageOnlyPath = path.join(outDir, "usage-last.json");
    fs.writeFileSync(usageOnlyPath, JSON.stringify(json.usage, null, 2));
    console.log("  usage saved  :", usageOnlyPath);
  } else {
    console.log("(no usage metadata — mock mode or non-Gemini provider)");
  }

  const slim = {
    ...json,
    imageDataUrl: json.imageDataUrl ? "[omitted]" : undefined,
  };
  fs.writeFileSync(reportPath, JSON.stringify(slim, null, 2));
} else {
  console.error("No image in response");
  process.exit(1);
}
