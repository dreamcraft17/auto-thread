# SDD v2.0 — System Design Document
## Threads Automation: Live Publish & Media Architecture

**Versi** | 2.0  
**Tanggal** | 25 Juli 2026  
**Status** | Ready for Implementation  
**Audience** | Architects, Backend/Frontend/DevOps engineers, Tech Lead

---

## 1. Architecture Overview

### 1.1 High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│  Editor | Dashboard | Settings | History Modal                   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API SERVER (Express)                          │
│  /v1/auth | /v1/posts | /v1/upload-media | /v1/settings         │
│  /v1/posts/{id}/history                                          │
└────────────┬─────────────────────────┬──────────────────────────┘
             │                         │
      ┌──────▼──────────┐     ┌───────▼─────────┐
      │  PostgreSQL DB  │     │   Redis Queue   │
      │  - posts        │     │   - Bull jobs   │
      │  - users        │     │   - cron scan   │
      │  - settings     │     └──────────┬──────┘
      │  - audit_log    │                │
      │  - history      │                ▼
      └────────────────┘     ┌───────────────────┐
                             │  WORKER (Node.js) │
                             │  Playwright Bot   │
                             └────────┬──────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                ┌───▼────┐    ┌──────▼──────┐   ┌─────▼─────┐
                │ /tmp/   │    │  Threads    │   │ Slack     │
                │ media   │    │  (Meta web) │   │ (alerts)  │
                └────────┘    └─────────────┘   └───────────┘

v2.0 Changes:
- New: Publish history table + audit log
- New: Media upload API + /data/uploads storage
- New: Settings table (live_publish_enabled flag)
- Enhanced: Worker includes media attach logic
- Enhanced: Error logging + retry resilience
```

### 1.2 Component Interactions

```
User schedules post with media
  │
  ├─→ Frontend: POST /v1/posts (content + media_urls)
  │     │
  │     └─→ API: Validate content, store in posts table
  │           (media_urls: JSON array)
  │
Cron due-scan (every 5 min)
  │
  ├─→ API: Query posts WHERE status='scheduled' AND due_at <= NOW()
  │
  ├─→ Bull queue: Push job {post_id, mode: 'live|dry-run'}
  │
Worker processes job
  │
  ├─→ Fetch post + media_urls from DB
  │
  ├─→ IF live_publish_enabled AND mode='live':
  │     │
  │     ├─→ Download media from /data/uploads/{uuid}
  │     │
  │     ├─→ Playwright: Launch Chromium, navigate Threads
  │     │
  │     ├─→ Attach media (file input)
  │     │
  │     ├─→ Fill form, submit post
  │     │
  │     ├─→ Retry logic (3x, exponential backoff)
  │     │
  │     └─→ Capture threads_url
  │   ELSE:
  │     └─→ Dry-run: simulate without form submit
  │
  ├─→ Insert publish_history record (success/fail)
  │
  ├─→ Update posts.status = 'published'
  │
  ├─→ IF fail: Alert ops (Slack)
  │
UI Dashboard
  │
  ├─→ Display post status: "Published ✓"
  │
  └─→ "View History" link shows timeline of attempts
