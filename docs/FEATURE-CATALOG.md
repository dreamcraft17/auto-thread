# Threads Automation — Feature Catalog

**Owner:** Dozer · **Company:** DN Tech  
**UpdatedAt:** 25 Juli 2026  
**Spec:** PRD/SRS/SDD v2.0 Live Publish & Media  
**Path:** `auto/`

## Cara membaca

| Status | Arti |
|--------|------|
| **Available** | Ada di UI/API codebase |
| **Conditional** | Ada, tapi butuh env/provider/ops |
| **Roadmap** | Belum produk; jangan dijual sebagai existing |

## 1. Identity & session

| Fitur | Kapabilitas | Surface | Status |
|-------|-------------|---------|--------|
| Threads login | Username/password → validasi Playwright / dry-run → JWT | `/login`, `POST /v1/auth/login` | Available |
| Credential storage | Password Threads encrypted; session cookie string | DB `users` | Available |
| Login lockout | 5 gagal → 15 menit | Auth service | Available |
| Logout | Client clear token | `POST /v1/auth/logout` | Available (no server revoke) |
| Profile / me | Current user | `GET /v1/auth/me` | Available |
| Notification prefs | Update preferences JSON | `/settings`, `PUT /v1/auth/preferences` | Available |

## 2. Scheduling & posts

| Fitur | Kapabilitas | Surface | Status |
|-------|-------------|---------|--------|
| Single schedule | Caption + waktu + timezone; preview | Dashboard form | Available |
| Media attach | PNG/JPEG/GIF/WebP, max 4 × 5MB, magic-byte check | Schedule form, `POST /v1/posts/upload-media` | Available |
| Edit / cancel | Update/delete sebelum publish | `PUT/DELETE /v1/posts/:id` | Available |
| Bulk CSV import | Validasi batch | Import dialog, `POST /v1/posts/import` | Available |
| Lists by status | scheduled / published / failed | Dashboard + API | Available |
| Search/filter | Filter status/search/date | `GET /v1/posts` | Available |
| Manual retry | Retry failed post | `POST /v1/posts/:id/retry` | Available |
| Publish history | Attempt timeline + CSV export | Post card, `GET /v1/posts/:id/history` | Available |

## 3. Auto-publish engine

| Fitur | Kapabilitas | Surface | Status |
|-------|-------------|---------|--------|
| Live / dry-run toggle | DB setting; env force dry-run | Settings, `GET/PATCH /v1/settings` | Available |
| Live warning | Confirmation modal + persistent banner | Settings / Layout | Available |
| Cron due scan | Menit-an scan post due | node-cron | Available |
| Bull queue | Job publish async | Redis/Bull | Available |
| Playwright publish | Text + media attach + text fallback | Worker | Conditional (live needs toggle + env) |
| Auto retry | 3x exponential backoff | Job service | Available |
| Activity + audit log | Actions + live toggle audit | `activity_logs`, `audit_log` | Available |
| History retention | 90-day prune | Nightly maintenance | Available |
| Nightly canary | Staging smoke + Slack | `npm run canary`, cron 02:00 UTC | Conditional |

## 4. Dashboard & notifications

| Fitur | Kapabilitas | Surface | Status |
|-------|-------------|---------|--------|
| Stats | Counts / basic metrics | `GET /v1/dashboard/stats` | Available |
| Timeline | Activity feed | `/dashboard/timeline` | Available |
| Queue status | Worker/queue view | `/dashboard/queue` | Available |
| In-app notifications | List + mark read | Dashboard | Available |
| Email notifications | Success/fail via SendGrid | Notification service | Conditional |
| Slack critical alerts | Permanent publish fail / canary | `SLACK_WEBHOOK_URL` | Conditional |

## 5. AI Content (v3.0)

| Fitur | Kapabilitas | Surface | Status |
|-------|-------------|---------|--------|
| Generate caption | Topic → LLM caption + validation | Dashboard modal, `POST /v1/ai/generate-caption` | Available |
| Brand guidelines | Voice/example/hashtags in prompt | Settings, `/v1/ai/brand-guidelines` | Available |
| Approve & schedule | Mandatory review → schedule | Modal / `approve-schedule` | Available |
| Batch generate | Max 10 topics + staggered slots | Batch dialog | Available |
| Best time | Heatmap suggestion | `GET /v1/ai/best-time` | Available |
| Cost tracking | Per-provider monthly spend | Settings usage | Available |
| LLM switch | claude / codex / openrouter / mock | `LLM_PROVIDER` env | Available |

## 6. Quality

| Fitur | Kapabilitas | Surface | Status |
|-------|-------------|---------|--------|
| API unit/route tests | Jest + Supertest | `npm test -w backend` | Available |
| Worker mock tests | Mocked Playwright | Jest | Available |
| Live publish runbook | Ops checklist | [RUNBOOK.md](./RUNBOOK.md) | Available |

## 7. Roadmap (OOS v2.0)

| Fitur | Catatan |
|-------|---------|
| Schedule templates | PRD Phase 3 |
| Multi-account | SRS out of scope |
| Engagement analytics | Butuh sumber data Threads |
| Official Threads API | Saat Meta expose + approve |
| AI caption generation | SRS out of scope |
| Mobile app | SRS out of scope |
| Video media | v2.0 images only |

## Ringkasan produk

Threads Automation = **scheduler + Playwright publisher** untuk Threads, dengan **live/dry-run control**, **image media**, **publish history**, dan dashboard monitoring. Live production: ikuti [RUNBOOK.md](./RUNBOOK.md).
