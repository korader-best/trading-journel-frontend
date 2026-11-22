"use client";
import { useState } from "react";
import { assetUrl } from "@/lib/config";
import { OUTCOMES } from "./TradeForm";

const BADGE = {
  win: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
  loss: "bg-red-500/15 text-red-300 ring-red-400/30",
  breakeven: "bg-slate-500/20 text-slate-300 ring-slate-400/30",
};
const LABEL = Object.fromEntries(OUTCOMES.map((o) => [o.value, o.label]));

const fmt = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function TradeList({ trades, strategies, loading, selectedId, onSelect, onDelete }) {
  const [filter, setFilter] = useState("");
  const [preview, setPreview] = useState(null);
  const shown = filter ? trades.filter((t) => String(t.strategy_id) === filter) : trades;

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Journal</h2>
          <p className="text-xs text-slate-500">{shown.length} trades</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-[150px] rounded-lg border border-white/10 bg-black/20 px-2 py-1.5 text-xs text-slate-300 outline-none"
        >
          <option value="" className="bg-slate-900">
            All strategies
          </option>
          {strategies.map((s) => (
            <option key={s.id} value={s.id} className="bg-slate-900">
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-3">
        {loading &&
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        {!loading && shown.length === 0 && (
          <div className="px-3 py-10 text-center text-sm text-slate-500">No trades logged yet.</div>
        )}
        {shown.map((t) => {
          const active = t.id === selectedId;
          const cover = t.images[0];
          return (
            <div
              key={t.id}
              className={`group flex gap-3 rounded-xl p-2.5 transition ${
                active ? "bg-emerald-500/10 ring-1 ring-emerald-400/30" : "hover:bg-white/[0.04]"
              }`}
            >
              <button
                type="button"
                onClick={() => cover && setPreview(assetUrl(cover.url))}
                className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-black/30 ring-1 ring-white/10"
                aria-label="View screenshot"
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={assetUrl(cover.url)} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] text-slate-600">No image</span>
                )}
                {t.images.length > 1 && (
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 text-[10px] text-white">
                    +{t.images.length - 1}
                  </span>
                )}
              </button>
              <button type="button" onClick={() => onSelect(t)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${BADGE[t.outcome]}`}
                  >
                    {LABEL[t.outcome]}
                  </span>
                  {t.symbol && (
                    <span className="truncate text-sm font-medium text-slate-200">{t.symbol}</span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-slate-400">{t.strategy_name}</p>
                <p className="text-[11px] text-slate-500">{fmt(t.taken_at)}</p>
              </button>
              <button
                type="button"
                onClick={() => onDelete(t)}
                aria-label="Delete trade"
                className="self-start rounded-md px-1.5 text-xs text-slate-500 transition hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 grid cursor-zoom-out place-items-center bg-black/80 p-6 backdrop-blur-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Trade screenshot" className="max-h-full max-w-full rounded-xl shadow-2xl" />
        </div>
      )}
    </aside>
  );
}
