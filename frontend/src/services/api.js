import { io } from 'socket.io-client';

async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch (_) { /* kosong */ }
  if (!res.ok) {
    const err = new Error((data && data.message) || `HTTP ${res.status}`);
    err.status = res.status; err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (u) => req('GET', u),
  post: (u, b = {}) => req('POST', u, b),
  put: (u, b = {}) => req('PUT', u, b),
  del: (u) => req('DELETE', u)
};

export async function uploadAsset(file) {
  const res = await fetch(`/api/assets?name=${encodeURIComponent(file.name)}`, { method: 'POST', headers: { 'content-type': 'application/octet-stream' }, body: file });
  let data = null;
  try { data = await res.json(); } catch (_) { /* kosong */ }
  if (!res.ok) throw new Error((data && data.message) || `Upload gagal (HTTP ${res.status})`);
  return data.asset;
}

// Ukuran asli media (untuk menentukan ukuran source saat drop/upload)
export function mediaSize(url, kind) {
  return new Promise((resolve) => {
    const done = (w, h) => resolve(w && h ? { w, h } : null);
    if (kind === 'video') {
      const v = document.createElement('video');
      v.preload = 'metadata'; v.onloadedmetadata = () => done(v.videoWidth, v.videoHeight); v.onerror = () => done(0, 0); v.src = url;
    } else {
      const i = new window.Image();
      i.onload = () => done(i.naturalWidth, i.naturalHeight); i.onerror = () => done(0, 0); i.src = url;
    }
    setTimeout(() => done(0, 0), 4000);
  });
}

export const socket = io({ transports: ['websocket', 'polling'], reconnectionDelayMax: 5000 });
