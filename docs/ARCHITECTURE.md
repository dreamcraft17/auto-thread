# Threads Automation — Architecture (ringkas)

**UpdatedAt:** 24 Juli 2026 · Detail desain: [PRD/THREADS_AUTOMATION_SDD.md](./PRD/THREADS_AUTOMATION_SDD.md)

## Komponen

```
Frontend (React/Vite :5173)
    │  JWT Bearer
    ▼
API Express (:3000)  /v1| /api
    ├── PostgreSQL (users, posts, jobs, activity_logs, notifications)
    ├── Redis + Bull (publish jobs)
    ├── node-cron (scan scheduled due)
    └── Playwright worker → threads.net
```

## Publish flow

1. User schedule post → status `scheduled`  
2. Cron menemukan `scheduled_time <= now` → enqueue Bull job  
3. Worker load session/credentials → Playwright compose & publish (atau dry-run)  
4. Update post `published` / `failed` + `retry_count` + notifications/activity  

## Keamanan

- Password Threads dienkripsi at rest (`ENCRYPTION_KEY`)  
- JWT untuk API (`JWT_SECRET`)  
- Rate limit / helmet di Express  
- Lockout setelah gagal login berulang  

## Mode operasi

| Mode | Env | Perilaku |
|------|-----|----------|
| Dev / demo | `PLAYWRIGHT_DRY_RUN=true` | Simulasi login & publish |
| Live | `false` + Chromium | Browser automation nyata |

## Batasan arsitektur (sadar)

- Bergantung DOM Threads (rapuh terhadap perubahan UI)  
- Bukan official API  
- Single-account per login user (tidak multi-profile)  
- Logout tidak mencabut JWT di server  
