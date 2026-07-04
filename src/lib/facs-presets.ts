import {
  DEFAULT_EXPRESSION_INTENSITY,
  intensityPromptLine,
} from "./expression-intensity";

export type FacsPresetTier = "stable" | "beta";

export type FacsPreset = {
  id: string;
  label: string;
  emoji: string;
  auCodes: string[];
  description: string;
  tier?: FacsPresetTier;
};

/** Article reference: FACS Action Units for AI image expression control */
export const FACS_UNITS: Record<string, string> = {
  AU1: "Inner Brow Raiser",
  AU2: "Outer Brow Raiser",
  AU4: "Brow Lowerer",
  AU5: "Upper Lid Raiser",
  AU6: "Cheek Raiser",
  AU7: "Lid Tightener",
  AU8: "Lips Toward Each Other",
  AU9: "Nose Wrinkler",
  AU10: "Upper Lip Raiser",
  AU11: "Nasolabial Deepener",
  AU12: "Lip Corner Puller",
  AU13: "Sharp Lip Puller",
  AU14: "Dimpler",
  AU15: "Lip Corner Depressor",
  AU16: "Lower Lip Depressor",
  AU17: "Chin Raiser",
  AU18: "Lip Pucker",
  AU20: "Lip Stretcher",
  AU22: "Lip Funneler",
  AU23: "Lip Tightener",
  AU24: "Lip Pressor",
  AU25: "Lips Part",
  AU26: "Jaw Drop",
  AU27: "Mouth Stretch",
  AU28: "Lip Suck",
  AU41: "Lid Droop",
  AU42: "Slit Eyes",
  AU43: "Eyes Closed",
  AU44: "Squint",
  AU45: "Blink",
  AU46: "Wink",
  AU51: "Head Turn Left",
  AU52: "Head Turn Right",
  AU53: "Head Up",
  AU54: "Head Down",
  AU55: "Head Tilt Left",
  AU56: "Head Tilt Right",
  AU57: "Head Forward",
  AU58: "Head Back",
  AU61: "Eyes Turn Left",
  AU62: "Eyes Turn Right",
  AU63: "Eyes Up",
  AU64: "Eyes Down",
  AU71: "Brow Furrow",
  AU72: "Brow Bulge",
  AU81: "Chewing",
  AU82: "Nostril Dilator",
  AU83: "Nostril Compressor",
  AU84: "Tongue Up",
  AU85: "Tongue Out",
};

export const EXPRESSION_PRESETS: FacsPreset[] = [
  {
    id: "smile",
    label: "미소",
    emoji: "😊",
    auCodes: ["AU6", "AU12"],
    description: "부드러운 미소",
  },
  {
    id: "laugh",
    label: "웃음",
    emoji: "😄",
    auCodes: ["AU6", "AU12", "AU25"],
    description: "입을 살짝 벌린 웃음",
  },
  {
    id: "surprise",
    label: "놀람",
    emoji: "😮",
    auCodes: ["AU1", "AU2", "AU25", "AU26"],
    description: "눈썹·입이 올라간 놀람",
  },
  {
    id: "angry",
    label: "화남",
    emoji: "😠",
    auCodes: ["AU4", "AU23"],
    description: "눈썹을 내리고 입을 조인 표정",
  },
  {
    id: "sad",
    label: "슬픔",
    emoji: "😢",
    auCodes: ["AU1", "AU15"],
    description: "입꼬리가 내려간 슬픈 표정",
  },
  {
    id: "wink",
    label: "윙크",
    emoji: "😉",
    auCodes: ["AU46"],
    description: "한쪽 눈 윙크",
  },
  {
    id: "tongue",
    label: "혀 내밀기",
    emoji: "😛",
    auCodes: ["AU85"],
    description: "혀를 내민 장난 표정",
  },
  {
    id: "squint",
    label: "눈 찌푸리기",
    emoji: "😑",
    auCodes: ["AU44", "AU23"],
    description: "눈을 가늘게 뜬 표정",
  },
  {
    id: "sleepy",
    label: "졸림",
    emoji: "😴",
    auCodes: ["AU43", "AU17"],
    description: "눈을 감고 턱을 올린 표정",
  },
  {
    id: "shock",
    label: "경악",
    emoji: "😱",
    auCodes: ["AU1", "AU2", "AU5", "AU26", "AU27"],
    description: "입을 크게 벌린 경악",
  },
  {
    id: "pout",
    label: "삐침",
    emoji: "😗",
    auCodes: ["AU18", "AU15"],
    description: "입술을 오므린 삐진 표정",
  },
  {
    id: "side_eye",
    label: "시선 이동",
    emoji: "🙄",
    auCodes: ["AU62"],
    description: "시선을 옆으로 돌린 표정 (실험)",
    tier: "beta",
  },
  {
    id: "neutral",
    label: "무표정",
    emoji: "😐",
    auCodes: ["AU23", "AU24"],
    description: "감정을 드러내지 않은 차분한 표정",
  },
  {
    id: "contempt",
    label: "경멸",
    emoji: "😒",
    auCodes: ["AU10", "AU4"],
    description: "한쪽 입꼬리와 눈썹이 올라간 표정",
  },
  {
    id: "fear",
    label: "두려움",
    emoji: "😨",
    auCodes: ["AU1", "AU2", "AU4", "AU5", "AU20"],
    description: "눈썹·눈이 올라가고 입이 늘어난 긴장된 표정",
  },
  {
    id: "thinking",
    label: "생각",
    emoji: "🤔",
    auCodes: ["AU4", "AU17"],
    description: "눈썹을 내리고 턱을 올린 생각하는 표정",
  },
  {
    id: "speaking",
    label: "말하려는",
    emoji: "😯",
    auCodes: ["AU25", "AU26"],
    description: "입을 살짝 벌린 말하려는 표정",
  },
  {
    id: "lips_together",
    label: "입 오므림",
    emoji: "🫢",
    auCodes: ["AU8", "AU23"],
    description: "입술을 다문 단단한 표정",
  },
  {
    id: "big_laugh",
    label: "활짝 웃음",
    emoji: "🤣",
    auCodes: ["AU6", "AU12", "AU25", "AU26"],
    description: "입을 크게 벌린 활짝 웃는 표정",
  },
  {
    id: "disgust",
    label: "찡그림",
    emoji: "🤢",
    auCodes: ["AU9", "AU4"],
    description: "코와 눈썹을 찡그린 표정",
  },
];

export function getPresetById(id: string): FacsPreset | undefined {
  return EXPRESSION_PRESETS.find((p) => p.id === id);
}

export function buildFacsPrompt(auCodes: string[], intensity?: number): string {
  const codes = auCodes.join(" ");
  const details = auCodes
    .map((code) => `${code} (${FACS_UNITS[code] ?? code})`)
    .join(", ");
  return [
    `표정 변경 FACS ${codes}`,
    "Keep the same character identity, art style, colors, pose, clothing, and background.",
    "Change only the facial expression using these FACS Action Units:",
    details,
    "Do not distort the face structure. Apply a clean expression change.",
    intensityPromptLine(intensity ?? DEFAULT_EXPRESSION_INTENSITY),
  ].join(" ");
}
