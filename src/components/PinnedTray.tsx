"use client";

export type PinnedResult = {
  id: string;
  imageDataUrl: string;
  presetLabel: string;
  presetEmoji: string;
  seed?: number;
  pinnedAt: number;
};

const MAX_PINNED = 24;

type PinnedTrayProps = {
  items: PinnedResult[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onDownload: (item: PinnedResult) => void;
  onApplySeed?: (seed: number) => void;
};

function formatPinnedTime(timestamp: number) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function PinnedTray({
  items,
  onRemove,
  onClear,
  onDownload,
  onApplySeed,
}: PinnedTrayProps) {
  return (
    <section className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">4. 고정함</h2>
          <p className="mt-1 text-xs text-slate-500">
            마음에 든 결과를 모아 둡니다. 새로고침하면 비워집니다.
          </p>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-xs text-slate-400 transition hover:text-slate-200"
          >
            전체 삭제
          </button>
        )}
      </div>

      <div className="min-h-[12rem] flex-1 space-y-3 overflow-y-auto pr-1 xl:max-h-[calc(100vh-10rem)]">
        {items.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/50 px-4 text-center">
            <p className="text-sm text-slate-400">고정한 결과가 없습니다</p>
            <p className="mt-2 text-xs text-slate-500">
              결과에서 「이 결과 고정」을 눌러 추가하세요
            </p>
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60"
            >
              <div className="relative aspect-square bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageDataUrl}
                  alt={`${item.presetLabel} 고정 결과`}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {item.presetEmoji} {item.presetLabel}
                  </p>
                  <span className="text-xs text-slate-500">
                    {formatPinnedTime(item.pinnedAt)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onDownload(item)}
                    className="rounded-full border border-emerald-500/40 px-2.5 py-1 text-xs text-emerald-300 transition hover:bg-emerald-500/10"
                  >
                    다운로드
                  </button>
                  {item.seed != null && onApplySeed && (
                    <button
                      type="button"
                      onClick={() => onApplySeed(item.seed!)}
                      className="rounded-full border border-slate-600 px-2.5 py-1 text-xs text-slate-300 transition hover:border-slate-400"
                    >
                      스타일 재사용
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition hover:border-red-500/40 hover:text-red-300"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {items.length > 0 && (
        <p className="mt-3 text-center text-xs text-slate-500">
          {items.length}개 저장됨 · 최대 {MAX_PINNED}개
        </p>
      )}
    </section>
  );
}

export { MAX_PINNED };
