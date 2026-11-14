'use strict';
const { HttpError } = require('../api/store');

function createOverlayApi({ r, wrap, io, overlays, bus }) {
  const reload = (name) => io.to(`overlay:${name}`).emit('overlay:config', { name });

  r.get('/overlays', wrap((req, res) => res.json({ overlays: overlays.list(), eventTypes: bus.types })));
  r.get('/overlays/state', wrap((req, res) => res.json(bus.state())));
  r.post('/overlays/events', wrap((req, res) => {
    const b = req.body || {};
    const ev = bus.publish(String(b.type || ''), b.data, b.source === 'test' ? 'test' : 'api');
    res.status(202).json({ event: ev });
  }));
  r.post('/overlays', wrap((req, res) => {
    const c = overlays.create((req.body || {}).name, (req.body || {}).title);
    res.status(201).json({ overlay: c });
  }));
  r.get('/overlays/:name', wrap((req, res) => res.json({ overlay: overlays.get(req.params.name) })));
  r.put('/overlays/:name', wrap((req, res) => { const c = overlays.update(req.params.name, req.body); reload(c.name); res.json({ overlay: c }); }));
  r.post('/overlays/:name/reset', wrap((req, res) => { const c = overlays.reset(req.params.name); reload(c.name); res.json({ overlay: c }); }));
  r.delete('/overlays/:name', wrap((req, res) => { overlays.remove(req.params.name); reload(req.params.name); res.json({ ok: true }); }));
}
module.exports = { createOverlayApi };
