# Threads Automation Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/).

---

## [2026-07-25] — User guide + how-it-works docs

### Added
- `docs/USER-GUIDE.md` — cara pakai harian (login, schedule, media, CSV, history, live)
- `docs/HOW-IT-WORKS.md` — cara kerja sistem (komponen, alur, dry-run/live, media)

### Changed
- `docs/00_INDEX.md`, README, PROJECT-OVERVIEW, ARCHITECTURE — entry point per peran

---

## [2026-07-25] — Native Postgres/Redis (no Docker)

### Removed
- `docker-compose.yml` and `npm run docker:up` / `docker:down`

### Added
- `docs/DEPLOY.md` — VPS deploy with apt Postgres/Redis + systemd + Nginx

### Changed
- README / living docs assume host-installed Postgres + Redis (VPS-friendly)

---

---

## [2026-07-25] — v2.0 Live Publish & Media

### Added
- DB: `settings`, `publish_history`, `audit_log`, `posts.media_count`
- Live publish toggle (`GET/PATCH /v1/settings`) with confirmation UI + dashboard warning bar
- Media upload (`POST /v1/posts/upload-media`) with MIME + magic-byte validation; static `/media`
- Playwright media staging + attach; text-only fallback when attach fails
- Publish history API + post-card modal + CSV export
- Jest/Supertest tests; optional nightly canary + Slack alerts
- `docs/RUNBOOK.md` for enabling live mode safely

### Changed
- Publish mode: effective dry-run = `PLAYWRIGHT_DRY_RUN` OR `!live_publish_enabled`
- Living docs updated to v2.0 status

---

## [2026-07-24] — Living docs tree + next PRD brief

### Added
- `docs/` living documentation: index, overview, current implementation, status, feature catalog, API, architecture, **NEXT-PRD-BRIEF**, changelog
- `docs/PRD/` mirror of THREADS_AUTOMATION PRD/SRS/SDD v1.0
- Wiki mirror under `company-wiki/docs/products/threads-automation/docs/`

### Changed
- Root `README.md` rewritten product-first (apa itu tool + fitur + quick start); stack ringkas
- Wiki product status: Planned → MVP in repo (live publish Conditional)

---

## [2026-06-22] — Initial MVP scaffold (code + Draft specs)

### Added
- PRD/SRS/SDD v1.0 Draft at repo root
- Express + React MVP: auth, posts, dashboard, Bull/Playwright pipeline
