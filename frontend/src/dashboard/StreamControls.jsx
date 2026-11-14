import { Radio, Square, Circle, Eye } from 'lucide-react';
import { api } from '../services/api';
import { useStudio } from '../services/useStudio.jsx';
import { PanelHeader, Pill } from '../components/ui.jsx';

const tiktokTone = { connected: 'ok', connecting: 'warn', disconnected: 'off', error: 'err' };
const streamTone = { live: 'ok', starting: 'warn', offline: 'off', error: 'err' };

export default function StreamControls({ className = '' }) {
  const { status, ui, setUi, addLog } = useStudio();
  const stream = status?.stream;
  const run = async (path, label) => {
    try { await api.post(path); addLog(`${label} berhasil`); }
    catch (e) { addLog(`${label}: ${e.message}`, 'warn'); }
  };
  return (
    <section className={`flex flex-col min-h-0 bg-panel ${className}`}>
      <PanelHeader title="Streaming Controls" />
      <div className="p-2 space-y-2 overflow-y-auto">
        <div className="flex flex-wrap gap-1.5">
          <Pill label="Preview" value="lokal" tone="ok" title={status?.preview?.note} />
          <Pill label="TikTok" value={status?.tiktok?.state || '…'} tone={tiktokTone[status?.tiktok?.state] || 'off'} title={status?.tiktok?.note} />
          <Pill label="Stream" value={stream?.state || '…'} tone={streamTone[stream?.state] || 'off'} title={stream?.note} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button className="btn btn-primary" onClick={() => run('/api/stream/start', 'Start Stream')}><Radio size={13} /> Start Stream</button>
          <button className="btn" disabled={stream?.state !== 'live'} onClick={() => run('/api/stream/stop', 'Stop Stream')}><Square size={13} /> Stop</button>
          <button className="btn" onClick={() => run('/api/stream/record', 'Recording')}><Circle size={13} className="text-rose-400" /> Rec</button>
          <button className={`btn ${ui.preview ? '!border-accent' : ''}`} onClick={() => setUi({ preview: !ui.preview })}><Eye size={13} /> Preview Mode</button>
        </div>
        <div className="text-[11px] text-muted">Durasi: <b className="text-slate-300 font-mono">00:00:00</b> · {stream?.note}</div>
      </div>
    </section>
  );
}
