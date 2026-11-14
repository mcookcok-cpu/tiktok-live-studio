import { useStudio } from '../services/useStudio.jsx';
import ScenePanel from '../scenes/ScenePanel.jsx';
import SourcePanel from '../sources/SourcePanel.jsx';
import MixerPanel from '../mixer/MixerPanel.jsx';
import { NAV } from './Sidebar.jsx';
import OverlaysPage from '../overlays/OverlaysPage.jsx';

const INFO = {
  avatars: [4, 'Import model Live2D/ZIP/JSON, library, preview, animasi idle/talking/blink, dan expression.'],
  chat: [5, 'Chat TikTok real-time lewat adapter connector/Windows Bridge.'],
  events: [5, 'Event gift, like, follow, share, dan notifikasi.']
};

function Placeholder({ id }) {
  const label = NAV.find((n) => n[0] === id)?.[1];
  const [phase, text] = INFO[id] || [];
  return (
    <div className="flex-1 min-w-0 grid place-items-center p-5 md:p-8">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-semibold mb-2">{label}</h2>
        <p className="text-muted leading-relaxed">{text}</p>
        <p className="mt-4 inline-block px-3 py-1 rounded bg-amber-500/15 text-amber-300 text-[12px]">Dijadwalkan di Phase {phase}. Belum diimplementasikan.</p>
      </div>
    </div>
  );
}

function Settings() {
  const { status, connected } = useStudio();
  const rows = [
    ['Versi', status?.app?.version], ['Fase terimplementasi', status?.app?.phase], ['Port', status?.app?.port],
    ['Backend', connected ? 'terhubung (Socket.IO)' : 'terputus'], ['AI Host (WebSocket)', status?.aiHost?.url],
    ['Scene terakhir disimpan', status?.storage?.savedAt ? new Date(status.storage.savedAt).toLocaleString('id-ID') : 'belum pernah pada sesi server ini'],
    ['RAM proses backend', status?.system ? `${status.system.processRssMB} MB` : '—']
  ];
  return (
    <div className="flex-1 min-w-0 p-3 md:p-6 overflow-y-auto">
      <h2 className="text-lg font-semibold mb-3">Settings</h2>
      <dl className="w-full max-w-xl bg-panel border border-line rounded divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col sm:flex-row sm:items-center px-3 py-2 gap-0.5"><dt className="sm:w-52 shrink-0 text-muted text-[12px] sm:text-[13px]">{k}</dt><dd className="flex-1 min-w-0 font-mono text-[12px] break-all">{String(v ?? '—')}</dd></div>
        ))}
      </dl>
      <p className="text-muted text-[12px] mt-3">Pengaturan lanjutan (encoder, ingest, perangkat audio) ditambahkan bersama fasenya masing-masing.</p>
    </div>
  );
}

export default function Pages({ id }) {
  if (id === 'scenes') return <div className="flex-1 min-w-0 p-2 md:p-4 min-h-0"><ScenePanel className="h-full max-w-xl border border-line rounded" /></div>;
  if (id === 'sources') return <div className="flex-1 min-w-0 p-2 md:p-4 min-h-0"><SourcePanel className="h-full max-w-xl border border-line rounded" /></div>;
  if (id === 'mixer') return <div className="flex-1 min-w-0 p-2 md:p-4 min-h-0"><MixerPanel className="h-72 max-w-xl border border-line rounded" /></div>;
  if (id === 'settings') return <Settings />;
  if (id === 'overlays') return <OverlaysPage />;
  return <Placeholder id={id} />;
}
