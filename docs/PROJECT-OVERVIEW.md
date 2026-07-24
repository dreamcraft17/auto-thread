# Threads Automation — Project Overview

| | |
|---|---|
| **Product** | Threads Automation Posting System |
| **Folder / package** | `auto/` · `threads-automation` |
| **Owner** | Dozer (CEO + Tech Lead) |
| **Company** | DN Tech (PT. Dozer Napitupulu Technology) |
| **UpdatedAt** | 25 Juli 2026 |
| **Spec** | PRD **v3.0 AI Content** (+ v2.0 Live Publish & Media, v1.0 baseline) |
| **License** | Private — internal use only |

---

## Apa itu Threads Automation?

Aplikasi web internal untuk **membuat, menjadwalkan, dan auto-publish** postingan ke akun **Meta Threads** (threads.net) tanpa harus online di jam tayang.

**Masalah:** content creator / social media manager membuang waktu untuk menulis caption dan posting manual berulang.  
**Jawaban:** caption dibantu **AI (brand-aware)**, schedule caption + gambar, antrean publish, retry, history attempt, dan dashboard monitoring — dengan saklar **dry-run / live** yang aman.

Bukan produk SaaS multi-tenant publik seperti dnPeople; ini tool operasional dengan login memakai **kredensial Threads** user, disimpan terenkripsi. Deploy **tanpa Docker** (Postgres + Redis + Node di VPS).

## Visi

- Caption AI sesuai brand voice DN Tech, selalu lewat approval manusia
- Schedule post dengan tanggal/waktu (+ timezone) dan media gambar
- Auto-publish andal (±5 menit dari due time, target spek)
- Dashboard + publish history per attempt + tracking biaya AI
- Minimal intervensi (retry + notifikasi); live mode hanya saat sengaja diaktifkan

## Siapa penggunanya?

| Persona | Kebutuhan | Baca |
|---------|-----------|------|
| Content creator | Generate caption AI, schedule 1–N post + gambar, pantau status | [USER-GUIDE.md](./USER-GUIDE.md), [AI-CONTENT.md](./AI-CONTENT.md) |
| Social media manager | Batch generate + bulk CSV untuk plan mingguan | [USER-GUIDE.md](./USER-GUIDE.md), [AI-CONTENT.md](./AI-CONTENT.md) |
| Ops / engineer | Deploy, live toggle, runbook | [DEPLOY.md](./DEPLOY.md), [RUNBOOK.md](./RUNBOOK.md), [HOW-IT-WORKS.md](./HOW-IT-WORKS.md) |

Tidak ada RBAC multi-role. Auth = JWT setelah login Threads berhasil (atau dry-run).

## Milestone

| Phase | Target | Status |
|-------|--------|--------|
| Phase 1 MVP | Auth, schedule, Playwright, dashboard | **Done** |
| Phase 2 Enhanced | CSV, retry, lists, stats | **Done** |
| **v2.0** | Live toggle, media, history, tests, runbook | **Done** |
| **v3.0** | AI caption (multi-provider), batch generate, brand guidelines, best-time, cost tracking | **Done** |
| Berikutnya | Engagement metrics asli, multi-account, templates, official API | Roadmap |

## Stack (ringkas)

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18, Vite, MUI, Redux Toolkit |
| Backend | Express, TypeScript |
| DB | PostgreSQL (native host) |
| Queue | Redis + Bull (native host) |
| Automation | Playwright → threads.net |
| Scheduler | node-cron |
| AI | LLM abstraction: Claude · Codex · OpenRouter · Mock |

## Dokumentasi

| | |
|---|---|
| Indeks | [00_INDEX.md](./00_INDEX.md) |
| Cara pakai | [USER-GUIDE.md](./USER-GUIDE.md) |
| Cara kerja | [HOW-IT-WORKS.md](./HOW-IT-WORKS.md) |
| AI content | [AI-CONTENT.md](./AI-CONTENT.md) |
