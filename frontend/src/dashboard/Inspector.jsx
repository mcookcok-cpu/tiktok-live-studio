import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { Eye, EyeOff, Lock, Unlock, Upload, AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, Maximize, RotateCcw } from 'lucide-react';
import { useStudio } from '../services/useStudio.jsx';
import { PanelHeader, Row, Num, EditableName } from '../components/ui.jsx';
import { SOURCE_META, BLEND_MODES } from '../sources/sourceTypes.js';

function UploadBtn({ accept, onFile }) {
  const ref = useRef(null);
  return (
    <>
      <button className="btn mt-1" onClick={() => ref.current?.click()}><Upload size={13} /> Upload file</button>
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </>
  );
}

function OverlayPicker({ onPick }) {
  const [list, setList] = useState([]);
  useEffect(() => { api.get('/api/overlays').then((d) => setList(d.overlays)).catch(() => {}); }, []);
  return (
    <Row label="Pakai overlay">
      <select className="field" value="" onChange={(e) => e.target.value && onPick(`${location.origin}/overlay/${e.target.value}`)}>
        <option value="">— pilih —</option>
        {list.map((o) => <option key={o.name} value={o.name}>{o.title} (/overlay/{o.name})</option>)}
      </select>
    </Row>
  );
}

function TypeProps({ src, set, uploadFile }) {
  const p = src.props || {};
  const upload = async (f) => { const a = await uploadFile(f); if (a) set({ props: { url: a.url } }); };
  const text = (k, ph) => <input className="field" value={p[k] ?? ''} placeholder={ph} onChange={(e) => set({ props: { [k]: e.target.value } })} />;
  switch (src.type) {
    case 'text':
      return (
        <>
          <Row label="Teks"><textarea className="field" rows={3} value={p.text ?? ''} onChange={(e) => set({ props: { text: e.target.value } })} /></Row>
          <Row label="Ukuran font"><Num value={Number(p.fontSize) || 48} min={8} max={600} onChange={(v) => set({ props: { fontSize: v } })} /></Row>
          <Row label="Warna"><input type="color" className="h-6 w-full bg-transparent" value={p.color || '#ffffff'} onChange={(e) => set({ props: { color: e.target.value } })} /></Row>
          <Row label="Ketebalan">
            <select className="field" value={p.fontWeight || '700'} onChange={(e) => set({ props: { fontWeight: e.target.value } })}>
              {['400', '500', '600', '700', '800', '900'].map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </Row>
          <Row label="Rata">
            <select className="field" value={p.align || 'center'} onChange={(e) => set({ props: { align: e.target.value } })}>
              <option value="left">Kiri</option><option value="center">Tengah</option><option value="right">Kanan</option>
            </select>
          </Row>
        </>
      );
    case 'image':
      return (
        <>
          <Row label="URL gambar">{text('url', 'https://… atau upload')}<UploadBtn accept="image/*" onFile={upload} /></Row>
          <Row label="Fit">
            <select className="field" value={p.fit || 'contain'} onChange={(e) => set({ props: { fit: e.target.value } })}>
              <option value="contain">Contain</option><option value="cover">Cover</option><option value="fill">Stretch</option>
            </select>
          </Row>
        </>
      );
    case 'video':
      return (
        <>
          <Row label="URL video">{text('url', 'https://… atau upload')}<UploadBtn accept="video/mp4,video/webm" onFile={upload} /></Row>
          <Row label="Loop"><input type="checkbox" checked={p.loop !== false} onChange={(e) => set({ props: { loop: e.target.checked } })} /></Row>
          <Row label="Mute"><input type="checkbox" checked={p.muted !== false} onChange={(e) => set({ props: { muted: e.target.checked } })} /></Row>
        </>
      );
    case 'browser':
      return (
        <>
          <Row label="URL">{text('url', 'https://… atau /overlay/main')}</Row>
          <OverlayPicker onPick={(u) => set({ props: { url: u } })} />
        </>
      );
    case 'chat':
    case 'gift':
    case 'alert':
      return <p className="text-[11px] text-muted py-1">Menampilkan overlay <code>/overlay/{src.type === 'alert' ? 'alerts' : src.type}</code> secara live. Atur isinya di menu Overlays. Event uji bisa dikirim dari sana.</p>;
    case 'webcam':
      return <p className="text-[11px] text-muted py-1">Webcam memakai kamera default browser. Butuh HTTPS atau localhost.</p>;
    case 'screen':
      return <p className="text-[11px] text-muted py-1">Browser akan meminta izin memilih layar/jendela. Butuh HTTPS atau localhost.</p>;
    default:
      return null;
  }
}

export default function Inspector({ mobile = false }) {
  const asideCls = mobile ? 'flex-1 min-h-0 w-full bg-panel flex flex-col' : 'w-72 shrink-0 bg-panel border-l border-line flex flex-col min-h-0';
  const { selected, activeScene, updateSource, commitSource, deleteSource, duplicateSource, uploadFile } = useStudio();

  if (!activeScene) return null;
  if (!selected) {
    return (
      <aside className={asideCls}>
        <PanelHeader title="Properties" />
        <div className="p-3 text-muted text-[12px] leading-relaxed">
          <p className="text-slate-200 font-semibold mb-1">{activeScene.name}</p>
          <p>Canvas {activeScene.canvas.width}×{activeScene.canvas.height}</p>
          <p>{activeScene.sources.length} source</p>
          <p className="mt-3">Pilih source di preview atau daftar Sources untuk melihat propertinya.</p>
          <p className="mt-3 text-[11px]">Shortcut: Delete = hapus · Ctrl+D = duplikat · Panah = geser (Shift = 10px) · Alt saat drag = tanpa snap · Shift saat rotate = snap 15°</p>
        </div>
      </aside>
    );
  }
  const s = selected;
  const set = (patch, save = true) => updateSource(s.id, patch, { save });
  const Icon = SOURCE_META[s.type]?.icon;
  const scalePct = (s.width / (s.baseW || s.width)) * 100;
  const CW = activeScene.canvas.width, CH = activeScene.canvas.height;
  const fit = () => {
    const k = Math.min(CW / s.width, CH / s.height);
    const w = Math.round(s.width * k), h = Math.round(s.height * k);
    set({ width: w, height: h, x: Math.round((CW - w) / 2), y: Math.round((CH - h) / 2), rotation: 0 });
  };

  return (
    <aside className={asideCls}>
      <PanelHeader title="Properties">
        <button className="btn btn-icon" title={s.visible ? 'Sembunyikan' : 'Tampilkan'} onClick={() => set({ visible: !s.visible })}>{s.visible ? <Eye size={13} /> : <EyeOff size={13} />}</button>
        <button className="btn btn-icon" title={s.locked ? 'Buka kunci' : 'Kunci layer'} onClick={() => set({ locked: !s.locked })}>{s.locked ? <Lock size={13} /> : <Unlock size={13} />}</button>
      </PanelHeader>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center gap-2 mb-2 text-slate-200">
          {Icon && <Icon size={15} className="text-accent shrink-0" />}
          <EditableName value={s.name} onSave={(name) => set({ name })} className="font-semibold flex-1" />
        </div>
        <p className="text-[11px] text-muted mb-2">{SOURCE_META[s.type]?.label}</p>

        <div className="flex flex-wrap gap-1 mb-2" title="Align ke canvas">
          {[
            ['Kiri', AlignHorizontalJustifyStart, { x: 0 }],
            ['Tengah (H)', AlignHorizontalJustifyCenter, { x: Math.round((CW - s.width) / 2) }],
            ['Kanan', AlignHorizontalJustifyEnd, { x: CW - s.width }],
            ['Atas', AlignVerticalJustifyStart, { y: 0 }],
            ['Tengah (V)', AlignVerticalJustifyCenter, { y: Math.round((CH - s.height) / 2) }],
            ['Bawah', AlignVerticalJustifyEnd, { y: CH - s.height }]
          ].map(([t, I, patch]) => <button key={t} className="btn btn-icon" title={`Align ${t}`} onClick={() => set(patch)}><I size={14} /></button>)}
          <button className="btn btn-icon" title="Fit ke canvas (jaga rasio)" onClick={fit}><Maximize size={14} /></button>
          <button className="btn btn-icon" title="Reset rotasi & skala 100%" onClick={() => set({ rotation: 0, width: s.baseW, height: s.baseH })}><RotateCcw size={14} /></button>
        </div>
        <div className="grid grid-cols-2 gap-x-2">
          <Row label="X"><Num value={s.x} onChange={(v) => set({ x: v })} /></Row>
          <Row label="Y"><Num value={s.y} onChange={(v) => set({ y: v })} /></Row>
          <Row label="Lebar"><Num value={s.width} min={8} onChange={(v) => set({ width: v })} /></Row>
          <Row label="Tinggi"><Num value={s.height} min={8} onChange={(v) => set({ height: v })} /></Row>
        </div>
        <Row label="Scale %">
          <Num value={scalePct} min={1} max={1000} onChange={(v) => set({ width: Math.round((s.baseW * v) / 100), height: Math.round((s.baseH * v) / 100) })} />
        </Row>
        <Row label="Rotasi °"><Num value={s.rotation} min={-360} max={360} onChange={(v) => set({ rotation: v })} /></Row>
        <Row label="Opacity">
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={1} step={0.01} value={s.opacity} className="flex-1 accent-[#8b7bff]" onChange={(e) => set({ opacity: parseFloat(e.target.value) })} />
            <span className="w-9 text-right text-[11px] text-muted">{Math.round(s.opacity * 100)}%</span>
          </div>
        </Row>
        <Row label="Blend">
          <select className="field" value={s.blend} onChange={(e) => set({ blend: e.target.value })}>
            {BLEND_MODES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Row>

        <div className="border-t border-line mt-2 pt-2">
          <TypeProps src={s} set={set} uploadFile={uploadFile} />
        </div>

        <div className="flex gap-2 mt-3">
          <button className="btn flex-1 justify-center" onClick={() => duplicateSource(s.id)}>Duplikat</button>
          <button className="btn flex-1 justify-center !text-rose-300" onClick={() => deleteSource(s.id)}>Hapus</button>
        </div>
      </div>
    </aside>
  );
}
