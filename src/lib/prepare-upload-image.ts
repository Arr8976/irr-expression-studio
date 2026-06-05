const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const DEFAULT_MAX_BYTES = 3.5 * 1024 * 1024;
const DEFAULT_MAX_DIMENSION = 2048;

type PrepareImageOptions = {
  maxBytes?: number;
  maxDimension?: number;
};

function replaceExtension(name: string, extension: string) {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base || "upload"}${extension}`;
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("invalid image"));
    };

    image.src = url;
  });
}

function drawToCanvas(image: HTMLImageElement, maxDimension: number) {
  let { width, height } = image;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("canvas unavailable");
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("encode failed"));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

async function encodeUnderLimit(
  canvas: HTMLCanvasElement,
  maxBytes: number,
): Promise<Blob> {
  let quality = 0.88;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (blob.size <= maxBytes) {
      return blob;
    }
    quality = Math.max(0.45, quality - 0.1);
  }

  const blob = await canvasToBlob(canvas, "image/jpeg", 0.45);
  if (blob.size > maxBytes) {
    throw new Error("image too large after compression");
  }
  return blob;
}

export async function prepareImageForUpload(
  file: File,
  options?: PrepareImageOptions,
): Promise<File> {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return file;
  }

  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;

  const image = await loadImageFromFile(file);
  const needsResize =
    file.size > maxBytes ||
    image.width > maxDimension ||
    image.height > maxDimension;

  if (!needsResize) {
    return file;
  }

  const canvas = drawToCanvas(image, maxDimension);
  const blob = await encodeUnderLimit(canvas, maxBytes);

  return new File([blob], replaceExtension(file.name, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
