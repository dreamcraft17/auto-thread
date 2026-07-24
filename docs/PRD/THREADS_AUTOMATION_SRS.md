# SRS: Software Requirements Specification
## Threads Automation Posting System

**Document Version:** 1.0  
**Last Updated:** June 22, 2026  
**Status:** Draft  
**Prepared for:** Product Team & Development Team

---

## 1. Introduction

### 1.1 Purpose
Document ini mendefinisikan semua software requirements untuk Threads Automation Posting System secara detail dan terukur. Digunakan sebagai reference untuk development, QA, dan acceptance testing.

### 1.2 Scope
System ini mencakup:
- ✅ Scheduling posts ke Threads
- ✅ Auto-publishing berdasarkan jadwal
- ✅ Dashboard untuk manage posts
- ✅ Notification system
- ✅ Error handling & retry mechanism

**Out of Scope:**
- ❌ Direct integration dengan Threads official API (belum tersedia)
- ❌ Multi-account management (future phase)
- ❌ Content creation/AI generation (future phase)
- ❌ Mobile app

### 1.3 Definitions, Acronyms, Abbreviations

| Term | Definition |
|---|---|
| **Post** | Single content item untuk publish ke Threads |
| **Queue** | Job queue untuk manage scheduled posts |
| **Playwright** | Browser automation library |
| **Redis** | In-memory data store untuk queue |
| **JWT** | JSON Web Token untuk authentication |
| **UTC** | Coordinated Universal Time |
| **SLA** | Service Level Agreement |

---

## 2. Overall Description

### 2.1 Product Perspective
Threads Automation adalah standalone web application yang:
- Menghubungkan user ke akun Threads mereka
- Manage post schedule & execution
- Provide dashboard untuk monitoring

**System Integration:**
```
User Browser
    ↓
Web Dashboard (React)
    ↓
Backend API (Node.js/Express)
    ↓
┌─────────────┬──────────────┬──────────────┐
│  Database   │  Job Queue   │  Playwright  │
│ (Postgres)  │  (Redis)     │  (Browser)   │
└─────────────┴──────────────┴──────────────┘
    ↓
Threads.net (Auto-Login & Post)
```

### 2.2 Product Functions
1. **User Authentication** - Secure Threads account login
2. **Post Scheduling** - Input caption & publish time
3. **Job Management** - Queue, execute, retry posts
4. **Dashboard** - View & manage all posts
5. **Notifications** - Alert user tentang status
6. **Error Handling** - Graceful failure & recovery

### 2.3 User Classes & Characteristics

#### Class 1: Content Creator (Primary)
- **Profile:** Individual, 1-5 posts/day
- **Needs:** Easy scheduling, reliability
- **Tech Level:** Medium

#### Class 2: Social Media Manager
- **Profile:** Team, 5-20 posts/day, bulk scheduling
- **Needs:** Bulk import, analytics, automation
- **Tech Level:** Medium-High

#### Class 3: Small Business Owner
- **Profile:** 1-2 posts/day, consistent schedule
- **Needs:** Simple interface, reliability
- **Tech Level:** Low

### 2.4 Operating Environment

**Server Environment:**
- Platform: Linux (Ubuntu 20.04+)
- Runtime: Node.js 18+
- Database: PostgreSQL 13+
- Cache: Redis 6.0+
- Browser: Chromium (via Playwright)

**Client Environment:**
- Browsers: Chrome, Firefox, Safari, Edge (latest 2 versions)
- Screen: Desktop 1024x768+ (mobile support future)
- Network: Minimum 2 Mbps

**Hosting:**
- Cloud Platform: Railway / Render / AWS
- Uptime SLA: 99%
- Geographic: Primary region Asia (Indonesia)

### 2.5 Design & Implementation Constraints

1. **Threads API Limitation:**
   - Threads tidak punya public API untuk posting
   - Harus menggunakan browser automation (Playwright)
   - Subject to Threads Terms of Service

2. **Security Constraints:**
   - User credentials harus encrypted
   - No storing plaintext passwords
   - HTTPS only communication

3. **Performance Constraints:**
   - Posts publish dalam 2-minute window
   - Max 1000 concurrent scheduled posts
   - Database query response < 500ms

