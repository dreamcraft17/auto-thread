# Threads Automation — Current Implementation Baseline

| Metadata | Value |
|----------|-------|
| Snapshot date | 24 Juli 2026 |
| Purpose | Baseline untuk menulis PRD berikutnya (jangan rebuild yang sudah ada) |
| Spec baseline | PRD/SRS/SDD v1.0 Draft · Phase 1–2 largely in code |
| Local path | `auto/` |
| Owner | Dozer · DN Tech |
| UpdatedAt | 25 Juli 2026 (v2.0 shipped; lihat FEATURE-CATALOG) |

> Panduan produk: [USER-GUIDE.md](./USER-GUIDE.md) · [HOW-IT-WORKS.md](./HOW-IT-WORKS.md).
>
> **Cara baca baseline:** Yang di **Available now** = behavior existing (backward compatible kecuali PRD mengubahnya). **Conditional** = ada di kode tapi bergantung env/provider. **Roadmap** = butuh PRD baru.

---

## Available now

### Produk / UX
- Login dengan username/password Threads → JWT di client (`localStorage`)
- Halaman: `/login`, `/` (dashboard), `/settings` (preferensi notifikasi)
- Schedule single post + preview
- Bulk import CSV (`caption,date,time,timezone`)
- List / filter: scheduled, published, failed; edit/cancel scheduled; manual retry
- Dashboard stats, timeline aktivitas, status queue, in-app notifications

### Backend / data
- API di `/v1` (juga mount `/api`): auth, posts, dashboard
- Tabel Knex: `users`, `posts`, `jobs`, `activity_logs`, `notifications`
- Kredensial Threads dienkripsi at rest; session cookie string disimpan untuk publish
- Bull worker + cron: ambil post due → enqueue → publish via Playwright
- Retry hingga 3x dengan backoff ~1m / 5m / 15m
- Lockout login: 5 gagal → 15 menit

### Inventori
| Area | Isi |
|------|-----|
| Frontend pages | Login, Dashboard, Settings |
| API areas | auth · posts · dashboard · health |
| Models | 5 tabel inti |
| Spec docs | PRD + SRS + SDD di `docs/PRD/` |
| Automated tests | **Ada** (`npm test -w backend`) |

---

## Conditional (env / ops)

| Item | Syarat |
|------|--------|
| Real browser login/publish | `PLAYWRIGHT_DRY_RUN=false` + Chromium terpasang (`npx playwright install chromium`) |
| Email notifikasi | `SENDGRID_API_KEY` (+ `EMAIL_FROM`) |
| Secrets production | `JWT_SECRET`, `ENCRYPTION_KEY` non-default |
| Seed script | `npm run db:seed` ada di workspace — **folder seeds belum ada** |

Default lokal: **dry-run = true** → login/publish disimulasikan (aman untuk demo tanpa akun Threads nyata).

---

## Not implemented / roadmap boundary (jangan dijual sebagai existing)

Dari SRS out-of-scope + PRD Phase 3:

- Official Meta Threads API (belum dipakai; masih UI automation)
- Multi-account per user
- AI content generation
- Mobile app
- Schedule templates library (UI)
- Video / multi-account / templates / official Threads API
- Analytics performa Threads (impressions/engagement) — hanya basic post counts
- Server-side token revoke / session store (logout client-side)

---

## Requirements for the next PRD

1. Jangan ulangi Phase 1 MVP sebagai “fitur baru”.
2. Pilih **satu** fokus (lihat [NEXT-PRD-BRIEF.md](./NEXT-PRD-BRIEF.md)).
3. Acceptance harus mencakup: dry-run vs live, failure/retry, keamanan kredensial, dan (jika media) batasan ukuran/format.
4. Definisikan DoD testing — saat ini gap terbesar adalah **zero automated tests**.
5. Catat risiko ToS Meta / deteksi automation secara eksplisit.

## Suggested next (ringkas)

| Priority | Theme |
|----------|--------|
| **P0** | Harden live publish + test harness + ops runbook |
| **P0 product** | Media attach + publish dengan gambar |
| **P1** | Multi-account OR schedule templates |
| **P2** | Analytics / official API migration when available |
