'use strict';
// Penyimpanan scene + source (JSON di storage/scenes/state.json). Tanpa dependensi eksternal.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const uid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 10);
const num = (v, d, min = -1e5, max = 1e5) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'];

const SOURCE_TYPES = {
  image:   { label: 'Image',          w: 480, h: 270, props: { url: '', fit: 'contain' } },
  video:   { label: 'Video',          w: 640, h: 360, props: { url: '', loop: true, muted: true } },
  browser: { label: 'Browser Source', w: 640, h: 360, props: { url: '' } },
  text:    { label: 'Text',           w: 600, h: 120, props: { text: 'Teks baru', fontSize: 64, color: '#ffffff', fontWeight: '700', align: 'center' } },
  webcam:  { label: 'Webcam',         w: 480, h: 270, props: { deviceId: '' } },
  audio:   { label: 'Audio',          w: 120, h: 120, props: { device: 'default' } },
  screen:  { label: 'Screen Capture', w: 640, h: 360, props: {} },
  avatar:  { label: '2D Avatar',      w: 480, h: 640, props: { modelId: '' } },
  chat:    { label: 'Chat Overlay',   w: 420, h: 520, props: {} },
  gift:    { label: 'Gift Overlay',   w: 420, h: 200, props: {} },
  alert:   { label: 'Alert Overlay',  w: 640, h: 180, props: {} }
};

const cleanProps = (p) => {
  const out = {};
  if (p && typeof p === 'object') {
    for (const [k, v] of Object.entries(p).slice(0, 40)) {
      if (['string', 'number', 'boolean'].includes(typeof v)) out[String(k).slice(0, 40)] = typeof v === 'string' ? v.slice(0, 5000) : v;
    }
  }
  return out;
};

function makeSource(type, over = {}, canvas = { width: 1920, height: 1080 }) {
  const def = SOURCE_TYPES[type];
  if (!def) throw new HttpError(400, `Tipe source tidak dikenal: ${type}`);
  const width = num(over.width, def.w, 8, 20000);
  const height = num(over.height, def.h, 8, 20000);
  return {
    id: typeof over.id === 'string' && /^[\w-]{1,24}$/.test(over.id) ? over.id : uid(),
    type,
    name: String(over.name || def.label).slice(0, 80),
    visible: over.visible !== false,
    locked: !!over.locked,
    x: num(over.x, Math.round((canvas.width - width) / 2)),
    y: num(over.y, Math.round((canvas.height - height) / 2)),
    width, height,
    baseW: num(over.baseW, width, 1, 20000),
    baseH: num(over.baseH, height, 1, 20000),
    rotation: num(over.rotation, 0, -360, 360),
    opacity: num(over.opacity, 1, 0, 1),
    blend: BLEND_MODES.includes(over.blend) ? over.blend : 'normal',
    props: { ...def.props, ...cleanProps(over.props) }
  };
}

function patchSource(src, patch = {}) {
  if (typeof patch.name === 'string' && patch.name.trim()) src.name = patch.name.trim().slice(0, 80);
  if (typeof patch.visible === 'boolean') src.visible = patch.visible;
  if (typeof patch.locked === 'boolean') src.locked = patch.locked;
  if ('x' in patch) src.x = num(patch.x, src.x);
  if ('y' in patch) src.y = num(patch.y, src.y);
  if ('width' in patch) src.width = num(patch.width, src.width, 8, 20000);
  if ('height' in patch) src.height = num(patch.height, src.height, 8, 20000);
  if ('rotation' in patch) src.rotation = num(patch.rotation, src.rotation, -360, 360);
  if ('opacity' in patch) src.opacity = num(patch.opacity, src.opacity, 0, 1);
  if (BLEND_MODES.includes(patch.blend)) src.blend = patch.blend;
  if (patch.props) src.props = { ...src.props, ...cleanProps(patch.props) };
  return src;
}

