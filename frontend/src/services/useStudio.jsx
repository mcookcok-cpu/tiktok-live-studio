import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, socket, uploadAsset, mediaSize } from './api';

const Ctx = createContext(null);
export const useStudio = () => useContext(Ctx);

export function StudioProvider({ children }) {
  const [scenes, setScenes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState(null);
  const [connected, setConnected] = useState(socket.connected);
  const [log, setLog] = useState([]);
  const [page, setPage] = useState('studio');
  const [ui, setUiState] = useState(() => {
    let collapsed = false;
    try { collapsed = localStorage.getItem('tls.navCollapsed') === '1'; } catch (_) { /* abaikan */ }
    return { grid: false, safe: false, guides: true, preview: false, compact: false, navOpen: false, navCollapsed: collapsed };
  });

  const scenesRef = useRef([]);
  const activeIdRef = useRef(null);
  const hist = useRef({ undo: [], redo: [], last: 0 });
  const [histVer, setHistVer] = useState(0);
  const pending = useRef(0);
  const dragging = useRef(false);
  const queued = useRef({});
  const timers = useRef({});

  scenesRef.current = scenes;
  activeIdRef.current = activeId;

  const addLog = useCallback((msg, level = 'info') => {
    setLog((l) => [{ id: Math.random().toString(36).slice(2), t: Date.now(), msg, level }, ...l].slice(0, 200));
  }, []);

  const applyState = useCallback((d) => {
    setScenes(d.scenes);
    setActiveId(d.activeSceneId);
    setSelectedId((sel) => (d.scenes.some((s) => s.sources.some((x) => x.id === sel)) ? sel : null));
  }, []);

  const call = useCallback(async (fn, okMsg) => {
    pending.current++;
    try {
      const d = await fn();
      if (okMsg) addLog(okMsg);
      return d;
    } catch (e) {
      addLog(e.message, 'error');
      return null;
    } finally {
      pending.current--;
    }
  }, [addLog]);

  const flush = useCallback((id) => {
    const patch = queued.current[id];
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    delete queued.current[id];
    if (!patch) return;
    pending.current++;
    api.put(`/api/sources/${id}`, patch)
      .catch((e) => addLog(`Gagal menyimpan source: ${e.message}`, 'error'))
      .finally(() => { pending.current--; });
  }, [addLog]);

  useEffect(() => {
    api.get('/api/scenes').then(applyState).catch((e) => addLog(`Gagal memuat scene: ${e.message}`, 'error'));
    api.get('/api/status').then(setStatus).catch(() => {});
    const onState = (d) => {
      if (pending.current === 0 && !dragging.current && Object.keys(timers.current).length === 0) applyState(d);
    };
    const onStatus = (s) => setStatus(s);
    const onConn = () => { setConnected(true); addLog('Terhubung ke backend'); };
    const onDisc = () => { setConnected(false); addLog('Koneksi backend terputus', 'warn'); };
    socket.on('state:update', onState);
    socket.on('status', onStatus);
    socket.on('connect', onConn);
    socket.on('disconnect', onDisc);
    return () => {
      socket.off('state:update', onState); socket.off('status', onStatus);
      socket.off('connect', onConn); socket.off('disconnect', onDisc);
    };
  }, [applyState, addLog]);

  const activeScene = useMemo(() => scenes.find((s) => s.id === activeId) || scenes[0] || null, [scenes, activeId]);
  const selected = useMemo(() => activeScene?.sources.find((x) => x.id === selectedId) || null, [activeScene, selectedId]);

  const refresh = useCallback(async () => { applyState(await api.get('/api/scenes')); }, [applyState]);

  // ---------- undo / redo (per scene aktif, maks 50 langkah) ----------
  const snapshotActive = () => {
    const sc = scenesRef.current.find((x) => x.id === activeIdRef.current);
    return sc ? { sceneId: sc.id, sources: JSON.parse(JSON.stringify(sc.sources)) } : null;
  };
  const pushHistory = useCallback(() => {
    const snap = snapshotActive();
    if (!snap) return;
    const h = hist.current;
    h.undo.push(snap); if (h.undo.length > 50) h.undo.shift();
    h.redo = []; h.last = Date.now();
    setHistVer((v) => v + 1);
  }, []);
  const clearHistory = useCallback(() => { hist.current = { undo: [], redo: [], last: 0 }; setHistVer((v) => v + 1); }, []);

  const restore = useCallback(async (snap) => {
    Object.keys(timers.current).forEach((id) => { clearTimeout(timers.current[id]); });
    timers.current = {}; queued.current = {};
    setScenes((all) => all.map((sc) => (sc.id === snap.sceneId ? { ...sc, sources: snap.sources } : sc)));
    setSelectedId((sel) => (snap.sources.some((x) => x.id === sel) ? sel : null));
    await call(() => api.put(`/api/scenes/${snap.sceneId}/sources`, { sources: snap.sources }));
  }, [call]);

  const undo = useCallback(async () => {
    const h = hist.current;
    const snap = h.undo.pop();
    if (!snap) return;
    const cur = snapshotActive();
    if (!cur || cur.sceneId !== snap.sceneId) { setHistVer((v) => v + 1); return; }
    h.redo.push(cur);
    setHistVer((v) => v + 1);
    await restore(snap); addLog('Undo');
  }, [restore, addLog]);
  const redo = useCallback(async () => {
    const h = hist.current;
    const snap = h.redo.pop();
    if (!snap) return;
    const cur = snapshotActive();
    if (!cur || cur.sceneId !== snap.sceneId) { setHistVer((v) => v + 1); return; }
    h.undo.push(cur);
    setHistVer((v) => v + 1);
    await restore(snap); addLog('Redo');
  }, [restore, addLog]);

  // ---------- scenes ----------
  const createScene = useCallback(async (name) => {
    const d = await call(() => api.post('/api/scenes', { name }), 'Scene dibuat');
    if (d) { applyState(d); setSelectedId(null); clearHistory(); }
  }, [call, applyState, clearHistory]);
  const deleteScene = useCallback(async (id) => {
    const d = await call(() => api.del(`/api/scenes/${id}`), 'Scene dihapus');
    if (d) { applyState(d); clearHistory(); }
  }, [call, applyState, clearHistory]);
  const duplicateScene = useCallback(async (id) => {
    const d = await call(() => api.post(`/api/scenes/${id}/duplicate`), 'Scene diduplikasi');
    if (d) { applyState(d); setSelectedId(null); clearHistory(); }
  }, [call, applyState, clearHistory]);
  const renameScene = useCallback(async (id, name) => {
    const d = await call(() => api.put(`/api/scenes/${id}`, { name }), 'Scene diganti nama');
    if (d) applyState(d);
  }, [call, applyState]);
  const switchScene = useCallback(async (id) => {
    setActiveId(id); setSelectedId(null); clearHistory();
    const d = await call(() => api.post(`/api/scenes/${id}/activate`));
    if (d) { applyState(d); addLog('Scene aktif diganti'); }
  }, [call, applyState, addLog, clearHistory]);
  const setCanvas = useCallback(async (id, width, height) => {
    const d = await call(() => api.put(`/api/scenes/${id}`, { canvas: { width, height } }), `Canvas ${width}x${height}`);
    if (d) applyState(d);
  }, [call, applyState]);
  const saveScene = useCallback(async () => {
    Object.keys(timers.current).forEach((id) => flush(id));
    const d = await call(() => api.post('/api/scenes/save'));
    if (d) addLog('Scene disimpan ke disk');
  }, [call, addLog, flush]);
  const exportScene = useCallback(async (id) => {
    const d = await call(() => api.get(`/api/scenes/${id}/export`));
    if (!d) return;
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${d.scene.name.replace(/[^\w-]+/g, '_')}.scene.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    addLog(`Scene "${d.scene.name}" diekspor`);
  }, [call, addLog]);
  const importScene = useCallback(async (file) => {
    let json;
    try { json = JSON.parse(await file.text()); } catch { addLog('File import bukan JSON valid', 'error'); return; }
    const d = await call(() => api.post('/api/scenes/import', json), 'Scene diimpor');
    if (d) { applyState(d); setSelectedId(null); clearHistory(); }
  }, [call, applyState, addLog, clearHistory]);

  // ---------- sources ----------
  const addSource = useCallback(async (type, over = {}) => {
    if (!activeScene) return null;
    pushHistory();
    const d = await call(() => api.post('/api/sources', { ...over, sceneId: activeScene.id, type }), `Source ${type} ditambahkan`);
    if (d) { await refresh(); setSelectedId(d.source.id); }
    return d;
  }, [activeScene, call, refresh, pushHistory]);

  // Upload file lalu (opsional) langsung jadi source di scene aktif
  const uploadFile = useCallback(async (file, { asSource = false } = {}) => {
    let asset;
    try { asset = await uploadAsset(file); addLog(`Upload ${file.name} (${Math.round(asset.size / 1024)} KB)`); }
    catch (e) { addLog(e.message, 'error'); return null; }
    if (asSource && activeScene && ['image', 'video'].includes(asset.kind)) {
      const sz = await mediaSize(asset.url, asset.kind);
      const cw = activeScene.canvas.width, ch = activeScene.canvas.height;
      const over = { name: file.name.replace(/\.[^.]+$/, ''), props: { url: asset.url } };
      if (sz) { const k = Math.min((cw * 0.6) / sz.w, (ch * 0.6) / sz.h); over.width = Math.round(sz.w * k); over.height = Math.round(sz.h * k); }
      await addSource(asset.kind, over);
    }
    return asset;
  }, [activeScene, addSource, addLog]);

  const updateSource = useCallback((id, patch, { save = true } = {}) => {
    if (save && Date.now() - hist.current.last > 800) pushHistory();
    setScenes((all) => all.map((sc) => ({
      ...sc,
      sources: sc.sources.map((x) => (x.id === id ? { ...x, ...patch, props: patch.props ? { ...x.props, ...patch.props } : x.props } : x))
    })));
    const prev = queued.current[id] || {};
    queued.current[id] = { ...prev, ...patch, props: { ...(prev.props || {}), ...(patch.props || {}) } };
    clearTimeout(timers.current[id]);
    // save=false: simpan nanti saat commitSource (akhir drag); tetap ada timer pengaman 3 dtk
    timers.current[id] = setTimeout(() => flush(id), save ? 300 : 3000);
  }, [flush, pushHistory]);

  const commitSource = useCallback((id) => flush(id), [flush]);

  const deleteSource = useCallback(async (id) => {
    pushHistory();
    clearTimeout(timers.current[id]);
    delete timers.current[id]; delete queued.current[id];
    setScenes((all) => all.map((sc) => ({ ...sc, sources: sc.sources.filter((x) => x.id !== id) })));
    setSelectedId((s) => (s === id ? null : s));
    await call(() => api.del(`/api/sources/${id}`), 'Source dihapus');
  }, [call, pushHistory]);

  const duplicateSource = useCallback(async (id) => {
    pushHistory();
    flush(id);
    const d = await call(() => api.post(`/api/sources/${id}/duplicate`), 'Source diduplikasi');
    if (d) { await refresh(); setSelectedId(d.source.id); }
  }, [call, refresh, flush, pushHistory]);

  const moveSource = useCallback(async (id, index) => {
    pushHistory();
    flush(id);
    const d = await call(() => api.post(`/api/sources/${id}/reorder`, { index }));
    if (d) await refresh();
  }, [call, refresh, flush, pushHistory]);

  const setDragging = useCallback((v) => { dragging.current = v; }, []);
  const setUi = useCallback((p) => setUiState((u) => ({ ...u, ...p })), []);

  const value = {
    scenes, activeScene, selected, selectedId, select: setSelectedId, status, connected, log, addLog,
    page, setPage, ui, setUi,
    createScene, deleteScene, duplicateScene, renameScene, switchScene, setCanvas, saveScene, exportScene, importScene,
    addSource, uploadFile, updateSource, commitSource, deleteSource, duplicateSource, moveSource, setDragging,
    pushHistory, undo, redo, canUndo: hist.current.undo.length > 0, canRedo: hist.current.redo.length > 0, histVer
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
