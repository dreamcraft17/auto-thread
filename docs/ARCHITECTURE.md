# Threads Automation — Architecture (ringkas)

**UpdatedAt:** 25 Juli 2026 · v3.0  
**Penjelasan alur lengkap:** [HOW-IT-WORKS.md](./HOW-IT-WORKS.md) · Spek: [PRD/SDD-v2.0-System-Design.md](./PRD/SDD-v2.0-System-Design.md), [PRD/PRD-v3_0-AI-Content-Generation-INTERNAL.md](./PRD/PRD-v3_0-AI-Content-Generation-INTERNAL.md)

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
    │     generated_captions, brand_guidelines, posting_heatmap
    ├── Redis + Bull (publish jobs + retries)
    ├── Uploads dir → static /media
    ├── node-cron (due scan + maintenance + heatmap refresh)
    ├── LLMService → claude | codex | openrouter | mock (fallback chain)
    └── Playwright worker → threads.net (atau dry-run)
```

## Publish flow

1. User schedule post (± media) → status `scheduled` + enqueue  
2. Cron / Bull memicu worker saat due  
3. Mode = dry-run kecuali `live_publish_enabled` **dan** `PLAYWRIGHT_DRY_RUN=false`  
4. Insert `publish_history` (pending) → Playwright (teks + attach media / fallback)  
5. Update `published` / `failed` + history + notifikasi  

## AI generation flow

1. `POST /v1/ai/generate` → ambil `brand_guidelines` aktif → susun prompt  
2. `LLMService` panggil provider aktif; error → fallback provider berikutnya  
3. `CaptionValidator` cek panjang, jumlah hashtag, grammar dasar, brand fit  
4. Simpan `generated_captions` (provider, token, cost, status) → tampilkan ke user  
5. User approve → caption masuk ke schedule flow standar  

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
- LLM API key hanya di env server; tidak pernah dikirim ke frontend  
- Caption AI wajib approval manusia sebelum dijadwalkan  

## Batasan arsitektur (sadar)

- Bergantung DOM Threads (rapuh terhadap perubahan UI)  
- Bukan official API  
- Single-account per login user  
- Logout tidak mencabut JWT di server  
- Heatmap = proxy volume publish, bukan engagement asli Threads  
