'use strict';
// Monitor CPU/RAM sederhana (tanpa dependensi). Hanya mengukur saat dipanggil.
const os = require('os');

let last = snap();
let cpuPct = 0;

function snap() {
  let idle = 0, total = 0;
  for (const c of os.cpus()) {
    for (const k of Object.keys(c.times)) total += c.times[k];
    idle += c.times.idle;
  }
  return { idle, total };
}

function sample() {
  const now = snap();
  const dt = now.total - last.total;
  const di = now.idle - last.idle;
  if (dt > 0) cpuPct = Math.max(0, Math.min(100, Math.round((1 - di / dt) * 100)));
  last = now;
  return read();
}

function read() {
  const total = os.totalmem();
  const free = os.freemem();
  return {
    cpu: cpuPct,
    ramUsedMB: Math.round((total - free) / 1048576),
    ramTotalMB: Math.round(total / 1048576),
    ramPct: Math.round(((total - free) / total) * 100),
    processRssMB: Math.round(process.memoryUsage().rss / 1048576),
    uptimeSec: Math.round(process.uptime())
  };
}

module.exports = { sample, read };
