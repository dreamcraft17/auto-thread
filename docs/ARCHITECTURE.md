# Threads Automation — Architecture (ringkas)

**UpdatedAt:** 25 Juli 2026  
**Penjelasan alur lengkap:** [HOW-IT-WORKS.md](./HOW-IT-WORKS.md) · Spek: [PRD/SDD-v2.0-System-Design.md](./PRD/SDD-v2.0-System-Design.md)

## Deploy

Runtime **tanpa Docker**: PostgreSQL + Redis di host, API/worker via Node/systemd. Lihat [DEPLOY.md](./DEPLOY.md).

## Komponen

```
Frontend (React/Vite :5173)
    │  JWT Bearer
    ▼
API Express (:3000)  /v1 | /api | /media
    ├── PostgreSQL
    │     users, posts, jobs, activity_logs, notifications
    │     settings, publish_history, audit_log
    ├── Redis + Bull (publish jobs + retries)
    ├── Uploads dir → static /media
    ├── node-cron (due scan + maintenance)
    └── Playwright worker → threads.net (atau dry-run)
```

## Publish flow

1. User schedule post (± media) → status `scheduled` + enqueue  
2. Cron / Bull memicu worker saat due  
3. Mode = dry-run kecuali `live_publish_enabled` **dan** `PLAYWRIGHT_DRY_RUN=false`  
4. Insert `publish_history` (pending) → Playwright (teks + attach media / fallback)  
5. Update `published` / `failed` + history + notifikasi  

## Mode operasi

| Kondisi | Perilaku |
|---------|----------|
| `live_publish_enabled=false` (default) | Dry-run |
| Toggle ON + `PLAYWRIGHT_DRY_RUN=true` | Tetap dry-run (env safety) |
| Toggle ON + `PLAYWRIGHT_DRY_RUN=false` | Live ke Threads |

## Keamanan

- Password Threads dienkripsi at rest (`ENCRYPTION_KEY`)  
- JWT untuk API (`JWT_SECRET`)  
- Media: magic-byte + size validation  
- Error messages disanitasi (no token/URL mentah di history)  
- Rate limit / helmet · login lockout  

## Batasan arsitektur (sadar)

- Bergantung DOM Threads (rapuh terhadap perubahan UI)  
- Bukan official API  
- Single-account per login user  
- Logout tidak mencabut JWT di server  
