# Threads Automation — Current Implementation Baseline

| Metadata | Value |
|----------|-------|
| Snapshot date | 25 Juli 2026 |
| Purpose | Baseline untuk menulis PRD berikutnya (jangan rebuild yang sudah ada) |
| Spec baseline | v1.0 MVP + **v2.0 Live Publish & Media** + **v3.0 AI Content** — semuanya sudah di kode |
| Local path | `auto/` |
| Owner | Dozer · DN Tech |
| Runtime | Node + PostgreSQL + Redis di host (**tanpa Docker**) |

> Panduan produk: [USER-GUIDE.md](./USER-GUIDE.md) · [HOW-IT-WORKS.md](./HOW-IT-WORKS.md) · [AI-CONTENT.md](./AI-CONTENT.md).
>
> **Cara baca:** **Available now** = behavior existing (backward compatible kecuali PRD mengubahnya). **Conditional** = ada di kode tapi bergantung env/provider. **Roadmap** = butuh PRD baru.

---

## Available now

### Produk / UX
- Login dengan username/password Threads → JWT di client (`localStorage`)
- Halaman: `/login`, `/` (dashboard), `/settings`
- Schedule single post + preview + **attach media** (max 4 gambar, 5MB each)
- Bulk import CSV (`caption,date,time,timezone`)
- List / filter: scheduled, published, failed; edit/cancel scheduled; manual retry
- **Publish history** per post + export CSV
- **Live / dry-run toggle** + modal konfirmasi + banner peringatan
- **AI:** Generate Caption, Batch Generate, Brand Guidelines, AI Usage & Cost
- Dashboard stats, timeline aktivitas, status queue, in-app notifications

### Backend / data
- API di `/v1` (juga mount `/api`): `auth`, `posts`, `dashboard`, `settings`, `ai`; static `/media`
- Tabel Knex: `users`, `posts`, `jobs`, `activity_logs`, `notifications`, `settings`, `publish_history`, `audit_log`, `generated_captions`, `brand_guidelines`, `posting_heatmap`
- Kredensial Threads dienkripsi at rest; session cookie string disimpan untuk publish
- Bull worker + cron: ambil post due → enqueue → publish via Playwright (+ attach media, fallback text-only)
- Retry hingga 3x dengan backoff ~1m / 5m / 15m; error message disanitasi
- Maintenance cron: prune history 90 hari, cleanup uploads, refresh heatmap, canary opsional
- LLM abstraction: `claude` | `codex` | `openrouter` | `mock` dengan fallback otomatis

### Inventori
| Area | Isi |
|------|-----|
| Frontend pages | Login, Dashboard, Settings |
| Frontend dialogs | ScheduleForm, ImportDialog, GenerateCaptionModal, BatchGenerateDialog, History |
| API areas | auth · posts · dashboard · settings · ai · media · health |
| Models | 11 tabel |
| Spec docs | PRD/SRS/SDD v1.0, v2.0, v3.0 di `docs/PRD/` |
| Automated tests | **16 tests** (`npm test -w backend`) |

---

## Conditional (env / ops)

| Item | Syarat |
|------|--------|
| Real browser login/publish | `PLAYWRIGHT_DRY_RUN=false` **dan** live toggle ON + Chromium (`npx playwright install --with-deps chromium`) |
| LLM sungguhan | `LLM_PROVIDER=claude\|codex\|openrouter` + API key (default lokal: `mock`) |
| Email notifikasi | `SENDGRID_API_KEY` (+ `EMAIL_FROM`) |
| Slack alert / canary | `SLACK_WEBHOOK_URL`, `ENABLE_CANARY` + credential staging |
| Secrets production | `JWT_SECRET`, `ENCRYPTION_KEY` non-default |
| Seed script | `npm run db:seed` ada di workspace — **folder seeds belum ada** |

Default lokal: **dry-run + live toggle OFF + LLM mock** → aman untuk demo tanpa akun/API nyata.

---

## Not implemented / roadmap boundary (jangan dijual sebagai existing)

- Official Meta Threads API (masih UI automation)
- Multi-account per user
- Schedule templates library (UI)
- Video / carousel di luar 4 gambar
- AI image generation, multi-language captions
- Analytics engagement asli Threads (heatmap sekarang pakai proxy volume publish)
- Server-side token revoke / session store (logout client-side)
- Mobile app

---

## Requirements for the next PRD

1. Jangan ulangi v1.0–v3.0 sebagai “fitur baru”.
2. Pilih **satu** fokus (lihat [NEXT-PRD-BRIEF.md](./NEXT-PRD-BRIEF.md)).
3. Acceptance harus mencakup: dry-run vs live, failure/retry, keamanan kredensial/API key, dan biaya LLM jika relevan.
4. Definisikan DoD testing (test suite sudah ada — tambahkan, jangan mulai dari nol).
5. Catat risiko ToS Meta / deteksi automation secara eksplisit.

## Suggested next (ringkas)

| Priority | Theme |
|----------|--------|
| **P0** | Engagement metrics asli → heatmap & analytics beneran |
| **P1** | Multi-account ATAU schedule templates |
| **P1** | Content plan/calendar view untuk batch AI |
| **P2** | Official API migration saat Meta membuka akses |
