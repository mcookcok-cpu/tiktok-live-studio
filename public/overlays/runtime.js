/* Runtime overlay TikTok Live Studio. Semua teks dari event dirender dengan textContent (aman dari XSS penonton). */
(function () {
  'use strict';
  var boot = JSON.parse(document.getElementById('ov-boot').textContent);
  var cfg = boot.config;
  var opts = cfg.options || {};
  var root = document.getElementById('ov-root');
  var debug = /[?&]debug=1/.test(location.search);
  var listeners = {};

  function on(type, fn) { (listeners[type] = listeners[type] || []).push(fn); }
  function dispatch(ev) {
    var fns = (listeners[ev.type] || []).concat(listeners['*'] || []);
    for (var i = 0; i < fns.length; i++) { try { fns[i](ev.data, ev); } catch (e) { console.error('[overlay]', e); } }
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  function fadeRemove(node, ms) { setTimeout(function () { node.classList.add('out'); setTimeout(function () { node.remove(); }, 650); }, ms); }

  // ---------- renderer ----------
  function chat(box) {
    box.classList.add('ov-chat');
    box.style.fontSize = num(opts.fontSize, 28) + 'px';
    var max = num(opts.maxMessages, 10), life = num(opts.lifetime, 0) * 1000;
    on('chat', function (d) {
      var m = el('div', 'ov-msg');
      m.appendChild(el('span', 'u', d.user));
      m.appendChild(el('span', 't', d.text));
      box.appendChild(m);
      while (box.children.length > max) box.firstChild.remove();
      if (life > 0) fadeRemove(m, life);
    });
  }
  function gifts(box) {
    box.classList.add('ov-gifts');
    box.style.fontSize = '26px';
    var max = num(opts.max, 4), dur = num(opts.duration, 4000);
    on('gift', function (d) {
      var g = el('div', 'ov-gift', d.gift + ' x' + d.count);
      g.appendChild(el('small', '', 'dari ' + d.user));
      box.appendChild(g);
      while (box.children.length > max) box.firstChild.remove();
      fadeRemove(g, dur);
    });
  }
  function alerts(box) {
    box.classList.add('ov-alerts');
    box.style.fontSize = '30px';
    var dur = num(opts.duration || opts.alertDuration, 5000), queue = [], busy = false;
    function next() {
      var item = queue.shift();
      if (!item) { busy = false; return; }
      busy = true;
      var a = el('div', 'ov-alert');
      a.appendChild(el('b', '', item.title));
      a.appendChild(el('span', '', item.text));
      box.appendChild(a);
      setTimeout(function () { a.classList.add('out'); setTimeout(function () { a.remove(); next(); }, 450); }, dur);
    }
    function push(title, text) { if (queue.length < 20) queue.push({ title: title, text: text }); if (!busy) next(); }
    on('follow', function (d) { push('Follower baru!', d.user + ' mulai mengikuti'); });
    on('share', function (d) { push('Terima kasih!', d.user + ' membagikan live'); });
    on('gift', function (d) { if (cfg.kind === 'alerts') push(d.gift + ' x' + d.count, 'dari ' + d.user); });
    on('alert', function (d) { push(d.title || 'Alert', d.text); });
  }
  function goal(box) {
    box.classList.add('ov-goal');
    var cur = num(opts.current, 0), tgt = Math.max(1, num(opts.target, 100)), title = String(opts.title || 'Goal');
    var row = el('div', 'row'), t = el('span'), c = el('span'), bar = el('div', 'bar'), fill = el('div', 'fill');
    row.appendChild(t); row.appendChild(c); bar.appendChild(fill); box.appendChild(row); box.appendChild(bar);
    function draw() { t.textContent = title; c.textContent = cur + ' / ' + tgt; fill.style.width = Math.min(100, (cur / tgt) * 100) + '%'; }
    on('goal', function (d) { if (d.title) title = d.title; cur = d.current; tgt = Math.max(1, d.target); draw(); });
    draw();
  }
  function viewers(box) {
    box.classList.add('ov-viewers');
    var n = el('span', 'n', '0'), l = el('span', 'l', String(opts.label || 'Penonton'));
    box.appendChild(n); box.appendChild(l);
    on('viewers', function (d) { n.textContent = String(d.count); });
  }
  function avatar(box) {
    // Phase 4: renderer model 2D akan dipasang di #ov-avatar. Saat ini hanya menyimpan state (data-state) agar CSS/JS kustom bisa memakainya.
    box.id = 'ov-avatar';
    box.setAttribute('data-state', 'idle');
    if (debug) box.appendChild(el('div', 'ov-debug', 'avatar overlay: renderer Live2D belum tersedia (Phase 4)'));
    on('avatar', function (d) { box.setAttribute('data-state', d.state); box.setAttribute('data-emotion', d.emotion || ''); box.style.setProperty('--mouth', d.mouth); });
  }
  function sub(cls, fn) { var b = el('div', cls); root.appendChild(b); fn(b); }
  function fill(fn) { var b = el('div', 'ov-fill'); root.appendChild(b); fn(b); }

  switch (cfg.kind) {
    case 'chat': fill(chat); break;
    case 'gift': fill(gifts); break;
    case 'alerts': fill(alerts); break;
    case 'goal': fill(goal); break;
    case 'viewers': fill(viewers); break;
    case 'avatar': fill(avatar); break;
    case 'main':
      sub('ov-main-chat', chat); sub('ov-main-gifts', gifts); sub('ov-main-alerts', alerts); break;
    default: break; // custom: hanya HTML/CSS/JS kustom
  }
  if (debug) root.appendChild(el('div', 'ov-debug', 'overlay/' + cfg.name + ' (' + cfg.kind + ')'));

  // ---------- socket ----------
  var socket = typeof io === 'function' ? io({ transports: ['websocket', 'polling'], reconnectionDelayMax: 5000 }) : null;
  if (socket) {
    socket.on('connect', function () { socket.emit('overlay:join', cfg.name); });
    socket.on('overlay:event', dispatch);
    socket.on('overlay:state', function (st) { Object.keys(st || {}).forEach(function (k) { dispatch({ type: k, data: st[k] }); }); });
    socket.on('overlay:config', function () { location.reload(); });
  }

  // API untuk Custom JS
  window.Overlay = { name: cfg.name, kind: cfg.kind, config: cfg, root: root, on: on, socket: socket };
})();
