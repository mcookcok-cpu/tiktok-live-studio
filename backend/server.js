'use strict';
const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const compression = require('compression');
const { Server } = require('socket.io');
const { createStore } = require('./api/store');
const { createApi, buildStatus } = require('./api');
const { attachSockets } = require('./websocket');
const { overlayRouter } = require('./overlay');
const { createOverlayStore } = require('./overlay/config');
const { createBus } = require('./overlay/bus');

const ROOT = path.join(__dirname, '..');

function createApp(opts = {}) {
  const config = {
    port: Number(opts.port || process.env.PORT || 9003),
    host: opts.host || process.env.HOST || '0.0.0.0',
    storageDir: opts.storageDir || process.env.STORAGE_DIR || path.join(ROOT, 'storage'),
    aiHostWs: process.env.AI_HOST_WS || 'ws://localhost:2027/ws'
  };
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: true } });
  const store = createStore(config.storageDir);
  const overlays = createOverlayStore(config.storageDir);
  const bus = createBus(io);

  app.disable('x-powered-by');
  app.use(compression());
  app.use(express.json({ limit: '5mb' }));
  app.use('/api', createApi({ store, io, config, overlays, bus }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: 'bad_request', message: err.type === 'entity.parse.failed' ? 'JSON tidak valid' : 'Terjadi kesalahan' }));
  app.use('/overlay', overlayRouter(express, { overlays }));
  // Aset upload: nosniff + sandbox supaya SVG/HTML tidak bisa menjalankan skrip bila dibuka langsung.
  app.use('/assets', express.static(path.join(config.storageDir, 'assets'), {
    index: false, maxAge: '1d',
    setHeaders: (res) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'"); }
  }));
  app.use('/overlay-assets', express.static(path.join(ROOT, 'public', 'overlays')));

  const dist = path.join(ROOT, 'frontend', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api|socket\.io|overlay).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
  } else {
    app.get('/', (req, res) => res.type('text/plain').send('Frontend belum di-build. Jalankan: npm run build'));
  }

  const stop = attachSockets({ io, store, bus, overlays, getStatus: () => buildStatus({ store, config }) });
  return { app, server, io, store, overlays, bus, config, stop };
}

if (require.main === module) {
  const ctx = createApp();
  ctx.server.listen(ctx.config.port, ctx.config.host, () => {
    console.log(`[tiktok-live-studio] http://${ctx.config.host}:${ctx.config.port}`);
  });
  // Error di luar request tidak boleh mematikan dashboard.
  process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
  process.on('uncaughtException', (e) => console.error('[uncaughtException]', e));
  const shutdown = () => { ctx.stop(); ctx.io.close(); ctx.server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { createApp };
