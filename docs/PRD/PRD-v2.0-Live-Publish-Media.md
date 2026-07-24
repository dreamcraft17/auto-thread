# PRD v2.0 — Threads Automation: Live Publish & Media

**Versi** | 2.0  
**Tanggal** | 25 Juli 2026  
**Owner** | Dozer (CEO + Tech Lead)  
**Status** | Ready for Development  
**Baseline** | MVP Phase 1 + Phase 2 ✓ (repo)  
**Predecessor** | PRD/SRS/SDD v1.0 Draft (22 Jun 2026)

---

## 1. Executive Summary

Threads Automation saat ini adalah **scheduler + dry-run automation** dengan 0 automated tests. PRD v2.0 mengangkat produk ke status **production-ready** dengan tiga pilar:

1. **Live Publish** — pengguna dapat publish langsung ke Threads (bukan dry-run saja)
2. **Media Attachments** — lampirkan ≥1 gambar per post
3. **Quality & Reliability** — test suite otomatis + runbook ops + audit trail

**Outcome bisnis:** User dapat mempublikasikan konten dengan media ke Threads dalam SLA terukur (on-time ≥95%), dengan visibility penuh terhadap success/failure dan compliance logs.

---

## 2. Opportunity & Rationale

### 2.1 Masalah yang diselesaikan

| Masalah | Impact | Solusi di v2.0 |
|---------|--------|----------------|
| Dry-run = produk belum benar-benar publish | 0% value delivery | Live publish toggle + runbook |
| 0 tests = regresi Playwright sering | High risk | Test suite API + worker + nightly live |
| Konten text-only = engagement rendah | Lost media value | Media upload + Playwright wiring |
| Tidak ada audit trail publish | Compliance blind spot | Publish history + user attribution |
| Selector Threads sering berubah | Publishing dapat tiba-tiba break | Resilience testing + selector monitoring |

### 2.2 Peluang pasar

- **Visual content** adalah 80% engagement di Threads — tanpa media = produk incomplete
- **Automation trust** memerlukan visible track record (test pass rate, publish success rate)
- **Enterprise adoption** menuntut audit trail + SLA guarantees

---

## 3. Goals & Success Metrics

### 3.1 Primary Goals

| Goal | Metrik | Target |
|------|--------|--------|
| **Produk launch ke live** | % posts published live vs. dry-run | 100% posts dapat di-publish live |
| **Reliability** | % posts published on-time | ≥95% within scheduled time ±5min |
| **Media support** | % posts dengan media | ≥50% adoption dalam 30 hari |
| **Test coverage** | Automated test pass rate | ≥90% (API + worker + dry-run flow) |
| **Visibility** | Users dapat lihat publish proof | 100% posts punya audit log + error details |

### 3.2 Secondary Metrics

- MTTR (Mean Time To Recovery) dari selector break: <1 jam dengan alert
- Test suite execution time: <5 menit (API unit) + <15 menit (integration)
- Zero credential leakage incidents (encryption + key rotation audit)

---

## 4. User Stories & Acceptance Criteria

### Story 4.1: Live Publish Toggle (P0)

**Sebagai** user admin, **saya ingin** mengaktifkan mode "Live Publish" di settings, **sehingga** post saya benar-benar publish ke akun Threads.

**Acceptance Criteria**
- [ ] Ada toggle `LIVE_PUBLISH_ENABLED` di Settings page (admin-only)
- [ ] Ketika toggle OFF (default): semua publish tetap dry-run, UI menampilkan "🟡 Dry-run mode"
- [ ] Ketika toggle ON: publish menggunakan Chromium real + Threads live
- [ ] Toggle action di-log ke audit table (who, when, before/after state)
- [ ] Konfigurasi tersimpan di PostgreSQL, encrypted di transit
- [ ] UI menampilkan warning modal: "Live mode akan publish konten nyata ke Threads — baca runbook"
- [ ] Dry-run mode tetap fungsional sebagai fallback

**Test Criteria**
- [ ] Unit: toggle state persists di DB
- [ ] API: `PATCH /v1/settings` mengubah `live_publish_enabled` flag
- [ ] Integration: workflow dengan toggle ON tetap cache-safe (no double-publish)
- [ ] Manual: toggle terlihat jelas di UI, warning muncul

**Risks**
- Accidental live publish → mitigasi: default OFF, confirmation modal
- Keamanan credential → enkripsi existing, jangan ada hardcoded key

