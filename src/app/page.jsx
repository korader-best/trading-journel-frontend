"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import PineEditor from "@/components/PineEditor";
import StrategySidebar from "@/components/StrategySidebar";
import TradeForm from "@/components/TradeForm";
import TradeList from "@/components/TradeList";
import { api } from "@/lib/api";
const EMPTY = { name: "", description: "", pine_script: "" };
export default function Dashboard() {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("journal");
  const [trades, setTrades] = useState([]);
  const [editingTrade, setEditingTrade] = useState(null);
  const notify = (t) => {
    setToast(t);
    setTimeout(() => setToast(null), 3000);
  };
  const load = useCallback(async () => {
    setLoading(true);
    try {
      await api.health();
      setOnline(true);
      const [s, t] = await Promise.all([api.listStrategies(), api.listTrades()]);
      setStrategies(s);
      setTrades(t);
    } catch {
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const dirty = useMemo(() => {
    const base = selected ?? EMPTY;
    return (
      form.name !== base.name ||
      form.description !== base.description ||
      form.pine_script !== base.pine_script
    );
  }, [form, selected]);
  const select = (s) => {
    setSelected(s);
    setForm({ name: s.name, description: s.description, pine_script: s.pine_script });
  };
  const startNew = () => {
    setSelected(null);
    setForm(EMPTY);
  };
  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      notify({ kind: "error", text: "Give your strategy a name." });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim() };
      const saved = selected
        ? await api.updateStrategy(selected.id, payload)
        : await api.createStrategy(payload);
      setStrategies((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
      setTrades((prev) =>
        prev.map((t) => (t.strategy_id === saved.id ? { ...t, strategy_name: saved.name } : t)),
      );
      select(saved);
      notify({ kind: "success", text: selected ? "Strategy updated" : "Strategy saved" });
    } catch (err) {
      notify({ kind: "error", text: err.message || "Could not save" });
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!selected) return;
    try {
      await api.deleteStrategy(selected.id);
      setStrategies((prev) => prev.filter((s) => s.id !== selected.id));
      setTrades((prev) => prev.filter((t) => t.strategy_id !== selected.id)); // backend cascades
      startNew();
      notify({ kind: "success", text: "Strategy deleted" });
    } catch (err) {
      notify({ kind: "error", text: err.message });
    }
  };
  const sortTrades = (list) =>
    [...list].sort((a, b) => new Date(b.taken_at) - new Date(a.taken_at) || b.id - a.id);

  const saveTrade = async ({ fields, newFiles, removedImageIds }) => {
    let saved;
    if (editingTrade) {
      const id = editingTrade.id;
      saved = await api.updateTrade(id, fields);
      for (const imageId of removedImageIds) await api.deleteTradeImage(id, imageId);
      if (newFiles.length) saved = await api.addTradeImages(id, newFiles);
      else if (removedImageIds.length)
        saved = { ...saved, images: saved.images.filter((i) => !removedImageIds.includes(i.id)) };
    } else {
      const data = new FormData();
      Object.entries(fields).forEach(([k, v]) => data.append(k, v));
      newFiles.forEach((f) => data.append("images", f));
      saved = await api.createTrade(data);
    }
    setTrades((prev) => sortTrades([saved, ...prev.filter((t) => t.id !== saved.id)]));
    setEditingTrade(null);
    notify({ kind: "success", text: editingTrade ? "Trade updated" : "Trade logged" });
  };

  const removeTrade = async (trade) => {
    try {
      await api.deleteTrade(trade.id);
      setTrades((prev) => prev.filter((t) => t.id !== trade.id));
      if (editingTrade?.id === trade.id) setEditingTrade(null);
      notify({ kind: "success", text: "Trade deleted" });
    } catch (err) {
      notify({ kind: "error", text: err.message });
    }
  };

  const decided = trades.filter((t) => t.outcome !== "breakeven");
  const winRate = decided.length
    ? `${Math.round((decided.filter((t) => t.outcome === "win").length / decided.length) * 100)}%`
    : "—";

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-sky-500 shadow-lg shadow-emerald-500/20">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 text-slate-950"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
            >
              <path d="M3 17l5-5 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M15 8h5v5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white">Trading Journal</h1>
            <p className="text-xs text-slate-500">
              {tab === "journal" ? "Trade journal" : "Strategy workspace"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${online === null ? "bg-slate-500" : online ? "bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400" : "bg-red-400"}`}
          />
          <span className="text-slate-400">
            {online === null ? "Connecting…" : online ? "Backend connected" : "Backend offline"}
          </span>
          {online === false && (
            <button onClick={load} className="ml-1 text-emerald-300 hover:underline">
              Retry
            </button>
          )}
        </div>
      </header>

      {/* Stats */}
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Strategies", value: strategies.length.toString() },
          { label: "Trades journaled", value: trades.length.toString() },
          { label: "Win rate", value: winRate, hint: decided.length ? "Breakeven excluded" : undefined },
          { label: "AI prediction", value: "—", hint: "Needs trade images" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{s.value}</p>
            {s.hint && <p className="text-[11px] text-slate-600">{s.hint}</p>}
          </div>
        ))}
      </section>

      {/* Tabs */}
      <nav className="mb-6 flex gap-1 self-start rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {[
          { id: "journal", label: "Trade journal" },
          { id: "strategies", label: "Strategies" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-1.5 text-sm transition ${
              tab === t.id ? "bg-white/10 font-medium text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "journal" && (
        <main className="grid flex-1 gap-6 lg:grid-cols-[340px_1fr]">
          <div className="lg:h-[calc(100vh-18rem)] lg:min-h-[560px]">
            <TradeList
              trades={trades}
              strategies={strategies}
              loading={loading}
              selectedId={editingTrade?.id ?? null}
              onSelect={setEditingTrade}
              onDelete={removeTrade}
            />
          </div>
          <div>
            {!loading && strategies.length === 0 && (
              <p className="mb-4 rounded-xl bg-amber-400/10 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-400/20">
                Add a strategy first so you can tag your trades.{" "}
                <button onClick={() => setTab("strategies")} className="underline">
                  Go to Strategies
                </button>
              </p>
            )}
            <TradeForm
              key={editingTrade?.id ?? "new"}
              strategies={strategies}
              trade={editingTrade}
              defaultStrategyId={selected?.id}
              disabled={online === false}
              onSubmit={saveTrade}
              onCancel={() => setEditingTrade(null)}
            />
          </div>
        </main>
      )}

      {/* Main */}
      {tab === "strategies" && (
        <main className="grid flex-1 gap-6 lg:grid-cols-[300px_1fr]">
          <div className="lg:h-[calc(100vh-15rem)] lg:min-h-[560px]">
            <StrategySidebar
              strategies={strategies}
              selectedId={selected?.id ?? null}
              loading={loading}
              onSelect={select}
              onNew={startNew}
            />
          </div>

          <form
            onSubmit={save}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
          >
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {selected ? "Edit strategy" : "New strategy"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Describe your edge and paste the Pine Script that powers it.
                </p>
              </div>
              {dirty && (
                <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs text-amber-300 ring-1 ring-amber-400/20">
                  Unsaved changes
                </span>
              )}
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-300">Strategy name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={200}
                  placeholder="e.g. London Open Breakout"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-4 focus:ring-emerald-400/10"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-300">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  placeholder="Market, timeframe, entry and exit rules, risk management…"
                  className="scrollbar-thin w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-4 focus:ring-emerald-400/10"
                />
              </label>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">Pine Script</span>
                  <span className="text-xs text-slate-500">No character limit</span>
                </div>
                <PineEditor
                  value={form.pine_script}
                  onChange={(pine_script) => setForm((f) => ({ ...f, pine_script }))}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
              <div>
                {selected && (
                  <button
                    type="button"
                    onClick={remove}
                    className="rounded-xl px-4 py-2.5 text-sm text-red-300 transition hover:bg-red-500/10"
                  >
                    Delete strategy
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => (selected ? select(selected) : startNew())}
                  disabled={!dirty || saving}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/5 disabled:opacity-40"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={saving || online === false}
                  className="rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:opacity-50"
                >
                  {saving ? "Saving…" : selected ? "Update strategy" : "Save strategy"}
                </button>
              </div>
            </div>
          </form>
        </main>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-xl px-4 py-3 text-sm shadow-2xl ring-1 backdrop-blur ${
            toast.kind === "success"
              ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30"
              : "bg-red-500/15 text-red-200 ring-red-400/30"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
