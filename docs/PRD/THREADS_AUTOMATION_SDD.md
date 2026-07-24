# SDD: System Design Document
## Threads Automation Posting System

**Document Version:** 1.0  
**Last Updated:** June 22, 2026  
**Status:** Draft  
**Audience:** Architecture Team, Backend Engineers, DevOps

---

## 1. Introduction

### 1.1 Purpose
Document ini menjelaskan desain teknis lengkap dari Threads Automation system, termasuk architecture, components, data flow, dan implementation details untuk developers.

### 1.2 System Overview
```
┌─────────────────┐
│  Web Client     │
│   (React)       │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  API Gateway    │ Load Balancer
├─────────────────┤
│  Express Server │
│  (3 instances)  │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬─────────┐
    ▼         ▼          ▼         ▼
┌────────┐ ┌──────┐ ┌─────────┐ ┌──────────┐
│  Postgres  Redis  Playwright  File Storage
│  Database  Queue   Browser    (S3)
└────────┘ └──────┘ └─────────┘ └──────────┘
    │         │         │
    └─────────┼─────────┘
              │
          ┌───▼────┐
          │Threads │
          │ .net   │
          └────────┘
```

---

## 2. Architecture Design

### 2.1 Layered Architecture

#### Layer 1: Presentation Layer (Client)
```
React Components
├─ Pages
│  ├─ Dashboard
│  ├─ Schedule Form
│  ├─ Login
│  └─ Settings
├─ Components
│  ├─ PostCard
│  ├─ PostGrid
│  ├─ DateTimePicker
│  └─ NotificationBell
└─ Services
   ├─ API Client
   ├─ Auth Service
   └─ Store (Redux/Context)
```

#### Layer 2: API Layer (Backend)
```
Express.js
├─ Routes
│  ├─ /auth
│  ├─ /posts
│  ├─ /dashboard
│  └─ /notifications
├─ Middleware
│  ├─ Authentication
│  ├─ Authorization
│  ├─ Error Handling
│  └─ Rate Limiting
└─ Services
   ├─ Post Service
   ├─ Auth Service
   ├─ Job Service
   └─ Notification Service
```

#### Layer 3: Business Logic Layer
```
Services & Utilities
├─ PostService
│  ├─ createPost()
│  ├─ getPost()
│  ├─ updatePost()
│  └─ deletePost()
├─ PublishService
│  ├─ executePublish()
│  ├─ retryPost()
│  └─ handleError()
├─ AuthService
│  ├─ login()
│  ├─ logout()
│  └─ validateSession()
└─ JobQueueService
   ├─ enqueue()
   ├─ dequeue()
   └─ process()
```

#### Layer 4: Data Access Layer
```
Repositories & Models
├─ PostRepository
├─ UserRepository
├─ JobRepository
├─ ActivityLogRepository
└─ Database Connection Pool
```

#### Layer 5: Infrastructure Layer
```
Databases & External Services
├─ PostgreSQL
├─ Redis
├─ Playwright Browser
├─ Email Service (SendGrid)
└─ S3 Storage
```

### 2.2 Microservices vs Monolithic

**Decision: Monolithic (Initial MVP)**

**Rationale:**
- Simpler deployment & ops untuk MVP
- Faster development cycle
- Data consistency easier to manage
- Can migrate to microservices later if needed

**Future Microservices Split:**
```
API Service (users, posts management)
Publishing Service (background job processor)
Notification Service (email & notifications)
Analytics Service (stats & insights)
```

### 2.3 Design Patterns

#### Pattern 1: Service Layer Pattern
```javascript
// PostService.js
class PostService {
  constructor(postRepository, jobQueueService) {
    this.postRepository = postRepository;
    this.jobQueueService = jobQueueService;
  }
  
  async createPost(userId, postData) {
    // Validation
    this.validatePostData(postData);
    
    // Business logic
    const post = await this.postRepository.create(userId, postData);
    
    // Enqueue job
    await this.jobQueueService.enqueue({
      type: 'PUBLISH_POST',
      postId: post.id,
      scheduledTime: post.scheduledTime
    });
    
    return post;
  }
}
```

