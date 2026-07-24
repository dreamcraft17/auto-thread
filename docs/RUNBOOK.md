# Threads Automation — Live Publish Runbook (v2.0)

## Purpose

This runbook covers enabling **live** Threads publishing safely. Default install mode is **dry-run**.

## Preconditions

1. App running with Postgres + Redis.
2. Migrations applied (`npm run db:migrate`) including `20260725000001_v2_live_publish_media`.
3. You have verified at least one scheduled post succeeds in **dry-run** (status becomes `published`, history mode = `dry-run`).
4. Threads credentials for the target account are correct.
5. Optional: Slack webhook configured for critical alerts (`SLACK_WEBHOOK_URL`).

## Dry-run vs live

| Signal | Behavior |
|--------|----------|
| Settings `live_publish_enabled=false` (default) | Worker always dry-runs |
| Settings `live_publish_enabled=true` | Live publish **unless** env override |
| `PLAYWRIGHT_DRY_RUN=true` | **Force dry-run** even if toggle is ON (local/staging safety) |

Effective mode:

```
dryRun = PLAYWRIGHT_DRY_RUN || !live_publish_enabled
```

## Enable live mode

1. Open **Settings**.
2. Toggle **Live publish**.
3. Read the confirmation modal: *Publishing akan mengirim konten NYATA ke Threads...*
4. Click **OK — Enable Live** only if you accept real posts.
5. Confirm the red dashboard banner: **LIVE MODE AKTIF**.
6. For production: set `PLAYWRIGHT_DRY_RUN=false` in env, then restart API/worker.

## Disable live mode

1. Settings → turn toggle off (no confirmation required).
2. Banner disappears; subsequent publishes are dry-run.

## Media checklist

- Formats: PNG, JPEG, GIF, WebP
- Max 4 files / post, 5 MB each
- Files stored under `data/uploads/` (or `UPLOAD_DIR`)
- Served at `/media/{filename}`
- If attach fails at publish time, worker falls back to **text-only** and records history

## Publish history

- Each attempt inserts `publish_history` (pending → success/fail)
- Post card → **View History**
- Export CSV from the history dialog
- Retention: 90 days (nightly prune)

## Rollback / incident

1. Immediately disable live toggle.
2. Optionally set `PLAYWRIGHT_DRY_RUN=true` and restart.
3. Check `publish_history` + job logs for the failed post IDs.
4. Do **not** delete audit/history rows manually (immutable trail).

## Optional canary

```bash
# Requires ENABLE_CANARY=true + CANARY_THREADS_* credentials
npm run canary -w backend
```

Nightly cron runs at **02:00 UTC** when enabled; Slack notified on pass/fail.

## Verify after deploy

```bash
cd auto
# Pastikan Postgres + Redis jalan di host (lihat DEPLOY.md) — bukan Docker
npm run db:migrate
npm test -w backend
# Schedule a text-only post with live OFF → history mode dry-run
# Attach 1 PNG, schedule, confirm media_count and thumbnail
# Only then enable live with PLAYWRIGHT_DRY_RUN=false
```

VPS checklist: [DEPLOY.md](./DEPLOY.md).
