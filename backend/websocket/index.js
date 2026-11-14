'use strict';
// Socket.IO: kirim state awal + status berkala (hanya saat ada klien -> hemat resource).
const monitor = require('../api/monitor');

function attachSockets({ io, store, getStatus, bus, overlays }) {
  io.on('connection', (socket) => {
    // Halaman overlay bergabung ke room-nya untuk menerima reload konfigurasi + state terakhir (viewers/goal)
    socket.on('overlay:join', (name) => {
      if (typeof name !== 'string' || !overlays.has(name)) return;
      socket.join(`overlay:${name}`);
      socket.emit('overlay:state', bus.state());
    });
    socket.emit('state:update', { ...store.snapshot(), event: 'hello' });
    socket.emit('status', getStatus());
  });
  const timer = setInterval(() => {
    if (io.engine.clientsCount === 0) return;
    monitor.sample();
    io.emit('status', getStatus());
  }, 2000);
  timer.unref();
  return () => clearInterval(timer);
}

module.exports = { attachSockets };
