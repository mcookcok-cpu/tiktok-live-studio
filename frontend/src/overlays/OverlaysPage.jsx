import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, ExternalLink, Save, RotateCcw, Trash2, Plus, RefreshCw, Send } from 'lucide-react';
import { api } from '../services/api';
import { useStudio } from '../services/useStudio.jsx';
import { PanelHeader, Row, Num } from '../components/ui.jsx';

const OPTION_FIELDS = {
  main: [['maxMessages', 'Maks pesan chat', 'number'], ['duration', 'Durasi alert (ms)', 'number']],
  chat: [['maxMessages', 'Maks pesan', 'number'], ['fontSize', 'Ukuran font', 'number'], ['lifetime', 'Hilang setelah (detik, 0 = tetap)', 'number']],
  gift: [['duration', 'Durasi tampil (ms)', 'number'], ['max', 'Maks kartu', 'number']],
  alerts: [['duration', 'Durasi alert (ms)', 'number']],
  goal: [['title', 'Judul', 'text'], ['current', 'Nilai awal', 'number'], ['target', 'Target', 'number']],
  viewers: [['label', 'Label', 'text']]
};
const USERS = ['rina', 'budi_gaming', 'sasa', 'dimas', 'ayu99'];
const TEXTS = ['halo kak!', 'seru banget live-nya', 'salam dari Bandung', 'lanjut terus ya', 'wah keren'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

function useDebounced(fn, ms) {
  const t = useRef();
  return useCallback((...a) => { clearTimeout(t.current); t.current = setTimeout(() => fn(...a), ms); }, [fn, ms]);
}

export default function OverlaysPage() {
  const { addLog } = useStudio();
  const [list, setList] = useState([]);
  const [name, setName] = useState('main');
  const [draft, setDraft] = useState(null);
  const [orig, setOrig] = useState(null);
  const [tab, setTab] = useState('settings');
  const [newName, setNewName] = useState('');
  const [viewers, setViewers] = useState(100);
  const [goal, setGoal] = useState(30);
  const [rk, setRk] = useState(0);
  const [copied, setCopied] = useState(false);

  const loadList = useCallback(async () => { const d = await api.get('/api/overlays'); setList(d.overlays); }, []);
  useEffect(() => { loadList().catch((e) => addLog(e.message, 'error')); }, [loadList, addLog]);
  useEffect(() => {
    let dead = false;
    api.get(`/api/overlays/${name}`).then((d) => { if (!dead) { setDraft(d.overlay); setOrig(JSON.stringify(d.overlay)); } }).catch((e) => addLog(e.message, 'error'));
    return () => { dead = true; };
  }, [name, addLog]);

  const dirty = draft && JSON.stringify(draft) !== orig;
  const url = useMemo(() => `${location.origin}/overlay/${name}`, [name]);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const setOpt = (k, v) => setDraft((d) => ({ ...d, options: { ...d.options, [k]: v } }));

  const save = async () => {
    try {
      const d = await api.put(`/api/overlays/${name}`, { title: draft.title, width: draft.width, height: draft.height, options: draft.options, customCss: draft.customCss, customHtml: draft.customHtml, customJs: draft.customJs });
      setDraft(d.overlay); setOrig(JSON.stringify(d.overlay)); addLog(`Overlay "${name}" disimpan`); loadList();
    } catch (e) { addLog(e.message, 'error'); }
  };
  const reset = async () => {
    if (!window.confirm(`Reset overlay "${name}" ke bawaan? Pengaturan dan kode kustom akan hilang.`)) return;
    try { const d = await api.post(`/api/overlays/${name}/reset`); setDraft(d.overlay); setOrig(JSON.stringify(d.overlay)); addLog(`Overlay "${name}" di-reset`); loadList(); }
    catch (e) { addLog(e.message, 'error'); }
  };
  const remove = async () => {
    if (!window.confirm(`Hapus overlay "${name}"?`)) return;
    try { await api.del(`/api/overlays/${name}`); addLog(`Overlay "${name}" dihapus`); setName('main'); loadList(); }
    catch (e) { addLog(e.message, 'error'); }
  };
  const create = async () => {
    const n = newName.trim().toLowerCase();
    try { await api.post('/api/overlays', { name: n, title: n }); setNewName(''); await loadList(); setName(n); addLog(`Overlay "${n}" dibuat`); }
    catch (e) { addLog(e.message, 'error'); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); }
    catch { const t = document.createElement('textarea'); t.value = url; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    setCopied(true); setTimeout(() => setCopied(false), 1500); addLog(`URL disalin: ${url}`);
  };
  const send = useDebounced(async (type, data) => {
    try { await api.post('/api/overlays/events', { type, data, source: 'test' }); } catch (e) { addLog(e.message, 'error'); }
  }, 0);

  if (!draft) return <div className="flex-1 grid place-items-center text-muted">Memuat overlay…</div>;
  const fields = OPTION_FIELDS[draft.kind] || [];
  const pw = Math.min(420, (typeof window !== 'undefined' ? window.innerWidth : 420) - 40), ph = 320;
  const k = Math.min(pw / draft.width, ph / draft.height);

  return (
    <div className="flex flex-col md:flex-row flex-1 min-w-0 min-h-0 overflow-y-auto md:overflow-hidden">
      {/* daftar */}
      <aside className="md:w-52 shrink-0 bg-panel md:border-r border-b md:border-b-0 border-line flex flex-col md:min-h-0">
        <PanelHeader title="Overlays" />
        <ul className="flex md:block md:flex-1 overflow-x-auto md:overflow-y-auto p-1 gap-1 no-scrollbar">
          {list.map((o) => (
            <li key={o.name} onClick={() => setName(o.name)} className={`shrink-0 min-w-[8.5rem] md:min-w-0 px-2 py-1.5 rounded cursor-pointer ${o.name === name ? 'bg-accent/20 ring-1 ring-accent/50' : 'hover:bg-panel2'}`}>
              <div className="flex items-center gap-2"><span className="flex-1 truncate">{o.title}</span>{o.hasCustomCode && <span className="text-[10px] text-accent">kode</span>}</div>
              <div className="text-[10px] text-muted font-mono">/overlay/{o.name}</div>
            </li>
          ))}
        </ul>
        <div className="p-2 border-t border-line flex gap-1">
          <input className="field" placeholder="nama-baru" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          <button className="btn btn-icon" title="Buat overlay kustom" disabled={!newName.trim()} onClick={create}><Plus size={13} /></button>
        </div>
      </aside>

      {/* editor */}
      <section className="md:flex-1 min-w-0 flex flex-col md:min-h-0 bg-bg">
        <div className="p-3 border-b border-line bg-panel space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input className="field !w-full sm:!w-56 font-semibold" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
            <span className="text-[11px] text-muted">{draft.kind}{draft.builtin ? ' · bawaan' : ' · kustom'}</span>
            <div className="ml-auto flex gap-1.5">
              <button className="btn btn-primary" disabled={!dirty} onClick={save}><Save size={13} /> Simpan{dirty ? ' •' : ''}</button>
              {draft.builtin ? <button className="btn" onClick={reset}><RotateCcw size={13} /> Reset</button> : <button className="btn !text-rose-300" onClick={remove}><Trash2 size={13} /> Hapus</button>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly className="field font-mono" value={url} onFocus={(e) => e.target.select()} />
            <button className="btn" onClick={copy}><Copy size={13} /> {copied ? 'Tersalin' : 'Copy URL'}</button>
            <a className="btn" href={url} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Buka</a>
          </div>
          <p className="text-[11px] text-muted">OBS: Sources → Browser → URL di atas, ukuran {draft.width}×{draft.height}. Background transparan, tidak perlu chroma key.</p>
        </div>

        <div className="flex border-b border-line bg-side text-[12px]">
          {[['settings', 'Pengaturan'], ['css', 'CSS'], ['html', 'HTML'], ['js', 'JavaScript']].map(([id, l]) => (
            <button key={id} onClick={() => setTab(id)} className={`px-4 h-8 border-b-2 ${tab === id ? 'border-accent text-white' : 'border-transparent text-muted hover:text-slate-200'}`}>{l}</button>
          ))}
        </div>
        <div className="md:flex-1 md:min-h-0 md:overflow-y-auto p-3">
          {tab === 'settings' && (
            <div className="max-w-md">
              <div className="grid grid-cols-2 gap-x-2">
                <Row label="Lebar"><Num value={draft.width} min={16} max={8000} onChange={(v) => set({ width: v })} /></Row>
                <Row label="Tinggi"><Num value={draft.height} min={16} max={8000} onChange={(v) => set({ height: v })} /></Row>
              </div>
              {fields.length === 0 && <p className="text-muted text-[12px] mt-2">Overlay ini tidak punya opsi bawaan{draft.kind === 'avatar' ? ' (renderer avatar dibuat di Phase 4)' : ''}. Gunakan tab CSS/HTML/JavaScript.</p>}
              {fields.map(([key, label, type]) => (
                <Row key={key} label={label}>
                  {type === 'number'
                    ? <Num value={Number(draft.options[key] ?? 0)} onChange={(v) => setOpt(key, v)} />
                    : <input className="field" value={draft.options[key] ?? ''} onChange={(e) => setOpt(key, e.target.value)} />}
                </Row>
              ))}
            </div>
          )}
          {tab === 'css' && <CodeBox value={draft.customCss} onChange={(v) => set({ customCss: v })} ph={'/* contoh */\n.ov-msg { font-size: 1.1em; }'} />}
          {tab === 'html' && <CodeBox value={draft.customHtml} onChange={(v) => set({ customHtml: v })} ph={'<div class="banner">Follow @akunku</div>'} />}
          {tab === 'js' && (
            <>
              <CodeBox value={draft.customJs} onChange={(v) => set({ customJs: v })} ph={"Overlay.on('chat', function (d) { console.log(d.user, d.text); });"} />
              <p className="text-[11px] text-muted mt-2">API: <code>Overlay.on(tipe, fn)</code> (chat, gift, follow, share, like, viewers, goal, alert, avatar, atau <code>'*'</code>), <code>Overlay.config</code>, <code>Overlay.root</code>, <code>Overlay.socket</code>. Gunakan <code>textContent</code>, jangan <code>innerHTML</code>, untuk teks dari penonton. Kode berjalan di overlay milik Anda sendiri; jangan tempel kode dari sumber yang tidak dipercaya.</p>
            </>
          )}
        </div>
      </section>

      {/* preview + test */}
      <aside className="md:w-[460px] w-full shrink-0 bg-panel md:border-l border-t md:border-t-0 border-line flex flex-col md:min-h-0">
        <PanelHeader title="Preview overlay">
          <button className="btn btn-icon" title="Muat ulang preview" onClick={() => setRk((x) => x + 1)}><RefreshCw size={13} /></button>
        </PanelHeader>
        <div className="p-3 md:overflow-y-auto">
          <div className="checker mx-auto ring-1 ring-line overflow-hidden" style={{ width: draft.width * k, height: draft.height * k }}>
            <iframe key={`${name}-${rk}`} title="preview" src={`/overlay/${name}`} style={{ width: draft.width, height: draft.height, border: 0, background: 'transparent', transform: `scale(${k})`, transformOrigin: '0 0' }} />
          </div>
          <p className="text-[11px] text-muted mt-1 text-center">Kotak-kotak = transparan. Preview memuat versi yang <b>tersimpan</b>.</p>

          <h3 className="mt-4 mb-1 text-[11px] uppercase tracking-wide text-muted">Kirim event uji <span className="normal-case">(bukan dari TikTok)</span></h3>
          <div className="flex flex-wrap gap-1.5">
            <button className="btn" onClick={() => send('chat', { user: pick(USERS), text: pick(TEXTS) })}><Send size={12} /> Chat</button>
            <button className="btn" onClick={() => send('gift', { user: pick(USERS), gift: pick(['Rose', 'Panda', 'Lion']), count: 1 + Math.floor(Math.random() * 5) })}><Send size={12} /> Gift</button>
            <button className="btn" onClick={() => send('follow', { user: pick(USERS) })}><Send size={12} /> Follow</button>
            <button className="btn" onClick={() => send('share', { user: pick(USERS) })}><Send size={12} /> Share</button>
            <button className="btn" onClick={() => send('like', { user: pick(USERS), count: 5 })}><Send size={12} /> Like</button>
            <button className="btn" onClick={() => send('alert', { title: 'Halo!', text: 'Ini alert uji' })}><Send size={12} /> Alert</button>
            <button className="btn" onClick={() => send('avatar', { state: 'talking', mouth: 0.6 })}><Send size={12} /> Avatar bicara</button>
            <button className="btn" onClick={() => send('avatar', { state: 'idle', mouth: 0 })}>Avatar diam</button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-16 text-muted text-[11px]">Viewers</span><div className="w-24"><Num value={viewers} min={0} onChange={setViewers} /></div>
            <button className="btn" onClick={() => send('viewers', { count: viewers })}>Set</button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-16 text-muted text-[11px]">Goal</span><div className="w-24"><Num value={goal} min={0} onChange={setGoal} /></div>
            <button className="btn" onClick={() => send('goal', { title: draft.options.title || 'Target Follower', current: goal, target: Number(draft.options.target) || 100 })}>Set</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function CodeBox({ value, onChange, ph }) {
  return <textarea spellCheck={false} className="field font-mono text-[12px] h-64 md:h-[calc(100%-1.5rem)] md:min-h-64 resize-none leading-relaxed" value={value} placeholder={ph} onChange={(e) => onChange(e.target.value)} />;
}
