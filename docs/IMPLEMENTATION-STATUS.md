# Threads Automation — Implementation Status

> Terakhir diperbarui: **24 Juli 2026**  
> Referensi: PRD/SRS/SDD **v1.0 Draft** (22 Jun 2026)  
> Owner: Dozer · DN Tech · Local: `auto/`

## Ringkasan

| Phase (PRD §7) | Target | Status |
|----------------|--------|--------|
| Phase 1 — MVP | Auth Threads, single schedule, Playwright engine, dashboard, email | **Done in repo** (email Conditional) |
| Phase 2 — Enhanced | Bulk CSV, history/timeline, retry, error handling, basic analytics | **Mostly Done** (stats dasar; bukan analytics engagement) |
| Phase 3 — Advanced | Media, templates, performance analytics, multi-account, rate limiting UX | **Not started** (schema media siap sebagian) |

**Catatan:** Checkbox di PRD root masih `[ ]` (dokumen Draft belum di-tick). README produk menandai MVP `[x]` — living status mengikuti **kode**, bukan checkbox PRD lama.

## Matriks fitur vs spek

| Area | PRD/SRS | Kode | Catatan |
|------|---------|------|---------|
| Schedule single post | US1 | Available | Form + preview |
| Bulk CSV | US2 / Phase 2 | Available | Validasi + import |
| Monitor activity | US3 | Available | Lists + timeline + stats |
| Failure + retry | US4 | Available | Auto 3x + manual retry |
| Credential encryption | NFR Security | Available | At rest |
| Email notify | Phase 1 | Conditional | SendGrid |
| Live Playwright | Engine | Conditional | Dry-run default |
| Image/media | Phase 3 | Partial | `media_urls[]` · UI/pipeline belum lengkap |
| Multi-account | Phase 3 / OOS | Roadmap | |
| AI content | OOS | Roadmap | |
| Official Threads API | OOS | Roadmap | |
| Automated tests | NFR implied | Missing | Gap P0 engineering |

## Frontend

| Route | Status |
|-------|--------|
| `/login` | Done |
| `/` Dashboard | Done |
| `/settings` | Done |

## Backend routes (`/v1`)

| Group | Status |
|-------|--------|
| `/auth/*` | Done |
| `/posts/*` | Done |
| `/dashboard/*` | Done |
| `/health` | Done |

## Verifikasi lokal

```bash
cd auto
npm install
cp .env.example .env
npm run docker:up
npm run db:migrate
npm run dev
# UI http://localhost:5173 · API http://localhost:3000
```

## Mulai PRD berikutnya

1. Baca [NEXT-PRD-BRIEF.md](./NEXT-PRD-BRIEF.md)  
2. Cross-check [FEATURE-CATALOG.md](./FEATURE-CATALOG.md)  
3. Baseline detail: [CURRENT-IMPLEMENTATION.md](./CURRENT-IMPLEMENTATION.md)
