# PRD v3.0 — Threads Automation: AI Content Generation & Auto-Posting
## Internal Tool Edition (DN Tech)

**Versi** | 3.0  
**Tanggal** | 25 Juli 2026  
**Owner** | Dozer (CEO + Tech Lead)  
**Usage** | Internal DN Tech content automation (tidak untuk public/SaaS)  
**Status** | Ready for Development  
**Baseline** | MVP Phase 1 + Phase 2 + v2.0 Live Publish ✓

---

## 1. Executive Summary

Threads Automation v3.0 mengubah workflow content creation DN Tech dari **manual** ke **AI-powered**:

- **Sebelumnya:** Dozer/team menulis caption manual, schedule post satu-satu (20 min per post)
- **Sekarang:** Input topic → bot generate caption → approve → auto-schedule optimal time → posted

**Outcome:** DN Tech bisa **10x lebih konsisten** dalam content posting, lebih banyak engagement, dengan effort minimal.

**Stack flexibility:** Bisa pakai Claude API, GitHub Codex, atau OpenRouter—pilih berdasarkan cost/kecepatan.

---

## 2. User Personas (Internal)

| Persona | Kebutuhan | Usage Pattern |
|---------|-----------|---|
| **Dozer (CEO)** | Rapid posting tentang product updates + thought leadership | 1-2 posts/hari, batch planning mingguan |
| **Marketing Manager** | Plan content calendar, maintain brand voice | 5-10 posts/minggu, bulk scheduling |
| **Content Creator** | Consistency dalam topik, variety dalam framing | Daily posting, regenerate often |
| **Dev Team** | Tech tips, company culture posts | 2-3 posts/minggu, internal sharing |

---

## 3. Goals & Success Metrics

### Primary Goals

| Goal | Metrik | Target |
|------|--------|--------|
| **Consistency** | Posts published per week | 10+ (vs. 3-4 saat ini) |
| **Time saved** | Hours/week on content creation | 5+ hours saved |
| **Quality** | Generated caption approval rate | ≥85% (gak perlu banyak edit) |
| **Engagement** | Avg likes/replies per post | +20% vs. manual posts |
| **Team coverage** | Posts posted ketika orang busy | 100% auto-posted on schedule |

### Secondary Metrics

- Generation latency: <3s per caption
- Cost per caption: <$0.01 (minimize API spend)
- Team adoption: 100% (everyone uses it)

---

## 4. User Stories & Acceptance Criteria

### Story 4.1: AI Caption Generation (Any LLM Provider) (P0)

**Sebagai** content creator di DN Tech, **saya ingin** input topic, **sehingga** bot write caption yang engaging untuk Threads.

**Acceptance Criteria**
- [ ] Dashboard ada button "Generate Caption"
- [ ] User input: `topic` (required), `tone` (optional: professional/casual/DN-culture), `length` (optional: short/medium)
- [ ] Backend call ke LLM provider (configurable via env):
  ```
  LLM_PROVIDER=claude|codex|openrouter (default: claude)
  ```
- [ ] Generated caption muncul di editor, user bisa:
  - ✅ Use (populate field)
  - 🔄 Regenerate (up to 3x)
  - ✏️ Edit
  - ❌ Discard
- [ ] Hashtags included (2-5 relevant)
- [ ] Character count shown (Threads max 500)

**LLM Integration (Flexible)**
```typescript
// Backend abstraction layer
interface LLMProvider {
  generateCaption(topic: string, tone: string): Promise<string>;
  estimateCost(): number;
}

// Implementations
class ClaudeProvider implements LLMProvider { }
class CodexProvider implements LLMProvider { }
class OpenRouterProvider implements LLMProvider { }

// Route to correct provider
const provider = getLLMProvider(process.env.LLM_PROVIDER);
```

