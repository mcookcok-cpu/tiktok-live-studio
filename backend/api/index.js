'use strict';
const express = require('express');
const { HttpError, SOURCE_TYPES, BLEND_MODES } = require('./store');
const monitor = require('./monitor');
const { createAssets } = require('./assets');
const { createOverlayApi } = require('../overlay/api');


// Status dipisah per bagian supaya tidak memberi informasi palsu.
function buildStatus({ store, config }) {
  return {
    app: { name: 'tiktok-live-studio', version: '0.1.0', phase: 3, port: config.port },
    preview: { active: true, note: 'Preview lokal di browser (bukan siaran).' },
    tiktok: { state: 'disconnected', provider: null, note: 'Integrasi TikTok dibuat di Phase 5.' },
    stream: { state: 'offline', encoder: null, startedAt: null, recording: false, note: 'Encoder/ingest belum terpasang (Phase 7).' },
    aiHost: { state: 'unavailable', url: config.aiHostWs, note: 'Integrasi AI Host dibuat di Phase 6.' },
    system: monitor.read(),
    storage: { savedAt: store.savedAt() }
  };
}

function createApi({ store, io, config, overlays, bus }) {
  const r = express.Router();
  const wrap = (fn) => (req, res, next) => { try { Promise.resolve(fn(req, res)).catch(next); } catch (e) { next(e); } };
  const state = () => store.snapshot();
  const broadcast = (type, extra = {}) => io.emit('state:update', { ...state(), event: type, ...extra });
  const notImpl = (phase, what) => (req, res) =>
    res.status(501).json({ error: 'not_implemented', phase, message: `${what} belum tersedia (dijadwalkan di Phase ${phase}).` });

  r.get('/status', wrap((req, res) => res.json(buildStatus({ store, config }))));
  r.get('/meta', wrap((req, res) => res.json({
    sourceTypes: Object.entries(SOURCE_TYPES).map(([type, d]) => ({ type, label: d.label, width: d.w, height: d.h })),
    blendModes: BLEND_MODES
  })));

  // ---- Scenes ----
  r.get('/scenes', wrap((req, res) => res.json(state())));
  r.post('/scenes', wrap((req, res) => {
    const s = store.createScene(req.body && req.body.name, req.body && req.body.canvas);
    broadcast('scene:create'); res.status(201).json({ scene: s, ...state() });
  }));
  r.post('/scenes/save', wrap((req, res) => { const at = store.saveNow(); res.json({ savedAt: at }); }));
  r.post('/scenes/import', wrap((req, res) => {
    const s = store.importScene(req.body);
    broadcast('scene:import'); res.status(201).json({ scene: s, ...state() });
  }));
  r.get('/scenes/:id/export', wrap((req, res) => {
    const data = store.exportScene(req.params.id);
    res.setHeader('Content-Disposition', `attachment; filename="scene-${data.scene.id}.json"`);
    res.json(data);
  }));
  r.put('/scenes/:id', wrap((req, res) => { store.updateScene(req.params.id, req.body); broadcast('scene:update'); res.json(state()); }));
  r.delete('/scenes/:id', wrap((req, res) => { store.deleteScene(req.params.id); broadcast('scene:delete'); res.json(state()); }));
  r.post('/scenes/:id/duplicate', wrap((req, res) => { const s = store.duplicateScene(req.params.id); broadcast('scene:duplicate'); res.status(201).json({ scene: s, ...state() }); }));
  r.post('/scenes/:id/activate', wrap((req, res) => { store.activate(req.params.id); broadcast('scene:activate'); res.json(state()); }));

  r.put('/scenes/:id/sources', wrap((req, res) => { store.replaceSources(req.params.id, (req.body || {}).sources); broadcast('scene:restore'); res.json(state()); }));

  // ---- Assets (upload media) ----
  createAssets({ r, wrap, config });

  // ---- Sources ----
  r.get('/sources', wrap((req, res) => res.json({ sceneId: req.query.sceneId || state().activeSceneId, sources: store.listSources(req.query.sceneId) })));
  r.post('/sources', wrap((req, res) => {
    const b = req.body || {};
    const src = store.addSource(b.sceneId, b.type, b);
    broadcast('source:create'); res.status(201).json({ source: src });
  }));
  r.put('/sources/:id', wrap((req, res) => { const s = store.updateSource(req.params.id, req.body); broadcast('source:update'); res.json({ source: s }); }));
  r.delete('/sources/:id', wrap((req, res) => { store.deleteSource(req.params.id); broadcast('source:delete'); res.json({ ok: true }); }));
  r.post('/sources/:id/duplicate', wrap((req, res) => { const s = store.duplicateSource(req.params.id); broadcast('source:duplicate'); res.status(201).json({ source: s }); }));
  r.post('/sources/:id/reorder', wrap((req, res) => { const s = store.reorderSource(req.params.id, (req.body || {}).index); broadcast('source:reorder'); res.json({ source: s }); }));

  // ---- Fase berikutnya: jujur 501, bukan data palsu ----
  r.get('/avatars', wrap((req, res) => res.json({ avatars: [], note: 'Library avatar dibuat di Phase 4.' })));
  r.post('/avatars/import', notImpl(4, 'Import avatar'));
  createOverlayApi({ r, wrap, io, overlays, bus });
  r.get('/tiktok/status', wrap((req, res) => res.json(buildStatus({ store, config }).tiktok)));
  r.post('/tiktok/connect', notImpl(5, 'Koneksi TikTok Live'));
  r.post('/tiktok/disconnect', notImpl(5, 'Disconnect TikTok Live'));
  r.post('/stream/start', notImpl(7, 'Start stream (butuh encoder + ingest TikTok valid)'));
  r.post('/stream/stop', notImpl(7, 'Stop stream'));
  r.post('/stream/record', notImpl(7, 'Recording'));

  r.use((req, res) => res.status(404).json({ error: 'not_found', message: `Endpoint ${req.method} ${req.originalUrl} tidak ada` }));
  // eslint-disable-next-line no-unused-vars
  r.use((err, req, res, next) => {
    const status = err instanceof HttpError ? err.status : err.type === 'entity.parse.failed' ? 400 : 500;
    if (status === 500) console.error('[api]', err);
    res.status(status).json({ error: status === 500 ? 'server_error' : 'bad_request', message: status === 500 ? 'Terjadi kesalahan server' : err.message });
  });
  return r;
}

module.exports = { createApi, buildStatus };
