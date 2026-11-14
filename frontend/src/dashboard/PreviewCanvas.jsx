import { useEffect, useMemo, useRef, useState } from 'react';
import { Grid3x3, Frame, Ruler, Eye, Smartphone, Monitor, Undo2, Redo2 } from 'lucide-react';
import { useStudio } from '../services/useStudio.jsx';
import { useCoarse } from '../services/useMedia.js';
import SourceView from '../sources/SourceView.jsx';

const HANDLES = [
  ['nw', -1, -1], ['n', 0, -1], ['ne', 1, -1], ['e', 1, 0], ['se', 1, 1], ['s', 0, 1], ['sw', -1, 1], ['w', -1, 0]
];
const CURSORS = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize' };

export default function PreviewCanvas() {
  const { activeScene, selectedId, select, updateSource, commitSource, setDragging, ui, setUi, setCanvas, selected, pushHistory, undo, redo, canUndo, canRedo, uploadFile } = useStudio();
  const [dropping, setDropping] = useState(false);
  const coarse = useCoarse();
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const [box, setBox] = useState({ w: 800, h: 450 });
  const [guides, setGuides] = useState({ x: null, y: null });

  const ready = !!activeScene;
  useEffect(() => {
    if (!ready || !wrapRef.current) return undefined;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [ready]);

  const CW = activeScene?.canvas.width || 1920;
  const CH = activeScene?.canvas.height || 1080;
  const scale = Math.max(0.05, Math.min((box.w - 32) / CW, (box.h - 32) / CH));
  const portrait = CH > CW;
  const interactive = !ui.preview;

  const toCanvas = (e) => {
    const r = stageRef.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };

  const begin = (e, src, mode, handle) => {
    if (!interactive || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    select(src.id);
    if (src.locked) return;
    const start = toCanvas(e);
    const init = { x: src.x, y: src.y, w: src.width, h: src.height, r: src.rotation };
    const th = 8 / scale;
    pushHistory();
    setDragging(true);

    const onMove = (ev) => {
      const p = toCanvas(ev);
      const dx = p.x - start.x, dy = p.y - start.y;
      if (mode === 'move') {
        let nx = init.x + dx, ny = init.y + dy;
        const g = { x: null, y: null };
        if (!ev.altKey) {
          for (const [cand, line] of [[0, 0], [CW / 2 - init.w / 2, CW / 2], [CW - init.w, CW]]) {
            if (Math.abs(nx - cand) < th) { nx = cand; g.x = line; break; }
          }
          for (const [cand, line] of [[0, 0], [CH / 2 - init.h / 2, CH / 2], [CH - init.h, CH]]) {
            if (Math.abs(ny - cand) < th) { ny = cand; g.y = line; break; }
          }
        }
        setGuides(g);
        updateSource(src.id, { x: Math.round(nx), y: Math.round(ny) }, { save: false });
      } else if (mode === 'resize') {
        const rad = (init.r * Math.PI) / 180;
        const c = Math.cos(rad), s = Math.sin(rad);
        const ldx = c * dx + s * dy;       // delta pada sumbu lokal (setelah rotasi)
        const ldy = -s * dx + c * dy;
        let nw = init.w, nh = init.h;
        if (handle[1] !== 0) nw = Math.max(20, init.w + handle[1] * ldx);
        if (handle[2] !== 0) nh = Math.max(20, init.h + handle[2] * ldy);
        if (ev.shiftKey && handle[1] !== 0 && handle[2] !== 0) {
          const ratio = init.w / init.h;
          if (Math.abs(nw - init.w) > Math.abs(nh - init.h) * ratio) nh = nw / ratio; else nw = nh * ratio;
        }
        const lcx = (handle[1] * (nw - init.w)) / 2;  // pergeseran pusat (lokal)
        const lcy = (handle[2] * (nh - init.h)) / 2;
        const cx = init.x + init.w / 2 + c * lcx - s * lcy;
        const cy = init.y + init.h / 2 + s * lcx + c * lcy;
        updateSource(src.id, { x: Math.round(cx - nw / 2), y: Math.round(cy - nh / 2), width: Math.round(nw), height: Math.round(nh) }, { save: false });
      } else if (mode === 'rotate') {
        const cx = init.x + init.w / 2, cy = init.y + init.h / 2;
        let ang = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90;
        if (ang > 180) ang -= 360;
        if (ev.shiftKey) ang = Math.round(ang / 15) * 15;
        updateSource(src.id, { rotation: Math.round(ang) }, { save: false });
      }
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setGuides({ x: null, y: null });
      setDragging(false);
      commitSource(src.id);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  // Layar sentuh: handle lebih besar untuk jari, tetapi diperkecil untuk source kecil dan hanya sudut yang
  // ditampilkan agar bagian tengah source tetap bisa di-drag.
  const selScreen = selected ? Math.min(selected.width, selected.height) * scale : 999;
  const smallSel = coarse && selScreen < 48;
  const hs = (coarse ? Math.max(14, Math.min(26, selScreen * 0.5)) : 10) / scale;
  const rotOff = (coarse ? 52 : 34) / scale;
  const shownHandles = smallSel ? HANDLES.filter((h) => h[1] !== 0 && h[2] !== 0) : HANDLES;
  const list = useMemo(() => activeScene?.sources || [], [activeScene]);
  if (!activeScene) return <div className="flex-1 grid place-items-center text-muted">Memuat scene…</div>;

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0">
      <div className="flex items-center gap-1 min-h-9 px-2 py-0.5 border-b border-line bg-panel shrink-0 overflow-x-auto no-scrollbar whitespace-nowrap [&>*]:shrink-0">
        <button className={`btn ${!portrait ? '!border-accent' : ''}`} onClick={() => setCanvas(activeScene.id, 1920, 1080)} title="Canvas 16:9 (1920×1080)"><Monitor size={14} /> 16:9</button>
        <button className={`btn ${portrait ? '!border-accent' : ''}`} onClick={() => setCanvas(activeScene.id, 1080, 1920)} title="Canvas 9:16 (1080×1920)"><Smartphone size={14} /> 9:16</button>
        <span className="mx-1 w-px h-4 bg-line" />
        <button className="btn btn-icon" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo}><Undo2 size={14} /></button>
        <button className="btn btn-icon" title="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={redo}><Redo2 size={14} /></button>
        <span className="mx-1 w-px h-4 bg-line" />
        <button className={`btn btn-icon ${ui.grid ? '!border-accent' : ''}`} onClick={() => setUi({ grid: !ui.grid })} title="Grid"><Grid3x3 size={14} /></button>
        <button className={`btn btn-icon ${ui.safe ? '!border-accent' : ''}`} onClick={() => setUi({ safe: !ui.safe })} title="Safe area"><Frame size={14} /></button>
        <button className={`btn btn-icon ${ui.guides ? '!border-accent' : ''}`} onClick={() => setUi({ guides: !ui.guides })} title="Alignment guides & snapping"><Ruler size={14} /></button>
        <button className={`btn ${ui.preview ? '!border-accent' : ''}`} onClick={() => setUi({ preview: !ui.preview })} title="Preview mode: sembunyikan kontrol editor"><Eye size={14} /> <span className="hidden sm:inline">Preview</span></button>
        <span className="ml-auto pl-2 text-[11px] text-muted">{CW}×{CH}<span className="hidden sm:inline"> · zoom {Math.round(scale * 100)}%</span></span>
      </div>

      <div
        ref={wrapRef}
        className={`relative flex-1 min-h-0 grid place-items-center overflow-hidden touch-none bg-[#0c0e12] ${dropping ? 'ring-2 ring-accent ring-inset' : ''}`}
        onPointerDown={() => interactive && select(null)}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDropping(true); } }}
        onDragLeave={() => setDropping(false)}
        onDrop={async (e) => {
          e.preventDefault(); setDropping(false);
          for (const f of Array.from(e.dataTransfer.files || [])) await uploadFile(f, { asSource: true });
        }}
      >
        {dropping && <div className="absolute inset-0 z-50 grid place-items-center pointer-events-none text-accent font-semibold bg-accent/10">Lepas file gambar/video untuk menambah source</div>}
        <div ref={stageRef} className="relative checker shadow-2xl ring-1 ring-line" style={{ width: CW * scale, height: CH * scale }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: CW, height: CH, transform: `scale(${scale})`, transformOrigin: '0 0', overflow: ui.preview ? 'hidden' : 'visible' }}>
            {list.map((src, i) => src.visible && (
              <div
                key={src.id}
                onPointerDown={(e) => begin(e, src, 'move')}
                style={{
                  position: 'absolute', left: src.x, top: src.y, width: src.width, height: src.height,
                  transform: `rotate(${src.rotation}deg)`, opacity: src.opacity, mixBlendMode: src.blend, zIndex: i + 1,
                  cursor: interactive ? (src.locked ? 'not-allowed' : 'move') : 'default', userSelect: 'none', touchAction: 'none'
                }}
              >
                <SourceView src={src} />
              </div>
            ))}

            {interactive && ui.grid && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9000, backgroundImage: 'linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />
            )}
            {interactive && ui.safe && (
              <>
                <div style={{ position: 'absolute', left: CW * 0.05, top: CH * 0.05, width: CW * 0.9, height: CH * 0.9, border: `${2 / scale}px dashed rgba(255,200,60,.8)`, pointerEvents: 'none', zIndex: 9001 }} />
                <div style={{ position: 'absolute', left: CW * 0.1, top: CH * 0.1, width: CW * 0.8, height: CH * 0.8, border: `${1.5 / scale}px dashed rgba(255,120,60,.6)`, pointerEvents: 'none', zIndex: 9001 }} />
              </>
            )}
            {interactive && ui.guides && (
              <>
                <div style={{ position: 'absolute', left: CW / 2, top: 0, width: 1 / scale, height: CH, background: 'rgba(139,123,255,.25)', pointerEvents: 'none', zIndex: 9002 }} />
                <div style={{ position: 'absolute', top: CH / 2, left: 0, height: 1 / scale, width: CW, background: 'rgba(139,123,255,.25)', pointerEvents: 'none', zIndex: 9002 }} />
              </>
            )}
            {interactive && guides.x !== null && <div style={{ position: 'absolute', left: guides.x, top: 0, width: 2 / scale, height: CH, background: '#ff4d8d', pointerEvents: 'none', zIndex: 9003 }} />}
            {interactive && guides.y !== null && <div style={{ position: 'absolute', top: guides.y, left: 0, height: 2 / scale, width: CW, background: '#ff4d8d', pointerEvents: 'none', zIndex: 9003 }} />}

            {interactive && selected && selected.visible && selectedId === selected.id && (
              <div style={{ position: 'absolute', left: selected.x, top: selected.y, width: selected.width, height: selected.height, transform: `rotate(${selected.rotation}deg)`, border: `${2 / scale}px solid ${selected.locked ? '#f59e0b' : '#8b7bff'}`, zIndex: 9100, pointerEvents: 'none', boxSizing: 'border-box' }}>
                {!selected.locked && shownHandles.map((h) => (
                  <div
                    key={h[0]}
                    onPointerDown={(e) => begin(e, selected, 'resize', h)}
                    style={{ position: 'absolute', width: hs, height: hs, background: '#fff', border: `${1.5 / scale}px solid #8b7bff`, left: `calc(${(h[1] + 1) * 50}% - ${hs / 2}px)`, top: `calc(${(h[2] + 1) * 50}% - ${hs / 2}px)`, cursor: CURSORS[h[0]], pointerEvents: 'auto', boxSizing: 'border-box', touchAction: 'none' }}
                  />
                ))}
                {!selected.locked && (
                  <>
                    <div style={{ position: 'absolute', left: '50%', top: -rotOff, width: 2 / scale, height: rotOff, background: '#8b7bff', transform: 'translateX(-50%)' }} />
                    <div
                      onPointerDown={(e) => begin(e, selected, 'rotate')}
                      title="Rotate (Shift = snap 15°)"
                      style={{ position: 'absolute', left: `calc(50% - ${hs / 2}px)`, top: -rotOff - hs / 2, width: hs, height: hs, borderRadius: '50%', background: '#8b7bff', border: `${1.5 / scale}px solid #fff`, cursor: 'grab', pointerEvents: 'auto', boxSizing: 'border-box', touchAction: 'none' }}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
