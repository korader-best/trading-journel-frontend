"use client";
function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}
export default function StrategySidebar({ strategies, selectedId, loading, onSelect, onNew }) {
  return (
    <aside className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Strategies</h2>
          <p className="text-xs text-slate-500">{strategies.length} saved</p>
        </div>
        <button
          onClick={onNew}
          className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/25"
        >
          + New
        </button>
      </div>
      <div className="scrollbar-thin flex-1 space-y-1 overflow-y-auto p-3">
        {loading &&
          Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        {!loading && strategies.length === 0 && (
          <div className="px-3 py-10 text-center text-sm text-slate-500">
            No strategies yet.
            <br />
            Create your first one.
          </div>
        )}
        {strategies.map((s) => {
          const active = s.id === selectedId;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                active ? "bg-emerald-500/10 ring-1 ring-emerald-400/30" : "hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`truncate text-sm font-medium ${active ? "text-emerald-200" : "text-slate-200"}`}
                >
                  {s.name}
                </span>
                <span className="shrink-0 text-[11px] text-slate-500">{timeAgo(s.updated_at)}</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">{s.description || "No description"}</p>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
