# API (Phase 1)
Base: `http://HOST:9003/api`. Error selalu JSON `{error, message}`. Real-time: Socket.IO event `state:update` (scene+source) dan `status` (tiap 2 dtk saat ada klien).

| Method | Path | Fungsi |
|---|---|---|
| GET | /status | Status terpisah: preview, tiktok, stream, aiHost, system |
| GET | /meta | Tipe source + blend mode |
| GET | /scenes | `{activeSceneId, scenes[]}` |
| POST | /scenes | Buat scene `{name?, canvas?}` |
| PUT | /scenes/:id | Rename / ubah canvas `{name?, canvas:{width,height}?}` |
| DELETE | /scenes/:id | Hapus (min. 1 scene) |
| POST | /scenes/:id/duplicate | Duplikat |
| POST | /scenes/:id/activate | Jadikan aktif |
| POST | /scenes/save | Paksa tulis ke disk |
| GET | /scenes/:id/export | Unduh JSON scene |
| POST | /scenes/import | Impor JSON scene (id baru) |
| PUT | /scenes/:id/sources | Ganti seluruh daftar source `{sources[]}` (dipakai undo/redo, divalidasi ulang) |
| GET | /assets | Daftar file upload |
| POST | /assets?name=foto.png | Upload (body mentah, maks 60 MB; png jpg gif webp svg mp4 webm mp3 wav ogg) -> `{asset:{url,kind,size}}`; 415 bila tipe tak didukung |
| DELETE | /assets/:file | Hapus file upload |
| GET | /sources?sceneId= | Daftar source |
| POST | /sources | Tambah `{sceneId?, type, ...}` |
| PUT | /sources/:id | Ubah x,y,width,height,rotation,opacity,blend,visible,locked,name,props |
| DELETE | /sources/:id | Hapus |
| POST | /sources/:id/duplicate | Duplikat |
| POST | /sources/:id/reorder | `{index}` urutan layer (z-index) |
| GET | /overlays | Daftar overlay + tipe event yang didukung |
| GET | /overlays/:name | Konfigurasi lengkap (termasuk kode kustom) |
| PUT | /overlays/:name | `{title?,width?,height?,options?,customCss?,customHtml?,customJs?}` (kode maks 100k karakter); overlay yang sedang terbuka reload otomatis |
| POST | /overlays | Buat overlay kustom `{name,title?}` (nama `[a-z0-9_-]`, maks 31) |
| POST | /overlays/:name/reset | Kembalikan overlay bawaan ke default |
| DELETE | /overlays/:name | Hapus overlay kustom (bawaan: 400) |
| POST | /overlays/events | Publikasi event `{type,data,source?}` -> Socket.IO `overlay:event` (202) |
| GET | /overlays/state | State terakhir viewers/goal/avatar |
| GET | /avatars, /tiktok/status | Daftar kosong / status disconnected |
| POST | /avatars/import, /tiktok/connect, /stream/start | **501** `not_implemented` + fase terjadwal |

Halaman overlay (bukan API): `GET /overlay/:name`. Aset runtime: `/overlay-assets/runtime.js|css`.

Data event: chat `{user,text}`, gift `{user,gift,count}`, follow/share `{user}`, like `{user,count}`, viewers `{count}`, goal `{title,current,target}`, alert `{title,text}`, avatar `{state:'idle'|'talking',emotion,mouth:0..1}`.

Tipe source: image, video, browser, text, webcam, audio, screen, avatar, chat, gift, alert.