4. **Compliance:**
   - Respect Threads ToS & rate limits
   - GDPR compliance untuk user data
   - Audit logs untuk semua posting activities

---

## 3. External Interface Requirements

### 3.1 User Interfaces

#### 3.1.1 Dashboard Page
**Required Elements:**
- Navigation bar dengan logo & user menu
- Main content area dengan 3 sections:
  1. **Upcoming Queue** - Posts scheduled untuk publish
  2. **Published History** - Posts yang sudah published
  3. **Failed Posts** - Posts dengan error

**Interactions:**
- Click post untuk view/edit details
- Delete/cancel post dengan confirmation
- Filter by date range
- Search by caption

**Layout Specs:**
- Responsive: min 1024px width
- Load time: < 2 detik
- Pagination: 10 posts per page

#### 3.1.2 Schedule Form
**Form Fields:**
- Caption textarea (min 1, max 500 chars)
- Media upload (optional, max 3 files)
- Publish date picker
- Publish time picker (HH:MM format)
- Timezone selector (default user timezone)
- Preview button
- Schedule button
- Cancel button

**Validations:**
- Caption not empty
- Time tidak boleh di masa lalu
- Max file size 10MB per file
- Supported formats: JPG, PNG, GIF

#### 3.1.3 Login Page
**Elements:**
- Threads username/password input
- Remember me checkbox
- Login button
- Security notice

**Behavior:**
- Secure credential handling
- Session timeout 24 hours
- Re-login required jika session expired

### 3.2 Hardware Interfaces
None (Web-based application)

### 3.3 Software Interfaces

#### 3.3.1 Threads Platform
- **Method:** Browser automation via Playwright
- **Authentication:** Username/Password login
- **Operations:** Post creation & publishing
- **Rate Limits:** Subject to Threads limits
- **Error Handling:** Graceful failure with retry

#### 3.3.2 Database (PostgreSQL)
```sql
-- Connection
Host: db.production.local
Port: 5432
Database: threads_automation
SSL: Required

-- Tables
- users
- posts
- jobs
- activity_logs
```

#### 3.3.3 Cache Layer (Redis)
```
Host: cache.production.local
Port: 6379
Database: 0
TTL: Varies per key
```

### 3.4 Communication Interfaces

**HTTP/HTTPS:**
- Protocol: HTTPS (TLS 1.2+)
- Port: 443
- API Base URL: https://api.threads-automation.com
- Response Format: JSON

**Email Notifications:**
- SMTP Server: SendGrid
- From: noreply@threads-automation.com
- Templates: HTML + Plain text

---

## 4. System Features

### 4.1 Feature 1: User Authentication & Account Management

#### 4.1.1 Threads Account Login
**Requirement ID:** REQ-AUTH-001  
**Priority:** CRITICAL

**Description:**
User harus dapat login dengan username & password Threads mereka secara aman.

**Functional Requirements:**
- FR-AUTH-001.1: System harus accept username & password input
- FR-AUTH-001.2: Credentials harus divalidasi via Playwright automation
- FR-AUTH-001.3: Session token harus digenerate setelah successful login
- FR-AUTH-001.4: Session timeout setelah 24 hours inactivity
- FR-AUTH-001.5: User dapat logout manually

**Non-Functional Requirements:**
- NFR-AUTH-001.1: Password harus encrypted in transit (HTTPS)
- NFR-AUTH-001.2: Max 5 login attempts sebelum lockout 15 menit
- NFR-AUTH-001.3: Login response time < 3 detik
- NFR-AUTH-001.4: Support session across multiple tabs

**Acceptance Criteria:**
- ✅ User dapat login dengan valid credentials
- ✅ Error message jika password salah
- ✅ Auto-logout jika session expired
- ✅ 2FA support (future requirement)

---

### 4.2 Feature 2: Single Post Scheduling

#### 4.2.1 Schedule Individual Post
**Requirement ID:** REQ-SCHEDULE-001  
**Priority:** CRITICAL

**Description:**
User dapat schedule 1 post untuk publish pada waktu tertentu.