---

### Story 4.2: Media Upload & Storage (P0)

**Sebagai** user content creator, **saya ingin** upload gambar ke editor post, **sehingga** post saya include visual.

**Acceptance Criteria**
- [ ] Editor form punya "Attach Media" button
- [ ] Accepted types: PNG, JPEG, GIF, WebP
- [ ] Max per post: 4 images (Threads limit), max 5MB per image
- [ ] Upload flow: client → server (`POST /v1/posts/upload-media`)
- [ ] Server menyimpan ke `/data/uploads/{uuid}.{ext}` (local disk v2.0, S3 future)
- [ ] Media URLs di-store di kolom `media_urls` (JSON array)
- [ ] Editor preview thumbnail sebelum schedule
- [ ] Jika upload fail: graceful error + retry UX

**Validation**
- [ ] File type check (MIME + magic bytes, bukan hanya extension)
- [ ] Size validation server-side
- [ ] Virus scan optional (Future: ClamAV integration)

**Test Criteria**
- [ ] Unit: file validation (size, type, MIME)
- [ ] API: `/v1/posts/upload-media` return media URLs
- [ ] Integration: post dengan media tersimpan + media URLs terekspor ke Playwright
- [ ] Manual: upload, preview, cancel, delete media

**Risks**
- Disk space overflow → mitigasi: cleanup script old uploads, alert @5GB
- Unsupported file types reject dengan clear message
- Media file corruption → mitigasi: virus scan + integrity hash

---

### Story 4.3: Media Publishing Pipeline (P0)

**Sebagai** automation engine, **saya ingin** attach media ke post saat publish ke Threads, **sehingga** post tampil dengan visual.

**Acceptance Criteria**
- [ ] Playwright worker membaca `media_urls` dari post record
- [ ] Worker download media lokal ke `/tmp` sebelum publish
- [ ] Dalam Threads compose flow: upload file ke platform (Threads media picker)
- [ ] Handle Threads media picker UI (file input element)
- [ ] Polling/wait untuk upload complete sebelum submit post
- [ ] Jika media upload fail: retry logic (2x), fallback publish text-only (warning)
- [ ] Dry-run mode: skip file upload, log "media skipped (dry-run)"

**Playwright Implementation**
```javascript
// Pseudo-code
1. Find media upload button in Threads compose
2. Upload file via file input
3. Poll for upload progress indicator gone
4. Verify media preview visible
5. Continue dengan normal submit flow
```

**Test Criteria**
- [ ] Dry-run: media prep & validation correct, skip actual upload
- [ ] Live (canary): small batch posts dengan 1 image succeed
- [ ] Retry: 1 fail → 2nd attempt success → post publish
- [ ] Fallback: media fail → post publish text-only + log error

**Risks**
- Threads media picker selector changes frequently → mitigasi: selector versioning, alert on fail
- File upload timeout → mitigasi: configurable timeout + retry
- Rate limit on Threads media upload → mitigasi: stagger batch jobs

---

### Story 4.4: Publish Audit Trail & History (P0)

**Sebagai** user, **saya ingin** lihat history setiap post publish (who, when, live/dry-run, status), **sehingga** saya bisa audit konten.

**Acceptance Criteria**
- [ ] Buat tabel baru `publish_history`:
  - `id, post_id, user_id, timestamp, mode (live|dry-run), status (success|fail), error_msg, threads_url`
- [ ] Setiap publish attempt insert record (before execution)
- [ ] Success: set `threads_url` + status=success
- [ ] Fail: status=fail + `error_msg` = sanitized error (no secrets)
- [ ] UI: Setiap post di dashboard punya "View History" link
- [ ] History modal menampilkan timeline + detail per attempt
- [ ] Export history → CSV (user, date, mode, status)

**Data Retention**
- Keep 90 days default, delete older records automatically

**Test Criteria**
- [ ] Unit: publish_history insert/select
- [ ] API: `GET /v1/posts/{id}/history` return array sorted by timestamp desc
- [ ] Manual: publish post → refresh history → verify record exists

**Risks**
- Error messages might leak credentials → mitigasi: sanitize function (remove URLs, tokens)
- Database size grows → mitigasi: archiving script, index on post_id + timestamp

---

### Story 4.5: Automated Test Suite — API Layer (P1)

**Sebagai** developer, **saya ingin** run automated API tests setiap push, **sehingga** regresi catch segera.