**Environment Variables**
```
# Choose ONE
LLM_PROVIDER=claude|codex|openrouter

# Claude
ANTHROPIC_API_KEY=sk-***

# GitHub Codex
GITHUB_API_KEY=ghp_***
GITHUB_MODEL=text-davinci-003|gpt-4 (or latest)

# OpenRouter
OPENROUTER_API_KEY=sk-***
OPENROUTER_MODEL=openai/gpt-4|anthropic/claude-opus|etc
```

**Test Criteria**
- [ ] Unit: prompt generation (topic → valid prompt)
- [ ] Integration: API call success (mock all providers)
- [ ] Rate limiting: 10 gen/min per user (prevent spam)
- [ ] Error handling: provider timeout → fallback graceful error

---

### Story 4.2: DN Tech Brand Voice & Templates (P0)

**Sebagai** Dozer, **saya ingin** AI generates captions yang match DN Tech brand (casual but professional, focus pada value/innovation), **sehingga** semua posts konsisten.

**Acceptance Criteria**
- [ ] Settings → "Brand Guidelines" section (admin-only, untuk Dozer)
- [ ] Template input:
  ```
  Brand voice: "We're tech-forward, casual, generous with knowledge sharing"
  Example caption: "🚀 Just shipped a feature that saves our team 2 hours/day..."
  Tone preference: Casual but not memes
  Hashtags: #dntech #threads #productlaunch
  ```
- [ ] Admin define one or more templates
- [ ] When generating: include brand guidelines in prompt
- [ ] All captions automatically match DN Tech style

**Prompt Template (Dynamic)**
```
You are writing for DN Tech's Threads account.

Brand voice: {brand_guidelines}
Example: {example_caption}

Topic: {user_topic}
Tone: {user_tone}

Generate a caption that matches our brand voice, includes 2-4 relevant hashtags.
Max 500 characters.
```

**Test Criteria**
- [ ] Brand template stored in DB
- [ ] Prompt includes template
- [ ] Generated captions sound consistent (human review 10 samples)

---

### Story 4.3: Content Review & Approval Workflow (P0)

**Sebagai** user, **saya ingin** review generated caption sebelum post (untuk quality control), **sehingga** tetap maintain brand quality.

**Acceptance Criteria**
- [ ] After generation: caption shown with "Generated" badge (blue)
- [ ] Optional checklist:
  - ☐ Sounds like DN Tech
  - ☐ No typos/grammar issues
  - ☐ Relevant to our brand
- [ ] User can:
  - ✅ Approve & Schedule
  - ✏️ Edit (remove "Generated" badge)
  - 🔄 Regenerate
  - ❌ Discard
- [ ] Approval logged in DB (audit trail)

---

### Story 4.4: Smart Scheduling (Best Time Prediction) (P1)

**Sebagai** Dozer, **saya ingin** bot suggest optimal time untuk post, **sehingga** maximize engagement tanpa manual thinking.

**Acceptance Criteria**
- [ ] After approving caption: system shows "💡 Best time to post: Thu 14:00"
- [ ] Based on:
  - Historical engagement data (past posts: when did they get most engagement?)
  - Day-of-week + hour heatmap
  - Optional: industry benchmarks (Threads typically peaks 18:00-20:00)
- [ ] User accept suggestion → auto-fill schedule form
- [ ] User ignore → pick custom time
- [ ] New user (no history) → suggest "Best times are typically 14:00-20:00"

**Heatmap Computation (Daily Cron)**
```typescript
async function computeBestTime() {
  const posts = await db('posts')
    .where('published_at', '>', knex.raw('NOW() - INTERVAL 30 DAY'));
  
  // Group by hour + day: { "Mon_14": 45, "Wed_19": 120, ... }
  const heatmap = {};
  for (const post of posts) {
    const key = `${getDayOfWeek(post.published_at)}_${getHour(post.published_at)}`;
    heatmap[key] = (heatmap[key] || 0) + (post.likes + post.replies);
  }
  
  // Find top slot
  const bestSlot = Object.entries(heatmap)
    .sort((a, b) => b[1] - a[1])[0];
  
  // Cache in Redis
  await redis.set('best-posting-time', bestSlot[0], 'EX', 86400);
}
```

