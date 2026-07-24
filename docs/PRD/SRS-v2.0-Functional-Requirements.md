# SRS v2.0 — System Requirements Specification
## Threads Automation: Live Publish & Media

**Versi** | 2.0  
**Tanggal** | 25 Juli 2026  
**Status** | Ready for Development  
**Baseline** | MVP Phase 1 + Phase 2 ✓

---

## 1. Document Overview

SRS v2.0 merinci **functional requirements** (apa sistem harus lakukan) dan **non-functional requirements** (bagaimana sistem harus melakukannya). Dokumen ini adalah kontrak teknis antara Product (PRD) dan Development (SDD).

### 1.1 Scope

Ini adalah **incremental spec** dari v1.0:
- ✅ Semua fitur v1.0 tetap (login, schedule, edit, cancel, CSV bulk, dashboard, settings)
- ✨ **Baru v2.0**: Live publish mode, media attach, test suite, audit trail

### 1.2 Audience

- **Developers** — implementasi, test plan, DoD
- **QA** — test cases, acceptance criteria
- **DevOps** — deployment, CI/CD, monitoring setup
- **Product** — validation, sign-off

---

## 2. Functional Requirements

### 2.1 FR-100: Live Publish Mode Management

**Beschreibung**  
Sistem harus mendukung toggle antara dry-run (default) dan live publish modes, dengan safeguard untuk prevent accidental publishing.

**Requirements**
- **FR-100.1** Aplikasi menyimpan `live_publish_enabled` flag di database (Settings table atau config)
- **FR-100.2** Flag hanya modifiable oleh authenticated admin user
- **FR-100.3** Flag changes di-log ke audit trail dengan timestamp + user ID
- **FR-100.4** Default value saat fresh install: `false` (dry-run mode)
- **FR-100.5** Settings page menampilkan toggle dengan visual warning (🔴 icon atau badge)
- **FR-100.6** Toggle action trigger modal confirmation: "Publishing akan mengirim konten NYATA ke Threads. Baca runbook terlebih dahulu."
- **FR-100.7** Keluar dari modal tanpa klik OK = cancel operasi, toggle tetap unchanged
- **FR-100.8** Setelah toggle ON, dashboard menampilkan persistent warning bar: "⚠️ LIVE MODE AKTIF — Verify credentials & runbook."

**Business Logic**
```
IF live_publish_enabled == false:
  All publish operations use dry-run (headless, no form submission)
ELSE IF live_publish_enabled == true:
  Publish operations use real Chromium + form submission
  
Dry-run mode CAN coexist dengan live mode (user can select per-post: future)
For v2.0: global mode toggle (all posts use same mode)
```

**Data Model**
```
Table: settings (new or modify existing)
Columns:
  - id INT PRIMARY KEY
  - key VARCHAR(100) UNIQUE (e.g., 'live_publish_enabled')
  - value TEXT (e.g., 'true' or 'false')
  - updated_at TIMESTAMP
  - updated_by INT (FK: users.id)

Table: audit_log (extend if exists)
Columns:
  - id INT PRIMARY KEY
  - user_id INT (FK: users.id)
  - action VARCHAR(50) (e.g., 'LIVE_MODE_TOGGLE')
  - details TEXT (JSON: {before: false, after: true})
  - timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**API Contract**
```
GET /v1/settings?key=live_publish_enabled
Response 200:
{
  "key": "live_publish_enabled",
  "value": "false",
  "updated_at": "2026-07-25T10:00:00Z"
}

PATCH /v1/settings
Request:
{
  "key": "live_publish_enabled",
  "value": "true"
}
Response 200:
{
  "key": "live_publish_enabled",
  "value": "true",
  "updated_at": "2026-07-25T10:15:00Z"
}

