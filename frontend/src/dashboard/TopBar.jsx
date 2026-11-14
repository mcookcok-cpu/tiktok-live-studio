import { Clapperboard, Settings, Minus, Maximize2, Cpu, MemoryStick, Menu } from 'lucide-react';
import { useStudio } from '../services/useStudio.jsx';
import { useIsMobile } from '../services/useMedia.js';
import { Pill } from '../components/ui.jsx';

const tone = (ok, bad) => (ok ? 'bg-emerald-400' : bad ? 'bg-rose-400' : 'bg-slate-500');

export default function TopBar() {
  const { status, connected, ui, setUi, setPage } = useStudio();
  const mobile = useIsMobile();
  const sys = status?.system;

  const toggleNav = () => {
    if (mobile) { setUi({ navOpen: !ui.navOpen }); return; }
    const c = !ui.navCollapsed;
    try { localStorage.setItem('tls.navCollapsed', c ? '1' : '0'); } catch (_) { /* abaikan */ }
    setUi({ navCollapsed: c });
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  };

  const st = status?.stream?.state, tk = status?.tiktok?.state, ai = status?.aiHost?.state;
  return (
    <header className="h-12 md:h-10 shrink-0 flex items-center gap-2 md:gap-3 px-2 md:px-3 bg-side border-b border-line">
      <button className="btn btn-icon shrink-0" aria-label="Menu" title="Menu" onClick={toggleNav}><Menu size={16} /></button>
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-6 h-6 shrink-0 rounded bg-gradient-to-br from-accent to-accent2 grid place-items-center"><Clapperboard size={14} /></span>
        <b className="text-[13px] truncate">{mobile ? 'Live Studio' : 'TikTok Live Studio 2D'}</b>
        <span className="hidden lg:inline text-muted text-[11px]">· Project: Default</span>
      </div>

      {mobile ? (
        <div className="ml-auto flex items-center gap-2.5 shrink-0">
          {[['Stream', st === 'live', st === 'error', st], ['Backend', connected, !connected, connected ? 'online' : 'offline'], ['TikTok', tk === 'connected', tk === 'error', tk], ['AI Host', ai === 'connected', false, ai]].map(([l, ok, bad, v]) => (
            <span key={l} title={`${l}: ${v || '…'}`} className={`w-2.5 h-2.5 rounded-full ${tone(ok, bad)}`} />
          ))}
          <button className="btn btn-icon" aria-label="Fullscreen" onClick={toggleFullscreen}><Maximize2 size={15} /></button>
        </div>
      ) : (
        <>
          <div className="hidden sm:flex items-center gap-1.5 ml-2">
            <Pill label="Stream" value={st || '…'} tone={st === 'live' ? 'ok' : 'off'} />
            <Pill label="Backend" value={connected ? 'online' : 'offline'} tone={connected ? 'ok' : 'err'} />
            <Pill label="TikTok" value={tk || '…'} tone={tk === 'connected' ? 'ok' : 'off'} />
            <Pill label="AI Host" value={ai || '…'} tone={ai === 'connected' ? 'ok' : 'off'} title={status?.aiHost?.url} />
          </div>
          <div className="ml-auto flex items-center gap-3 text-[11px] text-muted">
            <span className="flex items-center gap-1" title="CPU server"><Cpu size={13} /> {sys ? `${sys.cpu}%` : '—'}</span>
            <span className="flex items-center gap-1" title={sys ? `${sys.ramUsedMB}/${sys.ramTotalMB} MB · proses ${sys.processRssMB} MB` : ''}><MemoryStick size={13} /> {sys ? `${sys.ramPct}%` : '—'}</span>
            <button className="btn btn-icon" title="Settings" onClick={() => setPage('settings')}><Settings size={14} /></button>
            <button className={`btn btn-icon ${ui.compact ? '!border-accent' : ''}`} title="Minimize panel bawah" onClick={() => setUi({ compact: !ui.compact })}><Minus size={14} /></button>
            <button className="btn btn-icon" title="Fullscreen" onClick={toggleFullscreen}><Maximize2 size={14} /></button>
          </div>
        </>
      )}
    </header>
  );
}