**Acceptance Criteria**
- [ ] Test framework: Jest + Supertest
- [ ] Coverage: Auth, Posts (CRUD), Settings, Upload endpoints
- [ ] Setup: Test DB container (PostgreSQL) + seed minimal data
- [ ] Teardown: Truncate tables after each test
- [ ] Tests: 
  - Login: valid/invalid creds, JWT expiry
  - Posts: create, read, update, cancel, list
  - Upload: valid/invalid file, size limits
  - Settings: get/patch toggle, auth check
- [ ] Assertions: status code, response schema, DB state
- [ ] CI integration: GitHub Actions, run on PR, must pass to merge

**Test Files**
```
tests/
  unit/
    auth.test.js
    posts.test.js
    upload.test.js
  integration/
    api.test.js
    workflow.test.js
```

**Acceptance Criteria Details**
- [ ] ≥80% endpoint coverage
- [ ] All error paths tested (400, 401, 500)
- [ ] Execution time <5 minutes

**Test Criteria**
- [ ] Run `npm test` locally, see pass/fail
- [ ] CI runs automatically on push, blocks merge if fail

**Risks**
- Test DB slow → mitigasi: use SQLite for tests, PostgreSQL for staging
- Flaky tests (timing issues) → mitigasi: explicit waits, retry failed tests

---

### Story 4.6: Automated Test Suite — Worker/Queue (P1)

**Sebagai** developer, **saya ingin** test publish flow (dry-run), **sehingga** queue + Playwright logic works correctly.

**Acceptance Criteria**
- [ ] Test framework: Jest + Bull mock + Playwright mock
- [ ] Test dry-run publish flow end-to-end:
  - Post due → worker process → Playwright open browser (headless mock)
  - Navigation, form fill, submit (mock Threads response)
  - Verify post_status = published, threads_url set