```

---

## 2. Technology Stack

### 2.1 Backend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Runtime** | Node.js | 18+ | JavaScript server |
| **API Framework** | Express.js | 4.18+ | REST API server |
| **Database** | PostgreSQL | 14+ | Primary data store |
| **ORM/Query** | Knex.js | 2.5+ | DB migrations & queries |
| **Queue** | Bull (Redis) | 4.10+ | Job queue + cron |
| **Browser Automation** | Playwright | 1.40+ | Web automation for Threads |
| **Auth** | JWT (jsonwebtoken) | 9.0+ | Stateless auth |
| **Crypto** | crypto (Node.js native) | 18+ | Credential encryption (AES-256) |
| **Env** | dotenv | 16.0+ | Configuration management |

### 2.2 Frontend

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | React | 18+ | UI library |
| **Build Tool** | Vite | 4.0+ | Fast bundling |
| **UI Library** | Material-UI (MUI) | 5.0+ | Component library |
| **HTTP Client** | Axios | 1.4+ | API calls |
| **State** | React hooks | 18+ | Component state |
| **Testing** | Jest | 29+ | Unit testing |

### 2.3 DevOps & Testing

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Testing Framework** | Jest | 29+ | Unit + integration tests |
| **API Testing** | Supertest | 6.3+ | HTTP endpoint testing |
| **Mock Library** | jest-mock-playwright | — | Mock Playwright in tests |
| **CI/CD** | GitHub Actions | — | Automated testing + deployment |
| **Container** | Docker | 20.10+ | Containerization (future) |
| **Logging** | console.log + JSON files | — | Structured logging |

---

## 3. Backend Architecture

### 3.1 Project Structure

```
threads-automation/
├── src/
│   ├── index.js                    # Entry point
│   ├── app.js                      # Express app setup
│   │
│   ├── config/
│   │   ├── database.js             # Knex + PostgreSQL
│   │   ├── redis.js                # Redis connection
│   │   └── env.js                  # Environment vars
│   │
│   ├── routes/
│   │   ├── auth.js                 # /v1/auth/*
│   │   ├── posts.js                # /v1/posts/* + /upload-media
│   │   ├── settings.js             # /v1/settings
│   │   └── history.js              # /v1/posts/{id}/history
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── postsController.js      # NEW: upload media handling
│   │   ├── settingsController.js   # NEW: live mode toggle
│   │   └── historyController.js    # NEW: publish history
│   │
│   ├── middleware/
│   │   ├── auth.js                 # JWT verification
│   │   ├── errorHandler.js         # Error sanitization
│   │   └── uploadHandler.js        # NEW: media upload validation
│   │
│   ├── models/
│   │   ├── User.js
│   │   ├── Post.js                 # Extended: media_urls, media_count
│   │   ├── PublishHistory.js       # NEW
│   │   └── Settings.js             # NEW
│   │
│   ├── services/
│   │   ├── authService.js          # Credential encryption/JWT
│   │   ├── postsService.js
│   │   ├── mediaService.js         # NEW: file handling, storage
│   │   ├── publishService.js       # NEW: orchestrate publish flow
│   │   └── settingsService.js      # NEW: get/set live mode
│   │
│   ├── workers/
│   │   ├── publishWorker.js        # NEW: Playwright integration
│   │   ├── playwrightUtils.js      # NEW: selectors, flow logic
│   │   └── retryLogic.js           # NEW: exponential backoff
│   │
│   ├── jobs/
│   │   ├── duePostsScan.js         # Cron: find due posts
│   │   └── nightlyCanary.js        # NEW: canary job
│   │
│   ├── utils/
│   │   ├── validators.js           # NEW: file validation
│   │   ├── sanitizer.js            # NEW: error message cleanup
│   │   ├── logger.js               # JSON logging
│   │   └── encryption.js           # Credential encryption (v1)
│   │
│   └── data/
│       └── uploads/                # NEW: local media storage
│
├── migrations/
│   └── 2026-07-25-add-media-support.js  # NEW: DB schema
│
├── tests/
│   ├── unit/
│   │   ├── auth.test.js
│   │   ├── posts.test.js
│   │   ├── upload.test.js          # NEW
│   │   └── validators.test.js      # NEW
│   │
│   ├── integration/
│   │   ├── api.test.js
│   │   ├── workflow.test.js
│   │   ├── worker.test.js          # NEW
│   │   └── history.test.js         # NEW
│   │
│   ├── fixtures/
│   │   ├── seed.sql
│   │   └── mockData.js             # NEW: test data
│   │
│   └── setup.js                    # Test DB setup
│
├── docs/
│   ├── RUNBOOK.md                  # NEW: ops guide
│   ├── API.md                      # NEW: endpoint docs
│   └── ARCHITECTURE.md             # This file
│
├── .env.example
├── .github/
│   └── workflows/
│       └── test.yml                # GitHub Actions CI
│
└── package.json
```

### 3.2 API Endpoints (v2.0 Enhanced)

**Authentication** (v1 existing)
```
POST /v1/auth/login
POST /v1/auth/logout
POST /v1/auth/refresh
```

**Posts** (v1 existing + enhanced)
```
GET /v1/posts                      # List user's posts
GET /v1/posts/{id}                 # Get single post (+ media_urls)
POST /v1/posts                     # Create post (accept media_urls)
PATCH /v1/posts/{id}               # Update post
DELETE /v1/posts/{id}              # Cancel post
POST /v1/posts/bulk-import         # CSV import (v1)
```

**Media** (NEW v2.0)
```
POST /v1/posts/upload-media        # Upload file → return URL
GET /v1/media/{uuid}               # Serve file (static)
```

**Settings** (NEW v2.0)
```
GET /v1/settings?key=live_publish_enabled
PATCH /v1/settings                 # Toggle live mode
```

**History** (NEW v2.0)
```
GET /v1/posts/{id}/history         # Get publish attempts
GET /v1/posts/{id}/history/export?format=csv
```

**Dashboard** (v1 existing, enhanced)
```
GET /v1/dashboard                  # Stats + queue depth
```

### 3.3 Core Services (Detailed)

#### 3.3.1 Media Service (NEW)

**File: `src/services/mediaService.js`**

```javascript
class MediaService {
  // Upload + validate file
  async uploadMedia(file, userId) {
    // 1. Validate: size, MIME type, magic bytes
    this.validateFile(file);
    
    // 2. Generate UUID filename
    const uuid = generateUUID();
    const ext = path.extname(file.originalname);
    const filename = `${uuid}${ext}`;
    const filepath = `/data/uploads/${filename}`;
    
    // 3. Save to disk
    await fs.promises.writeFile(filepath, file.buffer);
    
    // 4. Return URL
    return {
      media_url: `https://localhost:3000/media/${filename}`,
      file_size: file.size,
      mime_type: file.mimetype
    };
  }
  
