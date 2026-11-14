import { useStudio } from '../services/useStudio.jsx';
import { PanelHeader } from '../components/ui.jsx';

const color = { info: 'text-slate-300', warn: 'text-amber-300', error: 'text-rose-300' };
export default function ActivityLog({ className = '' }) {
  const { log } = useStudio();
  return (
    <section className={`flex flex-col min-h-0 bg-panel ${className}`}>
      <PanelHeader title="Activity Log" />
      <ul className="flex-1 overflow-y-auto p-1 font-mono text-[11px]">
        {log.length === 0 && <li className="text-muted p-2">Belum ada aktivitas.</li>}
        {log.map((l) => (
          <li key={l.id} className={`px-1 py-0.5 ${color[l.level]}`}>
            <span className="text-muted">{new Date(l.t).toLocaleTimeString('id-ID')}</span> {l.msg}
          </li>
        ))}
      </ul>
    </section>
  );
}