**Test Criteria**
- [ ] Heatmap computes correctly
- [ ] API `GET /v1/ai/best-time` returns suggestion
- [ ] UI shows suggestion, clickable to accept

---

### Story 4.5: Batch Generation for Content Planning (P1)

**Sebagai** Dozer/Marketing Manager, **saya ingin** generate multiple captions sekaligus (e.g., plan Senin-Jumat), **sehingga** efficient content planning.

**Acceptance Criteria**
- [ ] Dashboard → "Batch Generate" button
- [ ] Input: paste topics (1 per line) atau upload CSV
  ```csv
  topic,tone,length
  "Product launch tips",professional,medium
  "Engineering challenges",casual,short
  "Culture snapshot",DN-culture,short
  ```
- [ ] Click "Generate All" → progress bar
- [ ] Show 5 captions in grid (preview + edit in-place)
- [ ] Approve all → auto-schedule dengan spaced-out timing
  - Mon 09:00, Tue 14:00, Wed 19:00, Thu 10:00, Fri 15:00 (stagger)
- [ ] Save as "Content Plan (Draft)" untuk later scheduling

**Constraints**
- Max 10 topics per batch (avoid excessive API calls)
- Rate limit: 1 batch per 10 min (safety)

**Test Criteria**
- [ ] Batch API handles array of topics
- [ ] Error resilience (1 fail doesn't break others)
- [ ] Auto-spacing schedule correct

---

### Story 4.6: Quality Validation (Grammar, Brand Fit, Tone) (P0)

**Sebagai** system, **saya ingin** check generated captions buat quality sebelum user approve, **sehingga** minimal rejection/bad posts.

**Acceptance Criteria**
- [ ] After generation, run validation:
  - **Grammar**: simple heuristic (sentence structure, common typos)
  - **Brand fit**: LLM-based check ("Does this sound like DN Tech? Rate 1-5")
  - **Tone match**: check if tone (casual/professional) is correct
  - **Hashtags**: at least 1, max 5

- [ ] If grammar issues detected:
  - Show ⚠️ badge: "Grammar issues detected"
  - Allow user to fix + revalidate manually

- [ ] If brand fit score <3:
  - Show 💡 suggestion: "Might not match our brand. Try regenerating?"
  - Allow override (user can still use it)

- [ ] Validation results stored (audit log)

---

### Story 4.7: Batch Scheduling for Team Collaboration (P1)

**Sebagai** Marketing Manager, **saya ingin** schedule posts untuk beberapa hari sekaligus, then hand-off to operations, **sehingga** content flows otomatis tanpa daily intervention.

**Acceptance Criteria**
- [ ] Generate 5-10 captions (batch)
- [ ] Approve all → show calendar view (Mon-Fri dengan preview)
- [ ] Click "Schedule All" → all posts scheduled at optimal times
- [ ] Notification: "5 posts scheduled for Mon-Fri. Will auto-post."
- [ ] Team dapat track status real-time (dashboard: pending, published, failed)

---

### Story 4.8: Cost Tracking & LLM Provider Comparison (P1)

**Sebagai** Dozer (concerned about API cost), **saya ingin** see per-caption cost by provider, **sehingga** optimize savings.

**Acceptance Criteria**
- [ ] Dashboard → "Usage & Cost" tab (admin-only)
- [ ] Show:
  - Captions generated this month: X
  - Cost breakdown by provider:
    - Claude: $Y (N captions)
    - Codex: $Z (M captions)
    - OpenRouter: $W
  - Avg cost per caption
  - Monthly trend (chart)

- [ ] Optional: "Recommended provider based on cost: Codex (-40% vs Claude)"

- [ ] Alert: if monthly spend > $50, notify Dozer

**Data Tracking**
```sql
CREATE TABLE caption_generation_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  topic VARCHAR(500),
  provider VARCHAR(50),  -- claude|codex|openrouter
  tokens_used INTEGER,
  cost_cents INTEGER,    -- in cents ($0.01 = 1 cent)
  generation_time_ms INTEGER,
  timestamp TIMESTAMP
);
```

---

## 5. Non-Functional Requirements

### 5.1 Performance

- **Generation latency**: <3s per caption (p95)
- **Batch generation**: 10 captions in <30s
- **Dashboard load**: <2s
- **API response time**: <500ms

### 5.2 Reliability

- **LLM API fallback**: if primary provider down → try secondary
  ```typescript
  // Try Claude first, fallback to OpenRouter
  try {
    return await claudeProvider.generate(topic);
  } catch {
    return await openRouterProvider.generate(topic);
  }
  ```
- **Retry logic**: 3x with backoff on timeout
- **Graceful degradation**: if LLM fails → show error, allow manual caption

### 5.3 Cost Optimization

- **Provider selection**: cheaper option by default (compare Codex vs Claude)
- **Prompt caching**: cache recent brand guidelines (reduce tokens)
- **Batch efficiency**: generate 10 at once cheaper than 10 individual calls
- **Cost alerts**: warn if monthly spend spikes

### 5.4 Security (Internal Only)

- **API keys** stored in `.env` (not in code/repo)
- **No public API** (only internal Express endpoints)
- **No rate limiting per user** (we're the only users)
- **Audit logging** (who generated what, when)

### 5.5 Usability

- **Simple UI**: "Generate Caption" button, minimal config
- **Clear results**: generated caption displayed prominently
- **Quick feedback**: loading state, error messages
- **Keyboard shortcuts**: maybe (Cmd+G to generate?)

---

## 6. In Scope vs. Out of Scope

### 6.1 In Scope (v3.0)

✅ AI caption generation (LLM-agnostic)  
✅ Multiple LLM provider support (Claude/Codex/OpenRouter)  
✅ DN Tech brand voice templates  
✅ Mandatory approval before posting  
✅ Smart scheduling (best-time prediction)  
✅ Batch generation (up to 10 topics)  
✅ Quality validation (grammar, brand fit)  
✅ Cost tracking & provider comparison  
✅ Audit logging (all generation events)  

### 6.2 Out of Scope (future)

❌ AI image generation (separate tool/process)  
❌ Team approval workflows (Dozer just approves)  
❌ Multi-language (English-only for v3.0)  
❌ Video content  
❌ TikTok/Instagram (Threads-only)  
❌ Advanced ML (sentiment analysis, trending topics)  

---

## 7. Architecture & Technical Approach

### 7.1 High-Level Flow

```
Dozer/Team → Dashboard
  ↓
Input: topic="Product launch: X feature"
  ↓
POST /v1/ai/generate-caption
  ↓
Backend:
  1. Load LLM provider (env: CLAUDE|CODEX|OPENROUTER)
  2. Load DN Tech brand guidelines (from DB)
  3. Build prompt (topic + brand + tone)
  4. Call LLM API (with retry fallback)
  5. Validate output (grammar, brand fit)
  6. Store in `generated_captions` table
  7. Return caption
  ↓
UI: Show caption + approve/edit/regenerate
  ↓
Click "Approve & Schedule"
  ↓
API suggests best time (from heatmap)
  ↓
Click "Use this time"
  ↓
Schedule form auto-filled
  ↓
Click "Schedule"
  ↓
POST /v1/posts → same v2.0 flow → Playwright → publish at due time
```

### 7.2 LLM Provider Abstraction

```typescript
// Interface (independent of provider)
interface ILLMProvider {
  generateCaption(topic: string, tone: string, prompt: string): Promise<string>;
  getEstimatedCost(tokens: number): number;
  getName(): string;
}

// Claude implementation
class ClaudeProvider implements ILLMProvider {
  async generateCaption(topic, tone, systemPrompt) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-opus-4",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `${systemPrompt}\n\nTopic: ${topic}\nTone: ${tone}`
      }]
    });
    return response.content[0].text;
  }
  
  getEstimatedCost(tokens) {
    // Claude: $0.003 per 1K input, $0.015 per 1K output
    return (tokens * 0.003) / 1000;
  }
}

// Codex implementation
class CodexProvider implements ILLMProvider {
  async generateCaption(topic, tone, systemPrompt) {
    const response = await fetch('https://api.github.com/copilot/chat/completions', {
      headers: { 'Authorization': `Bearer ${process.env.GITHUB_API_KEY}` },
      body: JSON.stringify({
        messages: [{ role: "user", content: `${systemPrompt}...\nTopic: ${topic}` }]
      })
    });
    return response.json().choices[0].message.content;
  }
  
  getEstimatedCost(tokens) {
    // GitHub Copilot: ~$20/month (fixed) or API pricing
    return 0; // or calculate per-token if using API directly
  }
}

// OpenRouter implementation
class OpenRouterProvider implements ILLMProvider {
  async generateCaption(topic, tone, systemPrompt) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4",
        messages: [{ role: "user", content: `${systemPrompt}...\nTopic: ${topic}` }]
      })
    });
    return response.json().choices[0].message.content;
  }
  
  getEstimatedCost(tokens) {
    // OpenRouter: varies by model (gpt-4, claude, etc)
    // Check openrouter.ai/pricing
    return (tokens * 0.00003); // approximate
  }
}

// Factory
function getLLMProvider(): ILLMProvider {
  const provider = process.env.LLM_PROVIDER || 'claude';
  switch(provider) {
    case 'claude': return new ClaudeProvider();
    case 'codex': return new CodexProvider();
    case 'openrouter': return new OpenRouterProvider();
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}
```

### 7.3 Database Changes

```sql
-- Generated captions (track all generations)
CREATE TABLE generated_captions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  topic VARCHAR(500) NOT NULL,
  tone VARCHAR(50),
  generated_text TEXT NOT NULL,
  provider VARCHAR(50),  -- claude|codex|openrouter
  tokens_used INTEGER,
  cost_cents INTEGER,
  validation_passed BOOLEAN,
  validation_errors TEXT,  -- JSON
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP  -- when scheduled to post
);

-- Brand guidelines (for consistency)
CREATE TABLE brand_guidelines (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200),
  voice_description TEXT,  -- "casual but professional, generous with knowledge"
  example_caption TEXT,
  tone_preference VARCHAR(200),
  hashtag_defaults VARCHAR(500),  -- "dntech, threads, innovation"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP
);

-- Cost tracking by provider
CREATE TABLE llm_cost_log (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50),
  caption_id INTEGER REFERENCES generated_captions(id),
  tokens_used INTEGER,
  cost_cents INTEGER,
  timestamp TIMESTAMP
);

-- Posting heatmap (cached daily)
CREATE TABLE posting_heatmap (
  id SERIAL PRIMARY KEY,
  day_of_week VARCHAR(3),  -- Mon, Tue, ...
  hour_of_day INTEGER,  -- 0-23
  total_engagement INTEGER,  -- sum of likes+replies
  updated_at TIMESTAMP
);
```

### 7.4 API Endpoints

**New:**
- `POST /v1/ai/generate-caption` — generate single caption
- `POST /v1/ai/batch-generate` — generate multiple
- `GET /v1/ai/best-time` — suggest posting time
- `GET /v1/ai/usage-stats` — cost breakdown by provider
- `PATCH /v1/ai/brand-guidelines` — update brand voice (admin)

**Modified:**
- `POST /v1/posts` — add `generated_caption_id` field

### 7.5 Frontend Components

- **Generate Caption Modal**: topic input, dropdown for tone, generate button
- **Batch Generator**: list of topics (paste), generate all, grid view
- **Usage & Cost Dashboard**: bar chart (cost by provider), monthly trend
- **Brand Guidelines Editor**: textarea for voice, example caption

---

## 8. Risk Register & Mitigation

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|-----------|
| Generated content low quality | HIGH | MEDIUM | Validation layer + mandatory review + human spot-check |
| LLM provider API down | MEDIUM | MEDIUM | Fallback to secondary provider, manual mode fallback |
| Inconsistent brand voice | MEDIUM | MEDIUM | Brand guidelines in every prompt, human review |
| Over-reliance on AI → team lazy | LOW | LOW | AI is assistant, encourage editing/thinking |
| Cost unexpected spike | MEDIUM | LOW | Cost dashboard + monthly alerts, test in staging first |

---

## 9. Implementation Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1** | Week 1 | Claude API setup + basic UI + test |
| **Phase 2** | Week 2 | Brand guidelines + approval workflow |
| **Phase 3** | Week 2-3 | Best-time prediction + batch generator |
| **Phase 4** | Week 3 | Quality validation + cost tracking |
| **Phase 5** | Week 4 | Polish + team testing + go-live |
| **TOTAL** | **~4 weeks** | Full v3.0 shipped |

---

## 10. Success Criteria

- [ ] Claude API works + generates reasonable captions
- [ ] LLM provider switching works (can swap providers)
- [ ] Team can generate 10 captions/day with <5 min effort
- [ ] Generated captions approval rate ≥85%
- [ ] Posting frequency increases 10x (3-4 → 30-40 posts/week)
- [ ] Brand voice consistent across all generated posts
- [ ] Cost tracking accurate + dashboard shows real spend
- [ ] All v2.0 features still work (backward compatible)

---

## 11. Appendix: Example Captions (DN Tech Brand)

### Example 1: Product Launch

```
Topic: "Shipped new Threads automation feature"
Generated:

🚀 Just shipped something we're really proud of—Threads automation v3.0. 
Your social strategy, on autopilot. Let AI handle the writing, you handle the thinking.
Live now at threads.dntech.com #Threads #Automation #ProductLaunch
```

### Example 2: Engineering/Culture

```
Topic: "How we use AI internally for content"
Generated:

The irony: we built an AI tool to auto-post about AI. 🤖 
Turns out Claude is better at captions than our whole team combined.
Share your secret to consistent posting—what tool changed the game for you?
#AI #Content #BehindTheScenes #Threads
```

### Example 3: Thought Leadership

```
Topic: "AI tools accelerating small business growth"
Generated:

AI isn't just for tech companies anymore. We're seeing small businesses 10x their productivity 
with tools like Claude + Threads automation. No more 20 min to schedule a post. 
How is AI changing your business? #AI #SmallBusiness #Threads #Innovation
```

---

## 12. Deployment Notes

### Environment Setup

```bash
# .env
LLM_PROVIDER=claude  # or codex, openrouter

# Claude
ANTHROPIC_API_KEY=sk-***

# GitHub Codex (optional)
GITHUB_API_KEY=ghp_***

# OpenRouter (optional)
OPENROUTER_API_KEY=sk-***
OPENROUTER_MODEL=openai/gpt-4

# Optional cost alert
MONTHLY_COST_ALERT_THRESHOLD=50  # dollars
```

### Local Testing

```bash
# Test Claude
LLM_PROVIDER=claude npm run dev

# Test Codex
LLM_PROVIDER=codex npm run dev

# Test OpenRouter
LLM_PROVIDER=openrouter npm run dev
```

### Migration

```bash
npm run db:migrate  # creates tables
npm run seed:brand-guidelines  # seed DN Tech guidelines
npm start  # launch
```

---

## Document Owner

**Dozer (CEO + Tech Lead)** — DN Tech  
**Created:** 25 Juli 2026  
**Status:** Ready for Development  
**Next Review:** After v3.0 shipped

---

**Let's ship v3.0 and make DN Tech's content game unstoppable.** 🚀
