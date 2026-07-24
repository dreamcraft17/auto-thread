# Threads Automation — Cara Kerja

**UpdatedAt:** 25 Juli 2026 · v3.0  
**Untuk:** engineer / ops yang perlu paham alur sistem  
**Cara pakai UI:** [USER-GUIDE.md](./USER-GUIDE.md) · **AI:** [AI-CONTENT.md](./AI-CONTENT.md) · **Deploy:** [DEPLOY.md](./DEPLOY.md)

---

## Ringkas satu kalimat

User **tulis (atau AI generate)** caption → **jadwalkan** post (teks ± gambar) → sistem **antrikan** → saat waktunya tiba, worker **buka Threads via Playwright** → status jadi **published / failed** (+ history tiap attempt).

---

## Komponen

```
┌─────────────┐     JWT      ┌──────────────────────┐      ┌──────────────┐
│  Frontend   │ ──────────►  │   API (Express)      │ ───► │ LLM provider │
│  React/Vite │              │ /v1 + /ai + /media   │      │ claude|codex │
└─────────────┘              └──────────┬───────────┘      │ openrouter   │
                                        │                  │ mock         │
                    ┌───────────────────┼──────────────┐   └──────────────┘
                    ▼                   ▼              ▼
              PostgreSQL             Redis           Disk
              posts, users,          Bull queue      data/uploads
              settings, history,     jobs
              captions, heatmap
                                        │
                                        ▼
                                Worker (sama proses Node)
                                cron 1 menit + Bull
                                        │
                                        ▼
                                Playwright → threads.net
                                (atau dry-run simulasi)
```

| Bagian | Peran |
|--------|--------|
| Frontend | Login, dashboard, schedule form, AI modal, settings, history |
| API | Auth JWT, CRUD posts, upload media, settings, AI generation, history |
| LLM provider | Generate caption (configurable via `LLM_PROVIDER`) |
| PostgreSQL | Sumber kebenaran post + settings + history + caption/heatmap |
| Redis + Bull | Antrian job publish + retry delay |
| Cron | Setiap menit scan post `scheduled` yang sudah due; harian untuk maintenance/heatmap |
| Playwright | Browser automation login/post ke Threads |
| Upload dir | File gambar lokal, dilayani di `/media/{file}` |

**Tidak pakai Docker.** Postgres + Redis + Node jalan di host (lihat DEPLOY).

---

## Alur utama: dari schedule ke publish

```mermaid
sequenceDiagram
  participant U as User
  participant API as API
  participant DB as Postgres
  participant Q as Redis/Bull
  participant W as Worker
  participant T as Threads

  U->>API: Schedule post (+ media URLs)
  API->>DB: INSERT status=scheduled
  API->>Q: enqueue (delay sampai scheduled_time)

  Note over W: Cron juga scan due posts tiap menit
  Q->>W: job publish
  W->>DB: cek live_publish_enabled
  alt dry-run
    W->>W: simulasi sukses
  else live
    W->>T: Playwright login/compose/post
  end
  W->>DB: status published/failed + publish_history
```

### Langkah detail

1. **Create** — caption, waktu, optional `mediaUrls` (hasil upload). Status: `scheduled`.
2. **Enqueue** — job Bull dijadwalkan mendekati `scheduled_time`.
3. **Due scan** — cron `* * * * *` mengambil post due (backup jika job hilang).
4. **Resolve mode** — `dryRun = PLAYWRIGHT_DRY_RUN || !live_publish_enabled`.
5. **History pending** — insert `publish_history` sebelum attempt.
6. **Publish** — Playwright (atau simulasi): caption + attach media bila ada.
7. **Hasil**
   - Sukses → `published`, history `success`, notifikasi
   - Gagal transient → retry (max 3: ~1m / 5m / 15m)
   - Gagal permanen → `failed`, history `fail`, alert Slack (jika di-set)

---

## Status post

| Status | Arti |
|--------|------|
| `scheduled` | Menunggu waktu publish; bisa diedit / dibatalkan |
| `published` | Sudah “terpublish” (nyata atau dry-run sukses) |
| `failed` | Habis retry / error fatal; bisa **Retry** manual |
| `cancelled` | Dibatalkan (jika dipakai di alur delete) |