**Functional Requirements:**
- FR-SCHEDULE-001.1: Form input untuk caption (text)
- FR-SCHEDULE-001.2: Optional image upload support
- FR-SCHEDULE-001.3: Date/time picker dengan timezone support
- FR-SCHEDULE-001.4: Preview post sebelum schedule
- FR-SCHEDULE-001.5: Save post ke database dengan status "scheduled"
- FR-SCHEDULE-001.6: Return confirmation dengan post ID

**Non-Functional Requirements:**
- NFR-SCHEDULE-001.1: Form validation < 500ms
- NFR-SCHEDULE-001.2: Database save < 1 detik
- NFR-SCHEDULE-001.3: Caption validation: 1-500 chars
- NFR-SCHEDULE-001.4: Image validation: max 10MB, JPG/PNG/GIF

**Acceptance Criteria:**
- ✅ User dapat input caption & datetime
- ✅ Preview menampilkan post seperti di Threads
- ✅ Post tersimpan dalam database
- ✅ User mendapat confirmation dengan post ID
- ✅ Post dapat di-edit sebelum publish time

---

### 4.3 Feature 3: Bulk Import Posts

#### 4.3.1 Import Multiple Posts via CSV
**Requirement ID:** REQ-IMPORT-001  
**Priority:** HIGH

**Description:**
User dapat upload CSV file berisi multiple posts untuk di-schedule sekaligus.

**Functional Requirements:**
- FR-IMPORT-001.1: Support CSV file upload max 5MB
- FR-IMPORT-001.2: CSV format: caption,date,time,timezone
- FR-IMPORT-001.3: Validate setiap row sebelum import
- FR-IMPORT-001.4: Show validation summary (success/failed counts)
- FR-IMPORT-001.5: Rollback jika error di > 10% rows
- FR-IMPORT-001.6: Return import report dengan detail

**Validation Rules:**
- Each row must have: caption, date, time
- Caption: 1-500 chars
- Date: YYYY-MM-DD format
- Time: HH:MM format
- Max 500 posts per import

**Acceptance Criteria:**
- ✅ User dapat upload CSV file
- ✅ Validation berjalan sebelum insert
- ✅ Error rows ditampilkan dengan alasan
- ✅ Success posts di-insert ke database
- ✅ Report download available

---

### 4.4 Feature 4: Auto-Publishing Engine

#### 4.4.1 Scheduled Post Execution
**Requirement ID:** REQ-PUBLISH-001  
**Priority:** CRITICAL

**Description:**
System secara otomatis publish posts pada waktu yang dijadwalkan.

**Functional Requirements:**
- FR-PUBLISH-001.1: Background job check queue setiap 1 menit
- FR-PUBLISH-001.2: Fetch posts dengan status "scheduled" & publish_time <= now
- FR-PUBLISH-001.3: Execute Playwright automation untuk login & post
- FR-PUBLISH-001.4: Update post status ke "published" setelah success
- FR-PUBLISH-001.5: Log activity ke database
- FR-PUBLISH-001.6: Handle Threads session management

**Non-Functional Requirements:**
- NFR-PUBLISH-001.1: Posts publish dalam 2-minute window dari scheduled time
- NFR-PUBLISH-001.2: Browser automation timeout: 30 detik per post
- NFR-PUBLISH-001.3: Concurrent jobs: max 3 simultaneous posts
- NFR-PUBLISH-001.4: Respect Threads rate limits (min 10 detik between posts)

**Error Scenarios:**
- Network timeout → Retry exponential backoff
- Session expired → Re-login
- Threads error → Log & retry
- Max retries reached → Mark as "failed" & notify user

**Acceptance Criteria:**
- ✅ Posts publish on schedule
- ✅ < 2 minute delay tolerance
- ✅ Successful posts logged
- ✅ Failed posts queued untuk retry
- ✅ No duplicate posts published

---

### 4.5 Feature 5: Dashboard & Monitoring

#### 4.5.1 Posts Management Dashboard
**Requirement ID:** REQ-DASHBOARD-001  
**Priority:** HIGH

**Description:**
User dapat melihat semua posts dalam 1 dashboard dengan berbagai views.

