export const DEFAULT_EXPRESSION_INTENSITY = 65;
export const MIN_EXPRESSION_INTENSITY = 0;
export const MAX_EXPRESSION_INTENSITY = 100;

export function clampExpressionIntensity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_EXPRESSION_INTENSITY;
  return Math.min(
    MAX_EXPRESSION_INTENSITY,
    Math.max(MIN_EXPRESSION_INTENSITY, Math.round(value)),
  );
}

export function parseExpressionIntensity(raw: unknown): number {
  if (raw == null || raw === "") return DEFAULT_EXPRESSION_INTENSITY;
  const parsed = Number(String(raw).trim());
  if (!Number.isFinite(parsed)) return DEFAULT_EXPRESSION_INTENSITY;
  return clampExpressionIntensity(parsed);
}

export function intensityLabel(intensity: number): string {
  const value = clampExpressionIntensity(intensity);
  if (value <= 25) return "은은하게";
  if (value <= 50) return "자연스럽게";
  if (value <= 75) return "뚜렷하게";
  return "강하게";
}

export function intensityPromptLine(intensity: number): string {
  const value = clampExpressionIntensity(intensity);
  let guidance =
    "Apply a clear, moderate expression change while keeping the face natural.";
  if (value <= 25) {
    guidance =
      "Apply a very subtle, barely noticeable expression change. Keep the face almost neutral.";
  } else if (value <= 50) {
    guidance =
      "Apply a gentle, natural expression change. The shift should be visible but soft.";
  } else if (value <= 75) {
    guidance =
      "Apply a clear, moderate expression change while keeping the face natural.";
  } else {
    guidance =
      "Apply a strong, pronounced expression change while keeping the face believable.";
  }

  return [
    `Expression intensity: ${value}/100.`,
    guidance,
    "Change only expression muscles—not identity, pose, clothing, or background.",
  ].join(" ");
}