Response 403 (non-admin):
{
  "error": "Unauthorized: admin role required"
}
```

---

### 2.2 FR-200: Media Upload & Validation

**Description**  
Pengguna dapat upload media (gambar) ke editor, dengan validation client-side + server-side.

**Requirements**
- **FR-200.1** Editor form punya button "📎 Attach Media" atau "(+) Add Image"
- **FR-200.2** Click button → file dialog terbuka, user select file(s)
- **FR-200.3** Accepted file types: `image/png`, `image/jpeg`, `image/gif`, `image/webp`
- **FR-200.4** Max files per post: 4
- **FR-200.5** Max file size: 5 MB per file
- **FR-200.6** File validation:
  - Magic bytes check (not just extension) → prevent `.exe` renamed to `.png`
  - MIME type match (Content-Type header)
  - Dimensions: optional (for future image resize feature)
- **FR-200.7** Failed validation → error message: "File harus PNG, JPEG, GIF atau WebP (<5MB)"
- **FR-200.8** Successful upload → thumbnail preview in editor, delete button per media
- **FR-200.9** Media stored locally (v2.0) at `/data/uploads/{uuid}.{ext}`
- **FR-200.10** Media URLs stored in post record: `media_urls: ["https://localhost:3000/media/{uuid}.png", ...]`

**Validation Rules**
| Rule | Check | Action |
|------|-------|--------|
| File size | >5 MB | Reject, show error |
| MIME type | not image/* | Reject, show error |
| Magic bytes | not PNG/JPG/GIF/WebP header | Reject, show error |
| File count | >4 per post | Reject on 5th file |
| Empty file | 0 bytes | Reject |

**Data Model**
```
Modify Table: posts
Add Columns:
  - media_urls TEXT (JSON array: ["url1", "url2"])
  - media_count INT DEFAULT 0
```

**API Contract**
```
POST /v1/posts/upload-media
Request (multipart/form-data):
  - file: <binary>

Response 200:
{
  "media_url": "https://localhost:3000/media/550e8400-e29b-41d4-a716-446655440000.png",
  "file_size": 1024000,
  "mime_type": "image/png"
}

Response 400:
{
  "error": "File size exceeds 5MB limit"
}

Response 415:
{
  "error": "Unsupported media type: file extension .txt not allowed"
}
```

---

### 2.3 FR-300: Media Publishing (Playwright Integration)

**Description**  
Worker dapat publish posts dengan media attachments ke Threads live feed.

**Requirements**
- **FR-300.1** Saat publish, worker membaca `post.media_urls` array dari DB
- **FR-300.2** Untuk setiap media URL: download file ke `/tmp` staging area
- **FR-300.3** Playwright navigasi ke Threads compose page
- **FR-300.4** Find media upload button (file input element)
- **FR-300.5** Upload file via Playwright `file_input.setInputFiles(path)`
- **FR-300.6** Wait for upload progress indicator → disappear (polling/polling strategy)
- **FR-300.7** Verify media thumbnail appear di compose preview
- **FR-300.8** Continue normal submit flow (click submit, wait for success page)
- **FR-300.9** Jika media upload fail: 
  - Retry 2x dengan exponential backoff (1s, 2s)
  - If still fail: publish text-only + log warning "Media upload failed, published as text-only"
- **FR-300.10** Handle edge case: post punya media_urls tapi file sudah deleted → treat as no media, continue

**Playwright Logic Pseudocode**
```javascript
// In worker.js, during publish flow
const post = await getPostById(postId);

if (post.media_urls && post.media_urls.length > 0) {
  for (const mediaUrl of post.media_urls) {
    const fileBuffer = await downloadMedia(mediaUrl);
    const tmpPath = `/tmp/${uuid()}.png`;
    await writeFile(tmpPath, fileBuffer);
    
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      logger.warn(`Media input not found, publishing without media`);
      break;
    }
    
    await fileInput.setInputFiles(tmpPath);
    
    // Poll untuk upload complete
    let uploadComplete = false;
    for (let i = 0; i < 30; i++) { // 30s timeout
      const progressBar = await page.$('.upload-progress'); // selector TBD
      if (!progressBar) {
        uploadComplete = true;
        break;
      }
      await page.waitForTimeout(1000);
    }
    
    if (!uploadComplete) {
      logger.error(`Media upload timeout for ${mediaUrl}`);
      // Retry or fallback
    }
  }
}