---

## Dry-run vs live

Dua saklar, digabung:

| | `live_publish_enabled` OFF (default) | ON |
|--|--------------------------------------|-----|
| `PLAYWRIGHT_DRY_RUN=true` | Dry-run | **Tetap dry-run** (env override aman) |
| `PLAYWRIGHT_DRY_RUN=false` | Dry-run | **Live** → post nyata ke Threads |

- Toggle live ada di **Settings** (butuh konfirmasi + banner merah di UI).
- Setiap attempt mencatat `mode: live | dry-run` di `publish_history`.
- Ops detail: [RUNBOOK.md](./RUNBOOK.md).

---

## Media

1. UI upload → `POST /v1/posts/upload-media`.
2. Validasi: MIME + magic bytes, max **5 MB**, tipe PNG/JPEG/GIF/WebP, max **4** file/post.
3. File disimpan di `UPLOAD_DIR` (default `data/uploads/`), URL `/media/{uuid}.ext`.
4. Saat publish, worker **copy ke /tmp staging** lalu `setInputFiles` di Threads compose.
5. Jika file hilang / attach gagal → **fallback text-only**, history tetap dicatat.

---

## AI caption (v3.0)

```
Topic  →  LLMService (provider dari env)
       →  prompt + brand_guidelines aktif
       →  caption + validasi heuristik (panjang, hashtag, brand fit)
       →  simpan ke generated_captions (provider, token, cost)
       →  user approve  →  schedule lewat alur post biasa
```

- Provider: `claude` / `codex` / `openrouter` / `mock`, ganti lewat env tanpa ubah kode.
- Gagal provider utama → fallback otomatis (openrouter → claude → mock).
- Approval user **wajib** sebelum jadi post.
- Best time dari `posting_heatmap` (seed default + refresh harian dari volume publish 30 hari).
- Biaya per provider dicatat, ada peringatan jika lewat `AI_MONTHLY_BUDGET_CENTS`.

Detail: [AI-CONTENT.md](./AI-CONTENT.md).

---

## Auth & session

1. Login: username/password Threads → Playwright validasi (atau dry-run fake session).
2. Password Threads dienkripsi at rest (`ENCRYPTION_KEY`).
3. API session = JWT (`JWT_SECRET`, default expiry 24h).
4. Cookie/session Threads disimpan untuk publish berikutnya; kalau expired, worker re-login.
5. Lockout: 5 gagal login → 15 menit.

---

## History & audit

| Tabel | Isi |
|-------|-----|
| `publish_history` | Tiap attempt publish (pending → success/fail) |
| `activity_logs` | Aksi user/sistem (CREATE, PUBLISH, …) |
| `audit_log` | Perubahan settings (toggle live) + brand guidelines + caption approval |
| `generated_captions` | Semua hasil AI: topic, provider, token, cost, approval |
| `jobs` | Log eksekusi job Bull |

Retensi history: prune otomatis **> 90 hari** (cron maintenance).

---

## Notifikasi

- In-app: sukses / gagal / retry (dashboard lonceng).
- Email: Conditional SendGrid (`SENDGRID_API_KEY`) + preferensi di Settings.
- Slack: Critical fail / canary — Conditional `SLACK_WEBHOOK_URL`.

---

## Batasan penting

- Bukan official Threads API — **UI automation** (risiko ToS / selector berubah).
- Satu kelas user (bukan multi-role admin).
- Satu akun Threads per login user tool (multi-account = roadmap).
- Gambar saja (bukan video).
- Heatmap memakai volume publish sebagai proxy engagement (metrik asli Threads belum tersedia).

---

## Lihat juga

| Dokumen | Isi |
|---------|-----|
| [USER-GUIDE.md](./USER-GUIDE.md) | Cara pakai harian |
| [AI-CONTENT.md](./AI-CONTENT.md) | AI caption v3.0 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Diagram komponen ringkas |
| [API.md](./API.md) | Endpoint |
| [FEATURE-CATALOG.md](./FEATURE-CATALOG.md) | Available / Conditional / Roadmap |
| [DEPLOY.md](./DEPLOY.md) | Install VPS tanpa Docker |