  // Validate file before storage
  validateFile(file) {
    // Size check
    if (file.size > 5 * 1024 * 1024) {
      throw new ValidationError('File exceeds 5MB limit');
    }
    
    // Whitelist MIME types
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      throw new ValidationError('Unsupported media type');
    }
    
    // Magic bytes check (file signature)
    const magicBytes = file.buffer.slice(0, 12);
    if (!this.isMagicBytesValid(magicBytes, file.mimetype)) {
      throw new ValidationError('File corrupted or mismatched type');
    }
  }
  
  // Verify file signature
  isMagicBytesValid(bytes, mimetype) {
    const signatures = {
      'image/png': Buffer.from([0x89, 0x50, 0x4E, 0x47]), // PNG
      'image/jpeg': Buffer.from([0xFF, 0xD8, 0xFF]), // JPEG
      'image/gif': Buffer.from([0x47, 0x49, 0x46]), // GIF
      'image/webp': Buffer.from([0x52, 0x49, 0x46, 0x46]) // WEBP
    };
    
    const sig = signatures[mimetype];
    return sig && bytes.slice(0, sig.length).equals(sig);
  }
  
  // Download media for publishing
  async downloadMedia(mediaUrl) {
    const uuid = mediaUrl.match(/\/media\/(\w+\.[\w]+)$/)[1];
    const filepath = `/data/uploads/${uuid}`;
    
    const exists = await fs.promises.stat(filepath).catch(() => null);
    if (!exists) {
      throw new Error(`Media file not found: ${uuid}`);
    }
    
    return filepath; // Return local path for Playwright
  }
  
  // Cleanup old uploads (cron job)
  async cleanupOldUploads(daysOld = 30) {
    const uploadDir = '/data/uploads';
    const files = await fs.promises.readdir(uploadDir);
    
    for (const file of files) {
      const filepath = path.join(uploadDir, file);
      const stat = await fs.promises.stat(filepath);
      const age = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24); // days
      
      if (age > daysOld) {
        await fs.promises.unlink(filepath);
        logger.info(`Deleted old upload: ${file}`);
      }
    }
  }
}
```

#### 3.3.2 Publish Service (NEW)

**File: `src/services/publishService.js`**

Orchestrates publish flow: fetch post, download media, run worker, handle errors.

```javascript
class PublishService {
  // Main publish orchestration
  async publishPost(postId, mode = 'dry-run') {
    let historyId;
    
    try {
      // 1. Create pending history record
      historyId = await this.db('publish_history').insert({
        post_id: postId,
        user_id: post.user_id,
        mode,
        status: 'pending'
      });
      
      // 2. Fetch post + media
      const post = await Post.find(postId);
      const mediaFiles = post.media_urls ? 
        await Promise.all(
          post.media_urls.map(url => this.mediaService.downloadMedia(url))
        ) : [];
      
      // 3. Get live mode setting
      const liveEnabled = await settingsService.isLivePublishEnabled();
      const actualMode = (liveEnabled && mode === 'live') ? 'live' : 'dry-run';
      
      // 4. Run publish worker (with retry)
      const result = await this.runPublishWorker(post, mediaFiles, actualMode);
      
      // 5. Update history record (success)
      await this.db('publish_history')
        .where('id', historyId)
        .update({
          status: 'success',
          threads_url: result.threads_url
        });
      
      // 6. Update post status
      await Post.update(postId, {
        status: 'published',
        published_at: new Date()
      });
      
      logger.info(`Published post ${postId} (${actualMode}): ${result.threads_url}`);
      
      return result;
      
    } catch (error) {
      // Handle failure
      const sanitized = this.sanitizeError(error.message);
      
      await this.db('publish_history')
        .where('id', historyId)
        .update({
          status: 'fail',
          error_msg: sanitized
        });
      
      await Post.update(postId, { status: 'failed' });
      
      // Alert ops on critical error
      if (this.isCriticalError(error)) {
        await this.notifyOps(`Publish failed: ${sanitized}`);
      }
      
      throw error;
    }
  }
  