- [ ] Mock Playwright browser (don't launch real Chromium in CI)
- [ ] Mock Threads responses (200 success, 401/500 errors)
- [ ] Retry logic: fail → wait → retry → success
- [ ] Tests:
  - Happy path: post publish dry-run success
  - Fail scenarios: network error, form validation fail, retry exhausted
  - Media handling: media attached, media fail fallback

**Test Files**
```
tests/
  integration/
    worker.test.js         // dry-run flow
    queue.test.js          // Bull queue mechanics
    playwright.test.js     // Playwright integration
```

**Acceptance Criteria Details**
- [ ] ≥70% happy path + fail scenarios
- [ ] Execution time <15 minutes
- [ ] All edge cases covered (retry, fallback, timeout)

**Test Criteria**
- [ ] `npm test -- tests/integration/` runs worker tests
- [ ] Mocks correctly simulate Threads behavior
- [ ] Real Playwright test (optional nightly, canary on staging)

**Risks**
- Playwright version mismatch between test mock + actual → mitigasi: run real nightly canary
- State pollution between tests → mitigasi: cleanup after each test

---

### Story 4.7: Live Publish Canary (Nightly, Optional) (P2)

**Sebagai** ops/QA, **saya ingin** run nightly test posts to a staging Threads account, **sehingga** live publish selector/flow valid before users push.

**Acceptance Criteria**
- [ ] Cron job nightly 2 AM: create 1 test post + 1 post with media
- [ ] Publish to staging Threads account (separate credential)
- [ ] Polling untuk success, collect output (threads_url)
- [ ] Alert @ops Slack channel: "Canary pass" atau "Canary fail + reason"
- [ ] Disable canary jika staging Threads account not configured
- [ ] Execution time <5 minutes
- [ ] Cleanup test posts after verify (optional)

**Test Criteria**
- [ ] Manual trigger: `npm run canary` works
- [ ] Cron logs to audit table + Slack notification
- [ ] Graceful fail jika staging account unavailable

**Risks**
- Threads detects automated posts → ban account → mitigasi: whitelist IP + rate limit 1 post/hour
- Staging credential leaks → mitigasi: rotate monthly, store in secure env

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Metrik | Target | Notes |
|--------|--------|-------|
| API endpoint latency (p95) | <500ms | excludes Threads network |
| Post schedule to publish | <5 min from due time | SLA window ±5 min |
| Media upload | <30s per 5MB | Server-side storage |
| Test suite (API) | <5 min | Local test DB |
| Test suite (Worker) | <15 min | Mock Playwright |

### 5.2 Scalability

- Support ≥100 concurrent users (phase 2: 10 users → v2.0: 100)
- Queue: ≥500 posts/day backlog (Bull can handle, vertical scaling first)
- Database: ≥50K posts, ≥1M publish_history rows (indexes needed)

### 5.3 Reliability

| Target | Metric |
|--------|--------|
| Uptime | 99.5% (acceptable downtime ~4 hours/month) |
| MTTR (Mean Time To Recovery) | <1 hour post-incident |
| Publish SLA | ≥95% on-time (within ±5 min) |
| Test pass rate | ≥90% (allow 10% flaky tolerance) |

### 5.4 Security

- Credentials encrypted at rest (AES-256) ✓ existing
- JWT expiry: 24 hours (refresh token: 7 days) ✓ existing
- Media upload: file type + size validation, no execute permissions
- Audit trail: immutable logging (insert-only), no delete/update
- Secrets rotation: runbook for JWT_SECRET, ENCRYPTION_KEY (manual quarterly)
- No hardcoded credentials in code/repo

### 5.5 Usability

- Live publish toggle must be **clearly visible** with warning
- Upload feedback: progress bar, size remaining, error message
- Publish history: sortable, filterable by status/date, export CSV
- Error messages: user-friendly, actionable recovery steps

### 5.6 Compliance & Terms of Service

- Publish only to authenticated Threads accounts (not bot accounts)
- Respect Threads rate limits: 1 post per ~1 minute (configurable)
- No bypass ToS checks: don't hide automation, don't impersonate
- Audit trail: retain 90 days for compliance queries
- Cookie/data retention: GDPR-compliant (delete user data on request)

---

## 6. In Scope vs. Out of Scope

### 6.1 In Scope (v2.0)

✅ Live publish toggle + runbook  
✅ Media upload (PNG, JPEG, GIF, WebP), validation, storage  
✅ Media publishing pipeline (Playwright integration)  
✅ Publish audit trail (history table + UI)  
✅ Automated test suite (API + worker dry-run)  
✅ Optional nightly canary (live test posts)  
✅ Enhanced error logging + retry resilience  
✅ Settings refactor for live/dry-run mode management  

### 6.2 Out of Scope (future PRDs)

❌ Multi-account support (separate PRD, security review needed)  
❌ Schedule templates (Phase 3, separate PRD)  
❌ Engagement analytics (requires Meta Partner API, phase 3+)  
❌ Official Meta Threads API migration (when available)  
❌ Mobile app  
❌ AI caption generator  
❌ Advanced media editing (crop, filter, etc.)  
❌ Bulk scheduling (CSV is v1, advanced bulk = future)  

---

## 7. Architecture & Technical Approach

### 7.1 High-Level Flow

```
User uploads media → API `/v1/posts/upload-media` → /data/uploads/
User schedules post + media → POST /v1/posts → DB (posts + media_urls)
Cron due-scan → Bull queue → Worker
Worker (dry-run or live):
  → Read post + media_urls
  → Download media (if live)
  → Playwright: open Threads, compose, attach media, submit
  → On success: publish_history + post_status=published + threads_url
  → On fail: retry 3x, then publish_history + status=fail + error
UI Dashboard: display status + history link
```

### 7.2 Database Changes (Migration)

**New tables:**
```sql
CREATE TABLE publish_history (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  mode VARCHAR(10) CHECK (mode IN ('live', 'dry-run')),
  status VARCHAR(10) CHECK (status IN ('success', 'fail')),
  error_msg TEXT,
  threads_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_publish_history_post_id ON publish_history(post_id);
CREATE INDEX idx_publish_history_timestamp ON publish_history(timestamp DESC);
```

**Modify existing:**
- `posts` table: add `live_publish_mode` boolean (default false) [or use global setting]
- `settings` table (if new): add `live_publish_enabled` (default false)

### 7.3 API Endpoints (New/Modified)

**New:**
- `POST /v1/posts/upload-media` — upload file, return media URLs
- `GET /v1/posts/{id}/history` — get publish history
- `PATCH /v1/settings` — modify live_publish_enabled flag

**Modified:**
- `POST /v1/posts` — accept `media_urls` array in request body
- `GET /v1/dashboard` — include media_urls in post response

### 7.4 Frontend Components

- **Editor Form**: Add "Attach Media" button, file input, preview thumbnails
- **Settings Page**: Add toggle "🔴 Live Publish Mode" (admin-only) with warning
- **Post Card (Dashboard)**: Add "View History" link
- **History Modal**: Timeline of publish attempts with status/error details

### 7.5 Infrastructure & DevOps

- **CI/CD**: GitHub Actions, run tests on push, block merge if tests fail
- **Test DB**: PostgreSQL 14 (same as prod) or SQLite for unit tests
- **Staging**: Deploy to staging before production (manual approval)
- **Monitoring**: Add metrics for publish success rate, test pass rate (future: Datadog/New Relic)

---

## 8. Risk Register & Mitigation

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|-----------|
| Threads detects automation, challenges/blocks account | HIGH | MEDIUM | Respect rate limits, whitelist IP, user ToS acknowledgment |
| Selector changes (Threads UI updates) | MEDIUM | MEDIUM | Selector resilience testing, alert system, runbook for selector fix |
| Credential leakage in logs/errors | MEDIUM | LOW | Sanitize error messages, encrypt audit trail, secret rotation audit |
| Media upload DoS (large files, many uploads) | MEDIUM | LOW | Size limits (5MB), rate limit `POST /upload-media`, disk quota monitoring |
| Test suite flakiness (timing, env issues) | LOW | MEDIUM | Mock external deps, explicit waits, retry failed tests, investigation log |
| Double-publish (post submits twice) | MEDIUM | LOW | Idempotency key, publish_history check before re-push, UI disable button on submit |
| Regression in existing dry-run flow | MEDIUM | MEDIUM | Comprehensive test coverage, manual regression test before release |

---

## 9. Dependencies & Blockers

| Dependency | Status | Owner | ETA |
|-----------|--------|-------|-----|
| Threads API stability (selector resilience) | ⚠️ Ongoing | Meta | TBD |
| PostgreSQL 14+ (if not v1) | ✅ v1 | Infra | Done |
| Chromium/Playwright installation | ✅ v1 | Dev | Done |
| Test infrastructure (GitHub Actions) | ✅ v1 | DevOps | Done |
| Staging Threads account (for canary) | 🟡 TBD | Ops | Week 1 |

---

## 10. Release & Go-Live Plan

### 10.1 Phased Rollout

**Phase 1 (Week 1-2)**: Internal testing (dev team)
- Deploy to staging
- Manual QA: upload, dry-run publish, history view
- Run test suite (API + worker)
- Selector validation (if Threads UI changed)

**Phase 2 (Week 3)**: Canary (trusted users, beta flag)
- Deploy live publish toggle (default OFF)
- Open beta to 5 power users
- Monitor publish success rate, error logs
- Gather feedback

**Phase 3 (Week 4)**: General availability
- Enable live publish for all users
- Release notes: new features, runbook link, ToS warning
- Monitor: publish SLA, media adoption, test pass rate

### 10.2 Rollback Plan

If publish success rate drops below 90% or >5% test failures:
1. Set `live_publish_enabled = false` globally (admin toggle)
2. All new publishes revert to dry-run
3. Existing live posts NOT reverted (already published to Threads)
4. Incident postmortem: investigate selector change or regression
5. Fix in hotfix branch, re-test, re-enable

---

## 11. Success Criteria (Definition of Done)

- [ ] All stories in §4 merged & tested
- [ ] Test suite passes ≥90% on CI
- [ ] Publish success rate ≥95% in staging + canary
- [ ] Audit trail working (publish_history populated)
- [ ] Media upload/publish functional for all supported types
- [ ] Error logs sanitized (no credential leaks)
- [ ] Runbook written (ops, troubleshooting)
- [ ] Release notes prepared
- [ ] User documentation updated (settings, media, history)
- [ ] 0 high-severity security findings (if pen-tested)

---

## 12. Appendix: Reference Links

- **Current Implementation**: `./CURRENT-IMPLEMENTATION.md`
- **Feature Catalog**: `./FEATURE-CATALOG.md`
- **Briefing Dasar**: `./NEXT-PRD-BRIEF.md`
- **Threads API Docs**: https://developers.facebook.com/docs/threads (Meta official)
- **Playwright Docs**: https://playwright.dev
- **Bull Queue**: https://docs.bullmq.io

---

**Document Owner:** Dozer (CEO + Tech Lead)  
**Last Updated:** 25 Juli 2026  
**Next Review:** After v2.0 shipped or major baseline change
