/** data URL → blob object URL (호출 측에서 revokeObjectURL 필요) */
export function dataUrlToObjectUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) {
    throw new Error("invalid data URL");
  }

  const header = dataUrl.slice(0, comma);
  const base64 = dataUrl.slice(comma + 1);
  const mimeMatch = header.match(/data:([^;]+)/);
  const mime = mimeMatch?.[1] ?? "image/png";

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  const blob = new Blob([bytes], { type: mime });
  return URL.createObjectURL(blob);
}

export function revokeObjectUrl(url: string | null | undefined) {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}
