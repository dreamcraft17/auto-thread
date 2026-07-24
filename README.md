# Threads Automation

**Threads Automation** adalah aplikasi web internal untuk **menjadwalkan dan auto-publish** postingan ke akun **Meta Threads** — supaya content creator / social media manager tidak harus online di jam tayang.

| | |
|---|---|
| Owner | Dozer (CEO + Tech Lead) |
| Company | DN Tech (PT. Dozer Napitupulu Technology) |
| Package | `threads-automation` · folder `auto/` |
| Status | MVP **in repo** · live Playwright Conditional (`PLAYWRIGHT_DRY_RUN`) |
| Spec | PRD/SRS/SDD v1.0 Draft |
| Docs | **[docs/00_INDEX.md](./docs/00_INDEX.md)** · PRD berikutnya: **[docs/NEXT-PRD-BRIEF.md](./docs/NEXT-PRD-BRIEF.md)** |
| UpdatedAt | 24 Juli 2026 |
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

## Fitur (MVP)

- [x] Login Threads + enkripsi kredensial + JWT session  
- [x] Single post scheduler + preview  
- [x] Bulk CSV import  
- [x] Auto-publish (cron + Bull + Playwright)  
- [x] Dashboard: upcoming, published, failed, timeline, queue  
- [x] Retry otomatis & manual  
- [x] In-app notifications · email Conditional (SendGrid)  
- [x] Settings preferensi notifikasi  

**Default lokal:** `PLAYWRIGHT_DRY_RUN=true` (simulasi — aman tanpa publish nyata).

Detail status: [docs/FEATURE-CATALOG.md](./docs/FEATURE-CATALOG.md) · [docs/IMPLEMENTATION-STATUS.md](./docs/IMPLEMENTATION-STATUS.md).

---

## Quick start

**Prasyarat:** Node.js 18+, Docker Compose.

```bash
cd auto
npm install
cp .env.example .env
npm run docker:up      # Postgres + Redis
npm run db:migrate
npm run dev            # API :3000 · UI :5173
```

Buka http://localhost:5173 → login dengan username/password Threads (atau dry-run).

**Live publish:**

1. `PLAYWRIGHT_DRY_RUN=false`  
2. `npx playwright install chromium`  
3. Ganti `JWT_SECRET` & `ENCRYPTION_KEY`  
4. Opsional: `SENDGRID_API_KEY`  

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

Jangan rebuild scheduler. Fokus yang disarankan: **live publish hardening + media + tests**.  
Baca: **[docs/NEXT-PRD-BRIEF.md](./docs/NEXT-PRD-BRIEF.md)**.

---

## Dokumentasi

| Dokumen | Isi |
|---------|-----|
| [docs/00_INDEX.md](./docs/00_INDEX.md) | Indeks |
| [docs/PROJECT-OVERVIEW.md](./docs/PROJECT-OVERVIEW.md) | Overview produk |
| [docs/CURRENT-IMPLEMENTATION.md](./docs/CURRENT-IMPLEMENTATION.md) | Baseline kode |
| [docs/NEXT-PRD-BRIEF.md](./docs/NEXT-PRD-BRIEF.md) | Briefing PRD berikutnya |
| [docs/PRD/](./docs/PRD/) | PRD · SRS · SDD v1.0 |
| Wiki | `company-wiki/docs/products/threads-automation/` |
# auto-thread
