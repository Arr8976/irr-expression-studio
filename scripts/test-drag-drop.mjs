import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "..");
const samplePath = path.join(root, "scripts", "output", "sample-face.png");

if (!fs.existsSync(samplePath)) {
  console.error("Run test-api.mjs first to create sample-face.png");
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
const urlBefore = page.url();

const buffer = fs.readFileSync(samplePath);
await page.evaluate(
  ({ bytes, name }) => {
    const dt = new DataTransfer();
    const file = new File([new Uint8Array(bytes)], name, { type: "image/png" });
    dt.items.add(file);

    const label = document.querySelector("label");
    if (!label) throw new Error("drop zone not found");

    for (const type of ["dragenter", "dragover", "drop"]) {
      label.dispatchEvent(
        new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }),
      );
    }
  },
  { bytes: [...buffer], name: "sample-face.png" },
);

await page.waitForSelector('img[alt="업로드 미리보기"]', { timeout: 5000 });
const urlAfter = page.url();
const previewVisible = await page.locator('img[alt="업로드 미리보기"]').isVisible();
const transformEnabled = await page.getByRole("button", { name: "표정 변환 실행" }).isEnabled();

await browser.close();

if (urlBefore !== urlAfter) {
  console.error("FAIL: page navigated away on drop", urlAfter);
  process.exit(1);
}
if (!previewVisible) {
  console.error("FAIL: preview not shown");
  process.exit(1);
}
if (!transformEnabled) {
  console.error("FAIL: transform button still disabled");
  process.exit(1);
}

console.log("OK: drag-drop upload works, no browser navigation, preview shown");
