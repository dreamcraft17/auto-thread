# Threads Automation

**Threads Automation** adalah aplikasi web internal untuk **menjadwalkan dan auto-publish** postingan ke akun **Meta Threads** — supaya content creator / social media manager tidak harus online di jam tayang.

| | |
|---|---|
| Owner | Dozer (CEO + Tech Lead) |
| Company | DN Tech (PT. Dozer Napitupulu Technology) |
| Package | `threads-automation` · folder `auto/` |
| Status | **v2.0** Live Publish & Media · live Conditional (toggle + `PLAYWRIGHT_DRY_RUN`) |
| Spec | PRD/SRS/SDD **v2.0** |
| Docs | **[Cara pakai](./docs/USER-GUIDE.md)** · **[Cara kerja](./docs/HOW-IT-WORKS.md)** · [Deploy](./docs/DEPLOY.md) · [Index](./docs/00_INDEX.md) |
| UpdatedAt | 25 Juli 2026 |
| License | Private — internal use only |

---

## Apa yang diselesaikan?

| Masalah | Jawaban di app |
|---------|----------------|
| Posting manual berulang | Schedule caption + waktu/timezone |
| Plan konten mingguan | Bulk import CSV |
| Takut gagal diam-diam | Retry 3x + list failed + notifikasi |
| Perlu pantau konsistensi | Dashboard scheduled / published / failed + stats |

**Bukan:** HRIS, official Meta Ads tool, atau mobile app. Login memakai kredensial Threads user (disimpan terenkripsi).

---

## Fitur (v2.0)

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

**Default lokal:** `PLAYWRIGHT_DRY_RUN=true` dan live toggle OFF (simulasi — aman tanpa publish nyata).

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

**VPS / produksi (tanpa Docker):** lihat **[docs/DEPLOY.md](./docs/DEPLOY.md)**.

**Live publish:**

1. `PLAYWRIGHT_DRY_RUN=false`  
2. `npx playwright install --with-deps chromium`  
3. Ganti `JWT_SECRET` & `ENCRYPTION_KEY`  
4. Opsional: `SENDGRID_API_KEY`  
5. Aktifkan toggle live di Settings (ikuti [docs/RUNBOOK.md](./docs/RUNBOOK.md))
---

## Stack (ringkas)

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18, Vite, MUI, Redux Toolkit |
| Backend | Express, TypeScript |
| DB / Queue | PostgreSQL, Redis + Bull |
| Automation | Playwright → threads.net |

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

v2.0 (live + media + tests) sudah di repo. Untuk ide berikutnya: **[docs/NEXT-PRD-BRIEF.md](./docs/NEXT-PRD-BRIEF.md)**.

---

## Dokumentasi

| Dokumen | Isi |
|---------|-----|
| [docs/USER-GUIDE.md](./docs/USER-GUIDE.md) | **Cara pakai** (login → schedule → history → live) |
| [docs/HOW-IT-WORKS.md](./docs/HOW-IT-WORKS.md) | **Cara kerja** sistem (alur, dry-run/live, media) |
| [docs/00_INDEX.md](./docs/00_INDEX.md) | Indeks semua docs |
| [docs/DEPLOY.md](./docs/DEPLOY.md) | Deploy VPS **tanpa Docker** |
| [docs/RUNBOOK.md](./docs/RUNBOOK.md) | Enable live publish |
| [docs/FEATURE-CATALOG.md](./docs/FEATURE-CATALOG.md) | Katalog fitur |
| [docs/PRD/](./docs/PRD/) | PRD · SRS · SDD |
| Wiki | `company-wiki/docs/products/threads-automation/` |
