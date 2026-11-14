'use strict';
// Konfigurasi overlay (storage/settings/overlays.json). Overlay bawaan tidak bisa dihapus, hanya di-reset.
const fs = require('fs');
const path = require('path');
const { HttpError } = require('../api/store');

const BUILTIN = {
  main:    { title: 'Main Overlay',    kind: 'main',    width: 1920, height: 1080, options: { maxMessages: 6, duration: 5000 } },
  chat:    { title: 'Chat',            kind: 'chat',    width: 600,  height: 900,  options: { maxMessages: 10, fontSize: 28, lifetime: 0 } },
  gift:    { title: 'Gift',            kind: 'gift',    width: 600,  height: 400,  options: { duration: 4000, max: 4 } },
  alerts:  { title: 'Alerts',          kind: 'alerts',  width: 1280, height: 400,  options: { duration: 5000 } },
  avatar:  { title: 'Avatar',          kind: 'avatar',  width: 1080, height: 1080, options: {} },
  goal:    { title: 'Goal',            kind: 'goal',    width: 800,  height: 140,  options: { title: 'Target Follower', current: 0, target: 100 } },
  viewers: { title: 'Viewers',         kind: 'viewers', width: 400,  height: 100,  options: { label: 'Penonton' } },
  custom:  { title: 'Custom',          kind: 'custom',  width: 1920, height: 1080, options: {} }
};
const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,30}$/;
const MAX_CODE = 100000;

const num = (v, d, min, max) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d; };
const cleanOptions = (o) => {
  const out = {};
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o).slice(0, 30)) {
      if (!/^[\w-]{1,30}$/.test(k)) continue;
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
      else if (typeof v === 'boolean') out[k] = v;
      else if (typeof v === 'string') out[k] = v.slice(0, 200);
    }
  }
  return out;
};
const code = (v, old) => {
  if (v === undefined) return old || '';
  if (typeof v !== 'string') throw new HttpError(400, 'Kode kustom harus string');
  if (v.length > MAX_CODE) throw new HttpError(400, `Kode kustom terlalu panjang (maks ${MAX_CODE} karakter)`);
  return v;
};

function createOverlayStore(dir) {
  const file = path.join(dir, 'settings', 'overlays.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let data = {};

  const fresh = (name) => ({ name, ...JSON.parse(JSON.stringify(BUILTIN[name])), builtin: true, customCss: '', customHtml: '', customJs: '', updatedAt: Date.now() });
  const save = () => {
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
  };
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')) || {}; } catch (_) { data = {}; }
  let dirty = false;
  for (const n of Object.keys(BUILTIN)) if (!data[n]) { data[n] = fresh(n); dirty = true; }
  if (dirty) save();

  const get = (name) => {
    if (!data[name]) throw new HttpError(404, 'Overlay tidak ditemukan');
    return data[name];
  };
  const summary = (c) => ({ name: c.name, title: c.title, kind: c.kind, builtin: !!c.builtin, width: c.width, height: c.height, url: `/overlay/${c.name}`, hasCustomCode: !!(c.customCss || c.customHtml || c.customJs), updatedAt: c.updatedAt });

  return {
    has: (name) => !!data[name],
    get,
    list: () => Object.values(data).map(summary),
    create(name, title) {
      if (!NAME_RE.test(String(name || ''))) throw new HttpError(400, 'Nama overlay: huruf kecil/angka/-/_ (maks 31 karakter)');
      if (data[name]) throw new HttpError(409, 'Nama overlay sudah dipakai');
      data[name] = { name, title: String(title || name).slice(0, 60), kind: 'custom', builtin: false, width: 1920, height: 1080, options: {}, customCss: '', customHtml: '', customJs: '', updatedAt: Date.now() };
      save();
      return data[name];
    },
    update(name, patch = {}) {
      const c = get(name);
      if (typeof patch.title === 'string' && patch.title.trim()) c.title = patch.title.trim().slice(0, 60);
      if ('width' in patch) c.width = num(patch.width, c.width, 16, 8000);
      if ('height' in patch) c.height = num(patch.height, c.height, 16, 8000);
      if (patch.options) c.options = { ...c.options, ...cleanOptions(patch.options) };
      c.customCss = code(patch.customCss, c.customCss);
      c.customHtml = code(patch.customHtml, c.customHtml);
      c.customJs = code(patch.customJs, c.customJs);
      c.updatedAt = Date.now();
      save();
      return c;
    },
    reset(name) {
      const c = get(name);
      if (!c.builtin) throw new HttpError(400, 'Hanya overlay bawaan yang bisa di-reset');
      data[name] = fresh(name);
      save();
      return data[name];
    },
    remove(name) {
      const c = get(name);
      if (c.builtin) throw new HttpError(400, 'Overlay bawaan tidak bisa dihapus (gunakan reset)');
      delete data[name];
      save();
    },
    summary
  };
}

module.exports = { createOverlayStore, NAME_RE };