#### Pattern 2: Repository Pattern
```javascript
// PostRepository.js
class PostRepository {
  async create(userId, data) {
    const query = `
      INSERT INTO posts (user_id, caption, scheduled_time, status)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    return db.query(query, [userId, data.caption, data.scheduledTime, 'scheduled']);
  }
  
  async getById(id) {
    return db.query('SELECT * FROM posts WHERE id = $1', [id]);
  }
}
```

#### Pattern 3: Job Queue Pattern (Bull + Redis)
```javascript
// Queue setup
const postQueue = new Bull('post-publishing', {
  redis: { host: 'localhost', port: 6379 }
});

// Producer
await postQueue.add(
  { postId, scheduledTime },
  { delay: delayMs, attempts: 3, backoff: 'exponential' }
);

// Consumer
postQueue.process(async (job) => {
  const { postId } = job.data;
  return publishPostToThreads(postId);
});
```

#### Pattern 4: Factory Pattern
```javascript
// ServiceFactory.js
class ServiceFactory {
  static createAuthService(config) {
    return new AuthService(config);
  }
  
  static createPostService(db, queue) {
    return new PostService(
      new PostRepository(db),
      new JobQueueService(queue)
    );
  }
}
```

#### Pattern 5: Middleware Pattern
```javascript
// Express middleware chain
app.use(express.json());
app.use(corsMiddleware);
app.use(authenticationMiddleware);
app.use(authorizationMiddleware);
app.use(errorHandlingMiddleware);
```

---

## 3. Data Design

### 3.1 Database Schema

#### Table: users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  threads_username VARCHAR(100),
  threads_session_token TEXT,
  timezone VARCHAR(50) DEFAULT 'UTC',
  notification_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_threads_username ON users(threads_username);
```

#### Table: posts
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  scheduled_time TIMESTAMP NOT NULL,
  published_time TIMESTAMP,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, published, failed, cancelled
  retry_count INT DEFAULT 0,
  last_error TEXT,
  threads_post_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled_time ON posts(scheduled_time);
