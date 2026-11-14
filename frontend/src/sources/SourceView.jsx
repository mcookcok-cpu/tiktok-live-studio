import { useEffect, useRef, useState } from 'react';
import { SOURCE_META } from './sourceTypes';

// Video dari getUserMedia / getDisplayMedia. Hanya aktif selama source terlihat (hemat resource).
function MediaVideo({ kind, deviceId }) {
  const ref = useRef(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let stream; let dead = false;
    (async () => {
      try {
        if (!navigator.mediaDevices) throw new Error('Butuh HTTPS atau localhost agar browser mengizinkan akses perangkat.');
        stream = kind === 'webcam'
          ? await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId } } : true, audio: false })
          : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        if (dead) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (ref.current) ref.current.srcObject = stream;
        setErr('');
      } catch (e) { setErr(e.message || String(e)); }
    })();
    return () => { dead = true; stream && stream.getTracks().forEach((t) => t.stop()); };
  }, [kind, deviceId]);
  if (err) return <Placeholder type={kind} note={err} />;
  return <video ref={ref} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />;
}

function Placeholder({ type, note }) {
  const meta = SOURCE_META[type] || { label: type, icon: () => null };
  const Icon = meta.icon;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(139,123,255,.12)', border: '2px dashed rgba(139,123,255,.5)', color: '#c7c0ff', textAlign: 'center', padding: 16, boxSizing: 'border-box', overflow: 'hidden' }}>
      <Icon size={Math.min(64, 40)} />
      <div style={{ fontSize: 22, fontWeight: 600 }}>{meta.label}</div>
      {(note || meta.phase) && <div style={{ fontSize: 15, opacity: .75, maxWidth: '90%' }}>{note || `Render tersedia di Phase ${meta.phase}`}</div>}
    </div>
  );
}

const OVERLAY_OF = { chat: 'chat', gift: 'gift', alert: 'alerts' };

export default function SourceView({ src }) {
  const p = src.props || {};
  switch (src.type) {
    case 'chat':
    case 'gift':
    case 'alert':
      return <iframe title={src.name} src={`/overlay/${p.overlay || OVERLAY_OF[src.type]}`} style={{ width: '100%', height: '100%', border: 0, background: 'transparent', pointerEvents: 'none' }} />;
    case 'text':
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: p.align === 'left' ? 'flex-start' : p.align === 'right' ? 'flex-end' : 'center', color: p.color || '#fff', fontSize: Number(p.fontSize) || 48, fontWeight: p.fontWeight || '700', textAlign: p.align || 'center', whiteSpace: 'pre-wrap', overflow: 'hidden', lineHeight: 1.15, fontFamily: 'Inter, system-ui, sans-serif' }}>
          {p.text}
        </div>
      );
    case 'image':
      return p.url
        ? <img src={p.url} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: p.fit || 'contain', pointerEvents: 'none' }} />
        : <Placeholder type="image" note="Isi URL gambar di Properties" />;
    case 'video':
      return p.url
        ? <video src={p.url} autoPlay muted={p.muted !== false} loop={p.loop !== false} playsInline style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
        : <Placeholder type="video" note="Isi URL video di Properties" />;
    case 'browser':
      return p.url
        ? <iframe title={src.name} src={p.url} sandbox="allow-scripts allow-same-origin" style={{ width: '100%', height: '100%', border: 0, background: 'transparent', pointerEvents: 'none' }} />
        : <Placeholder type="browser" note="Isi URL halaman di Properties" />;
    case 'webcam': return <MediaVideo kind="webcam" deviceId={p.deviceId} />;
    case 'screen': return <MediaVideo kind="screen" />;
    default: return <Placeholder type={src.type} note={src.type === 'audio' ? 'Sumber audio (tidak punya visual). Mixer di Phase 7' : undefined} />;
  }
}