  // Retry logic wrapper
  async runPublishWorker(post, mediaFiles, mode, retryCount = 0) {
    const maxRetries = 3;
    const backoffMs = 1000 * Math.pow(2, retryCount);
    
    try {
      // Actually call the worker
      return await publishWorker.publish(post, mediaFiles, mode);
      
    } catch (error) {
      if (retryCount < maxRetries && this.isRetryable(error)) {
        logger.warn(`Retry ${retryCount + 1}/${maxRetries} for post ${post.id}`);
        await sleep(backoffMs);
        return this.runPublishWorker(post, mediaFiles, mode, retryCount + 1);
      }
      
      throw error;
    }
  }
  
  // Sanitize error messages (no secrets)
  sanitizeError(msg) {
    return msg
      .replace(/https?:\/\/[^\s]+/g, '[URL]') // Remove URLs
      .replace(/Bearer\s+\w+/g, '[TOKEN]') // Remove auth tokens
      .replace(/password[=:]\w+/gi, 'password=[REDACTED]')
      .slice(0, 200); // Truncate
  }
}
```

#### 3.3.3 Settings Service (NEW)

**File: `src/services/settingsService.js`**

```javascript
class SettingsService {
  async isLivePublishEnabled() {
    const setting = await this.db('settings')
      .where('key', 'live_publish_enabled')
      .first();
    
    return setting?.value === 'true';
  }
  
  async setLivePublishEnabled(value, userId) {
    await this.db('settings')
      .where('key', 'live_publish_enabled')
      .update({
        value: value ? 'true' : 'false',
        updated_at: new Date(),
        updated_by: userId
      });
    
    // Audit log
    await this.db('audit_log').insert({
      user_id: userId,
      action: 'LIVE_MODE_TOGGLE',
      details: JSON.stringify({ 
        before: !value,
        after: value,
        timestamp: new Date().toISOString()
      })
    });
    
    logger.info(`Live mode toggled to ${value} by user ${userId}`);
  }
}
```

### 3.4 Worker & Playwright Integration (NEW)

**File: `src/workers/publishWorker.js`**

```javascript
class PublishWorker {
  async publish(post, mediaFiles, mode = 'dry-run') {
    let browser = null;
    
    try {
      // 1. Launch browser
      browser = await chromium.launch({
        headless: true,
        args: ['--disable-dev-shm-usage'] // For Linux
      });
      
      const context = await browser.newContext();
      const page = await context.newPage();
      
      // 2. Login to Threads (reuse v1 logic)
      await this.loginThreads(page, post.user_id);
      
      // 3. Navigate to compose
      await page.goto('https://threads.net/compose', { waitUntil: 'networkidle' });
      
      // 4. Fill content
      const contentField = await page.$('[data-testid="content-input"]'); // Selector TBD
      await contentField.fill(post.content);
      
      // 5. Attach media (if applicable)
      if (mediaFiles && mediaFiles.length > 0) {
        await this.attachMedia(page, mediaFiles, mode);
      }
      
      // 6. Submit post
      if (mode === 'live') {
        const submitBtn = await page.$('button:has-text("Post")');
        await submitBtn.click();
        
        // Wait for success page or URL change
        await page.waitForNavigation({ waitUntil: 'networkidle' });
        const threadsUrl = page.url();
        
        return { success: true, threads_url: threadsUrl };
      } else {
        // Dry-run: just verify form is ready
        logger.info(`[DRY-RUN] Post ready to submit: "${post.content.slice(0, 50)}..."`);
        return { success: true, threads_url: null };
      }
      
    } finally {
      if (browser) await browser.close();
    }
  }
  
  async attachMedia(page, mediaFiles, mode) {
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      logger.warn('Media input not found, skipping media attach');
      return;
    }
    
    for (const mediaPath of mediaFiles) {
      try {
        // Set files (supports multiple)
        await fileInput.setInputFiles(mediaPath);
        
        if (mode === 'live') {
          // Poll for upload complete
          let uploadDone = false;
          for (let i = 0; i < 30; i++) { // 30s timeout
            const progress = await page.$('[data-testid="upload-progress"]');
            if (!progress) {
              uploadDone = true;
              break;
            }
            await page.waitForTimeout(1000);
          }
          
          if (!uploadDone) {
            throw new Error(`Media upload timeout for ${mediaPath}`);
          }
        }
        
        logger.info(`Media attached: ${path.basename(mediaPath)}`);
        
      } catch (error) {
        logger.error(`Failed to attach media: ${error.message}`);
        // Continue with text-only publish
        if (mode === 'live') {
          throw new Error(`Media attach failed: ${error.message} (fallback: text-only)`);
        }
      }
    }
  }
  
  async loginThreads(page, userId) {
    // Reuse v1 login logic with encrypted credentials
    // ...
  }
}
```

### 3.5 Job Scheduling (NEW)

**File: `src/jobs/duePostsScan.js`**

```javascript
// Cron: every 5 minutes
async function scanDuePosts() {
  const now = new Date();
  
  const duePosts = await db('posts')
    .where('status', 'scheduled')
    .where('due_at', '<=', now);
  
  for (const post of duePosts) {
    // Determine mode (live or dry-run from settings)
    const liveEnabled = await settingsService.isLivePublishEnabled();
    const mode = liveEnabled ? 'live' : 'dry-run';
    
    // Push to queue
    const queue = new Bull('publish', { 
      redis: redisConfig 
    });
    
    await queue.add(
      { postId: post.id, mode },
      { delay: 0, attempts: 1 }
    );
    
    logger.info(`Queued post ${post.id} for publishing (${mode})`);
  }
}

