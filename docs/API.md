# Threads Automation — API Reference (ringkas)

**Base URL (dev):** `http://localhost:3000/v1`  
**Auth:** `Authorization: Bearer <JWT>` (kecuali login & health)  
**UpdatedAt:** 24 Juli 2026

Mount alternatif: `/api` (sama router).

## Auth

| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/auth/login` | Body: Threads username/password |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Current user |
| PUT | `/auth/preferences` | Notification preferences |

## Posts

| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/posts` | Create scheduled post |
| GET | `/posts` | List (filter: status, search, date) |
| GET | `/posts/:id` | Detail |
| PUT | `/posts/:id` | Update scheduled |
| DELETE | `/posts/:id` | Cancel |
| GET | `/posts/scheduled` | Upcoming |
| GET | `/posts/published` | History |
| GET | `/posts/failed` | Failed |
| POST | `/posts/import` | CSV multipart |
| POST | `/posts/:id/retry` | Manual retry |

### CSV format

```csv
caption,date,time,timezone
"Good morning! #threads",2026-06-23,09:00,Asia/Jakarta
```

Contoh: [`../sample-posts.csv`](../sample-posts.csv).

## Dashboard

| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/dashboard/stats` | Aggregates |
| GET | `/dashboard/timeline` | Activity |
| GET | `/dashboard/queue` | Queue status |
| GET | `/dashboard/activity` | Activity logs |
| GET | `/dashboard/notifications` | In-app |
| PUT | `/dashboard/notifications/:id/read` | Mark one |
| PUT | `/dashboard/notifications/read-all` | Mark all |

## Health

| Method | Path |
|--------|------|
| GET | `/health` (unversioned di app) |

Spek lengkap historis: [PRD §8](./PRD/THREADS_AUTOMATION_PRD.md) (path naming sedikit berbeda `/api/posts` vs implementasi `/v1/posts`).
