'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../server');

let ctx, base, dir;
test.before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tls-'));
  ctx = createApp({ storageDir: dir, port: 0 });
  await new Promise((r) => ctx.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${ctx.server.address().port}`;
});
test.after(() => { ctx.stop(); ctx.io.close(); ctx.server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

const j = async (method, url, body) => {
  const res = await fetch(base + url, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => null) };
};

test('GET /api/status memisahkan status preview/tiktok/stream/aiHost', async () => {
  const { status, data } = await j('GET', '/api/status');
  assert.equal(status, 200);
  assert.equal(data.tiktok.state, 'disconnected');
  assert.equal(data.stream.state, 'offline');
  assert.equal(data.aiHost.state, 'unavailable');
  assert.ok(data.system.ramTotalMB > 0);
});

test('scene: create, rename, duplicate, delete, minimal 1 scene', async () => {
  let r = await j('GET', '/api/scenes');
  assert.equal(r.data.scenes.length, 1);
  r = await j('POST', '/api/scenes', { name: 'Gaming' });
  assert.equal(r.status, 201);
  const id = r.data.scene.id;
  r = await j('PUT', `/api/scenes/${id}`, { name: 'Gaming 2' });
  assert.equal(r.data.scenes.find((s) => s.id === id).name, 'Gaming 2');
  r = await j('POST', `/api/scenes/${id}/duplicate`);
  assert.equal(r.data.scenes.length, 3);
  const dup = r.data.scene.id;
  r = await j('DELETE', `/api/scenes/${dup}`);
  assert.equal(r.data.scenes.length, 2);
  r = await j('DELETE', `/api/scenes/${id}`);
  assert.equal(r.data.scenes.length, 1);
  r = await j('DELETE', `/api/scenes/${r.data.scenes[0].id}`);
  assert.equal(r.status, 400);
});

test('source: add, update (clamp), duplicate, reorder, delete', async () => {
  const sceneId = (await j('GET', '/api/scenes')).data.activeSceneId;
  let r = await j('POST', '/api/sources', { type: 'text', name: 'Halo' });
  assert.equal(r.status, 201);
  const id = r.data.source.id;
  r = await j('PUT', `/api/sources/${id}`, { x: 10, opacity: 5, rotation: 45, visible: false, blend: 'screen' });
  assert.equal(r.data.source.opacity, 1);
  assert.equal(r.data.source.rotation, 45);
  assert.equal(r.data.source.visible, false);
  assert.equal(r.data.source.blend, 'screen');
  r = await j('POST', `/api/sources/${id}/duplicate`);
  assert.equal(r.data.source.name, 'Halo copy');
  r = await j('POST', `/api/sources/${id}/reorder`, { index: 0 });
  r = await j('GET', `/api/sources?sceneId=${sceneId}`);
  assert.equal(r.data.sources[0].id, id);
  r = await j('POST', '/api/sources', { type: 'bukan-tipe' });
  assert.equal(r.status, 400);
  r = await j('DELETE', `/api/sources/${id}`);
  assert.equal(r.status, 200);
  r = await j('DELETE', `/api/sources/${id}`);
  assert.equal(r.status, 404);
});

test('scene export + import membuat id baru', async () => {
  const st = (await j('GET', '/api/scenes')).data;
  const exp = await j('GET', `/api/scenes/${st.activeSceneId}/export`);
  assert.equal(exp.data.format, 'tiktok-live-studio.scene');
  const imp = await j('POST', '/api/scenes/import', exp.data);
  assert.equal(imp.status, 201);
  assert.notEqual(imp.data.scene.id, st.activeSceneId);
  const bad = await j('POST', '/api/scenes/import', { foo: 1 });
  assert.equal(bad.status, 400);
});

test('persistensi: state tersimpan di disk', async () => {
  await j('POST', '/api/scenes/save');
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'scenes', 'state.json'), 'utf8'));
  assert.ok(saved.scenes.length >= 1);
});

test('endpoint fase berikutnya jujur 501', async () => {
  for (const [m, u] of [['POST', '/api/tiktok/connect'], ['POST', '/api/avatars/import'], ['POST', '/api/stream/start']]) {
    const r = await j(m, u);
    assert.equal(r.status, 501, u);
    assert.equal(r.data.error, 'not_implemented');
  }
  assert.equal((await j('GET', '/api/avatars')).status, 200);
  assert.equal((await j('GET', '/api/overlays')).data.overlays.length, 8);
});

test('overlay route transparan & JSON rusak ditolak 400', async () => {
  const html = await (await fetch(base + '/overlay/main')).text();
  assert.match(html, /background:transparent/);
  const bad = await fetch(base + '/api/scenes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
  assert.equal(bad.status, 400);
});

test('assets: upload, list, serve dengan header aman, tolak tipe tak dikenal, delete', async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
  let res = await fetch(base + '/api/assets?name=../../kecil gambar.png', { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: png });
  assert.equal(res.status, 201);
  const { asset } = await res.json();
  assert.equal(asset.kind, 'image');
  assert.ok(!asset.file.includes('..') && !asset.file.includes('/'));
  const got = await fetch(base + asset.url);
  assert.equal(got.status, 200);
  assert.equal(got.headers.get('x-content-type-options'), 'nosniff');
  assert.match(got.headers.get('content-security-policy'), /sandbox/);
  assert.equal((await j('GET', '/api/assets')).data.assets.length, 1);
  res = await fetch(base + '/api/assets?name=virus.exe', { method: 'POST', body: Buffer.from('x') });
  assert.equal(res.status, 415);
  assert.equal((await j('DELETE', `/api/assets/${asset.file}`)).status, 200);
  assert.equal((await j('DELETE', `/api/assets/${asset.file}`)).status, 404);
});

test('restore sources (undo/redo) menjaga id & validasi tipe', async () => {
  const st = (await j('GET', '/api/scenes')).data;
  const sc = st.scenes.find((s) => s.id === st.activeSceneId);
  const snap = JSON.parse(JSON.stringify(sc.sources));
  const added = (await j('POST', '/api/sources', { type: 'image' })).data.source;
  let r = await j('PUT', `/api/scenes/${sc.id}/sources`, { sources: snap });
  assert.equal(r.status, 200);
  const now = r.data.scenes.find((s) => s.id === sc.id).sources;
  assert.deepEqual(now.map((x) => x.id), snap.map((x) => x.id));
  assert.ok(!now.find((x) => x.id === added.id));
  r = await j('PUT', `/api/scenes/${sc.id}/sources`, { sources: [{ type: 'nope' }] });
  assert.equal(r.status, 400);
  r = await j('PUT', `/api/scenes/${sc.id}/sources`, { sources: 'x' });
  assert.equal(r.status, 400);
});

test('backup: state.json.bak dibuat & dipakai bila file utama rusak', async () => {
  await j('POST', '/api/scenes/save');
  await j('POST', '/api/scenes/save');
  const f = path.join(dir, 'scenes', 'state.json');
  assert.ok(fs.existsSync(f + '.bak'));
  const { createStore } = require('../api/store');
  fs.writeFileSync(f, '{rusak');
  const s2 = createStore(dir);
  assert.ok(s2.snapshot().scenes.length >= 1);
});

// ---------------- Phase 3: overlay ----------------
test('overlay: daftar bawaan, update, validasi, reset, buat/hapus custom', async () => {
  let r = await j('GET', '/api/overlays');
  assert.equal(r.data.overlays.length, 8);
  assert.ok(r.data.eventTypes.includes('chat'));
  r = await j('PUT', '/api/overlays/chat', { width: 700, height: 99999, options: { maxMessages: 5, evil: { a: 1 } }, customCss: '.x{color:red}' });
  assert.equal(r.status, 200);
  assert.equal(r.data.overlay.width, 700);
  assert.equal(r.data.overlay.height, 8000);           // di-clamp
  assert.equal(r.data.overlay.options.maxMessages, 5);
  assert.equal(r.data.overlay.options.evil, undefined); // objek ditolak
  assert.equal((await j('PUT', '/api/overlays/chat', { customJs: 123 })).status, 400);
  assert.equal((await j('PUT', '/api/overlays/chat', { customCss: 'x'.repeat(100001) })).status, 400);
  assert.equal((await j('POST', '/api/overlays/chat/reset')).data.overlay.customCss, '');
  assert.equal((await j('DELETE', '/api/overlays/chat')).status, 400);          // bawaan tidak bisa dihapus
  assert.equal((await j('POST', '/api/overlays', { name: 'Bad Name!' })).status, 400);
  assert.equal((await j('POST', '/api/overlays', { name: 'promo', title: 'Promo' })).status, 201);
  assert.equal((await j('POST', '/api/overlays', { name: 'promo' })).status, 409);
  assert.equal((await j('POST', '/api/overlays/promo/reset')).status, 400);
  assert.equal((await j('DELETE', '/api/overlays/promo')).status, 200);
  assert.equal((await j('GET', '/api/overlays/promo')).status, 404);
});

test('overlay: event dibersihkan & divalidasi', async () => {
  let r = await j('POST', '/api/overlays/events', { type: 'chat', data: { user: 'bob\u0000<img src=x>', text: 'x'.repeat(1000) }, source: 'test' });
  assert.equal(r.status, 202);
  assert.equal(r.data.event.data.text.length, 300);
  assert.ok(!r.data.event.data.user.includes('\u0000'));
  assert.equal(r.data.event.source, 'test');
  assert.equal((await j('POST', '/api/overlays/events', { type: 'hack', data: {} })).status, 400);
  await j('POST', '/api/overlays/events', { type: 'viewers', data: { count: 1234 } });
  assert.equal((await j('GET', '/api/overlays/state')).data.viewers.count, 1234);
  r = await j('POST', '/api/overlays/events', { type: 'gift', data: { count: -5 } });
  assert.equal(r.data.event.data.count, 1);
});

test('overlay: halaman transparan, kode kustom di-escape, tanpa UI dashboard', async () => {
  await j('PUT', '/api/overlays/custom', { customCss: 'body{color:red}</style><b id="pwn">x</b></STYLE >', customHtml: '<div id="halo">Hai</div>', customJs: 'window.__x=1;</script><b>x' });
  const html = await (await fetch(base + '/overlay/custom')).text();
  assert.match(html, /background:transparent/);
  assert.match(html, /id="halo"/);
  assert.equal((html.match(/<\/style/gi) || []).length, 2, 'penutup <style> hanya milik server (CSS dasar + CSS kustom)');
  assert.equal((html.match(/<\/script/gi) || []).length, 4, 'boot, socket.io, runtime, custom saja');
  assert.ok(!html.includes('id="root"') && !html.includes('/assets/index-'), 'tidak boleh memuat dashboard');
  assert.equal((await fetch(base + '/overlay/tidak-ada')).status, 404);
  assert.equal((await fetch(base + '/overlay/..%2Fetc')).status, 404);
  assert.equal(fs.existsSync(path.join(__dirname, '..', '..', 'public', 'overlays', 'runtime.js')), true);
  const js = await fetch(base + '/overlay-assets/runtime.js');
  assert.equal(js.status, 200);
  await j('POST', '/api/overlays/custom/reset');
});
