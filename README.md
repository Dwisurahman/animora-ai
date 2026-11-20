# Animora AI Studio — MVP 1

React + Vite + Cloudflare Pages Functions + real fal.ai WAN 2.6 video generation (queued API).

## Fitur
- Prompt → video (5, 10, 15 detik)
- Foto/gambar → video (JPG/PNG/WEBP hingga 3 MB; converted to base64 Data URI)
- Format 9:16/16:9/1:1 untuk text-to-video; image mode mengikuti gambar/model
- 720p / 1080p
- Audio latar opsional via URL publik HTTPS, **bukan lipsync/voiceover AI**
- Queue status dan hasil MP4, riwayat lokal (20 item terakhir)
- API key rahasia di server, tidak diekspos dalam frontend

## Penting
**Ini aplikasi asli dengan integrasi API, bukan generator demo.** Namun untuk menghasilkan video sungguhan kamu perlu FAL_KEY aktif, saldo fal.ai, serta proses deploy. Belum ada pengujian end-to-end provider yang memerlukan API key/saldo. Harga generasi mengikuti penyedia model. Model dapat berubah skema atau ketersediaan.

WAN 2.6 resmi mendukung durasi 5/10/15 detik per klip. Ini bukan generator video 5 menit utuh. Multi-scene, lip sync, TTS, dan video composer adalah fase selanjutnya.

## Local development
```bash
npm install
npm run build
npx wrangler pages dev dist
```
Dev lokal dengan Pages Functions dan secret: buat `.dev.vars` (JANGAN commit):
```
FAL_KEY=masukkan-fal-api-key
APP_ACCESS_TOKEN=pilih-token-pribadi
```
Kemudian jalankan `npx wrangler pages dev dist` (atau `npm run pages:dev`). `npm run dev` hanya menampilkan frontend Vite, **tanpa API**.

## Deploy ke Cloudflare Pages
1. Buat akun dan API key di https://fal.ai/ (memerlukan saldo untuk generate).
2. Hubungkan repository ini sebagai Cloudflare Pages Git project (framework Vite, build command `npm run build`, output directory `dist`) agar folder `functions` otomatis dideploy. Alternatif: `npm run deploy` dengan Wrangler; pastikan platform mendukung deploy Pages Functions bersama assets.
3. Pada Cloudflare Pages project → Settings → Variables and Secrets, tambahkan **secret** `FAL_KEY`.
4. Sangat disarankan tambahkan **secret** `APP_ACCESS_TOKEN` untuk mencegah orang lain memakai saldo AI-mu tanpa izin (masukkan token di Advanced UI).
5. Redeploy agar konfigurasi baru aktif.
6. Generate video 5 detik dahulu untuk menguji saldonya.

### Security dan batasan
- **Jangan publikasi tanpa APP_ACCESS_TOKEN** (proyek ini tidak memiliki akun login/kuota/admin). Token merupakan shared secret sederhana untuk percobaan pribadi, bukan otentikasi publik yang kuat.
- Status job diketahui oleh siapa pun dengan ID job jika token tidak disetel. Jangan gunakan untuk konten privat/sensitif.
- Gambar dikirim melalui worker sebagai base64; file maksimal 3 MB, bukan solusi upload ukuran besar.
- Audio opsional harus berupa HTTPS yang diakses publik (WAV/MP3). Gunakan audio yang kamu punya izin pakai.
- Hasil disimpan di penyedia video dengan masa berlaku menurut ketentuan mereka; unduh MP4 segera. Riwayat lokal hanya di browser, tidak ada database.
- Tidak melakukan moderation khusus buatan sendiri; keamanan konten mengikuti provider. Jangan unggah gambar orang tanpa izin.

## Sumber API resmi
- https://fal.ai/models/wan/v2.6/text-to-video/api
- https://fal.ai/models/wan/v2.6/image-to-video/api
- https://fal.ai/docs/api-reference/inference-api/queue/submit-path
- https://fal.ai/docs/api-reference/inference-api/queue/status
- https://fal.ai/docs/api-reference/inference-api/queue/result
