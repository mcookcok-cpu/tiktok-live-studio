import { LayoutDashboard, Film, Layers, UserSquare, PictureInPicture2, MessagesSquare, Zap, SlidersHorizontal, Settings, X } from 'lucide-react';
import { useStudio } from '../services/useStudio.jsx';
import { useIsMobile } from '../services/useMedia.js';

export const NAV = [
  ['studio', 'Studio', LayoutDashboard], ['scenes', 'Scenes', Film], ['sources', 'Sources', Layers],
  ['avatars', 'Avatar Models', UserSquare, 4], ['overlays', 'Overlays', PictureInPicture2],
  ['chat', 'TikTok Chat', MessagesSquare, 5], ['events', 'Events', Zap, 5], ['mixer', 'Audio Mixer', SlidersHorizontal, 7],
  ['settings', 'Settings', Settings]
];

export default function Sidebar() {
  const { page, setPage, ui, setUi } = useStudio();
  const mobile = useIsMobile();
  const collapsed = !mobile && ui.navCollapsed;
  const go = (id) => { setPage(id); setUi({ navOpen: false }); };

  const items = NAV.map(([id, label, Icon, phase]) => (
    <button
      key={id} onClick={() => go(id)} title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-2.5 ${collapsed ? 'justify-center px-0' : 'px-3'} ${mobile ? 'h-11 text-[14px]' : 'h-8'} text-left border-l-2 ${page === id ? 'border-accent bg-accent/10 text-white' : 'border-transparent text-slate-400 hover:bg-panel hover:text-slate-200'}`}
    >
      <Icon size={collapsed ? 17 : 15} className={page === id ? 'text-accent' : ''} />
      {!collapsed && <span className="flex-1">{label}</span>}
      {!collapsed && phase && <span className="text-[10px] text-muted">P{phase}</span>}
    </button>
  ));

  if (mobile) {
    return (
      <>
        {ui.navOpen && <div className="fixed inset-0 z-50 bg-black/60" onClick={() => setUi({ navOpen: false })} />}
        <nav className={`fixed inset-y-0 left-0 z-[60] w-64 bg-side border-r border-line flex flex-col transition-transform duration-200 ${ui.navOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-hidden={!ui.navOpen}>
          <div className="h-12 shrink-0 flex items-center justify-between px-3 border-b border-line">
            <b>Menu</b>
            <button className="btn btn-icon" aria-label="Tutup menu" onClick={() => setUi({ navOpen: false })}><X size={16} /></button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">{items}</div>
        </nav>
      </>
    );
  }
  return <nav className={`${collapsed ? 'w-12' : 'w-44'} shrink-0 bg-side border-r border-line py-2 overflow-y-auto transition-[width] duration-150`}>{items}</nav>;
}
