import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useStudio } from './services/useStudio.jsx';
import { useIsMobile } from './services/useMedia.js';
import TopBar from './dashboard/TopBar.jsx';
import Sidebar from './dashboard/Sidebar.jsx';
import PreviewCanvas from './dashboard/PreviewCanvas.jsx';
import Inspector from './dashboard/Inspector.jsx';
import StreamControls from './dashboard/StreamControls.jsx';
import ActivityLog from './dashboard/ActivityLog.jsx';
import Pages from './dashboard/Pages.jsx';
import ScenePanel from './scenes/ScenePanel.jsx';
import SourcePanel from './sources/SourcePanel.jsx';
import MixerPanel from './mixer/MixerPanel.jsx';

const TABS = [['scenes', 'Scene'], ['sources', 'Source'], ['props', 'Properti'], ['stream', 'Stream'], ['log', 'Log'], ['mixer', 'Mixer']];

// Layout studio untuk layar sempit: preview di atas, panel bertab di bawah.
function MobileStudio() {
  const { ui, setUi, selectedId } = useStudio();
  const [tab, setTab] = useState('sources');
  useEffect(() => { if (selectedId && tab !== 'sources' && tab !== 'props') setTab('props'); }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = !ui.compact && !ui.preview;
  const h = 'h-full';
  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0">
      <div className="flex flex-1 min-h-0"><PreviewCanvas /></div>
      {!ui.preview && (
        <div className={`shrink-0 flex flex-col border-t border-line bg-panel ${open ? 'h-[44%]' : ''}`}>
          <div className="flex items-center border-b border-line bg-side">
            <div className="flex flex-1 overflow-x-auto no-scrollbar">
              {TABS.map(([id, l]) => (
                <button key={id} onClick={() => { setTab(id); setUi({ compact: false }); }} className={`px-3.5 h-10 shrink-0 text-[13px] border-b-2 ${open && tab === id ? 'border-accent text-white' : 'border-transparent text-muted'}`}>{l}</button>
              ))}
            </div>
            <button className="btn btn-icon mx-1 shrink-0" aria-label={open ? 'Ciutkan panel' : 'Buka panel'} onClick={() => setUi({ compact: open })}>{open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button>
          </div>
          {open && (
            <div className="flex-1 min-h-0 flex flex-col">
              {tab === 'scenes' && <ScenePanel className={h} />}
              {tab === 'sources' && <SourcePanel className={h} />}
              {tab === 'props' && <Inspector mobile />}
              {tab === 'stream' && <StreamControls className={h} />}
              {tab === 'log' && <ActivityLog className={h} />}
              {tab === 'mixer' && <MixerPanel className={h} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { page, ui, selected, select, updateSource, deleteSource, duplicateSource, undo, redo } = useStudio();
  const mobile = useIsMobile();

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (page !== 'studio') return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (e.key === 'Escape') select(null);
      if (!selected) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSource(selected.id); }
      else if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSource(selected.id); }
      else if (e.key.startsWith('Arrow') && !selected.locked) {
        e.preventDefault();
        const n = e.shiftKey ? 10 : 1;
        const d = { ArrowLeft: [-n, 0], ArrowRight: [n, 0], ArrowUp: [0, -n], ArrowDown: [0, n] }[e.key];
        updateSource(selected.id, { x: selected.x + d[0], y: selected.y + d[1] });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page, selected, select, updateSource, deleteSource, duplicateSource, undo, redo]);

  return (
    <div className="h-full flex flex-col bg-bg">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        {page === 'studio' ? (
          mobile ? <MobileStudio /> : (
            <div className="flex flex-col flex-1 min-w-0 min-h-0">
              <div className="flex flex-1 min-h-0">
                <PreviewCanvas />
                {!ui.preview && <Inspector />}
              </div>
              {!ui.compact && (
                <div className="h-56 shrink-0 grid grid-cols-5 gap-px bg-line border-t border-line">
                  <ScenePanel />
                  <SourcePanel />
                  <MixerPanel />
                  <StreamControls />
                  <ActivityLog />
                </div>
              )}
            </div>
          )
        ) : (
          <Pages id={page} />
        )}
      </div>
    </div>
  );
}
