import sharp from "sharp";

export async function applyMockTransform(
  imageBuffer: Buffer,
  presetLabel: string,
  auCodes: string[],
  subtitle: string,
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width ?? 512;
  const height = meta.height ?? 512;

  const overlayHeight = Math.max(72, Math.round(height * 0.18));
  const fontSize = Math.max(14, Math.round(width * 0.028));
  const smallFont = Math.max(11, Math.round(width * 0.02));

  const svg = `
    <svg width="${width}" height="${overlayHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="rgba(15,23,42,0.82)"/>
      <text x="16" y="${fontSize + 8}" fill="#f8fafc" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="700">
        DEMO · FACS ${auCodes.join(" + ")}
      </text>
      <text x="16" y="${fontSize + smallFont + 20}" fill="#cbd5e1" font-size="${smallFont}" font-family="Arial, sans-serif">
        ${subtitle}
      </text>
    </svg>
  `;

  return sharp(imageBuffer)
    .composite([
      {
        input: Buffer.from(svg),
        top: height - overlayHeight,
        left: 0,
      },
    ])
    .png()
    .toBuffer();
}
