import { useEffect, useRef, useState } from 'react';

export function PanelHeader({ title, children }) {
  return (
    <div className="flex items-center justify-between h-7 px-2 border-b border-line bg-panel2 text-[11px] uppercase tracking-wide text-muted shrink-0">
      <span className="font-semibold">{title}</span>
      <div className="flex items-center gap-1 normal-case tracking-normal">{children}</div>
    </div>
  );
}

export function Pill({ label, value, tone = 'off', title }) {
  const tones = { off: 'bg-[#2a2e3a] text-muted', ok: 'bg-emerald-500/15 text-emerald-300', warn: 'bg-amber-500/15 text-amber-300', err: 'bg-rose-500/15 text-rose-300' };
  const dot = { off: 'bg-slate-500', ok: 'bg-emerald-400', warn: 'bg-amber-400', err: 'bg-rose-400' };
  return (
    <span title={title} className={`inline-flex items-center gap-1.5 px-2 h-5 rounded text-[11px] ${tones[tone]}`}>
      <i className={`w-1.5 h-1.5 rounded-full ${dot[tone]}`} />
      <span className="opacity-70">{label}</span>
      <b className="font-semibold">{value}</b>
    </span>
  );
}

export function EditableName({ value, onSave, className = '', startEditing = false, onDone }) {
  const [editing, setEditing] = useState(startEditing);
  const [text, setText] = useState(value);
  const ref = useRef(null);
  useEffect(() => { setText(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.select(); }, [editing]);
  const finish = (ok) => {
    setEditing(false);
    if (ok && text.trim() && text.trim() !== value) onSave(text.trim());
    else setText(value);
    onDone && onDone();
  };
  if (!editing) {
    return <span className={`truncate ${className}`} onDoubleClick={() => setEditing(true)} title="Klik dua kali untuk ganti nama">{value}</span>;
  }
  return (
    <input
      ref={ref} className="field !py-0 h-5 flex-1" value={text} autoFocus
      onChange={(e) => setText(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => { if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); e.stopPropagation(); }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export function Row({ label, children }) {
  return (
    <label className="flex items-center gap-2 py-1">
      <span className="w-20 shrink-0 text-muted text-[11px]">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </label>
  );
}

export function Num({ value, onChange, min, max, step = 1 }) {
  return (
    <input
      type="number" className="field" value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
      min={min} max={max} step={step}
      onChange={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n)) onChange(n); }}
    />
  );
}
