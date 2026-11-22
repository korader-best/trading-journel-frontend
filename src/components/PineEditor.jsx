"use client";
import { useCallback, useMemo, useRef } from "react";
const INDENT = "    ";
/** Code editor for Pine Script: line numbers, Tab indent, no length limit. */
export default function PineEditor({ value, onChange }) {
  const textRef = useRef(null);
  const gutterRef = useRef(null);
  const lineCount = useMemo(() => Math.max(1, value.split("\n").length), [value]);
  const syncScroll = useCallback(() => {
    if (gutterRef.current && textRef.current) {
      gutterRef.current.scrollTop = textRef.current.scrollTop;
    }
  }, []);
  const onKeyDown = (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: start, selectionEnd: end } = el;
    const next = value.slice(0, start) + INDENT + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + INDENT.length;
    });
  };
  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) onChange(text);
    } catch {
      textRef.current?.focus();
    }
  };
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0d1117] shadow-inner">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 font-mono text-xs text-slate-400">strategy.pine</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>
            {lineCount.toLocaleString()} lines · {value.length.toLocaleString()} chars
          </span>
          <button
            type="button"
            onClick={pasteFromClipboard}
            className="rounded-md border border-white/10 px-2 py-1 text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
          >
            Paste
          </button>
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-md border border-white/10 px-2 py-1 text-slate-300 transition hover:border-red-400/40 hover:text-red-300"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="relative flex h-[460px]">
        <div
          ref={gutterRef}
          aria-hidden
          className="select-none overflow-hidden border-r border-white/5 bg-white/[0.015] py-4 pl-4 pr-3 text-right font-mono text-[13px] leading-6 text-slate-600"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={textRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap="off"
          placeholder={
            '//@version=5\nstrategy("My Strategy", overlay=true)\n\n// Paste your full Pine Script here — there is no length limit.'
          }
          className="scrollbar-thin flex-1 resize-none bg-transparent p-4 font-mono text-[13px] leading-6 text-emerald-100 caret-emerald-400 outline-none placeholder:text-slate-600"
        />
      </div>
    </div>
  );
}