// Cron setup
const job = cron.schedule('*/5 * * * *', scanDuePosts);
```

**File: `src/jobs/nightlyCanary.js`** (NEW)

```javascript
async function nightly_canary() {
  const stagingCred = await credentialService.get('staging_threads_account');
  
  if (!stagingCred) {
    logger.info('Canary skipped: staging credential not configured');
    return;
  }
  
  try {
    // Create 2 test posts
    const post1 = await Post.create({
      user_id: SYSTEM_USER_ID,
      content: `Automated test post at ${new Date().toISOString()}`,
      scheduled_at: new Date(),
      media_urls: []
    });
    
    const post2 = await Post.create({
      user_id: SYSTEM_USER_ID,
      content: `Automated media test at ${new Date().toISOString()}`,
      scheduled_at: new Date(),
      media_urls: ['https://localhost:3000/media/sample.png']
    });
    
    // Publish with staging credential
    const result1 = await publishService.publishPost(post1.id, 'live');
    const result2 = await publishService.publishPost(post2.id, 'live');
    
    // Notify success
    await slackService.send({
      channel: '#ops',
      text: '✅ Canary passed - live publish working'
    });
    
    // Cleanup test posts (optional)
    await Post.delete(post1.id);
    await Post.delete(post2.id);
    
  } catch (error) {
    await slackService.send({
      channel: '#ops',
      text: `❌ Canary failed: ${sanitizeError(error.message)}`
    });
    throw error;
  }
}

// Cron: daily at 02:00 UTC
cron.schedule('0 2 * * *', nightly_canary);
```

---

## 4. Frontend Architecture

### 4.1 Component Structure

```
src/
├── components/
│   ├── Editor/
│   │   ├── PostEditor.jsx
│   │   ├── MediaUploader.jsx        # NEW
│   │   └── MediaPreview.jsx         # NEW
│   │
│   ├── Dashboard/
│   │   ├── Dashboard.jsx
│   │   ├── PostCard.jsx             # Enhanced: history button
│   │   └── HistoryModal.jsx         # NEW
│   │
│   ├── Settings/
│   │   ├── Settings.jsx
│   │   └── LiveModeToggle.jsx       # NEW
│   │
│   └── Common/
│       ├── Header.jsx
│       └── ErrorBoundary.jsx
│
├── services/
│   ├── api.js                       # Axios instance
│   ├── authService.js
│   ├── postService.js               # Enhanced
│   ├── mediaService.js              # NEW
│   └── settingsService.js           # NEW
│
├── hooks/
│   ├── useAuth.js
│   ├── usePosts.js
│   ├── useMediaUpload.js            # NEW
│   └── useSettings.js               # NEW
│
├── styles/
│   ├── theme.js                     # MUI theme
│   └── globals.css
│
└── App.jsx
```

### 4.2 Key Components (NEW/Enhanced)

#### 4.2.1 Media Uploader Component

**File: `src/components/Editor/MediaUploader.jsx`**

```jsx
import React, { useState, useCallback } from 'react';
import { Box, Button, Typography, LinearProgress } from '@mui/material';
import { useMediaUpload } from '../../hooks/useMediaUpload';

