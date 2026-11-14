'use strict';
// Upload media sederhana: body mentah (bukan multipart) -> storage/assets. Tanpa dependensi tambahan.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { HttpError } = require('./store');

const EXT = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg'
};
const MAX = 60 * 1024 * 1024;

function kindOf(ext) {
  const m = EXT[ext] || '';
  return m.startsWith('image') ? 'image' : m.startsWith('video') ? 'video' : m.startsWith('audio') ? 'audio' : 'file';
}

function createAssets({ r, wrap, config }) {
  const dir = path.join(config.storageDir, 'assets');
  fs.mkdirSync(dir, { recursive: true });

  const list = () => fs.readdirSync(dir).filter((f) => EXT[path.extname(f).toLowerCase()]).map((f) => {
    const st = fs.statSync(path.join(dir, f));
    return { file: f, url: `/assets/${encodeURIComponent(f)}`, kind: kindOf(path.extname(f).toLowerCase()), size: st.size, createdAt: st.mtimeMs };
  }).sort((a, b) => b.createdAt - a.createdAt);

  r.get('/assets', wrap((req, res) => res.json({ assets: list() })));

  r.post('/assets', express.raw({ type: () => true, limit: MAX }), wrap((req, res) => {
    const raw = String(req.query.name || 'file').split(/[\\/]/).pop();
    const ext = path.extname(raw).toLowerCase();
    if (!EXT[ext]) throw new HttpError(415, `Tipe file tidak didukung (${ext || 'tanpa ekstensi'}). Didukung: ${Object.keys(EXT).join(' ')}`);
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) throw new HttpError(400, 'Body file kosong');
    const base = path.basename(raw, ext).replace(/[^\w.-]+/g, '_').slice(0, 60) || 'file';
    const file = `${crypto.randomBytes(4).toString('hex')}-${base}${ext}`;
    fs.writeFileSync(path.join(dir, file), req.body);
    res.status(201).json({ asset: { file, url: `/assets/${encodeURIComponent(file)}`, kind: kindOf(ext), size: req.body.length } });
  }));

  r.delete('/assets/:file', wrap((req, res) => {
    const f = path.basename(req.params.file);
    const full = path.join(dir, f);
    if (!EXT[path.extname(f).toLowerCase()] || !fs.existsSync(full)) throw new HttpError(404, 'Asset tidak ditemukan');
    fs.unlinkSync(full);
    res.json({ ok: true });
  }));
}

module.exports = { createAssets };
