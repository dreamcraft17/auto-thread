# Threads Automation

**Threads Automation** adalah aplikasi web internal untuk **membuat caption dengan AI, menjadwalkan, dan auto-publish** postingan ke akun **Meta Threads** — supaya content creator / social media manager tidak harus online di jam tayang.

| | |
|---|---|
| Owner | Dozer (CEO + Tech Lead) |
| Company | DN Tech (PT. Dozer Napitupulu Technology) |
| Package | `threads-automation` · folder `auto/` |
| Status | **v3.0** AI Content · v2.0 live/media · LLM via env |
| Spec | PRD **v3.0 AI** + v2.0 |
| Docs | **[Cara pakai](./docs/USER-GUIDE.md)** · **[Cara kerja](./docs/HOW-IT-WORKS.md)** · [Deploy](./docs/DEPLOY.md) · [Index](./docs/00_INDEX.md) |
| UpdatedAt | 25 Juli 2026 |
| License | Private — internal use only |

---

## Apa yang diselesaikan?

| Masalah | Jawaban di app |
|---------|----------------|
| Buntu ide caption | AI generate sesuai brand voice (single / batch) |
| Posting manual berulang | Schedule caption + gambar + waktu/timezone |
| Plan konten mingguan | Bulk import CSV + batch generate |
| Takut gagal diam-diam | Retry 3x + list failed + notifikasi + publish history |
| Perlu pantau konsistensi | Dashboard scheduled / published / failed + stats + AI cost |

**Bukan:** HRIS, official Meta Ads tool, atau mobile app. Login memakai kredensial Threads user (disimpan terenkripsi).

---

## Fitur (v3.0)

- [x] Login Threads + enkripsi kredensial + JWT session  
- [x] Single post scheduler + preview + **media attach** (max 4 images)  
- [x] Bulk CSV import  
- [x] Auto-publish (cron + Bull + Playwright) + media pipeline  
- [x] **Live / dry-run toggle** (default OFF) + warning bar · [RUNBOOK](./docs/RUNBOOK.md)  
- [x] **Publish history** + CSV export  
- [x] Dashboard: upcoming, published, failed, timeline, queue  
- [x] Retry otomatis & manual  
- [x] In-app notifications · email Conditional (SendGrid)  
- [x] Settings preferensi notifikasi  
- [x] Automated tests (`npm test`)
- [x] **AI caption** generate / batch / brand / best-time / cost (`docs/AI-CONTENT.md`)

**Default lokal:** `PLAYWRIGHT_DRY_RUN=true`, live toggle OFF, `LLM_PROVIDER=mock` (simulasi — aman tanpa publish nyata & tanpa biaya AI).

Detail status: [docs/FEATURE-CATALOG.md](./docs/FEATURE-CATALOG.md) · [docs/IMPLEMENTATION-STATUS.md](./docs/IMPLEMENTATION-STATUS.md).

---

## Quick start

**Prasyarat:** Node.js 18+, **PostgreSQL 15+**, **Redis 7+** (native — **tanpa Docker**).

### Lokal (macOS contoh)

```bash
brew install postgresql@15 redis
brew services start postgresql@15
brew services start redis
# buat DB/user sesuai DATABASE_URL di .env
```

### App

```bash
cd auto
npm install
cp .env.example .env   # sesuaikan DATABASE_URL & REDIS_URL ke host lokal
npm run db:migrate
npm run dev            # API :3000 · UI :5173
```

Buka http://localhost:5173 → login dengan username/password Threads (atau dry-run).

**VPS / produksi:** **satu URL** (contoh `https://ai.dntech.id`) + **satu PM2** (`ai-thread`) — API, UI, dan worker di process yang sama. Lihat **[docs/DEPLOY.md](./docs/DEPLOY.md)**.

```bash
npm run build:prod
pm2 start ecosystem.config.cjs   # name: ai-thread
# Nginx: proxy_pass → 127.0.0.1:3000 (semua path)
```

**Live publish:**

1. `PLAYWRIGHT_DRY_RUN=false`  
2. `npx playwright install --with-deps chromium`  
3. Ganti `JWT_SECRET` & `ENCRYPTION_KEY`  
4. Opsional: `SENDGRID_API_KEY`  
5. Aktifkan toggle live di Settings (ikuti [docs/RUNBOOK.md](./docs/RUNBOOK.md))

**AI sungguhan:** set `LLM_PROVIDER=claude|codex|openrouter` + API key-nya di `.env` (default `mock`). Detail: [docs/AI-CONTENT.md](./docs/AI-CONTENT.md).

---

## Stack (ringkas)

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18, Vite, MUI, Redux Toolkit |
| Backend | Express, TypeScript |
| DB / Queue | PostgreSQL, Redis + Bull |
| Automation | Playwright → threads.net |
| AI | Claude · Codex · OpenRouter · Mock (pilih via `LLM_PROVIDER`) |

Arsitektur: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) · API: [docs/API.md](./docs/API.md).

---

## CSV import

```csv
caption,date,time,timezone
"Good morning! #threads",2026-06-23,09:00,Asia/Jakarta
```

Lihat `sample-posts.csv`.

---

## PRD berikutnya

v2.0 (live + media + tests) dan v3.0 (AI content) sudah di repo. Kandidat berikutnya: **engagement signals nyata** — lihat **[docs/NEXT-PRD-BRIEF.md](./docs/NEXT-PRD-BRIEF.md)**.

---

## Dokumentasi

| Dokumen | Isi |
|---------|-----|
| [docs/USER-GUIDE.md](./docs/USER-GUIDE.md) | **Cara pakai** (login → schedule → history → live → AI) |
| [docs/AI-CONTENT.md](./docs/AI-CONTENT.md) | **v3.0 AI** generate / batch / cost |
| [docs/HOW-IT-WORKS.md](./docs/HOW-IT-WORKS.md) | **Cara kerja** sistem (alur, dry-run/live, media) |
| [docs/00_INDEX.md](./docs/00_INDEX.md) | Indeks semua docs |
| [docs/DEPLOY.md](./docs/DEPLOY.md) | Deploy VPS: **1 URL + PM2 `ai-thread`** |
| [docs/RUNBOOK.md](./docs/RUNBOOK.md) | Enable live publish |
| [docs/FEATURE-CATALOG.md](./docs/FEATURE-CATALOG.md) | Katalog fitur |
| [docs/PRD/](./docs/PRD/) | PRD · SRS · SDD |
| Wiki | `company-wiki/docs/products/threads-automation/` |
