import { useRef, useState } from 'react';
import { Plus, Copy, Trash2, Download, Upload, Save, Pencil } from 'lucide-react';
import { useStudio } from '../services/useStudio.jsx';
import { PanelHeader, EditableName } from '../components/ui.jsx';

export default function ScenePanel({ className = '' }) {
  const { scenes, activeScene, createScene, deleteScene, duplicateScene, renameScene, switchScene, exportScene, importScene, saveScene } = useStudio();
  const fileRef = useRef(null);
  const [renaming, setRenaming] = useState(null);

  const del = (s) => { if (window.confirm(`Hapus scene "${s.name}"?`)) deleteScene(s.id); };

  return (
    <section className={`flex flex-col min-h-0 bg-panel ${className}`}>
      <PanelHeader title="Scenes">
        <button className="btn btn-icon" title="Create scene" onClick={() => createScene()}><Plus size={13} /></button>
        <button className="btn btn-icon" title="Duplicate scene" disabled={!activeScene} onClick={() => duplicateScene(activeScene.id)}><Copy size={13} /></button>
        <button className="btn btn-icon" title="Rename scene" disabled={!activeScene} onClick={() => setRenaming(activeScene.id)}><Pencil size={13} /></button>
        <button className="btn btn-icon" title="Delete scene" disabled={scenes.length <= 1} onClick={() => activeScene && del(activeScene)}><Trash2 size={13} /></button>
        <button className="btn btn-icon" title="Save scene" onClick={saveScene}><Save size={13} /></button>
        <button className="btn btn-icon" title="Export scene (.json)" disabled={!activeScene} onClick={() => exportScene(activeScene.id)}><Download size={13} /></button>
        <button className="btn btn-icon" title="Import scene (.json)" onClick={() => fileRef.current?.click()}><Upload size={13} /></button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importScene(f); e.target.value = ''; }} />
      </PanelHeader>
      <ul className="flex-1 overflow-y-auto p-1">
        {scenes.map((s) => (
          <li
            key={s.id}
            onClick={() => s.id !== activeScene?.id && switchScene(s.id)}
            className={`flex items-center gap-2 px-2 h-7 rounded cursor-pointer ${s.id === activeScene?.id ? 'bg-accent/20 text-white ring-1 ring-accent/50' : 'hover:bg-panel2 text-slate-300'}`}
          >
            <EditableName
              value={s.name} className="flex-1"
              startEditing={renaming === s.id}
              onDone={() => setRenaming(null)}
              onSave={(name) => renameScene(s.id, name)}
            />
            <span className="text-[10px] text-muted">{s.sources.length}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
