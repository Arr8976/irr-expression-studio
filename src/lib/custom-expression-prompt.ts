import { buildFacsPrompt, FACS_UNITS, type FacsPreset } from "./facs-presets";

export const CUSTOM_PROMPT_MAX_LENGTH = 300;
export const CUSTOM_PROMPT_MIN_LENGTH = 2;

export const CUSTOM_EXPRESSION_PRESET: FacsPreset = {
  id: "custom",
  label: "프롬프트 표정",
  emoji: "✨",
  auCodes: [],
  description: "직접 입력한 표정 설명",
};

const BLOCKED_TERMS = [
  "nude",
  "naked",
  "nsfw",
  "porn",
  "sex",
  "erotic",
  "노출",
  "나체",
  "성적",
  "선정",
];

export function normalizeCustomPrompt(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed;
}

export function validateCustomPrompt(
  prompt: string,
): { ok: true } | { ok: false; error: string } {
  if (prompt.length < CUSTOM_PROMPT_MIN_LENGTH) {
    return {
      ok: false,
      error: `표정 설명은 ${CUSTOM_PROMPT_MIN_LENGTH}자 이상 입력해 주세요.`,
    };
  }

  if (prompt.length > CUSTOM_PROMPT_MAX_LENGTH) {
    return {
      ok: false,
      error: `표정 설명은 ${CUSTOM_PROMPT_MAX_LENGTH}자 이하로 입력해 주세요.`,
    };
  }

  const lowered = prompt.toLowerCase();
  for (const term of BLOCKED_TERMS) {
    if (lowered.includes(term)) {
      return {
        ok: false,
        error: "SFW(전연령) 표정만 입력할 수 있습니다.",
      };
    }
  }

  return { ok: true };
}

function formatAuHints(auCodes: string[]): string {
  return auCodes
    .map((code) => `${code} (${FACS_UNITS[code] ?? code})`)
    .join(", ");
}

export function buildCustomExpressionPrompt(input: {
  customPrompt: string;
  preset?: Pick<FacsPreset, "label" | "auCodes"> | null;
}): string {
  const lines = [
    "Facial expression edit for the uploaded portrait.",
    "Keep the same character identity, art style, colors, pose, clothing, and background.",
    "Change only the facial expression. Do not distort the face structure.",
  ];

  if (input.preset?.auCodes.length) {
    lines.push(
      `Base preset reference: ${input.preset.label} (${input.preset.auCodes.join(" ")})`,
      `FACS action units to blend: ${formatAuHints(input.preset.auCodes)}`,
    );
  }

  lines.push(
    `User-requested expression (combine multiple cues if helpful): ${input.customPrompt}`,
    "Apply a natural, clean expression change. Return only the edited image.",
  );

  return lines.join("\n");
}

export function buildPresetExpressionPrompt(auCodes: string[]): string {
  return buildFacsPrompt(auCodes);
}

export type TransformExpressionSource = "preset" | "custom" | "hybrid";

export function resolveExpressionSource(input: {
  customPrompt: string | null;
  presetId: string | null;
}): TransformExpressionSource {
  if (input.customPrompt && input.presetId) return "hybrid";
  if (input.customPrompt) return "custom";
  return "preset";
}
