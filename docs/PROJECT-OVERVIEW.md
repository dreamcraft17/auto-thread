# Threads Automation — Project Overview

| | |
|---|---|
| **Product** | Threads Automation Posting System |
| **Folder / package** | `auto/` · `threads-automation` |
| **Owner** | Dozer (CEO + Tech Lead) |
| **Company** | DN Tech (PT. Dozer Napitupulu Technology) |
| **UpdatedAt** | 25 Juli 2026 |
| **Spec** | PRD/SRS/SDD **v2.0** (+ v1.0 baseline) |
| **License** | Private — internal use only |

---

## Apa itu Threads Automation?

Aplikasi web internal untuk **menjadwalkan dan auto-publish** postingan ke akun **Meta Threads** (threads.net) tanpa harus online di jam tayang.

**Masalah:** content creator / social media manager membuang waktu untuk posting manual berulang.  
**Jawaban:** schedule caption + gambar, antrean publish, retry, history attempt, dan dashboard monitoring — dengan saklar **dry-run / live** yang aman.

Bukan produk SaaS multi-tenant publik seperti dnPeople; ini tool operasional dengan login memakai **kredensial Threads** user, disimpan terenkripsi. Deploy **tanpa Docker** (Postgres + Redis + Node di VPS).

## Visi

- Schedule post dengan tanggal/waktu (+ timezone) dan media gambar
- Auto-publish andal (±5 menit dari due time, target spek)
- Dashboard + publish history per attempt
- Minimal intervensi (retry + notifikasi); live mode hanya saat sengaja diaktifkan

## Siapa penggunanya?

| Persona | Kebutuhan | Baca |
|---------|-----------|------|
| Content creator | Schedule 1–N post + gambar, pantau status | [USER-GUIDE.md](./USER-GUIDE.md) |
| Social media manager | Bulk CSV untuk plan mingguan | [USER-GUIDE.md](./USER-GUIDE.md) |
| Ops / engineer | Deploy, live toggle, runbook | [DEPLOY.md](./DEPLOY.md), [RUNBOOK.md](./RUNBOOK.md), [HOW-IT-WORKS.md](./HOW-IT-WORKS.md) |

Tidak ada RBAC multi-role. Auth = JWT setelah login Threads berhasil (atau dry-run).

## Milestone

| Phase | Target | Status |
|-------|--------|--------|
| Phase 1 MVP | Auth, schedule, Playwright, dashboard | **Done** |
| Phase 2 Enhanced | CSV, retry, lists, stats | **Done** |
| **v2.0** | Live toggle, media, history, tests, runbook | **Done** |
| Berikutnya | Multi-account, templates, official API, … | Roadmap |

## Stack (ringkas)

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18, Vite, MUI, Redux Toolkit |
| Backend | Express, TypeScript |
| DB | PostgreSQL (native host) |
| Queue | Redis + Bull (native host) |
| Automation | Playwright → threads.net |
| Scheduler | node-cron |

## Dokumentasi

| | |
|---|---|
| Indeks | [00_INDEX.md](./00_INDEX.md) |
| Cara pakai | [USER-GUIDE.md](./USER-GUIDE.md) |
| Cara kerja | [HOW-IT-WORKS.md](./HOW-IT-WORKS.md) |
