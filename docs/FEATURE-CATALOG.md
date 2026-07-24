# Threads Automation — Feature Catalog

**Owner:** Dozer · **Company:** DN Tech  
**UpdatedAt:** 24 Juli 2026  
**Spec:** PRD/SRS/SDD v1.0 Draft  
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
| Edit / cancel | Update/delete sebelum publish | `PUT/DELETE /v1/posts/:id` | Available |
| Bulk CSV import | Validasi batch | Import dialog, `POST /v1/posts/import` | Available |
| Lists by status | scheduled / published / failed | Dashboard + API | Available |
| Search/filter | Filter status/search/date | `GET /v1/posts` | Available |
| Media URLs | Kolom array di DB | Schema | Partial — Roadmap UX |
| Manual retry | Retry failed post | `POST /v1/posts/:id/retry` | Available |

## 3. Auto-publish engine

| Fitur | Kapabilitas | Surface | Status |
|-------|-------------|---------|--------|
| Cron due scan | Menit-an scan post due | node-cron | Available |
| Bull queue | Job publish async | Redis/Bull | Available |
| Playwright publish | Browser post ke threads.net | Worker | Conditional (dry-run default) |
| Auto retry | 3x exponential backoff | Job service | Available |
| Activity log | Audit actions | `activity_logs` | Available |

## 4. Dashboard & notifications

| Fitur | Kapabilitas | Surface | Status |
|-------|-------------|---------|--------|
| Stats | Counts / basic metrics | `GET /v1/dashboard/stats` | Available |
| Timeline | Activity feed | `/dashboard/timeline` | Available |
| Queue status | Worker/queue view | `/dashboard/queue` | Available |
| In-app notifications | List + mark read | Dashboard | Available |
| Email notifications | Success/fail via SendGrid | Notification service | Conditional |

## 5. Roadmap (Phase 3 / OOS)

| Fitur | Catatan |
|-------|---------|
| Image/video attach UI + reliable publish | PRD Phase 3 |
| Schedule templates | PRD Phase 3 |
| Multi-account | SRS out of scope |
| Engagement analytics | Butuh sumber data Threads |
| Official Threads API | Saat Meta expose + approve |
| AI caption generation | SRS out of scope |
| Mobile app | SRS out of scope |
| Automated test suite | Engineering DoD |

## Ringkasan produk

Threads Automation = **scheduler + Playwright publisher** untuk Threads, dengan dashboard monitoring dan retry. Cocok untuk penggunaan internal; produksi live butuh dry-run off, secrets kuat, dan mitigasi risiko ToS/automation.