**Functional Requirements:**
- FR-DASHBOARD-001.1: Show upcoming posts dalam queue
- FR-DASHBOARD-001.2: Show published posts history dengan timestamps
- FR-DASHBOARD-001.3: Show failed posts dengan error details
- FR-DASHBOARD-001.4: Filter by date range (preset: Today, This Week, This Month)
- FR-DASHBOARD-001.5: Search functionality by caption keyword
- FR-DASHBOARD-001.6: Sort by date (newest/oldest first)
- FR-DASHBOARD-001.7: Pagination (10 posts per page)
- FR-DASHBOARD-001.8: View post details (caption, scheduled time, status)

**UI Elements:**
```
┌──────────────────────────────────────┐
│ Filter: [Date Range] [Status] [Search]│
├──────────────────────────────────────┤
│ UPCOMING (5)                          │
│ ├─ Post 1 - Tomorrow 10:00 [Edit][X] │
│ └─ Post 2 - Next Week 14:00 [Edit][X]│
│                                      │
│ PUBLISHED (23)                        │
│ ├─ Post A - 2 hours ago   [View]     │
│ └─ Post B - 5 hours ago   [View]     │
│                                      │
│ FAILED (1)                            │
│ ├─ Post X - Error: Timeout [Retry][X]│
└──────────────────────────────────────┘
```

**Acceptance Criteria:**
- ✅ Dashboard loads < 2 detik
- ✅ Data update real-time atau every 30 detik
- ✅ All filters functional
- ✅ Search returns relevant results
- ✅ Pagination works smoothly

---

### 4.6 Feature 6: Error Handling & Retry Mechanism

#### 4.6.1 Failed Post Retry
**Requirement ID:** REQ-ERROR-001  
**Priority:** CRITICAL

**Description:**
System harus automatically retry failed posts dengan intelligent backoff.

**Functional Requirements:**
- FR-ERROR-001.1: Auto-retry failed posts max 3 times
- FR-ERROR-001.2: Exponential backoff: 1 min, 5 min, 15 min
- FR-ERROR-001.3: Log each retry attempt dengan timestamp & error
- FR-ERROR-001.4: Notify user jika final retry gagal
- FR-ERROR-001.5: Manual retry option available di dashboard
- FR-ERROR-001.6: Categorize errors (network, authentication, rate limit, etc)

**Error Categories & Handling:**
| Error Type | Retry | Action |
|---|---|---|
| Network timeout | Yes (exponential) | Retry up to 3x |
| Session expired | Yes | Re-login then retry |
| Rate limit | Yes | Delay 1 hour then retry |
| Invalid post | No | Mark failed, notify user |
| Account locked | No | Notify user to check Threads |

**Acceptance Criteria:**
- ✅ Failed posts automatically retry
- ✅ Retries follow exponential backoff
- ✅ User notified of final failure
- ✅ Manual retry available
- ✅ Error logs accessible

---

### 4.7 Feature 7: Notifications

#### 4.7.1 User Notifications
**Requirement ID:** REQ-NOTIFY-001  
**Priority:** MEDIUM

**Description:**
System notify user tentang posting status via email & in-app.

**Functional Requirements:**
- FR-NOTIFY-001.1: In-app notification untuk successful posts
- FR-NOTIFY-001.2: Email notification untuk failed posts
- FR-NOTIFY-001.3: Daily summary email (optional, user preference)
- FR-NOTIFY-001.4: Notification preferences manageable di settings
- FR-NOTIFY-001.5: Real-time in-app alerts
- FR-NOTIFY-001.6: Notification history available

**Notification Types:**
1. **Post Published Successfully**
   - Trigger: Post successfully published
   - Channel: In-app + Email
   - Content: Post ID, publish time, caption preview

2. **Post Failed - Retry**
   - Trigger: First/second retry starts
   - Channel: In-app
   - Content: Error type, retry attempt number

3. **Post Failed - Final**
   - Trigger: Max retries exhausted
   - Channel: In-app + Email
   - Content: Error details, manual retry link

4. **Daily Summary**
   - Trigger: User-configured time (default 9 AM)
   - Channel: Email
   - Content: Posts published today, upcoming, pending

**Acceptance Criteria:**
- ✅ Notifications delivered on time
- ✅ User dapat customize preferences
- ✅ Email format professional & readable
- ✅ Notification history available
- ✅ Unsubscribe option available

---