CREATE INDEX idx_posts_user_status ON posts(user_id, status);
```

#### Table: jobs
```sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  job_type VARCHAR(50), -- PUBLISH_POST, RETRY_POST, etc
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  attempt_number INT DEFAULT 1,
  next_retry_time TIMESTAMP,
  error_message TEXT,
  execution_logs JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_jobs_post_id ON jobs(post_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_next_retry_time ON jobs(next_retry_time);
```

#### Table: activity_logs
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  post_id UUID REFERENCES posts(id),
  action VARCHAR(50), -- CREATE, UPDATE, DELETE, PUBLISH, RETRY
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
```

### 3.2 Data Flow Diagram

```
User Input (Frontend)
    │
    ▼
┌─────────────────────┐
│ Validation          │
│ (Frontend + Backend)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ PostService.create()│
└──────────┬──────────┘
           │
      ┌────┴────┐
      ▼         ▼
  ┌────────┐ ┌──────────┐
  │Database│ │Job Queue │
  │ (save) │ │ (enqueue)│
  └────────┘ └──────────┘
                 │
                 ▼
          ┌────────────────┐
          │Background Job  │
          │Processor       │
          └────────┬───────┘
                   │
           ┌───────┴────────┐
           ▼                ▼
      ┌────────┐       ┌──────────┐
      │Playwright   │DB    │
      │(Post)       │(Update)│
      └────────┘       └──────────┘
           │
           ▼
      ┌─────────────┐
      │Notification │
      │Service      │
      └─────────────┘
```

---

## 4. API Design

### 4.1 REST API Specification

#### Base URL
```
https://api.threads-automation.com/v1
```

#### Authentication
```
Headers:
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

#### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "POST_NOT_FOUND",
    "message": "Post with ID not found",
    "statusCode": 404
  },
  "timestamp": "2024-06-22T15:30:00Z"
}
```

### 4.2 Endpoint Specifications

#### 1. Authentication Endpoints

**POST /auth/login**
```
Request:
{
  "username": "threads_username",
  "password": "password"
}

Response (200 OK):
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "timezone": "Asia/Jakarta"
    },
    "expiresIn": 86400
  }
}

Response (401 Unauthorized):
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password"
  }
}
```

**POST /auth/logout**
```
Response (200 OK):
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### 2. Posts Endpoints

**POST /posts**
```
Request:
{
  "caption": "Hello Threads!",
  "mediaUrls": ["https://..."],
  "scheduledTime": "2024-06-23T10:00:00+07:00"
}

Response (201 Created):
{
  "success": true,
  "data": {
    "id": "post_abc123",
    "userId": "user_xyz",
    "caption": "Hello Threads!",
    "status": "scheduled",
    "scheduledTime": "2024-06-23T10:00:00+07:00",
    "createdAt": "2024-06-22T15:30:00Z"
  }
}
```

**GET /posts**
```
Query Params:
- status: scheduled | published | failed
- limit: 10 (default)
- offset: 0 (default)
- sort: -scheduledTime (default)

Response (200 OK):
{
  "success": true,
  "data": {
    "posts": [...],
    "pagination": {
      "total": 50,
      "limit": 10,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

**GET /posts/:id**
```
Response (200 OK):
{
  "success": true,
  "data": {
    "id": "post_abc123",
    "caption": "Hello Threads!",
    "status": "scheduled",
    "scheduledTime": "2024-06-23T10:00:00+07:00",
    "retryCount": 0,
    "lastError": null,
    "createdAt": "2024-06-22T15:30:00Z"
  }
}
```

**PUT /posts/:id**
```
Request:
{
  "caption": "Updated caption",
  "scheduledTime": "2024-06-24T10:00:00+07:00"
}

Response (200 OK):
{
  "success": true,
  "data": { ... }
}
```

**DELETE /posts/:id**
```
Response (204 No Content)
```

**POST /posts/import**
```
Request: FormData
- file: CSV file

Response (200 OK):
{
  "success": true,
  "data": {
    "imported": 95,
    "failed": 5,
    "errors": [
      {
        "row": 2,
        "caption": "Row 2 caption",
        "error": "Invalid date format"
      }
    ]
  }
}
```

**POST /posts/:id/retry**
```
Response (200 OK):
{
  "success": true,
  "data": {
    "postId": "post_abc123",
    "status": "scheduled",
    "retryCount": 1,
    "message": "Post requeued for retry"
  }
}
```

#### 3. Dashboard Endpoints

**GET /dashboard/stats**
```
Response (200 OK):
{
  "success": true,
  "data": {
    "totalPosts": 150,
    "publishedToday": 5,
    "scheduledCount": 23,
    "failedCount": 2,
    "postsThisWeek": 35,
    "publishRate": 94.5
  }
}
```

**GET /dashboard/timeline**
```
Query:
- startDate: 2024-06-01
- endDate: 2024-06-30

Response (200 OK):
{
  "success": true,
  "data": {
    "timeline": [
      {
        "date": "2024-06-22",
        "published": 5,
        "scheduled": 3,
        "failed": 1
      }
    ]
  }
}
```

---

## 5. Component Design

### 5.1 Core Components

#### Component 1: Authentication Manager
```javascript
class AuthenticationManager {
  // Properties
  sessionToken: string;
  sessionExpiry: Date;
  refreshToken: string;
  
  // Methods
  async login(username: string, password: string): Promise<AuthResponse>
  async logout(): Promise<void>
  async refreshSession(): Promise<string>
  isSessionValid(): boolean
  setSession(token: string, expiry: Date): void
  clearSession(): void
}
```

#### Component 2: Post Manager
```javascript
class PostManager {
  // Methods
  async createPost(postData: PostInput): Promise<Post>
  async updatePost(postId: string, updates: Partial<Post>): Promise<Post>
  async deletePost(postId: string): Promise<void>
  async getPost(postId: string): Promise<Post>
  async listPosts(filters: PostFilters, pagination: Pagination): Promise<PostList>
  async importPosts(csvFile: File): Promise<ImportResult>
}
```

#### Component 3: Publishing Engine
```javascript
class PublishingEngine {
  // Properties
  browser: Browser;
  sessionManager: SessionManager;
  retryPolicy: RetryPolicy;
  
  // Methods
  async publishPost(post: Post): Promise<PublishResult>
  async retryFailedPost(postId: string): Promise<PublishResult>
  async login(username: string, password: string): Promise<Session>
  async logout(): Promise<void>
  private async validateSession(): Promise<boolean>
  private async handleRateLimit(): Promise<void>
}
```

#### Component 4: Job Queue Manager
```javascript
class JobQueueManager {
  // Properties
  queue: Queue;
  
  // Methods
  async enqueuePost(post: Post): Promise<Job>
  async dequeuePost(): Promise<Post>
  async processJob(job: Job): Promise<JobResult>
  async retryJob(jobId: string): Promise<void>
  async getQueueStats(): Promise<QueueStats>
}
```

#### Component 5: Notification Service
```javascript
class NotificationService {
  // Methods
  async notifyPostPublished(post: Post): Promise<void>
  async notifyPostFailed(post: Post, error: Error): Promise<void>
  async sendDailySummary(userId: string): Promise<void>
  async getUserPreferences(userId: string): Promise<Preferences>
  async updatePreferences(userId: string, preferences: Preferences): Promise<void>
}
```

### 5.2 Component Interaction Diagram

```
┌──────────────┐
│ Frontend     │
│ (React)      │
└──────┬───────┘
       │ (HTTP/REST)
       ▼
┌──────────────────┐
│ AuthMiddleware   │ ◄── Token Validation
├──────────────────┤
│ API Router       │
├──────────────────┤
│ Error Handler    │
└──────┬───────────┘
       │
   ┌───┴────────┬──────────┬────────────┐
   ▼            ▼          ▼            ▼
┌──────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐
│PostMgr   │ │AuthMgr  │ │Dashboard │ │Notif Svc │
└────┬─────┘ └────┬────┘ └────┬─────┘ └────┬─────┘
     │            │           │            │
     └────────────┼───────────┴────────────┘
                  │
            ┌─────┴──────┬───────────┬────────────┐
            ▼            ▼           ▼            ▼
         ┌──────────┐ ┌──────┐ ┌──────────┐ ┌──────────┐
         │Publish   │ │Queue │ │Database  │ │Email Svc │
         │Engine    │ │Mgr   │ │(Postgres)│ │(SendGrid)│
         └──────────┘ └──────┘ └──────────┘ └──────────┘
```

---

## 6. Implementation Details

### 6.1 Tech Stack Details

#### Frontend
```
Framework: React 18
TypeScript: 5.0+
State Management: Redux Toolkit
HTTP Client: Axios
UI Library: Material-UI (MUI)
Form Handling: React Hook Form
Validation: Zod
Build Tool: Vite
```

#### Backend
```
Runtime: Node.js 18+
Framework: Express.js 4.18+
TypeScript: 5.0+
Validation: Joi
Authentication: JWT (jsonwebtoken)
Job Queue: Bull 4.11+
Database ORM: Knex.js
Async Tasks: node-cron
```

#### Database & Cache
```
Primary DB: PostgreSQL 13+
Connection Pool: node-postgres with pooling
Cache: Redis 6.0+
Pub/Sub: Redis (for real-time updates)
```

#### Browser Automation
```
Library: Playwright 1.40+
Browsers: Chromium (headless)
Timeout: 30 sec per operation
Retry: Built-in exponential backoff
```

### 6.2 Code Structure

```
threads-automation/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── queue.ts
│   │   │   └── env.ts
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Post.ts
│   │   │   └── Job.ts
│   │   ├── repositories/
│   │   │   ├── UserRepository.ts
│   │   │   ├── PostRepository.ts
│   │   │   └── JobRepository.ts
│   │   ├── services/
│   │   │   ├── AuthService.ts
│   │   │   ├── PostService.ts
│   │   │   ├── PublishingService.ts
│   │   │   ├── JobQueueService.ts
│   │   │   └── NotificationService.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── posts.ts
│   │   │   └── dashboard.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── validation.ts
│   │   ├── workers/
│   │   │   ├── postPublisher.ts
│   │   │   └── notificationWorker.ts
│   │   ├── utils/
│   │   │   ├── playwright.ts
│   │   │   ├── encryption.ts
│   │   │   └── logger.ts
│   │   └── app.ts
│   ├── tests/
│   ├── migrations/
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   ├── ScheduleForm/
│   │   │   ├── PostCard/
│   │   │   └── Layout/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── auth.ts
│   │   │   └── storage.ts
│   │   ├── store/
│   │   │   ├── slices/
│   │   │   └── hooks.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── formatters.ts
│   │   │   └── validators.ts
│   │   ├── hooks/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tests/
│   └── package.json
│
├── docker-compose.yml
├── .env.example
└── README.md
```

### 6.3 Configuration Management

#### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/threads_automation
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379

# API
API_PORT=3000
API_DOMAIN=api.threads-automation.com
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Playwright
PLAYWRIGHT_BROWSER=chromium
PLAYWRIGHT_TIMEOUT=30000

# Email
SENDGRID_API_KEY=your-key
EMAIL_FROM=noreply@threads-automation.com

# Logging
LOG_LEVEL=info
```

### 6.4 Error Handling Strategy

#### Error Categories
```
┌──────────────────┐
│ Application Error│
├──────────────────┤
│ - Validation     │ (4xx)
│ - Business Logic │ (400-403)
│ - Not Found      │ (404)
└──────────────────┘

┌──────────────────┐
│ System Error     │
├──────────────────┤
│ - Database Err   │ (500)
│ - Service Err    │ (503)
│ - Timeout        │ (504)
└──────────────────┘

┌──────────────────┐
│ External Error   │
├──────────────────┤
│ - Threads API    │ (Retry)
│ - Rate Limited   │ (Backoff)
│ - Network        │ (Fallback)
└──────────────────┘
```

#### Error Recovery
```javascript
// Exponential Backoff Example
const BACKOFF_DELAYS = [1000, 5000, 15000]; // 1min, 5min, 15min

async function retryWithBackoff(fn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      
      const delay = BACKOFF_DELAYS[attempt - 1];
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

## 7. Deployment Architecture

### 7.1 Infrastructure Stack

```
┌──────────────────────────────────────┐
│ Load Balancer (Railway/Render)       │
└────────────┬─────────────────────────┘
             │
   ┌─────────┼─────────┐
   ▼         ▼         ▼
┌──────┐ ┌──────┐ ┌──────┐
│Node1 │ │Node2 │ │Node3 │ (Express API)
└──┬───┘ └──┬───┘ └──┬───┘
   │        │        │
   └────────┼────────┘
            │
    ┌───────┴──────────┐
    ▼                  ▼
┌──────────────┐  ┌──────────┐
│ PostgreSQL   │  │ Redis    │
│ (Managed DB) │  │ (Cache)  │
└──────────────┘  └──────────┘
```

### 7.2 CI/CD Pipeline

```
GitHub Push
    │
    ▼
┌─────────────────┐
│ GitHub Actions  │
├─────────────────┤
│ - Lint          │
│ - Unit Tests    │
│ - Build Docker  │
└────────┬────────┘
         │
    ┌────┴─────┐
    ▼          ▼
 STAGING    PRODUCTION
```

### 7.3 Monitoring & Logging

```
Application
    │
    ├─ Logs ──→ CloudWatch / Sentry
    ├─ Metrics ──→ Prometheus / DataDog
    ├─ Traces ──→ Jaeger
    └─ Alerts ──→ PagerDuty
```

---

## 8. Security Design

### 8.1 Authentication & Authorization

```
┌─────────────┐
│ User Login  │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ Verify Threads   │
│ Credentials      │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Generate JWT     │
│ Token            │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Store Session    │
│ in Redis         │
└──────────────────┘

Subsequent Requests:
┌──────────────────┐
│ Extract JWT      │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Verify Signature │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Check Expiry     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Allow/Deny       │
└──────────────────┘
```

### 8.2 Credential Encryption

```javascript
// At Rest Encryption
const encryptedPassword = await bcrypt.hash(password, 10);
const encryptedThreadsToken = await encrypt(threadsSessionToken, ENCRYPTION_KEY);

// In Transit Encryption
HTTPS TLS 1.2+
```

### 8.3 Rate Limiting

```javascript
// API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per windowMs
  keyGenerator: (req) => req.user.id // Per user
});

// Publishing Rate Limiting
const PUBLISH_RATE_LIMIT = 1 post per 10 seconds (respect Threads limits)
```

---

## 9. Testing Strategy

### 9.1 Testing Pyramid

```
        ▲
       / \
      /E2E\      10%
     /─────\
    /       \
   /  Integ  \   30%
  /───────────\
 /             \
/    Unit      \ 60%
───────────────────
```

### 9.2 Test Cases

#### Unit Tests
```
Services/
  ├─ PostService.test.ts
  ├─ AuthService.test.ts
  ├─ PublishingService.test.ts
  └─ NotificationService.test.ts

Utils/
  ├─ encryption.test.ts
  └─ validators.test.ts
```

#### Integration Tests
```
API/
  ├─ auth.integration.test.ts
  ├─ posts.integration.test.ts
  └─ dashboard.integration.test.ts

Database/
  └─ repositories.integration.test.ts
```

#### E2E Tests
```
Scenarios/
  ├─ user-login-schedule-post.e2e.ts
  ├─ bulk-import-posts.e2e.ts
  ├─ post-failure-retry.e2e.ts
  └─ dashboard-navigation.e2e.ts
```

---

## 10. Performance Optimization

### 10.1 Database Optimization

```sql
-- Query optimization
EXPLAIN ANALYZE SELECT * FROM posts WHERE user_id = $1 AND status = 'scheduled';

-- Index Strategy
CREATE INDEX idx_posts_user_status ON posts(user_id, status);
CREATE INDEX idx_posts_scheduled_time ON posts(scheduled_time);

-- Batch Operations
INSERT INTO posts (user_id, caption, scheduled_time)
VALUES ($1, $2, $3), ($1, $4, $5), ($1, $6, $7);
```

### 10.2 Caching Strategy

```javascript
// Redis Caching
const cacheKey = `user:${userId}:dashboard:stats`;
const cached = await redis.get(cacheKey);

if (!cached) {
  const stats = await calculateStats(userId);
  await redis.setex(cacheKey, 300, JSON.stringify(stats)); // 5 min TTL
}
```

### 10.3 API Optimization

```javascript
// Pagination
app.get('/posts', (req, res) => {
  const { limit = 10, offset = 0 } = req.query;
  const posts = await PostRepository.list(limit, offset);
});

// Partial responses
app.get('/posts/:id?fields=id,caption,status');

// Compression
app.use(compression());

// Caching headers
res.set('Cache-Control', 'public, max-age=300');
```

---

## 11. Scalability Considerations

### 11.1 Horizontal Scaling

```
┌──────────────┐
│ Load Balancer│
└──────┬───────┘
   ┌───┼───┐
   ▼   ▼   ▼
 API1 API2 API3
   │   │   │
   └───┼───┘
       │
   ┌───┴────┐
   ▼        ▼
  DB     Cache
```

### 11.2 Database Scaling

```
Read Replicas:
Primary DB → Replica1
         → Replica2
         → Replica3

Connection Pooling: PgBouncer (100+ connections)
```

### 11.3 Queue Scaling

```
Bull with Redis Cluster:
- Multiple queue consumers
- Job prioritization
- Dead letter queue
```

---

## 12. Appendix: Code Examples

### 12.1 Sample Service Implementation

```typescript
// src/services/PostService.ts
import { PostRepository } from '../repositories/PostRepository';
import { JobQueueService } from './JobQueueService';

export class PostService {
  constructor(
    private postRepository: PostRepository,
    private jobQueueService: JobQueueService
  ) {}

  async createPost(userId: string, postData: PostInput): Promise<Post> {
    // Validate input
    if (!postData.caption || postData.caption.length === 0) {
      throw new Error('Caption is required');
    }

    if (new Date(postData.scheduledTime) < new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    // Create post
    const post = await this.postRepository.create(userId, {
      caption: postData.caption,
      mediaUrls: postData.mediaUrls || [],
      scheduledTime: new Date(postData.scheduledTime),
      status: 'scheduled'
    });

    // Enqueue for publishing
    const delayMs = new Date(post.scheduledTime).getTime() - Date.now();
    await this.jobQueueService.enqueuePost(post, delayMs);

    return post;
  }

  async publishPost(postId: string): Promise<PublishResult> {
    const post = await this.postRepository.getById(postId);
    
    if (!post) {
      throw new Error('Post not found');
    }

    try {
      // Call publishing engine
      const result = await PublishingEngine.publish(post);
      
      // Update post status
      await this.postRepository.update(postId, {
        status: 'published',
        publishedTime: new Date(),
        threadsPostId: result.postId
      });

      return result;
    } catch (error) {
      // Handle retry
      await this.jobQueueService.enqueueRetry(postId, error.message);
      throw error;
    }
  }
}
```

---

**Document Review Sign-off:**

Reviewed By: _______________  
Date: _______________  
Status: ⬜ Draft ⬜ In Review ☑️ Approved
