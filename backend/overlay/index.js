'use strict';
// Halaman overlay (Browser Source). Tidak memuat UI dashboard sama sekali; background transparan.
const esc = (s, tag) => String(s || '').replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`);

function renderPage(cfg) {
  const boot = JSON.stringify({ config: { name: cfg.name, kind: cfg.kind, title: cfg.title, width: cfg.width, height: cfg.height, options: cfg.options } }).replace(/</g, '\\u003c');
  const js = cfg.customJs
    ? `<script>(function(){try{\n${esc(cfg.customJs, 'script')}\n}catch(e){console.error('[overlay custom js]',e)}})();</script>`
    : '';
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>overlay/${cfg.name}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;padding:0;width:100%;height:100%;background:transparent!important;overflow:hidden}</style>
<link rel="stylesheet" href="/overlay-assets/runtime.css">
<style id="ov-custom-css">${esc(cfg.customCss, 'style')}</style>
</head><body>
<div id="ov-root"></div>
<div id="ov-custom">${cfg.customHtml || ''}</div>
<script id="ov-boot" type="application/json">${boot}</script>
<script src="/socket.io/socket.io.js"></script>
<script src="/overlay-assets/runtime.js"></script>
${js}
</body></html>`;
}

function overlayRouter(express, { overlays }) {
  const r = express.Router();
  r.get('/:name', (req, res) => {
    const name = String(req.params.name);
    if (!/^[a-z0-9][a-z0-9_-]{0,30}$/.test(name) || !overlays.has(name)) return res.status(404).type('text/plain').send('Overlay tidak ditemukan');
    res.setHeader('Cache-Control', 'no-store');
    res.type('html').send(renderPage(overlays.get(name)));
  });
  return r;
}
module.exports = { overlayRouter, renderPage };
