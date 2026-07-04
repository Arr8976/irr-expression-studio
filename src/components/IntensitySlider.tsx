"use client";

import {
  DEFAULT_EXPRESSION_INTENSITY,
  intensityLabel,
  MAX_EXPRESSION_INTENSITY,
  MIN_EXPRESSION_INTENSITY,
} from "@/lib/expression-intensity";

type IntensitySliderProps = {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

export function IntensitySlider({
  value,
  onChange,
  disabled = false,
}: IntensitySliderProps) {
  const label = intensityLabel(value);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-200">표정 강도</p>
          <p className="mt-0.5 text-xs text-slate-500">
            은은하게 ~ 강하게 · 기본 {DEFAULT_EXPRESSION_INTENSITY}
          </p>
        </div>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-emerald-200">
          {label} · {value}
        </span>
      </div>

      <input
        type="range"
        min={MIN_EXPRESSION_INTENSITY}
        max={MAX_EXPRESSION_INTENSITY}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="표정 강도"
        aria-valuemin={MIN_EXPRESSION_INTENSITY}
        aria-valuemax={MAX_EXPRESSION_INTENSITY}
        aria-valuenow={value}
        aria-valuetext={`${label}, ${value}`}
      />

      <div className="mt-2 flex justify-between text-[11px] text-slate-500">
        <span>은은하게</span>
        <span>자연스럽게</span>
        <span>뚜렷하게</span>
        <span>강하게</span>
      </div>
    </div>
  );
}