function createStore(dir) {
  const file = path.join(dir, 'scenes', 'state.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let state = null;
  let savedAt = null;

  const newScene = (name, canvas) => ({
    id: uid(),
    name: String(name || 'Scene').slice(0, 80),
    canvas: canvas || { width: 1920, height: 1080 },
    sources: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  function load() {
    for (const f of [file, `${file}.bak`]) { // coba file utama, lalu backup
      try {
        const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (Array.isArray(raw.scenes) && raw.scenes.length) {
          state = raw;
          if (!state.scenes.find((s) => s.id === state.activeSceneId)) state.activeSceneId = state.scenes[0].id;
          if (f !== file) console.warn('[store] state.json rusak, dipulihkan dari backup');
          return;
        }
      } catch (_) { /* belum ada / rusak -> coba berikutnya */ }
    }
    const s = newScene('Scene 1');
    s.sources.push(makeSource('text', { name: 'Judul', props: { text: 'TikTok Live Studio 2D' }, y: 80 }, s.canvas));
    state = { activeSceneId: s.id, scenes: [s] };
    save();
  }

  function save() {
    const tmp = `${file}.tmp`;
    try { if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak`); } catch (_) { /* backup best-effort */ }
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, file);
    savedAt = Date.now();
    return savedAt;
  }

  const scene = (id) => {
    const s = state.scenes.find((x) => x.id === id);
    if (!s) throw new HttpError(404, 'Scene tidak ditemukan');
    return s;
  };
  const touch = (s) => { s.updatedAt = Date.now(); };
  const findSource = (id) => {
    for (const s of state.scenes) {
      const i = s.sources.findIndex((x) => x.id === id);
      if (i >= 0) return { scene: s, index: i, source: s.sources[i] };
    }
    throw new HttpError(404, 'Source tidak ditemukan');
  };
  const nextName = (base, names) => {
    if (!names.includes(base)) return base;
    let i = 2;
    while (names.includes(`${base} ${i}`)) i++;
    return `${base} ${i}`;
  };
  const cloneSource = (src) => ({ ...JSON.parse(JSON.stringify(src)), id: uid() });
  const cloneScene = (s, name) => {
    const c = JSON.parse(JSON.stringify(s));
    c.id = uid(); c.name = name; c.createdAt = c.updatedAt = Date.now();
    c.sources = c.sources.map((x) => ({ ...x, id: uid() }));
    return c;
  };

  load();

  return {
    savedAt: () => savedAt,
    snapshot: () => JSON.parse(JSON.stringify(state)),
    saveNow: save,
    getScene: (id) => scene(id),
    activeScene: () => scene(state.activeSceneId),

    createScene(name, canvas) {
      const names = state.scenes.map((s) => s.name);
      const c = canvas && canvas.width && canvas.height
        ? { width: num(canvas.width, 1920, 16, 8000), height: num(canvas.height, 1080, 16, 8000) } : undefined;
      const s = newScene(nextName(String(name || `Scene ${state.scenes.length + 1}`).trim().slice(0, 80) || 'Scene', names), c);
      state.scenes.push(s);
      state.activeSceneId = s.id;
      save();
      return s;
    },
    updateScene(id, patch = {}) {
      const s = scene(id);
      if (typeof patch.name === 'string' && patch.name.trim()) s.name = patch.name.trim().slice(0, 80);
      if (patch.canvas) {
        s.canvas = { width: num(patch.canvas.width, s.canvas.width, 16, 8000), height: num(patch.canvas.height, s.canvas.height, 16, 8000) };
      }
      touch(s); save();
      return s;
    },
    deleteScene(id) {
      scene(id);
      if (state.scenes.length <= 1) throw new HttpError(400, 'Minimal harus ada satu scene');
      state.scenes = state.scenes.filter((s) => s.id !== id);
      if (state.activeSceneId === id) state.activeSceneId = state.scenes[0].id;
      save();
    },
    duplicateScene(id) {
      const s = scene(id);
      const c = cloneScene(s, nextName(`${s.name} copy`, state.scenes.map((x) => x.name)));
      state.scenes.splice(state.scenes.indexOf(s) + 1, 0, c);
      state.activeSceneId = c.id;
      save();
      return c;
    },
    activate(id) { scene(id); state.activeSceneId = id; save(); },
    exportScene(id) { return { format: 'tiktok-live-studio.scene', version: 1, scene: JSON.parse(JSON.stringify(scene(id))) }; },
    importScene(payload) {
      const src = payload && payload.format === 'tiktok-live-studio.scene' ? payload.scene : payload && payload.scene ? payload.scene : payload;
      if (!src || typeof src !== 'object' || !Array.isArray(src.sources)) throw new HttpError(400, 'File scene tidak valid (butuh field "sources")');
      const canvas = src.canvas && src.canvas.width && src.canvas.height ? src.canvas : { width: 1920, height: 1080 };
      const s = newScene(nextName(String(src.name || 'Imported Scene').slice(0, 80), state.scenes.map((x) => x.name)), {
        width: num(canvas.width, 1920, 16, 8000), height: num(canvas.height, 1080, 16, 8000)
      });
      for (const raw of src.sources.slice(0, 200)) {
        if (!raw || !SOURCE_TYPES[raw.type]) continue; // lewati tipe tak dikenal
        s.sources.push(makeSource(raw.type, raw, s.canvas));
      }
      state.scenes.push(s);
      state.activeSceneId = s.id;
      save();
      return s;
    },

    listSources(sceneId) { return scene(sceneId || state.activeSceneId).sources; },
    addSource(sceneId, type, over) {
      const s = scene(sceneId || state.activeSceneId);
      const src = makeSource(type, over, s.canvas);
      src.name = nextName(src.name, s.sources.map((x) => x.name));
      s.sources.push(src);
      touch(s); save();
      return src;
    },
    updateSource(id, patch) {
      const { scene: s, source } = findSource(id);
      patchSource(source, patch);
      touch(s); save();
      return source;
    },
    deleteSource(id) {
      const { scene: s, index } = findSource(id);
      s.sources.splice(index, 1);
      touch(s); save();
    },
    duplicateSource(id) {
      const { scene: s, index, source } = findSource(id);
      const c = cloneSource(source);
      c.name = nextName(`${source.name} copy`, s.sources.map((x) => x.name));
      c.x += 30; c.y += 30;
      s.sources.splice(index + 1, 0, c);
      touch(s); save();
      return c;
    },
    // Mengganti seluruh daftar source sebuah scene (dipakai undo/redo). Semua field divalidasi ulang.
    replaceSources(sceneId, list) {
      const s = scene(sceneId);
      if (!Array.isArray(list)) throw new HttpError(400, 'Field "sources" harus array');
      const seen = new Set();
      const next = [];
      for (const raw of list.slice(0, 300)) {
        if (!raw || !SOURCE_TYPES[raw.type]) throw new HttpError(400, `Tipe source tidak valid: ${raw && raw.type}`);
        const src = makeSource(raw.type, raw, s.canvas);
        if (seen.has(src.id)) src.id = uid();
        seen.add(src.id);
        next.push(src);
      }
      s.sources = next;
      touch(s); save();
      return s;
    },
    reorderSource(id, to) {
      const { scene: s, index, source } = findSource(id);
      const t = Math.max(0, Math.min(s.sources.length - 1, Math.round(num(to, index, 0, 10000))));
      s.sources.splice(index, 1);
      s.sources.splice(t, 0, source);
      touch(s); save();
      return source;
    }
  };
}

module.exports = { createStore, HttpError, SOURCE_TYPES, BLEND_MODES };
