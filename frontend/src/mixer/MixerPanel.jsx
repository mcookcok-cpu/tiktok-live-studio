import { Mic, Monitor, Bot, Music } from 'lucide-react';
import { PanelHeader } from '../components/ui.jsx';

const CH = [['Microphone', Mic], ['Desktop Audio', Monitor], ['Avatar TTS', Bot], ['Background Music', Music]];

export default function MixerPanel({ className = '' }) {
  return (
    <section className={`flex flex-col min-h-0 bg-panel ${className}`}>
      <PanelHeader title="Audio Mixer"><span className="text-[10px] text-amber-300">Phase 7</span></PanelHeader>
      <ul className="flex-1 overflow-y-auto p-2 space-y-1.5 opacity-60">
        {CH.map(([n, Icon]) => (
          <li key={n} className="flex items-center gap-2">
            <Icon size={13} className="text-muted" />
            <span className="w-28 truncate">{n}</span>
            <input type="range" disabled className="flex-1" />
          </li>
        ))}
        <li className="text-[11px] text-muted pt-1">Mixer, meter level, dan pilihan perangkat dibuat di Phase 7.</li>
      </ul>
    </section>
  );
}