## 5. Requirements Summary Table

| Req ID | Feature | Priority | Status | Owner |
|---|---|---|---|---|
| REQ-AUTH-001 | Threads Login | CRITICAL | Pending | Backend |
| REQ-SCHEDULE-001 | Single Post Schedule | CRITICAL | Pending | Full Stack |
| REQ-IMPORT-001 | Bulk Import | HIGH | Pending | Backend |
| REQ-PUBLISH-001 | Auto-Publishing | CRITICAL | Pending | Backend |
| REQ-DASHBOARD-001 | Dashboard | HIGH | Pending | Frontend |
| REQ-ERROR-001 | Error Handling | CRITICAL | Pending | Backend |
| REQ-NOTIFY-001 | Notifications | MEDIUM | Pending | Backend |

---

## 6. Other Nonfunctional Requirements

### 6.1 Performance Requirements

| Metric | Target | Tolerance |
|---|---|---|
| Dashboard load time | 2 sec | ±500ms |
| API response time | 500ms | ±100ms |
| Post publish delay | 2 min window | ±1min |
| Database query | 200ms avg | max 500ms |
| Concurrent users | 1000 | - |
| Concurrent scheduled posts | 1000 | - |

### 6.2 Safety Requirements

- ✅ No data loss on system restart
- ✅ Automatic backup daily
- ✅ Recovery Point Objective (RPO): 1 hour
- ✅ Recovery Time Objective (RTO): 4 hours

### 6.3 Security Requirements

- ✅ Credentials encrypted at rest (AES-256)
- ✅ HTTPS TLS 1.2+ for all communication
- ✅ SQL injection prevention (parameterized queries)
- ✅ Rate limiting: 100 requests/min per user
- ✅ XSS protection (input sanitization)
- ✅ CSRF protection on all forms
- ✅ Audit logs for all user actions

### 6.4 Availability Requirements

- ✅ System uptime: 99% (4.32 hours downtime/month)
- ✅ Planned maintenance: Max 4 hours/month
- ✅ No data loss SLA: 99.9%
- ✅ Incident response: < 1 hour

### 6.5 Maintainability Requirements

- ✅ Code documented dengan JSDoc comments
- ✅ API documentation (Swagger/OpenAPI)
- ✅ Database schema versioned
- ✅ Deployment automated via CI/CD
- ✅ Monitoring & alerting setup

### 6.6 Scalability Requirements

- ✅ Support growth to 10,000 users
- ✅ Support 100,000 scheduled posts
- ✅ Horizontal scaling for API servers
- ✅ Database connection pooling
- ✅ CDN for static assets

---

## 7. Glossary

| Term | Definition |
|---|---|
| **Scheduled Post** | Post yang dijadwalkan untuk publish di waktu tertentu |
| **Job Queue** | Queue yang berisi posts menunggu untuk publish |
| **Playwright** | Browser automation library untuk login & interact dengan Threads |
| **Exponential Backoff** | Retry strategy dengan delay meningkat exponentially |
| **Session** | User session validity period dalam system |
| **Rate Limit** | Maximum requests/actions allowed dalam time window |

---

## 8. Appendix

### 8.1 Use Case Diagram
```
User
  ├─ Login dengan Threads credentials
  ├─ Schedule single post
  ├─ Import bulk posts via CSV
  ├─ View dashboard
  ├─ Edit/delete scheduled post
  ├─ Manual retry failed post
  ├─ Manage notification preferences
  └─ Logout
```

### 8.2 CSV Format Example
```csv
caption,date,time,timezone
"Good morning! #threads",2024-06-23,09:00,Asia/Jakarta
"Afternoon vibes 🌅",2024-06-23,15:00,Asia/Jakarta
"Night time thoughts",2024-06-23,21:00,Asia/Jakarta
```

### 8.3 API Response Example
```json
{
  "success": true,
  "data": {
    "postId": "post_abc123",
    "caption": "Hello Threads!",
    "scheduledTime": "2024-06-23T10:00:00+07:00",
    "status": "scheduled",
    "createdAt": "2024-06-22T15:30:00Z"
  }
}
```

---

**Document Approved By:** ____________________  
**Date:** ____________________  
**Next Review Date:** ____________________
