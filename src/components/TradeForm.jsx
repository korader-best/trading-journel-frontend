"use client";
import { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/config";

const MAX_MB = 10;
const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export const OUTCOMES = [
  { value: "win", label: "Profit", on: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/40" },
  { value: "loss", label: "Loss", on: "bg-red-500/15 text-red-200 ring-red-400/40" },
  { value: "breakeven", label: "Breakeven", on: "bg-slate-500/20 text-slate-200 ring-slate-400/40" },
];

/** "YYYY-MM-DDTHH:mm" in the user's local time, the format <input type="datetime-local"> uses. */
export function toLocalInput(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const blank = (strategyId) => ({
  strategy_id: strategyId ? String(strategyId) : "",
  outcome: "",
  taken_at: toLocalInput(new Date()),
  symbol: "",
  notes: "",
});

const inputCls =
  "w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-4 focus:ring-emerald-400/10";

/**
 * Create a journal entry, or edit `trade` when given.
 * onSubmit({ fields, newFiles, removedImageIds }) does the API calls and should throw on failure.
 */
export default function TradeForm({ strategies, trade, defaultStrategyId, disabled, onSubmit, onCancel }) {
  // The parent remounts this form (via `key`) when switching trades, so state is seeded once here.
  const [form, setForm] = useState(() =>
    trade
      ? {
          strategy_id: String(trade.strategy_id),
          outcome: trade.outcome,
          taken_at: toLocalInput(trade.taken_at),
          symbol: trade.symbol,
          notes: trade.notes,
        }
      : blank(defaultStrategyId),
  );
  const [files, setFiles] = useState([]); // [{ file, preview }]
  const existing = trade?.images ?? []; // images already saved on `trade`
  const [removed, setRemoved] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);

  // Free preview URLs when the form goes away.
  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.preview)), []);

  // Pick the first strategy once they load, if none is chosen yet.
  useEffect(() => {
    if (!form.strategy_id && strategies.length > 0) {
      setForm((f) => ({ ...f, strategy_id: String(defaultStrategyId ?? strategies[0].id) }));
    }
  }, [strategies, defaultStrategyId, form.strategy_id]);

  const addFiles = (list) => {
    const accepted = [];
    for (const file of list) {
      if (!ACCEPT.includes(file.type)) {
        setError(`${file.name || "That file"} is not a PNG, JPEG, WEBP or GIF image.`);
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`${file.name} is larger than ${MAX_MB} MB.`);
        continue;
      }
      accepted.push({ file, preview: URL.createObjectURL(file) });
    }
    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
  };

  const removeFile = (i) =>
    setFiles((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, j) => j !== i);
    });

  // Paste a screenshot straight from the clipboard (Cmd/Ctrl+V) while the form is focused.
  const onPaste = (e) => {
    const pasted = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
    if (pasted.length) {
      e.preventDefault();
      addFiles(pasted);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.strategy_id) return setError("Pick the strategy you used.");
    if (!form.outcome) return setError("Was this trade a profit or a loss?");
    if (!form.taken_at) return setError("Set the date and time of the trade.");
    setSaving(true);
    try {
      await onSubmit({
        fields: {
          strategy_id: Number(form.strategy_id),
          outcome: form.outcome,
          taken_at: new Date(form.taken_at).toISOString(), // local input -> UTC
          symbol: form.symbol.trim(),
          notes: form.notes,
        },
        newFiles: files.map((f) => f.file),
        removedImageIds: removed,
      });
      if (!trade) {
        files.forEach((f) => URL.revokeObjectURL(f.preview));
        setFiles([]);
        setForm(blank(form.strategy_id));
      }
    } catch (err) {
      setError(err.message || "Could not save the trade.");
    } finally {
      setSaving(false);
    }
  };

  const noStrategies = strategies.length === 0;

  return (
    <form
      onSubmit={submit}
      onPaste={onPaste}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">{trade ? "Edit trade" : "Log a trade"}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Record the result, attach your chart screenshot and tag the strategy you used.
        </p>
      </div>

      <div className="space-y-5">
        {/* Outcome */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-300">Outcome</span>
          <div className="grid grid-cols-3 gap-2">
            {OUTCOMES.map((o) => {
              const active = form.outcome === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    setForm({ ...form, outcome: o.value });
                    setError(null);
                  }}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium ring-1 transition ${
                    active ? o.on : "text-slate-400 ring-white/10 hover:bg-white/[0.04]"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Strategy */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-300">Strategy used</span>
            <select
              value={form.strategy_id}
              onChange={(e) => setForm({ ...form, strategy_id: e.target.value })}
              disabled={noStrategies}
              className={`${inputCls} appearance-none disabled:opacity-50`}
            >
              {noStrategies && <option value="">Create a strategy first</option>}
              {strategies.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900">
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          {/* Date & time */}
          <label className="block">
            <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-300">
              Date &amp; time
              <button
                type="button"
                onClick={() => setForm({ ...form, taken_at: toLocalInput(new Date()) })}
                className="text-xs font-normal text-emerald-300 hover:underline"
              >
                Set to now
              </button>
            </span>
            <input
              type="datetime-local"
              value={form.taken_at}
              onChange={(e) => setForm({ ...form, taken_at: e.target.value })}
              className={`${inputCls} [color-scheme:dark]`}
            />
          </label>
        </div>

        {/* Symbol */}
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-300">
            Symbol <span className="font-normal text-slate-500">(optional)</span>
          </span>
          <input
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
            maxLength={50}
            placeholder="e.g. EURUSD, NQ1!, BTCUSDT"
            className={inputCls}
          />
        </label>

        {/* Screenshots */}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-300">Screenshots</span>
          <div
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles([...e.dataTransfer.files]);
            }}
            className={`cursor-pointer rounded-xl border border-dashed px-4 py-6 text-center text-sm transition ${
              dragging
                ? "border-emerald-400/60 bg-emerald-500/5 text-emerald-200"
                : "border-white/15 text-slate-500 hover:border-white/25 hover:bg-white/[0.02]"
            }`}
          >
            <p>
              <span className="text-emerald-300">Click to upload</span>, drag and drop, or paste a screenshot
            </p>
            <p className="mt-1 text-xs text-slate-600">PNG, JPEG, WEBP or GIF, up to {MAX_MB} MB each</p>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT.join(",")}
              multiple
              hidden
              onChange={(e) => {
                addFiles([...e.target.files]);
                e.target.value = "";
              }}
            />
          </div>

          {(existing.length > 0 || files.length > 0) && (
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {existing
                .filter((img) => !removed.includes(img.id))
                .map((img) => (
                  <Thumb
                    key={`e${img.id}`}
                    src={assetUrl(img.url)}
                    onRemove={() => setRemoved((r) => [...r, img.id])}
                  />
                ))}
              {files.map((f, i) => (
                <Thumb key={f.preview} src={f.preview} isNew onRemove={() => removeFile(i)} />
              ))}
            </div>
          )}
        </div>

        {/* Notes */}
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-300">
            Notes <span className="font-normal text-slate-500">(optional)</span>
          </span>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="Why you took it, how you managed it, what you learned…"
            className={`${inputCls} scrollbar-thin resize-y`}
          />
        </label>
      </div>

      {error && (
        <p className="mt-5 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm text-red-200 ring-1 ring-red-400/20">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3 border-t border-white/10 pt-5">
        {trade && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving || disabled || noStrategies}
          className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Saving…" : trade ? "Update trade" : "Save trade"}
        </button>
      </div>
    </form>
  );
}

function Thumb({ src, isNew, onRemove }) {
  return (
    <div className="group relative aspect-video overflow-hidden rounded-lg ring-1 ring-white/10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="Trade screenshot" className="h-full w-full object-cover" />
      {isNew && (
        <span className="absolute left-1.5 top-1.5 rounded bg-emerald-500/80 px-1.5 text-[10px] font-medium text-slate-950">
          New
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove image"
        className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-xs text-white transition sm:opacity-0 sm:group-hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