// Continue dengan normal submit
const submitButton = await page.$('button[aria-label="Post"]');
await submitButton.click();
// ... rest of flow
```

**Data Model** (no change to schema, uses existing posts.media_urls)

**Error Handling**
```
Media upload fail cases:
1. File not found locally → skip + log warning
2. File download timeout → retry
3. Threads upload timeout → retry 2x, then fallback text-only
4. Selector not found → log error + manual runbook trigger
```

---

### 2.4 FR-400: Publish Audit Trail & History

**Description**  
Setiap publish attempt dicatat dengan metadata (user, timestamp, mode, status, error).

**Requirements**
- **FR-400.1** Insert `publish_history` record **sebelum** publish attempt (initial status = 'pending')
- **FR-400.2** Record kunci: `post_id, user_id, timestamp, mode (live|dry-run), status (pending|success|fail)`
- **FR-400.3** Setelah publish success: update record dengan `status='success', threads_url='...'`
- **FR-400.4** Setelah publish fail: update record dengan `status='fail', error_msg='...'`
- **FR-400.5** Error messages di-sanitize: remove URLs, tokens, credentials
- **FR-400.6** Keep history 90 days, auto-delete older records
- **FR-400.7** Dashboard post card punya "📋 View History" button
- **FR-400.8** Modal history shows:
  - Timeline sorted by timestamp DESC
  - Per attempt: timestamp, mode, status, error_msg (if fail)
  - Success entries: show threads_url as clickable link
- **FR-400.9** Export history to CSV: user, post_id, timestamp, mode, status, url

**Data Model**
```
CREATE TABLE publish_history (
  id SERIAL PRIMARY KEY,
  post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  mode VARCHAR(10) NOT NULL CHECK (mode IN ('live', 'dry-run')),
  status VARCHAR(10) NOT NULL CHECK (status IN ('pending', 'success', 'fail')),
  error_msg TEXT, -- NULL if success
  threads_url VARCHAR(500), -- NULL if fail or pending
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_publish_history_post_id ON publish_history(post_id);
CREATE INDEX idx_publish_history_user_id ON publish_history(user_id);
CREATE INDEX idx_publish_history_timestamp ON publish_history(timestamp DESC);
```

**API Contract**
```
GET /v1/posts/{postId}/history
Query params: ?limit=20&offset=0

Response 200:
{
  "post_id": 123,
  "history": [
    {
      "id": 1,
      "timestamp": "2026-07-25T10:15:00Z",
      "mode": "live",
      "status": "success",
      "threads_url": "https://threads.net/@user/p123456789"
    },
    {
      "id": 2,
      "timestamp": "2026-07-25T09:15:00Z",
      "mode": "dry-run",
      "status": "success",
      "error_msg": null
    },
    {
      "id": 3,
      "timestamp": "2026-07-25T08:15:00Z",
      "mode": "live",
      "status": "fail",
      "error_msg": "Media upload timeout after 2 retries"
    }
  ]
}

GET /v1/posts/{postId}/history/export?format=csv

Response 200 (text/csv):
post_id,user_id,timestamp,mode,status,threads_url,error_msg
123,1,2026-07-25T10:15:00Z,live,success,https://threads.net/@user/p123456789,
123,1,2026-07-25T09:15:00Z,dry-run,success,,
123,1,2026-07-25T08:15:00Z,live,fail,,Media upload timeout
```

**Cleanup Job**
```
Cron: Daily at 00:00 UTC
Query: DELETE FROM publish_history WHERE created_at < NOW() - INTERVAL '90 days'
Log success/rows deleted
```

---

### 2.5 FR-500: Enhanced Error Logging & Retry

**Description**  
Publish failures harus di-log dengan details untuk debugging, dengan automatic retry.

**Requirements**
- **FR-500.1** Setiap error di-log ke `error_log` table atau stdout (JSON format):
  ```json
  {
    "timestamp": "2026-07-25T10:15:00Z",
    "post_id": 123,
    "stage": "media_upload", // login, media_upload, form_fill, submit, etc.
    "error": "Timeout waiting for upload progress",
    "retry_count": 2,
    "user_agent": "Playwright/1.40.1",
    "threads_selector_version": "2026-07-25" // for tracking selector changes
  }
  ```
- **FR-500.2** Retry logic: max 3 attempts, exponential backoff (1s, 2s, 4s)
- **FR-500.3** Jika all retries fail: mark status='fail' + log final error + send notification
- **FR-500.4** Error message sanitization: regex remove credentials/tokens/URLs
- **FR-500.5** Critical errors alert ops team (Slack webhook)
  - "High failure rate detected: 5+ failures in last 10 minutes"
  - "Selector changed: unable to find button after 3 retries"

**Logging Example**
```
// Success case
[PUBLISH] post_id=123 mode=live status=success threads_url=https://threads.net/p123

// Fail with retry
[PUBLISH] post_id=123 mode=live status=fail retry_count=3 final_error="Media timeout" stage="media_upload"

// Selector issue
[ALERT] Threads UI changed: selector 'button[aria-label="Post"]' not found - manual intervention needed
```

---

### 2.6 FR-600: Automated Test Suite — API Layer

**Description**  
API endpoint suite tested dengan Jest + Supertest.

**Requirements**
- **FR-600.1** Test framework: Jest 29+ with `supertest`
- **FR-600.2** Test database: PostgreSQL (separate schema `test_*`) or SQLite `:memory:`
- **FR-600.3** Setup: seed minimal data (1 user, 1 post), teardown truncate tables
- **FR-600.4** Tests cover:
  - Auth endpoints: `/v1/auth/login`, JWT validation, 401 errors
  - Posts CRUD: create, read (single + list), update, cancel, delete
  - Media upload: `/v1/posts/upload-media` success + validation errors
  - Settings: get/patch live_publish_enabled, auth check
  - History: get post history, export CSV
- **FR-600.5** Each test: assert HTTP status, response schema, DB state
- **FR-600.6** Error scenarios tested: 400 (validation), 401 (auth), 403 (permission), 500 (server error)
- **FR-600.7** Coverage: ≥80% of endpoint code
- **FR-600.8** Execution time: <5 minutes
- **FR-600.9** CI integration: GitHub Actions, run on every push, fail if <80% pass rate

**Test File Structure**
```
tests/
  unit/
    auth.test.js          // JWT, encryption
    posts.test.js         // Post model methods
    validation.test.js    // File upload validation
  integration/
    api.test.js           // All endpoints
    workflow.test.js      // Multi-step flows (login → schedule → history)
  fixtures/
    seed.sql              // Test data
  setup.js                // DB connection, teardown hooks
```

**Example Test Case**
```javascript
describe('POST /v1/posts/upload-media', () => {
  it('should upload valid PNG and return media URL', async () => {
    const pngBuffer = /* png binary */;
    const res = await request(app)
      .post('/v1/posts/upload-media')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', pngBuffer, 'test.png');
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('media_url');
    expect(res.body.mime_type).toBe('image/png');
  });
  
  it('should reject file >5MB', async () => {
    const bigFile = Buffer.alloc(6 * 1024 * 1024);
    const res = await request(app)
      .post('/v1/posts/upload-media')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', bigFile, 'big.png');
    
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('exceeds 5MB');
  });
});
```

---

### 2.7 FR-700: Automated Test Suite — Worker/Queue Layer

**Description**  
Worker publish flow tested dengan mock Playwright + Bull.

**Requirements**
- **FR-700.1** Test framework: Jest with `jest-mock-playwright` or equivalent
- **FR-700.2** Mock Playwright browser (don't spawn real Chromium in CI)
- **FR-700.3** Mock Threads responses: 200 success, 401/500 errors
- **FR-700.4** Test scenarios:
  - Happy path: post dry-run success
  - Media success: post with 1+ media dry-run success
  - Media fail → fallback: media upload timeout → publish text-only
  - Retry success: 1st attempt fail network → 2nd attempt success
  - Retry exhausted: 3 attempts fail → status=fail, error logged
  - Selector not found: error + alert triggered
- **FR-700.5** Queue mechanics: Bull queue processing, cron due-scan trigger, worker picks up job
- **FR-700.6** Coverage: ≥70% happy path + fail scenarios
- **FR-700.7** Execution time: <15 minutes
- **FR-700.8** CI integration: run on PR merge (not on every push, optional nightly)

**Example Test Case**
```javascript
describe('Worker: Publish with Media (dry-run)', () => {
  it('should publish post with media in dry-run mode', async () => {
    const mockBrowser = new MockBrowser();
    const post = { id: 1, content: 'Test', media_urls: ['...'] };
    
    const result = await publishWorker(post, { dryRun: true });
    
    expect(result.status).toBe('success');
    expect(mockBrowser.navigate).toHaveBeenCalled();
    expect(mockBrowser.goto).toHaveBeenCalledWith('threads.net/compose');
  });
  
  it('should retry on media upload fail, fallback to text', async () => {
    const mockBrowser = new MockBrowser();
    mockBrowser.uploadMedia = jest.fn()
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce({});
    
    const result = await publishWorker(post, { dryRun: true });
    
    expect(mockBrowser.uploadMedia).toHaveBeenCalledTimes(2);
    expect(result.warning).toContain('published as text-only');
  });
});
```

---

### 2.8 FR-800: Nightly Canary Test (Optional)

**Description**  
Automated test posts published to staging Threads account nightly.

**Requirements**
- **FR-800.1** Cron job: daily 02:00 UTC
- **FR-800.2** Create 2 test posts:
  - 1 text-only: "Automated test post at 02:00 UTC"
  - 1 with media: includes sample image
- **FR-800.3** Publish to staging Threads account (separate credential, encrypted)
- **FR-800.4** Polling untuk success, collect `threads_url`
- **FR-800.5** On success: Slack notification "✅ Canary passed"
- **FR-800.6** On failure: Slack alert with error details "❌ Canary failed: Selector changed"
- **FR-800.7** If staging account credential not configured: skip gracefully, log info
- **FR-800.8** Optional: cleanup test posts after 24 hours
- **FR-800.9** Manual trigger: `npm run canary` for on-demand test

**Canary Job Pseudocode**
```javascript
async function nightly_canary() {
  const stagingCred = await getCredential('staging_threads_account');
  if (!stagingCred) {
    logger.info('Canary skipped: staging credential not configured');
    return;
  }
  
  try {
    const post1 = await create_post('Automated test text', null);
    const post2 = await create_post('Automated test with media', ['/data/samples/test.png']);
    
    await publish(post1, { live: true, credential: stagingCred });
    await publish(post2, { live: true, credential: stagingCred });
    
    await notify_slack('✅ Canary passed');
  } catch (error) {
    await notify_slack(`❌ Canary failed: ${sanitize(error.message)}`);
    throw;
  }
}
```

---

## 3. Non-Functional Requirements

### 3.1 Performance (NFR-100)

| Requirement | Target | Justification |
|-------------|--------|---------------|
| **NFR-100.1** API endpoint latency (p95) | <500ms | User experience: responsive UI |
| **NFR-100.2** Post schedule to publish | <5 min from due time | SLA: on-time publish ±5 min |
| **NFR-100.3** Media upload (5MB) | <30s server-side | User feedback: visible progress |
| **NFR-100.4** Test suite (API unit) | <5 min | CI/CD: fast feedback |
| **NFR-100.5** Test suite (worker integration) | <15 min | CI/CD: acceptable wait time |
| **NFR-100.6** Dashboard load | <2s (cold), <500ms (cached) | UX: fast page load |

**Measurement & Monitoring**
- API: instrument with `response.time` header (server-side)
- Worker: log `publish_duration_ms` to audit trail
- Test: `console.time('publish-flow')` output in logs

---

### 3.2 Scalability (NFR-200)

| Requirement | Target | Justification |
|-------------|--------|---------------|
| **NFR-200.1** Concurrent users | ≥100 (v1: 10) | Growth: 10x expansion |
| **NFR-200.2** Posts queued/day | ≥500 | Peak capacity: scheduler burst |
| **NFR-200.3** Database rows (posts) | ≥50K | 6 months of retention |
| **NFR-200.4** Database rows (publish_history) | ≥1M | 90 days history × 500 posts/day |
| **NFR-200.5** Media storage | ≥100GB (estimate) | 500 posts/day × 4 media × 5MB = ~10GB/month |

**Scaling Strategy**
- Vertical first: upgrade DB, cache, server
- Horizontal (future): load balancer, read replicas, S3 for media

---

### 3.3 Availability & Reliability (NFR-300)

| Requirement | Target | Notes |
|-------------|--------|-------|
| **NFR-300.1** Uptime | 99.5% (~4h/month downtime) | Acceptable for v2.0 |
| **NFR-300.2** Publish SLA | ≥95% on-time (±5 min) | Automation must be reliable |
| **NFR-300.3** MTTR | <1 hour post-incident | Quick recovery from selector changes |
| **NFR-300.4** Retry success | 90% of failed publish recovered on retry | Transient error resilience |
| **NFR-300.5** Test pass rate | ≥90% CI green (allow 10% flaky tolerance) | Developer confidence |

**Monitoring Metrics**
```
POST /v1/metrics (internal endpoint)
{
  "uptime_percent": 99.7,
  "publish_success_rate": 96.2,
  "publish_avg_latency_ms": 45000,
  "test_pass_rate": 92.5,
  "error_rate_1h": 0.8,
  "queue_depth": 23
}
```

---

### 3.4 Security (NFR-400)

| Requirement | Implementation | Owner |
|-------------|----------------|-------|
| **NFR-400.1** Credentials encryption | AES-256 at rest (v1 existing) | Backend |
| **NFR-400.2** JWT expiry | 24h access, 7d refresh (v1 existing) | Auth |
| **NFR-400.3** Media file validation | MIME + magic bytes + size | Upload handler |
| **NFR-400.4** Error message sanitization | Regex remove URLs/tokens | Error handler |
| **NFR-400.5** Audit trail immutable | Insert-only, no delete/update | DB schema |
| **NFR-400.6** Credential rotation | Quarterly manual (runbook) | Ops |
| **NFR-400.7** No hardcoded secrets | Env vars + .env.example | Code review |
| **NFR-400.8** HTTPS only | Force HTTPS in prod | DevOps |

---

### 3.5 Usability (NFR-500)

| Requirement | Implementation |
|-------------|-----------------|
| **NFR-500.1** Live mode prominent | Toggle with icon + warning, dashboard warning bar |
| **NFR-500.2** Upload feedback | Progress bar, file size display, error message |
| **NFR-500.3** History visibility | "View History" button on every post + timeline modal |
| **NFR-500.4** Error messages | User-friendly, no jargon, actionable recovery steps |
| **NFR-500.5** Documentation | Runbook for ops, user guide for features |

---

### 3.6 Compliance (NFR-600)

| Requirement | Implementation |
|-------------|-----------------|
| **NFR-600.1** Threads ToS | No bypass, respect rate limits (1 post/min), user auth |
| **NFR-600.2** Data retention | Keep history 90 days, delete older |
| **NFR-600.3** GDPR compliance | User data export/delete on request |
| **NFR-600.4** Audit logging | Immutable trail of publish actions |

---

## 4. Data Requirements

### 4.1 Database Schema Changes

**New Tables**
```sql
-- Audit trail for settings changes
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action VARCHAR(100), -- e.g., LIVE_MODE_TOGGLE
  details JSONB, -- {before: false, after: true}
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Publish history
CREATE TABLE publish_history (
  id SERIAL PRIMARY KEY,
  post_id INT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  mode VARCHAR(10) CHECK (mode IN ('live', 'dry-run')),
  status VARCHAR(10) CHECK (status IN ('pending', 'success', 'fail')),
  error_msg TEXT,
  threads_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_publish_history_post_id ON publish_history(post_id);
CREATE INDEX idx_publish_history_timestamp ON publish_history(timestamp DESC);
```

**Modified Tables**
```sql
-- Add to posts table
ALTER TABLE posts ADD COLUMN media_urls JSONB DEFAULT '[]';
ALTER TABLE posts ADD COLUMN media_count INT DEFAULT 0;

-- Add settings table (if new)
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT REFERENCES users(id)
);

INSERT INTO settings (key, value) VALUES ('live_publish_enabled', 'false');
```

### 4.2 Data Migration

**Migration Script** (Knex migration file: `migrations/2026-07-25-add-media-support.js`)
```javascript
exports.up = async function(knex) {
  await knex.schema.createTable('publish_history', (table) => {
    table.increments('id').primary();
    table.integer('post_id').notNullable().references('posts.id').onDelete('CASCADE');
    table.integer('user_id').references('users.id');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.enum('mode', ['live', 'dry-run']);
    table.enum('status', ['pending', 'success', 'fail']);
    table.text('error_msg').nullable();
    table.string('threads_url', 500).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('post_id');
    table.index('timestamp');
  });
  
  // Add columns to posts
  await knex.schema.alterTable('posts', (table) => {
    table.jsonb('media_urls').defaultTo('[]');
    table.integer('media_count').defaultTo(0);
  });
  
  // Create settings table
  await knex.schema.createTable('settings', (table) => {
    table.increments('id').primary();
    table.string('key', 100).unique().notNullable();
    table.text('value').nullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.integer('updated_by').references('users.id');
  });
  
  await knex('settings').insert({ key: 'live_publish_enabled', value: 'false' });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('publish_history');
  await knex.schema.dropTable('settings');
  await knex.schema.alterTable('posts', (table) => {
    table.dropColumn('media_urls');
    table.dropColumn('media_count');
  });
};
```

---

## 5. Integration Points

### 5.1 External Services

| Service | Integration | v2.0 Status |
|---------|-------------|-------------|
| **Threads (Meta)** | Web automation (Playwright) | Existing (enhanced) |
| **SendGrid** (optional) | Email notifications | v1 existing, conditional |
| **Slack** (optional) | Ops alerts (canary, errors) | New in v2.0 |
| **PostgreSQL** | Primary data store | Existing (schema extended) |
| **Redis** | Queue (Bull) | Existing (no change) |

### 5.2 API Dependencies

- **Playwright API**: Browser automation, file input handling
- **Bull QueueAPI**: Job scheduling, queue management
- **Node.js fs module**: Local media file storage
- **Express.js**: REST API server

---

## 6. Constraints & Assumptions

### 6.1 Assumptions

- ✅ PostgreSQL 14+ available (v1 baseline)
- ✅ Chromium/Playwright can be installed (v1 baseline)
- ✅ User has active Threads account (auth prerequisite)
- ⚠️ Threads UI selectors remain relatively stable (risk: see Risk Register in PRD)
- ✅ Local disk storage acceptable (future: S3 migration)
- ⚠️ Staging Threads account available for canary (ops setup, Week 1)

### 6.2 Constraints

- **Rate limit**: Max 1 post per minute to Threads (Threads platform limit)
- **Media size**: Max 5MB per file (Threads+browser limits)
- **Media count**: Max 4 per post (Threads limit)
- **Credential storage**: Cannot be modified without encryption
- **Audit trail**: Immutable (insert-only, no rollback)
- **Test DB**: Must be isolated from production (no shared data)

---

## 7. Quality Assurance & Testing

### 7.1 Test Strategy

| Level | Tool | Coverage | Trigger |
|-------|------|----------|---------|
| **Unit** | Jest | Services, models, validation | Every push |
| **Integration** | Jest + Supertest + Mock | API endpoints, workflows | Every push |
| **Worker** | Jest + Mock Playwright | Dry-run flow | Every push or nightly |
| **E2E** (optional) | Playwright real | Live canary | Nightly (staging account) |

### 7.2 Acceptance Criteria (Definition of Done per Story)

All stories must meet:
1. ✅ Acceptance criteria testable
2. ✅ Works in dry-run AND live (or explicitly dry-run only)
3. ✅ Credentials encrypted, auth checked
4. ✅ Failure path + retry + notification
5. ✅ DB migration included
6. ✅ Automated tests in DoD
7. ✅ ToS/security risks noted

---

## 8. Deployment & Rollout

### 8.1 Deployment Checklist

- [ ] Code review approved (GitHub PR)
- [ ] All tests pass (CI green)
- [ ] Database migration tested (local → staging)
- [ ] Staging environment: full QA pass
- [ ] Runbook prepared (ops troubleshooting)
- [ ] Release notes written (user-facing + technical)
- [ ] Secrets rotated/verified (JWT, encryption keys)
- [ ] Documentation updated (settings, media upload, history)
- [ ] Monitoring alerts configured (test pass rate, publish success rate)

### 8.2 Rollback Procedure

If publish success rate <90% OR test failures >5%:
1. `git revert <commit hash>` (or hotfix branch)
2. `npm run db:migrate:rollback` (revert schema)
3. Restart app/workers
4. Incident postmortem (what broke, why, prevention)

---

## 9. Documentation & Runbooks

### 9.1 User Documentation (in separate docs)

- **Settings**: How to enable live publish mode (admin-only)
- **Media upload**: File types, size limits, best practices
- **Publish history**: How to view, interpret, export
- **Error messages**: Troubleshooting common publish failures

### 9.2 Ops Runbooks

- **Selector changed**: Steps to update Playwright selectors
- **Credential rotation**: How to refresh Threads login
- **Canary failed**: Debug canary post, check staging account
- **High failure rate**: Investigation steps, escalation

---

## 10. Glossary

| Term | Definition |
|------|-----------|
| **Dry-run** | Publish flow simulated (no real form submission) |
| **Live** | Real publish to Threads (form submitted) |
| **Media** | Image attachment (PNG, JPEG, GIF, WebP) |
| **Publish history** | Audit trail of all publish attempts per post |
| **Canary** | Automated test posts to staging account |
| **Selector** | CSS/XPath identifier for HTML elements (Threads form fields) |
| **Magic bytes** | File signature (binary header) to verify file type |
| **MTTR** | Mean Time To Recovery (incident resolution speed) |

---

## 11. Sign-Off & Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product | Dozer (CEO) | — | 2026-07-25 |
| Tech Lead | Dozer (Tech Lead) | — | 2026-07-25 |
| QA | TBD | — | TBD |
| DevOps | TBD | — | TBD |

---

**Document Owner:** Dozer (CEO + Tech Lead)  
**Version History:**
- v2.0 (25 Jul 2026): Live Publish + Media + Tests
- v1.0 (22 Jun 2026): Original MVP spec

**Related Documents:**
- PRD-v2.0-Live-Publish-Media.md (business requirements)
- SDD-v2.0-System-Design.md (technical architecture)
- NEXT-PRD-BRIEF.md (strategy + context)
