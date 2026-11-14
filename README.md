# TikTok Live Studio 2D

Dashboard streaming web ala OBS Studio untuk TikTok Live. Status: **Phase 1-3 selesai** (lihat tabel fase).

## Deploy
```bash
npm install          # backend + (postinstall) frontend
npm run build        # build frontend -> frontend/dist
pm2 start ecosystem.config.js
pm2 save
```
Akses: `http://SERVER-IP:9003` (port 9003, host 0.0.0.0). Log: `logs/out.log`, `logs/error.log`.

Dev: `npm run dev:backend` + `npm run dev:frontend` (proxy ke :9003). Test: `npm test`.

## Struktur
`backend/` (api, websocket, overlay, tiktok, avatar, streaming) · `frontend/src/` (dashboard, scenes, sources, avatars, overlays, mixer, services) · `storage/` (state scene JSON) · `public/overlays/` · `docs/API.md`

## Status fase
| Fase | Isi | Status |
|---|---|---|
| 1 | Dashboard UI, layout, preview canvas, scenes, sources | Selesai |
| 2 | Source manager lanjutan, transform, persistensi scene | Selesai (upload media, drop file, undo/redo, align/fit/reset, backup state) |
| 3 | Overlay engine / Browser Source | Selesai |
| 4 | Avatar 2D / Live2D | Belum |
| 5 | TikTok Live + event | Belum (endpoint 501) |
| 6 | AI Host WebSocket | Belum (status "unavailable") |
| 7 | Audio mixer + streaming engine | Belum (endpoint 501) |
| 8 | Optimasi, test, deploy final | Berjalan bertahap |

## Catatan jujur
- Status **preview / TikTok / stream / AI Host dipisah**; stream tidak pernah ditampilkan "live" tanpa encoder + ingest valid.
- Webcam & Screen Capture butuh HTTPS atau `localhost` (aturan browser).
- Source Browser memakai iframe; situs yang memblokir framing tidak akan tampil.

## Fitur Phase 2
- Upload gambar/video/audio (maks 60 MB) lewat Properties atau drag-and-drop file ke preview; disimpan di `storage/assets/`, disajikan di `/assets/*` dengan header `nosniff` + CSP sandbox.
- Undo/redo (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y), 50 langkah per scene aktif; riwayat direset saat ganti scene.
- Align ke canvas, Fit, Reset rotasi/skala.
- `state.json.bak` dibuat tiap simpan; dipakai otomatis bila file utama rusak.

## Fitur Phase 3 (Overlay / Browser Source)
- 8 overlay bawaan: `/overlay/main|chat|gift|alerts|avatar|goal|viewers|custom` + overlay kustom buatan sendiri (menu Overlays -> nama baru).
- Halaman overlay **tidak memuat UI dashboard**, background transparan, layout responsif (mengisi ukuran Browser Source berapa pun). Tambah `?debug=1` untuk label debug.
- Real-time lewat Socket.IO; mengubah konfigurasi/kode kustom membuat halaman overlay reload otomatis. State terakhir `viewers`, `goal`, `avatar` dikirim ke overlay yang baru dibuka.
- Custom CSS / HTML / JavaScript per overlay. API JS: `Overlay.on(tipe, fn)`, `Overlay.config`, `Overlay.root`, `Overlay.socket`.
- Menu Overlays: pengaturan resolusi & opsi, copy URL, preview (kotak-kotak = transparan), dan tombol **event uji**.
- Di OBS: Sources -> Browser -> tempel URL (mis. `http://SERVER-IP:9003/overlay/chat`), isi lebar/tinggi sesuai pengaturan.
- Source Chat/Gift/Alert di Studio menampilkan overlay-nya secara live; source Browser punya pemilih overlay.
- **Event bus**: `POST /api/overlays/events {type,data}` (chat, gift, follow, share, like, viewers, goal, alert, avatar). Adapter TikTok (Phase 5) dan AI Host (Phase 6) akan memakai bus yang sama. Saat ini satu-satunya sumber event adalah API/tombol uji; **belum ada data TikTok sungguhan**.

## Catatan keamanan
- Teks dari event dirender dengan `textContent` (pesan penonton tidak bisa menyuntik HTML/JS) dan dibersihkan di server (panjang & karakter kontrol).
- Custom JS/HTML berjalan di halaman overlay pada origin yang sama dengan dashboard. Dashboard + API **belum memakai autentikasi** (dijadwalkan Phase 8): jalankan hanya di jaringan tepercaya (LAN/Tailscale), jangan buka port 9003 ke internet publik.

## Mobile & layar sentuh
- Layar < 768 px: sidebar menjadi **drawer** (tombol hamburger di kiri atas), top bar diringkas menjadi 4 titik status (Stream, Backend, TikTok, AI Host), dan Studio memakai preview di atas dengan **panel bertab** (Scene, Source, Properti, Stream, Log, Mixer) di bawah yang bisa diciutkan.
- Desktop: tombol hamburger melipat sidebar menjadi ikon saja (tersimpan di browser).
- Layar sentuh: tombol dan handle transform lebih besar (untuk source kecil hanya handle sudut yang tampil agar bagian tengah tetap bisa di-drag). Halaman Overlays menumpuk vertikal.
- Webcam/Screen Capture tetap butuh HTTPS atau localhost walau dibuka dari ponsel.
