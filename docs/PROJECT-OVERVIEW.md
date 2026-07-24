# Threads Automation — Project Overview

| | |
|---|---|
| **Product** | Threads Automation Posting System |
| **Folder / package** | `auto/` · `threads-automation` |
| **Owner** | Dozer (CEO + Tech Lead) |
| **Company** | DN Tech (PT. Dozer Napitupulu Technology) |
| **UpdatedAt** | 24 Juli 2026 |
| **Spec** | PRD/SRS/SDD v1.0 Draft (22 Jun 2026) |
| **License** | Private — internal use only |

---

## Apa itu Threads Automation?

Aplikasi web internal untuk **menjadwalkan dan auto-publish** postingan ke akun **Meta Threads** (threads.net) tanpa harus online di jam tayang.

**Masalah:** content creator / social media manager membuang waktu untuk posting manual berulang.  
**Jawaban:** schedule caption (+ media path di schema), antrean publish, retry, dan dashboard monitoring.

Bukan produk SaaS multi-tenant publik seperti dnPeople; ini tool operasional dengan login memakai **kredensial Threads** user, disimpan terenkripsi.

## Visi (dari PRD v1.0)

- Schedule post dengan tanggal/waktu spesifik (+ timezone)
- Auto-publish andal (≥95% on-time target PRD)
- Dashboard monitor scheduled / published / failed
- Minimal intervensi manual (retry + notifikasi)

## Siapa penggunanya?

| Persona | Kebutuhan |
|---------|-----------|
| Content creator | Schedule 1–N post, pantau status |
| Social media manager | Bulk CSV untuk plan mingguan |
| (Sistem) | Retry gagal, log aktivitas, notifikasi |

Tidak ada RBAC multi-role (admin/HR/dll). Auth = JWT per user setelah login Threads berhasil (atau dry-run).

## Milestone

| Phase (PRD) | Target | Status kode (Jul 2026) |
|-------------|--------|-------------------------|
| Phase 1 MVP | Auth, single schedule, Playwright publish, dashboard, email | **Done in repo** (email Conditional) |
| Phase 2 Enhanced | Bulk CSV, history, retry, basic analytics | **Sebagian besar Done** (CSV + retry + lists; analytics masih basic stats) |
| Phase 3 Advanced | Media UI, templates, multi-account, deeper analytics | **Roadmap** |

## Stack (ringkas)

| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18, Vite, MUI 6, Redux Toolkit, React Router 7 |
| Backend | Express 4, TypeScript, Joi, Winston |
| DB | PostgreSQL 15 (Knex) |
| Queue | Redis 7 + Bull |
| Automation | Playwright → threads.net |
| Scheduler | node-cron (scan due posts) |

Detail: [ARCHITECTURE.md](./ARCHITECTURE.md).

## Dokumentasi

Mulai: [00_INDEX.md](./00_INDEX.md) · PRD berikutnya: [NEXT-PRD-BRIEF.md](./NEXT-PRD-BRIEF.md)
