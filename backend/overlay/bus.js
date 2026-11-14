'use strict';
// Event bus overlay. Provider apa pun (API, TikTok adapter Phase 5, AI Host Phase 6) cukup memanggil publish().
const crypto = require('crypto');
const { HttpError } = require('../api/store');

const str = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const int = (v, min, max, d = 0) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d; };

const SCHEMA = {
  chat:    (d) => ({ user: str(d.user, 40) || 'anon', text: str(d.text, 300) }),
  gift:    (d) => ({ user: str(d.user, 40) || 'anon', gift: str(d.gift, 60) || 'Gift', count: int(d.count, 1, 9999, 1) }),
  follow:  (d) => ({ user: str(d.user, 40) || 'anon' }),
  share:   (d) => ({ user: str(d.user, 40) || 'anon' }),
  like:    (d) => ({ user: str(d.user, 40) || 'anon', count: int(d.count, 1, 9999, 1) }),
  viewers: (d) => ({ count: int(d.count, 0, 1e9) }),
  goal:    (d) => ({ title: str(d.title, 80), current: int(d.current, 0, 1e9), target: int(d.target, 1, 1e9, 100) }),
  alert:   (d) => ({ title: str(d.title, 80), text: str(d.text, 200) }),
  avatar:  (d) => ({ state: ['idle', 'talking'].includes(d.state) ? d.state : 'idle', emotion: str(d.emotion, 20), mouth: Math.min(1, Math.max(0, Number(d.mouth) || 0)) })
};
const TYPES = Object.keys(SCHEMA);
const STATEFUL = ['viewers', 'goal', 'avatar'];

function createBus(io) {
  const latest = {};
  return {
    types: TYPES,
    state: () => ({ ...latest }),
    publish(type, data = {}, source = 'api') {
      if (!SCHEMA[type]) throw new HttpError(400, `Tipe event tidak dikenal: ${type}. Didukung: ${TYPES.join(', ')}`);
      const ev = { id: crypto.randomBytes(5).toString('hex'), type, data: SCHEMA[type](data && typeof data === 'object' ? data : {}), ts: Date.now(), source };
      if (STATEFUL.includes(type)) latest[type] = ev.data;
      io.emit('overlay:event', ev);
      return ev;
    }
  };
}
module.exports = { createBus, TYPES };
