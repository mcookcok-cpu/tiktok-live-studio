import { useState } from 'react';
import { Plus, Eye, EyeOff, Lock, Unlock, Copy, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { useStudio } from '../services/useStudio.jsx';
import { PanelHeader, EditableName } from '../components/ui.jsx';
import { SOURCE_META, SOURCE_ORDER } from './sourceTypes.js';

export default function SourcePanel({ className = '' }) {
  const { activeScene, selectedId, select, addSource, updateSource, commitSource, deleteSource, duplicateSource, moveSource } = useStudio();
  const [menu, setMenu] = useState(false);
  const list = activeScene ? [...activeScene.sources].map((s, i) => ({ ...s, index: i })).reverse() : []; // atas = layer teratas

  const toggle = (s, patch) => { updateSource(s.id, patch); commitSource(s.id); };

  return (
    <section className={`flex flex-col min-h-0 bg-panel relative ${className}`}>
      <PanelHeader title="Sources">
        <button className="btn btn-icon" title="Tambah source" onClick={() => setMenu((m) => !m)}><Plus size={13} /></button>
        <button className="btn btn-icon" title="Layer naik" disabled={!selectedId} onClick={() => { const s = list.find((x) => x.id === selectedId); if (s) moveSource(s.id, s.index + 1); }}><ChevronUp size={13} /></button>
        <button className="btn btn-icon" title="Layer turun" disabled={!selectedId} onClick={() => { const s = list.find((x) => x.id === selectedId); if (s) moveSource(s.id, s.index - 1); }}><ChevronDown size={13} /></button>
        <button className="btn btn-icon" title="Duplicate" disabled={!selectedId} onClick={() => duplicateSource(selectedId)}><Copy size={13} /></button>
        <button className="btn btn-icon" title="Delete" disabled={!selectedId} onClick={() => deleteSource(selectedId)}><Trash2 size={13} /></button>
      </PanelHeader>

      {menu && (
        <div className="absolute z-50 top-7 right-1 w-52 bg-panel2 border border-line rounded shadow-xl p-1" onMouseLeave={() => setMenu(false)}>
          {SOURCE_ORDER.map((t) => {
            const m = SOURCE_META[t]; const Icon = m.icon;
            return (
              <button key={t} className="w-full flex items-center gap-2 px-2 h-7 rounded hover:bg-accent/20 text-left" onClick={() => { addSource(t); setMenu(false); }}>
                <Icon size={14} className="text-accent" /> <span className="flex-1">{m.label}</span>
                {m.phase && <span className="text-[10px] text-muted">P{m.phase}</span>}
              </button>
            );
          })}
        </div>
      )}

      <ul className="flex-1 overflow-y-auto p-1">
        {list.length === 0 && <li className="text-muted text-[12px] p-3">Belum ada source. Klik + untuk menambah.</li>}
        {list.map((s) => {
          const Icon = SOURCE_META[s.type]?.icon;
          return (
            <li key={s.id} onClick={() => select(s.id)}
              className={`flex items-center gap-2 px-2 h-7 rounded cursor-pointer ${s.id === selectedId ? 'bg-accent/20 ring-1 ring-accent/50 text-white' : 'hover:bg-panel2 text-slate-300'} ${s.visible ? '' : 'opacity-50'}`}>
              {Icon && <Icon size={14} className="text-accent shrink-0" />}
              <EditableName value={s.name} className="flex-1" onSave={(name) => toggle(s, { name })} />
              <button className="text-muted hover:text-white" title="Visibility" onClick={(e) => { e.stopPropagation(); toggle(s, { visible: !s.visible }); }}>{s.visible ? <Eye size={13} /> : <EyeOff size={13} />}</button>
              <button className={`hover:text-white ${s.locked ? 'text-amber-400' : 'text-muted'}`} title="Lock" onClick={(e) => { e.stopPropagation(); toggle(s, { locked: !s.locked }); }}>{s.locked ? <Lock size={13} /> : <Unlock size={13} />}</button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