export function MediaUploader({ onMediaUrlsChange, maxFiles = 4 }) {
  const [files, setFiles] = useState([]);
  const { upload, loading, error } = useMediaUpload();
  
  const handleFileSelect = useCallback(async (event) => {
    const selectedFiles = Array.from(event.target.files);
    
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`Max ${maxFiles} files allowed`);
      return;
    }
    
    // Upload each file
    const urls = [];
    for (const file of selectedFiles) {
      try {
        const { media_url } = await upload(file);
        urls.push(media_url);
        setFiles(prev => [...prev, { url: media_url, name: file.name }]);
      } catch (err) {
        alert(`Upload failed: ${error}`);
      }
    }
    
    onMediaUrlsChange([...files.map(f => f.url), ...urls]);
  }, [files, upload, error]);
  
  const handleRemove = (index) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onMediaUrlsChange(updated.map(f => f.url));
  };
  
  return (
    <Box sx={{ my: 2 }}>
      <Button
        variant="outlined"
        component="label"
        disabled={files.length >= maxFiles || loading}
      >
        📎 {loading ? 'Uploading...' : 'Attach Media'}
        <input
          type="file"
          hidden
          multiple
          accept="image/*"
          onChange={handleFileSelect}
        />
      </Button>
      
      {loading && <LinearProgress sx={{ mt: 1 }} />}
      
      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
        {files.map((file, idx) => (
          <Box key={idx} sx={{ position: 'relative' }}>
            <img
              src={file.url}
              alt={file.name}
              style={{ width: 100, height: 100, objectFit: 'cover' }}
            />
            <Button
              size="small"
              onClick={() => handleRemove(idx)}
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                minWidth: 'auto'
              }}
            >
              ✕
            </Button>
          </Box>
        ))}
      </Box>
      
      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
        {files.length}/{maxFiles} files · Max 5MB each · PNG, JPEG, GIF, WebP
      </Typography>
    </Box>
  );
}
```

#### 4.2.2 Live Mode Toggle Component

**File: `src/components/Settings/LiveModeToggle.jsx`**

```jsx
import React, { useState } from 'react';
import {
  Box,
  Switch,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert
} from '@mui/material';
import { useSettings } from '../../hooks/useSettings';

export function LiveModeToggle() {
  const { liveEnabled, toggleLiveMode } = useSettings();
  const [openDialog, setOpenDialog] = useState(false);
  const [tempValue, setTempValue] = useState(liveEnabled);
  
  const handleToggle = (event) => {
    if (event.target.checked && !liveEnabled) {
      // Toggling ON → show warning
      setTempValue(true);
      setOpenDialog(true);
    } else {
      // Toggling OFF → direct update
      toggleLiveMode(false);
    }
  };
  
  const handleConfirm = async () => {
    await toggleLiveMode(tempValue);
    setOpenDialog(false);
  };
  
  return (
    <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography variant="h6">🔴 Live Publish Mode</Typography>
          <Typography variant="body2" color="textSecondary">
            Enable to publish posts directly to Threads
          </Typography>
        </Box>
        <Switch
          checked={liveEnabled}
          onChange={handleToggle}
          inputProps={{ 'aria-label': 'live-mode-toggle' }}
        />
      </Box>
      
      {liveEnabled && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          ⚠️ LIVE MODE ACTIVE — Posts will be published to Threads immediately.
          Make sure you've verified credentials and read the runbook.
        </Alert>
      )}
      
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Enable Live Publish Mode?</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Publishing will send content DIRECTLY to Threads. Please read the runbook
            before continuing.
          </Alert>
          <Typography>
            I understand and have read the documentation:
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleConfirm} variant="contained" color="error">
            Enable Live Mode
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

#### 4.2.3 History Modal Component

**File: `src/components/Dashboard/HistoryModal.jsx`**

```jsx
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
  Chip
} from '@mui/material';
import { postService } from '../../services/postService';

export function HistoryModal({ postId, open, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (open && postId) {
      loadHistory();
    }
  }, [open, postId]);
  
  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await postService.getPublishHistory(postId);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleExport = async () => {
    const csv = await postService.exportHistoryCSV(postId);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(csv);
    link.download = `history_${postId}.csv`;
    link.click();
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Publish History</DialogTitle>
      <DialogContent>
        <Table size="small" sx={{ mt: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                <TableCell>
                  <Chip
                    label={item.mode}
                    size="small"
                    color={item.mode === 'live' ? 'error' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.status}
                    size="small"
                    color={item.status === 'success' ? 'success' : 'error'}
                  />
                </TableCell>
                <TableCell>
                  {item.status === 'success' && item.threads_url ? (
                    <a href={item.threads_url} target="_blank" rel="noopener">
                      View →
                    </a>
                  ) : item.error_msg ? (
                    <span title={item.error_msg}>{item.error_msg.slice(0, 20)}...</span>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
      <Box sx={{ p: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button onClick={handleExport}>📥 Export CSV</Button>
        <Button onClick={onClose}>Close</Button>
      </Box>
    </Dialog>
  );
}
```

---

## 5. Database Schema (v2.0)

### 5.1 New Tables

```sql
-- Publish history
CREATE TABLE publish_history (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  mode VARCHAR(10) NOT NULL CHECK (mode IN ('live', 'dry-run')),
  status VARCHAR(10) NOT NULL CHECK (status IN ('pending', 'success', 'fail')),
  error_msg TEXT,
  threads_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_publish_history_post_id ON publish_history(post_id);
CREATE INDEX idx_publish_history_user_id ON publish_history(user_id);
CREATE INDEX idx_publish_history_timestamp ON publish_history(timestamp DESC);

-- Settings
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

-- Audit log
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100),
  details JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
```

