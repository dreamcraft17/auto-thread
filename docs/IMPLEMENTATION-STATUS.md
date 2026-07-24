# Threads Automation — Implementation Status

> Terakhir diperbarui: **25 Juli 2026**  
> Referensi: PRD/SRS/SDD **v3.0 AI Content** (+ v2.0) (+ v1.0 baseline)  
> Owner: Dozer · DN Tech · Local: `auto/`

## Ringkasan

| Phase | Target | Status |
|-------|--------|--------|
| Phase 1 — MVP | Auth, schedule, Playwright, dashboard | **Done** |
| Phase 2 — Enhanced | Bulk CSV, history, retry, stats | **Done** |
| **v2.0 — Live Publish & Media** | Live toggle, media upload/attach, publish history, tests, runbook | **Done** |
| Phase 3 leftovers | Multi-account, templates, official API, AI | **Roadmap / OOS** |

## Matriks fitur vs spek v2.0

| Area | FR | Kode | Catatan |
|------|----|------|---------|
| Live publish toggle | FR-100 | Available | DB `settings.live_publish_enabled`, default OFF |
| Confirmation + warning bar | FR-100.5–8 | Available | Settings modal + Layout banner |
| Media upload | FR-200 | Available | Magic-byte validation, `/data/uploads` |
| Playwright media attach | FR-300 | Available | Stage → `setInputFiles`, text-only fallback |
| Publish history | FR-400 | Available | `publish_history` + UI + CSV |
| Error sanitization / Slack | FR-500 | Available | `sanitizeError` + optional webhook |
| API tests (Jest) | FR-600 | Available | `npm test -w backend` |
| Worker mock tests | FR-700 | Available | Playwright mocked |
| Nightly canary | FR-800 | Conditional | `ENABLE_CANARY` + credentials |

## Backend routes (`/v1`)

| Group | Status |
|-------|--------|
| `/auth/*` | Done |
| `/posts/*` | Done (+ `upload-media`, `/:id/history`) |
| `/settings` | Done (GET/PATCH) |
| `/ai/*` | Done (v3.0 generate/batch/brand/usage) |
| `/dashboard/*` | Done |
| `/media/*` | Done (static uploads) |
| `/health` | Done |

## Verifikasi lokal

```bash
cd auto
npm install
cp .env.example .env   # Postgres + Redis native (bukan Docker)
npm run db:migrate
npm test -w backend
npm run dev
# UI http://localhost:5173 · API http://localhost:3000
# VPS: docs/DEPLOY.md · Live mode: docs/RUNBOOK.md
```

## Spek

- [PRD-v2.0-Live-Publish-Media.md](./PRD/PRD-v2.0-Live-Publish-Media.md)
- [SRS-v2.0-Functional-Requirements.md](./PRD/SRS-v2.0-Functional-Requirements.md)
- [SDD-v2.0-System-Design.md](./PRD/SDD-v2.0-System-Design.md)
- [RUNBOOK.md](./RUNBOOK.md)
