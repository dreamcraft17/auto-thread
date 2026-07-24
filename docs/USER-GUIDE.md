# Threads Automation — Cara Pakai (User Guide)

**UpdatedAt:** 25 Juli 2026 · v2.0  
**Untuk:** content creator / social media manager  
**Cara kerja sistem:** [HOW-IT-WORKS.md](./HOW-IT-WORKS.md)

---

## Sebelum mulai

1. Minta admin/ops menyiapkan app (lihat [DEPLOY.md](./DEPLOY.md) jika self-host).
2. Pastikan kamu tahu apakah mode saat ini **dry-run** atau **live**:
   - Banner merah di atas = **LIVE MODE AKTIF** (post benar-benar ke Threads).
   - Tanpa banner = aman untuk latihan (simulasi / dry-run).
3. Siapkan akun Threads yang boleh dipakai tool ini.

---

## 1. Login

1. Buka URL app (dev: `http://localhost:5173`).
2. Masukkan **username & password Threads**.
3. Setelah sukses, kamu masuk ke **Dashboard**.

Gagal berulang (5×) → akun terkunci sementara ~15 menit.

---

## 2. Dashboard — apa yang terlihat

| Area | Kegunaan |
|------|----------|
| Stats | Jumlah post, scheduled, failed, dll. |
| Scheduled | Antrian yang belum tayang |
| Published | Yang sudah sukses (termasuk dry-run sukses) |
| Failed | Yang gagal — bisa **Retry** |
| Lonceng | Notifikasi in-app |
| Settings | Preferensi + **Live publish** |

---

## 3. Jadwalkan satu post

1. Klik **Schedule** / tambah post.
2. Isi **caption** (1–500 karakter).
3. Pilih **tanggal & waktu** (harus di masa depan) + timezone.
4. Opsional **Attach Media**:
   - PNG, JPEG, GIF, atau WebP
   - Maks **4** file, masing-masing **≤ 5 MB**
   - Thumbnail muncul; hapus per gambar jika salah
5. **Preview** untuk cek tampilan.
6. **Schedule** — post masuk daftar *scheduled*.

### Edit / batalkan

- Hanya status **scheduled** yang bisa diedit.
- Batalkan dari kartu post (ikon hapus) sebelum waktu tayang.
- Post **published** tidak bisa dihapus dari app.

---

## 4. Bulk import CSV

1. Siapkan file CSV:

```csv
caption,date,time,timezone
"Good morning! #threads",2026-07-26,09:00,Asia/Jakarta
"Tips konten kedua",2026-07-26,18:00,Asia/Jakarta
```

2. Di dashboard → **Import** → pilih file.
3. Cek ringkasan sukses / gagal. Contoh file: `sample-posts.csv` di root `auto/`.

**Catatan:** CSV v2.0 = teks + jadwal saja. Gambar tetap dilampirkan lewat form schedule (per post).

---

## 5. Pantau hasil publish

Setiap post punya ikon **History**:

| Kolom | Arti |
|-------|------|
| Time | Kapan attempt |
| Mode | `dry-run` atau `live` |
| Status | `pending` / `success` / `fail` |
| URL / Error | Link Threads (jika ada) atau pesan error (sudah disanitasi) |

**Export CSV** dari dialog history untuk laporan.

### Kalau gagal

1. Baca pesan error di kartu / history.
2. Klik **Retry** pada post failed.
3. Sistem juga auto-retry hingga 3× untuk error jaringan / auth / rate-limit.

---

## 6. Settings

### Preferensi notifikasi

- Email saat sukses / gagal (butuh SendGrid di server).
- Daily summary (opsional) + jam kirim.

### Live publish (hati-hati)

1. Toggle **Live publish**.
2. Baca modal peringatan — konten akan ke Threads **nyata**.
3. Hanya klik **OK** jika sudah cek runbook & kredensial.
4. Pastikan banner merah muncul.
5. Matikan toggle kapan saja untuk kembali ke mode aman.

Detail ops: [RUNBOOK.md](./RUNBOOK.md).

---

## 7. Alur kerja yang disarankan

### Latihan / staging

1. Live toggle **OFF**, env dry-run biasanya **ON**.
2. Schedule 1 post teks → tunggu / pastikan jadi *published* + history `dry-run`.
3. Schedule 1 post + 1 gambar → cek thumbnail & history.

### Produksi

1. Ops: `PLAYWRIGHT_DRY_RUN=false`, secrets diganti, Chromium terpasang.
2. User: uji dry-run dulu (toggle masih OFF).
3. Baru nyalakan **Live** untuk slot penting.
4. Setelah batch selesai, matikan Live lagi jika tidak perlu terus-menerus.

---

## 8. Troubleshooting cepat

| Gejala | Coba |
|--------|------|
| Login gagal | Cek password Threads; tunggu jika lockout; pastikan jaringan |
| Post stuck scheduled | Refresh; cek Redis/API hidup (hubungi ops) |
| Media ditolak | Format/ukuran salah — pakai PNG/JPEG/GIF/WebP &lt; 5MB |
| Published tapi tidak ada di Threads | Masih **dry-run** — cek history `mode` & banner live |
| Live ON tapi tetap simulasi | Env `PLAYWRIGHT_DRY_RUN=true` memaksa dry-run — minta ops matikan |
| Attach gagal, caption saja yang tayang | Normal fallback; cek file masih ada di storage |

---

## 9. Yang tidak didukung (sengaja)

- Multi-akun Threads dalam satu login tool  
- Video / carousel di luar 4 gambar  
- Template jadwal / AI caption  
- Official Meta Ads / Insights API  

---

## 10. AI Caption (v3.0)

1. Dashboard → **Generate Caption**.
2. Isi topic (+ tone/length) → Generate.
3. Review badge **Generated**, cek warning validasi.
4. **Use Caption** (isi form schedule) atau **Approve & Schedule** (pakai best time).
5. **Batch Generate** untuk plan mingguan (max 10 baris).
6. Settings → Brand Guidelines / AI Usage & Cost.

Default lokal tanpa API key: provider **mock**. Produksi: set `LLM_PROVIDER` + key. Detail: [AI-CONTENT.md](./AI-CONTENT.md).

---

## Cheat sheet

| Mau… | Lakukan… |
|------|----------|
| Post 1 kali besok | Schedule form → waktu → Schedule |
| Plan seminggu | Import CSV |
| Pakai gambar | Attach Media di form (max 4) |
| Cek apakah benar ke Threads | History → kolom **mode** = `live` + banner merah |
| Stop post nyata | Settings → matikan Live |
| Laporan attempt | History → Export CSV |