### 5.2 Modified Tables

```sql
-- Extend posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_count INTEGER DEFAULT 0;

-- Add foreign key if missing
ALTER TABLE posts ADD CONSTRAINT fk_posts_user
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE CASCADE;
```

### 5.3 Indexes (Performance)

```sql
-- Posts
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status_due_at ON posts(status, due_at);

-- Publish history
CREATE INDEX idx_ph_post_status ON publish_history(post_id, status);
CREATE INDEX idx_ph_user_created ON publish_history(user_id, created_at DESC);

-- Settings
CREATE INDEX idx_settings_key ON settings(key);
```

---

## 6. Error Handling & Resilience

### 6.1 Retry Strategy

```
Publish attempt → Fail (transient error)
  │
  ├─ Retry count < 3? → YES
  │   │
  │   └─ Backoff = 1s * 2^(retry_count)
  │       ├─ Retry 1: wait 1s
  │       ├─ Retry 2: wait 2s
  │       └─ Retry 3: wait 4s
  │
  └─ All retries exhausted? → YES
      │
      └─ Mark failed, notify ops
```

### 6.2 Error Categories

| Error Type | Example | Retryable? | Action |
|-----------|---------|-----------|--------|
| **Transient** | Network timeout | ✅ YES | Retry with backoff |
| **Selector changed** | Button not found | ❌ NO | Alert ops, manual fix |
| **Credential invalid** | Login failed | ❌ NO | Manual credential update |
| **Rate limit** | 429 from Threads | ✅ YES | Retry with longer backoff |
| **Media upload fail** | Timeout on media | ✅ YES | Retry, fallback text-only |
| **Validation error** | Invalid post content | ❌ NO | Mark failed, notify user |

### 6.3 Logging & Monitoring

```javascript
// Structured logging (JSON)
logger.info({
  event: 'publish_success',
  post_id: 123,
  mode: 'live',
  duration_ms: 45000,
  threads_url: 'https://threads.net/@user/p123'
});

logger.error({
  event: 'publish_fail',
  post_id: 123,
  stage: 'media_upload',
  error: 'Timeout after 3 retries',
  retry_count: 3
});

logger.warn({
  event: 'selector_not_found',
  selector: 'button[aria-label="Post"]',
  action: 'manual_investigation_required'
});
```

---

## 7. Deployment & Configuration

### 7.1 Environment Variables

**File: `.env.example`**

```env
# Server
NODE_ENV=production
PORT=3000
HOST=localhost

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/threads_db
DB_MIGRATE_ON_START=true

# Redis
REDIS_URL=redis://localhost:6379/0

# Auth
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your-32-char-hex-key-here

# Playwright
PLAYWRIGHT_TIMEOUT=60000
PLAYWRIGHT_DRY_RUN=false (can be overridden per-job)

# File Storage
UPLOAD_DIR=/data/uploads
MAX_UPLOAD_SIZE_MB=5

# Slack (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Logging
LOG_LEVEL=info

# Features
ENABLE_CANARY_JOBS=true
CANARY_SCHEDULE="0 2 * * *"
```

### 7.2 Docker Compose (v2.0)

**File: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://threads:password@postgres:5432/threads_db
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    volumes:
      - ./data/uploads:/data/uploads
    command: npm start

  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: threads_db
      POSTGRES_USER: threads
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## 8. CI/CD Pipeline

### 8.1 GitHub Actions Workflow

**File: `.github/workflows/test.yml`**

```yaml
name: Test & Build

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: test_db
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      
      - run: npm run db:migrate:test
      
      - run: npm run test:unit
      
      - run: npm run test:integration
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: build
          path: dist/
```

---

## 9. Operational Runbook (RUNBOOK.md)

Key sections (full file in `/docs/RUNBOOK.md`):

### 9.1 Selector Changes

**Problem:** "button not found" error in logs

**Solution:**
1. Check Threads web app manually (might have changed UI)
2. Open Playwright Inspector: `PWDEBUG=1 npm run worker`
3. Find new selector (e.g., `button[aria-label="Share"]` → `button:text("Post")`)
4. Update `src/workers/playwrightUtils.js`
5. Test dry-run: `npm run test:integration`
6. Deploy hotfix

### 9.2 Credential Expiration

**Problem:** Login fails with 401

**Solution:**
1. Manually login to Threads in browser
2. Re-enter credentials in settings
3. Encrypt stored (happens automatically)
4. Test publish with dry-run

### 9.3 High Failure Rate

**Alerts:** Slack notification "5+ failures in last 10 minutes"

