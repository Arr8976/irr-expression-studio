"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditShop } from "@/components/CreditShop";
import { MAX_PINNED, PinnedTray, type PinnedResult } from "@/components/PinnedTray";
import { CUSTOM_PROMPT_MAX_LENGTH } from "@/lib/custom-expression-prompt";
import { prepareImageForUpload } from "@/lib/prepare-upload-image";
import { readApiJson } from "@/lib/read-api-response";
import { SFW_UPLOAD_NOTICE } from "@/lib/gemini-safety";
import { EXPRESSION_PRESETS } from "@/lib/facs-presets";

const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const ESTIMATED_SECONDS = { min: 15, max: 45 };

function pickImageFile(files: FileList | null): File | null {
  if (!files) return null;
  for (const file of files) {
    if (ACCEPTED_TYPES.has(file.type)) return file;
  }
  return null;
}

type TransformResponse = {
  mode: "openai" | "gemini" | "mock";
  prompt: string;
  model?: string | null;
  warning?: string;
  note?: string;
  imageDataUrl?: string;
  seed?: number;
  seedLocked?: boolean;
  seedSupported?: boolean;
  quota?: {
    limit: number;
    remaining: number;
    used: number;
  };
  credits?: {
    balance: number;
    dailyLimit?: number;
    used?: number;
  };
  billingSource?: "free" | "credit";
  expressionSource?: "preset" | "custom" | "hybrid";
  customPrompt?: string;
  preset: {
    id: string;
    label: string;
    emoji: string;
    auCodes: string[];
  };
  error?: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [presetId, setPresetId] = useState(EXPRESSION_PRESETS[0].id);
  const [result, setResult] = useState<TransformResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lockedSeed, setLockedSeed] = useState<number | null>(null);
  const [pinnedResults, setPinnedResults] = useState<PinnedResult[]>([]);
  const [quotaHint, setQuotaHint] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState(0);
  const [creditDailyLimit, setCreditDailyLimit] = useState(0);
  const [preparingImage, setPreparingImage] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customPromptEnabled, setCustomPromptEnabled] = useState(false);
  const [combinePresetWithCustom, setCombinePresetWithCustom] = useState(true);

  const trimmedCustomPrompt = customPrompt.trim();
  const hasCustomPrompt = trimmedCustomPrompt.length > 0;
  const canUseCustomPrompt = creditBalance > 0;
  const isCustomPromptActive = customPromptEnabled && hasCustomPrompt;

  function formatCreditHint(balance: number, dailyLimit?: number) {
    if (dailyLimit != null && dailyLimit > 0) {
      return `${balance}/${dailyLimit}회`;
    }
    return `${balance}회`;
  }

  function applyCreditsState(credits?: {
    balance?: number;
    dailyLimit?: number;
    used?: number;
  }) {
    if (!credits) return;
    if (typeof credits.balance === "number") {
      setCreditBalance(credits.balance);
    }
    if (typeof credits.dailyLimit === "number") {
      setCreditDailyLimit(credits.dailyLimit);
    }
  }

  function updateUsageHints(data: {
    quota?: TransformResponse["quota"];
    credits?: TransformResponse["credits"];
    billingSource?: TransformResponse["billingSource"];
  }) {
    applyCreditsState(data.credits);

    const freeRemaining = data.quota?.remaining ?? 0;
    const credits = data.credits?.balance ?? creditBalance;
    const dailyLimit = data.credits?.dailyLimit ?? creditDailyLimit;
    const creditHint = formatCreditHint(credits, dailyLimit);

    if (freeRemaining > 0) {
      setQuotaHint(
        `오늘 무료 변환 ${freeRemaining}회 남음 · 오늘 크레딧 ${creditHint}`,
      );
      return;
    }

    if (credits > 0) {
      setQuotaHint(`무료 변환 소진 · 오늘 크레딧 ${creditHint} 사용 가능`);
      return;
    }

    setQuotaHint("오늘 무료 변환과 크레딧을 모두 사용했습니다");
  }

  useEffect(() => {
    async function loadCredits() {
      try {
        const res = await fetch("/api/credits");
        const data = await readApiJson<{
          balance?: number;
          dailyLimit?: number;
        }>(res);
        applyCreditsState(data);
      } catch {
        // ignore initial load errors
      }
    }

    loadCredits();
  }, []);

  useEffect(() => {
    setLockedSeed(null);
  }, [presetId, file, isCustomPromptActive]);

  useEffect(() => {
    if (!canUseCustomPrompt && customPromptEnabled) {
      setCustomPromptEnabled(false);
    }
  }, [canUseCustomPrompt, customPromptEnabled]);

  useEffect(() => {
    if (!loading) {
      setElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    function preventBrowserFileDrop(event: DragEvent) {
      event.preventDefault();
    }

    window.addEventListener("dragover", preventBrowserFileDrop);
    window.addEventListener("drop", preventBrowserFileDrop);

    return () => {
      window.removeEventListener("dragover", preventBrowserFileDrop);
      window.removeEventListener("drop", preventBrowserFileDrop);
    };
  }, []);

  const selectedPreset = useMemo(
    () => EXPRESSION_PRESETS.find((p) => p.id === presetId),
    [presetId],
  );

  const isCurrentResultPinned = useMemo(() => {
    if (!result?.imageDataUrl) return false;
    return pinnedResults.some((item) => item.imageDataUrl === result.imageDataUrl);
  }, [pinnedResults, result?.imageDataUrl]);

  async function onFileChange(next: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!next) {
      setFile(null);
      setPreviewUrl(null);
      setResult(null);
      setError(null);
      return;
    }

    setPreparingImage(true);
    setError(null);

    try {
      const prepared = await prepareImageForUpload(next);
      setFile(prepared);
      setPreviewUrl(URL.createObjectURL(prepared));
      setResult(null);
    } catch {
      setFile(null);
      setPreviewUrl(null);
      setError(
        "이미지를 처리할 수 없습니다. PNG, JPG, WEBP 파일을 다시 선택해 주세요.",
      );
    } finally {
      setPreparingImage(false);
    }
  }

  async function onDropFiles(files: FileList | null) {
    const next = pickImageFile(files);
    if (!next) {
      setError("PNG, JPG, WEBP 이미지만 업로드할 수 있습니다.");
      return;
    }
    await onFileChange(next);
  }

  function downloadResult(imageDataUrl: string, presetLabel: string) {
    const link = document.createElement("a");
    link.href = imageDataUrl;
    link.download = `irr-expression-${presetLabel.replace(/\s+/g, "-")}.png`;
    link.click();
  }

  async function runTransform(options?: { useRandomSeed?: boolean }) {
    if (!file) return;

    const useCustom = isCustomPromptActive;
    if (!useCustom && !presetId) return;

    if (customPromptEnabled && hasCustomPrompt && !canUseCustomPrompt) {
      setError("프롬프트 표정은 오늘 사용 가능한 크레딧이 있을 때만 이용할 수 있습니다.");
      return;
    }

    if (customPromptEnabled && !hasCustomPrompt) {
      setError("프롬프트 표정을 사용하려면 표정 설명을 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append("image", file);

    if (useCustom) {
      form.append("customPrompt", trimmedCustomPrompt);
      if (combinePresetWithCustom && presetId) {
        form.append("presetId", presetId);
      }
    } else {
      form.append("presetId", presetId);
    }

    const seedToUse = options?.useRandomSeed === true ? null : lockedSeed;

    if (seedToUse != null) {
      form.append("seed", String(seedToUse));
    }

    try {
      const res = await fetch("/api/transform", {
        method: "POST",
        body: form,
      });
      const data = await readApiJson<TransformResponse>(res);
      if (!res.ok) {
        updateUsageHints(data);
        throw new Error(data.error ?? "변환 요청에 실패했습니다.");
      }
      updateUsageHints(data);
      if (data.billingSource === "credit") {
        const creditNote = useCustom
          ? "이번 변환은 프롬프트 표정(크레딧)을 사용했습니다"
          : "이번 변환은 크레딧을 사용했습니다";
        setQuotaHint((prev) => (prev ? `${prev} · ${creditNote}` : creditNote));
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit() {
    runTransform();
  }

  function onTryAnotherResult() {
    setLockedSeed(null);
    runTransform({ useRandomSeed: true });
  }

  function pinCurrentResult() {
    if (!result?.imageDataUrl) return;
    if (isCurrentResultPinned) return;

    const entry: PinnedResult = {
      id: crypto.randomUUID(),
      imageDataUrl: result.imageDataUrl,
      presetLabel: result.preset.label,
      presetEmoji: result.preset.emoji,
      seed: result.seed,
      pinnedAt: Date.now(),
    };

    setPinnedResults((prev) => [entry, ...prev].slice(0, MAX_PINNED));

    if (result.seed != null) {
      setLockedSeed(result.seed);
    }
  }

  function removePinned(id: string) {
    setPinnedResults((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <main className="w-full flex-1 bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <header className="mb-8">
          <p className="text-sm text-emerald-400">IRR Expression Studio</p>
          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className="mt-2 block text-left text-3xl font-bold tracking-tight transition hover:text-emerald-300"
            title="처음으로"
          >
            AI 표정 변환기
          </button>
          <p className="mt-3 max-w-3xl text-slate-300">
            AI를 이용한 표정 변경 프롬프트로 원본을 유지하며 표정 변환을 시도합니다.
          </p>
        </header>

        <div className="mb-6">
          <CreditShop
            balance={creditBalance}
            dailyLimit={creditDailyLimit}
            onCreditsChange={(credits) => {
              setCreditBalance(credits.balance);
              if (typeof credits.dailyLimit === "number") {
                setCreditDailyLimit(credits.dailyLimit);
              }
            }}
          />
        </div>

        <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
          <div className="min-w-0 flex-1">
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <h2 className="mb-2 text-lg font-semibold">1. 이미지 업로드</h2>
                <p className="mb-4 text-xs leading-relaxed text-slate-400">
                  {SFW_UPLOAD_NOTICE}
                </p>
                <label
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition ${
                    isDragging
                      ? "border-emerald-400 bg-emerald-500/10"
                      : "border-slate-700 bg-slate-950/60 hover:border-emerald-500/60"
                  }`}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = "copy";
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                    onDropFiles(e.dataTransfer.files);
                  }}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => onFileChange(pickImageFile(e.target.files))}
                  />
                  <span className="text-sm text-slate-300">
                    {preparingImage
                      ? "이미지 최적화 중..."
                      : isDragging
                        ? "여기에 이미지를 놓으세요"
                        : "PNG / JPG / WEBP 업로드"}
                  </span>
                  <span className="mt-2 text-xs text-slate-500">
                    클릭하거나 이미지를 드래그해서 놓기
                  </span>
                </label>

                {previewUrl && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="업로드 미리보기"
                      className="max-h-[420px] w-full object-contain bg-slate-950"
                    />
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <h2 className="mb-4 text-lg font-semibold">2. 표정 프리셋</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {EXPRESSION_PRESETS.map((preset) => {
                    const active = preset.id === presetId;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setPresetId(preset.id)}
                        className={`relative rounded-xl border px-3 py-3 text-left transition ${
                          active
                            ? "border-emerald-400 bg-emerald-500/10"
                            : "border-slate-700 bg-slate-950/50 hover:border-slate-500"
                        }`}
                      >
                        {preset.tier === "beta" && (
                          <span className="absolute right-2 top-2 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-200">
                            실험
                          </span>
                        )}
                        <div className="text-2xl">{preset.emoji}</div>
                        <div className="mt-1 text-sm font-medium">{preset.label}</div>
                      </button>
                    );
                  })}
                </div>

            {selectedPreset && !isCustomPromptActive && (
              <p className="mt-4 rounded-lg bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                {selectedPreset.description}
              </p>
            )}

            <div
              className={`mt-5 rounded-xl border p-4 transition ${
                customPromptEnabled
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-slate-700 bg-slate-950/50"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <label className="inline-flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={customPromptEnabled}
                    onChange={(e) => setCustomPromptEnabled(e.target.checked)}
                    disabled={!canUseCustomPrompt || loading}
                    className="mt-0.5 rounded border-slate-600 bg-slate-950"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-200">
                      프롬프트 표정 사용
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {canUseCustomPrompt
                        ? "켜면 크레딧 1회 · 끄면 선택한 프리셋만 적용"
                        : "크레딧 충전 후 사용할 수 있습니다"}
                    </span>
                  </span>
                </label>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    isCustomPromptActive
                      ? "bg-amber-500/15 text-amber-200"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {isCustomPromptActive ? "다음: 프롬프트" : "다음: 프리셋만"}
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-500">
                원하는 표정을 직접 입력할 수 있습니다. 여러 느낌을 섞어도 됩니다.
                끄면 입력 내용은 남지만 프리셋 변환에는 영향을 주지 않습니다.
              </p>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={!customPromptEnabled || !canUseCustomPrompt || loading}
                maxLength={CUSTOM_PROMPT_MAX_LENGTH}
                rows={3}
                placeholder={
                  canUseCustomPrompt
                    ? "예: 살짝 웃는데 눈은 슬퍼 보이게 / 미소 + 살짝 놀란 눈"
                    : "크레딧을 충전하면 프롬프트 표정을 사용할 수 있습니다"
                }
                className="mt-3 w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  {customPrompt.length}/{CUSTOM_PROMPT_MAX_LENGTH}
                </span>
                {isCustomPromptActive && selectedPreset && (
                  <label className="inline-flex items-center gap-2 text-slate-400">
                    <input
                      type="checkbox"
                      checked={combinePresetWithCustom}
                      onChange={(e) => setCombinePresetWithCustom(e.target.checked)}
                      disabled={loading}
                      className="rounded border-slate-600 bg-slate-950"
                    />
                    선택한 프리셋({selectedPreset.label})과 함께 적용
                  </label>
                )}
              </div>
              {isCustomPromptActive && (
                <p className="mt-2 text-xs text-amber-200/90">
                  프롬프트 표정은 무료 횟수와 관계없이 크레딧 1회가 차감됩니다. 결과는
                  실험 기능이라 편차가 클 수 있습니다.
                </p>
              )}
            </div>

            {quotaHint && (
              <p className="mt-4 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs text-slate-400">
                {quotaHint}
              </p>
            )}

            {lockedSeed != null && (
                  <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-200">
                    결과 스타일이 고정되었습니다. 같은 이미지·프리셋으로 실행하면
                    비슷한 결과를 다시 받을 수 있습니다.
                  </div>
                )}

                <button
                  type="button"
                  disabled={!file || loading || (customPromptEnabled && !hasCustomPrompt) || (!isCustomPromptActive && !presetId)}
                  onClick={onSubmit}
                  className="mt-5 w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "변환 중..." : "표정 변환 실행"}
                </button>

                {!loading && lockedSeed != null && (
                  <button
                    type="button"
                    onClick={() => setLockedSeed(null)}
                    className="mt-2 w-full rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-400 hover:text-slate-100"
                  >
                    고정 해제
                  </button>
                )}

                {loading && (
                  <div
                    className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-4"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                      <p className="text-sm font-medium text-emerald-300">
                        표정을 변환하고 있습니다…
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      예상 소요 시간: 약 {ESTIMATED_SECONDS.min}~{ESTIMATED_SECONDS.max}초
                      {elapsedSeconds > 0 && ` · 경과 ${elapsedSeconds}초`}
                    </p>
                    {elapsedSeconds > ESTIMATED_SECONDS.max && (
                      <p className="mt-2 text-xs text-amber-300/90">
                        평소보다 조금 더 걸리고 있습니다. 잠시만 기다려 주세요.
                      </p>
                    )}
                  </div>
                )}
              </section>
            </div>

            {(error || result) && (
              <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <h2 className="mb-4 text-lg font-semibold">3. 결과</h2>
                {error && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-amber-100 whitespace-pre-line">
                    {error}
                  </p>
                )}
                {result && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full bg-slate-800 px-3 py-1">
                        {result.expressionSource === "custom" ||
                        result.expressionSource === "hybrid"
                          ? "프롬프트"
                          : "프리셋"}
                        : {result.preset.emoji} {result.preset.label}
                      </span>
                      {result.customPrompt && (
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
                          “{result.customPrompt.length > 36
                            ? `${result.customPrompt.slice(0, 36)}…`
                            : result.customPrompt}”
                        </span>
                      )}
                      {result.imageDataUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            downloadResult(result.imageDataUrl!, result.preset.label)
                          }
                          className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-3 py-1 text-emerald-300 transition hover:bg-emerald-500/20"
                        >
                          PNG 다운로드
                        </button>
                      )}
                      {result.imageDataUrl && (
                        <button
                          type="button"
                          onClick={pinCurrentResult}
                          disabled={isCurrentResultPinned}
                          className={`rounded-full border px-3 py-1 transition disabled:cursor-default disabled:opacity-70 ${
                            isCurrentResultPinned
                              ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                              : "border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-400"
                          }`}
                        >
                          {isCurrentResultPinned ? "고정함에 추가됨" : "이 결과 고정"}
                        </button>
                      )}
                      {result.seedSupported && (
                        <button
                          type="button"
                          onClick={onTryAnotherResult}
                          disabled={loading}
                          className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-slate-300 transition hover:border-slate-400 disabled:opacity-50"
                        >
                          다른 결과 시도
                        </button>
                      )}
                    </div>
                    {result.imageDataUrl && (
                      <div className="overflow-hidden rounded-xl border border-slate-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={result.imageDataUrl}
                          alt="변환 결과"
                          className="max-h-[520px] w-full object-contain bg-slate-950"
                        />
                      </div>
                    )}
                    {result.mode === "mock" && (
                      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 whitespace-pre-line">
                        {result.warning ??
                          result.note ??
                          "실제 AI 변환이 적용되지 않았습니다. API 키와 서버 로그를 확인해 주세요."}
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>

          <aside className="w-full shrink-0 xl:sticky xl:top-6 xl:w-80">
            <PinnedTray
              items={pinnedResults}
              onRemove={removePinned}
              onClear={() => setPinnedResults([])}
              onDownload={(item) => downloadResult(item.imageDataUrl, item.presetLabel)}
              onApplySeed={setLockedSeed}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
