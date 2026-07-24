# Threads Automation — API Reference (ringkas)

**Base URL (dev):** `http://localhost:3000/v1`  
**Auth:** `Authorization: Bearer <JWT>` (kecuali login & health)  
**UpdatedAt:** 25 Juli 2026

Mount alternatif: `/api` (sama router). Media files: `GET /media/{filename}` (unversioned).

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
| POST | `/posts` | Create scheduled post (`mediaUrls` optional, max 4) |
| GET | `/posts` | List (filter: status, search, date) |
| GET | `/posts/:id` | Detail |
| PUT | `/posts/:id` | Update scheduled |
| DELETE | `/posts/:id` | Cancel |
| GET | `/posts/scheduled` | Upcoming |
| GET | `/posts/published` | History |
| GET | `/posts/failed` | Failed |
| POST | `/posts/import` | CSV multipart |
| POST | `/posts/upload-media` | Image multipart → `{ media_url, file_size, mime_type }` |
| GET | `/posts/:id/history` | Publish attempts (`?format=csv` for export) |
| POST | `/posts/:id/retry` | Manual retry |

### CSV format

```csv
caption,date,time,timezone
"Good morning! #threads",2026-06-23,09:00,Asia/Jakarta
```

Contoh: [`../sample-posts.csv`](../sample-posts.csv).

## Settings

| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/settings?key=live_publish_enabled` | Current live flag (default false) |
| PATCH | `/settings` | Body: `{ "key": "live_publish_enabled", "value": true }` |

## AI (v3.0)

| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/ai/generate-caption` | `{ topic, tone?, length? }` → caption + validation |
| POST | `/ai/batch-generate` | `{ topicsText }` or `{ topics: [] }` max 10 |
| GET | `/ai/best-time` | Heatmap suggestion + `suggestedAt` ISO |
| GET | `/ai/usage` | Cost by provider (month) |
| GET | `/ai/brand-guidelines` | List brand templates |
| PUT | `/ai/brand-guidelines` | Upsert active brand voice |
| POST | `/ai/captions/:id/approve` | Mark approved + return best time |
| POST | `/ai/captions/:id/approve-schedule` | Approve + create scheduled post |

Detail: [AI-CONTENT.md](./AI-CONTENT.md).

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

Ops: [RUNBOOK.md](./RUNBOOK.md). Spek v2.0: [PRD](./PRD/PRD-v2.0-Live-Publish-Media.md).