**Checklist:**
- [ ] Check Threads service status
- [ ] Review error logs: `docker logs <container>`
- [ ] Check selector/UI changes
- [ ] Check API rate limits (429 errors)
- [ ] Review credential/auth issues
- [ ] Rollback last deploy if applicable

---

## 10. Performance & Scaling Considerations

### 10.1 Bottlenecks & Optimization

| Component | Current Limit | v2.0 Target | Optimization |
|-----------|---------------|-------------|--------------|
| **API requests/sec** | ~50 | ~100 | Caching + load balancer |
| **Queue depth** | 100 | 500 | Horizontal workers |
| **Media storage** | 10GB | 100GB | S3 migration |
| **DB connections** | 20 | 50 | Connection pooling (Knex) |
| **Playwright browsers** | 1 (serial) | 5 (parallel) | Worker pool |

### 10.2 Caching Strategy

```javascript
// Cache settings (live mode flag)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getLiveModeEnabled() {
  const cached = cache.get('live_publish_enabled');
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }
  
  const value = await db.query('SELECT value FROM settings WHERE key = ?');
  cache.set('live_publish_enabled', { value, timestamp: Date.now() });
  return value;
}

// Invalidate cache on toggle
async function setLiveMode(value) {
  await db.query('UPDATE settings SET value = ? WHERE key = ?', [value, key]);
  cache.delete('live_publish_enabled');
}
```

---

## 11. Security Considerations

### 11.1 Threat Model

| Threat | Impact | Mitigation |
|--------|--------|-----------|
| **Credential leakage** | Account takeover | Encrypt AES-256, no logging |
| **Unauthorized publish** | Spam/ToS violation | JWT auth, RBAC (future) |
| **Media injection** | Malware spread | Validate magic bytes, no execution |
| **Error message info leak** | Security disclosure | Sanitize, test error messages |
| **Audit trail tampering** | Compliance failure | Insert-only, immutable |

### 11.2 Secret Management

```javascript
// ✅ CORRECT: Load from env, encrypted in DB
const JWT_SECRET = process.env.JWT_SECRET;
const credentials = await decrypt(storedEncryptedCred);

// ❌ WRONG: Hardcoded secrets
const JWT_SECRET = "my-secret-123"; // BAD
console.log(credentials); // Logs plaintext - BAD
```

---

## 12. Testing & QA

### 12.1 Test Pyramid

```
         ▲
        / \
       /   \  E2E (optional nightly)
      / --- \
     /       \
    /         \ Integration (push)
   / --------- \
  /             \
 /               \ Unit (push)
/━━━━━━━━━━━━━━━━\
```

- **Unit** (70%): Services, models, validation
- **Integration** (20%): API endpoints, workflows
- **E2E** (10%): Live publish (nightly canary, staging only)

### 12.2 Test Checklist

- [ ] Media upload: valid + invalid types, size limits
- [ ] Live mode toggle: warning modal, audit log
- [ ] Publish with media: dry-run success, live success, retry
- [ ] History view: records persist, export CSV works
- [ ] Error handling: transient fail → retry, critical fail → alert
- [ ] Security: credentials encrypted, no leak in logs

---

## 13. Appendix

### 13.1 API Endpoint Examples

**Upload Media**
```bash
curl -X POST http://localhost:3000/v1/posts/upload-media \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@image.png"

# Response
{
  "media_url": "https://localhost:3000/media/550e8400-e29b-41d4-a716-446655440000.png",
  "file_size": 1024000,
  "mime_type": "image/png"
}
```

**Get Publish History**
```bash
curl -X GET http://localhost:3000/v1/posts/123/history \
  -H "Authorization: Bearer $JWT_TOKEN"

# Response
{
  "post_id": 123,
  "history": [
    {
      "id": 1,
      "timestamp": "2026-07-25T10:15:00Z",
      "mode": "live",
      "status": "success",
      "threads_url": "https://threads.net/@user/p123456789"
    }
  ]
}
```

### 13.2 Useful Commands

```bash
# Run tests locally
npm test                          # All tests
npm run test:unit               # Unit only
npm run test:integration        # Integration only

# Database
npm run db:migrate              # Run migrations
npm run db:migrate:rollback     # Rollback
npm run db:seed                 # Seed test data

# Development
npm run dev                     # Watch mode
npm run lint                    # ESLint
npm run format                  # Prettier

# Operations
npm run canary                  # Manual canary test
npm run worker                  # Run worker manually
PWDEBUG=1 npm run worker       # Playwright inspector
```

---

**Document Owner:** Dozer (CEO + Tech Lead)  
**Version:** 2.0 (25 Jul 2026)  
**Status:** Ready for Implementation

**Key Links:**
- PRD: `PRD-v2.0-Live-Publish-Media.md`
- SRS: `SRS-v2.0-Functional-Requirements.md`
- Runbook: `docs/RUNBOOK.md`
