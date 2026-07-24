# Implementation Guide — v3.0 AI Content Generation (Internal)
## Fast Track: 4 Weeks to Ship

**Audience:** Backend + Frontend devs at DN Tech  
**Timeline:** ~4 weeks  
**Effort:** 1-2 engineers part-time  
**Goal:** Get v3.0 live with flexible LLM support by end of month

---

## Phase 1: LLM Provider Abstraction (Week 1)

### Task 1.1: Create LLM Service Layer

**File:** `src/services/llm/index.ts`

```typescript
export interface ILLMProvider {
  generateCaption(prompt: string): Promise<string>;
  getProviderName(): string;
  estimateCost(tokensUsed: number): number;
}

export class LLMService {
  private provider: ILLMProvider;

  constructor() {
    this.provider = this.initializeProvider();
  }

  private initializeProvider(): ILLMProvider {
    const providerType = process.env.LLM_PROVIDER || 'claude';
    
    switch(providerType) {
      case 'claude':
        return new ClaudeProvider();
      case 'codex':
        return new CodexProvider();
      case 'openrouter':
        return new OpenRouterProvider();
      default:
        throw new Error(`Unknown LLM provider: ${providerType}`);
    }
  }

  async generate(topic: string, tone: string): Promise<{
    caption: string;
    provider: string;
    cost: number;
  }> {
    try {
      const prompt = this.buildPrompt(topic, tone);
      const caption = await this.provider.generateCaption(prompt);
      
      // Log to DB for cost tracking
      const cost = this.provider.estimateCost(prompt.length / 4); // rough token estimate
      
      return {
        caption,
        provider: this.provider.getProviderName(),
        cost
      };
    } catch (error) {
      logger.error('LLM generation failed', { error, topic });
      throw error;
    }
  }

  private buildPrompt(topic: string, tone: string): string {
    const brandGuidelines = this.getBrandGuidelines();
    
    return `You are writing for DN Tech's Threads account.

Brand Voice: ${brandGuidelines.voice}

Topic: ${topic}
Tone: ${tone}

Requirements:
- Max 500 characters
- Include 2-4 relevant hashtags
- Sound conversational and authentic
- Focus on value/learning

Generate the caption now:`;
  }

  private getBrandGuidelines() {
    // Load from DB or cache
    return {
      voice: "Casual but professional, generous with knowledge sharing, innovation-focused",
      examples: ["🚀 Just shipped...", "The irony: we built..."]
    };
  }
}
```

**Checklist:**
- [ ] Create abstract interface `ILLMProvider`
- [ ] Create LLMService factory
- [ ] Test: can initialize Claude provider from env
- [ ] Test: can initialize Codex provider from env
- [ ] Test: can initialize OpenRouter provider from env

---

### Task 1.2: Implement Claude Provider

**File:** `src/services/llm/claude.provider.ts`

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { ILLMProvider } from "./index";

export class ClaudeProvider implements ILLMProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateCaption(prompt: string): Promise<string> {
    const message = await this.client.messages.create({
      model: "claude-opus-4",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as any).text)
      .join("");

    return text;
  }

  getProviderName(): string {
    return "claude";
  }

  estimateCost(tokensUsed: number): number {
    // Claude: $0.003 per 1K input tokens
    // (Approximate: 1 word ≈ 1.3 tokens)
    return (tokensUsed * 0.003) / 1000;
  }
}
```

**Checklist:**
- [ ] `npm install @anthropic-ai/sdk`
- [ ] Set `ANTHROPIC_API_KEY` in `.env`
- [ ] Test locally: `node -e "const s = new LLMService(); s.generate('test topic', 'casual')"`

---

### Task 1.3: Implement GitHub Codex Provider (Optional)

**File:** `src/services/llm/codex.provider.ts`

```typescript
import { ILLMProvider } from "./index";

export class CodexProvider implements ILLMProvider {
  async generateCaption(prompt: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GITHUB_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GITHUB_MODEL || "gpt-4-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Codex API error: ${data.error?.message}`);
    }

    return data.choices[0].message.content;
  }

  getProviderName(): string {
    return "codex";
  }

  estimateCost(tokensUsed: number): number {
    // GitHub Copilot: ~$20/month (fixed) or API pricing
    // If using API directly, check current pricing
    return (tokensUsed * 0.000015); // GPT-4 pricing
  }
}
```

---

### Task 1.4: Implement OpenRouter Provider (Optional)

**File:** `src/services/llm/openrouter.provider.ts`

```typescript
import { ILLMProvider } from "./index";

export class OpenRouterProvider implements ILLMProvider {
  async generateCaption(prompt: string): Promise<string> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://dntech.com",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || "openai/gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }

  getProviderName(): string {
    return "openrouter";
  }

  estimateCost(tokensUsed: number): number {
    // OpenRouter pricing varies by model
    // Check https://openrouter.ai/pricing
    return (tokensUsed * 0.000005); // rough estimate
  }
}
```

---

### Task 1.5: Database Migration

**File:** `migrations/20260725_ai_generation_tables.ts`

```typescript
export async function up(knex) {
  await knex.schema.createTable("generated_captions", (table) => {
    table.increments("id").primary();
    table.integer("user_id").unsigned().notNullable();
    table.string("topic", 500).notNullable();
    table.string("tone", 50);
    table.text("generated_text").notNullable();
    table.string("provider", 50); // claude|codex|openrouter
    table.integer("tokens_used");
    table.integer("cost_cents"); // in cents
    table.boolean("is_approved").defaultTo(false);
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("used_at");
    
    table.index(["user_id", "created_at"]);
  });

  await knex.schema.createTable("brand_guidelines", (table) => {
    table.increments("id").primary();
    table.string("name", 200);
    table.text("voice_description");
    table.text("example_caption");
    table.string("tone_preference");
    table.string("hashtag_defaults");
    table.boolean("is_active").defaultTo(true);
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("posting_heatmap", (table) => {
    table.increments("id").primary();
    table.string("day_of_week", 3); // Mon, Tue, ...
    table.integer("hour_of_day"); // 0-23
    table.integer("total_engagement").defaultTo(0);
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    
    table.unique(["day_of_week", "hour_of_day"]);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists("generated_captions");
  await knex.schema.dropTableIfExists("brand_guidelines");
  await knex.schema.dropTableIfExists("posting_heatmap");
}
```

**Run:**
```bash
npm run db:migrate
```

---

## Phase 2: API Endpoints (Week 1-2)

### Task 2.1: Create Generation Endpoint

**File:** `src/routes/ai.routes.ts`

```typescript
import { Router } from "express";
import { generateCaptionHandler, batchGenerateHandler, bestTimeHandler } from "../controllers/ai.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/generate-caption", authenticate, generateCaptionHandler);
router.post("/batch-generate", authenticate, batchGenerateHandler);
router.get("/best-time", authenticate, bestTimeHandler);

export default router;
```

**File:** `src/controllers/ai.controller.ts`

```typescript
import { LLMService } from "../services/llm";
import { db } from "../db";

export async function generateCaptionHandler(req, res) {
  const { topic, tone = "casual" } = req.body;
  const userId = req.user.id;

  // Validation
  if (!topic || topic.length < 3 || topic.length > 500) {
    return res.status(400).json({ error: "Topic must be 3-500 characters" });
  }

  try {
    const llm = new LLMService();
    const { caption, provider, cost } = await llm.generate(topic, tone);

    // Store in DB
    const [id] = await db("generated_captions").insert({
      user_id: userId,
      topic,
      tone,
      generated_text: caption,
      provider,
      cost_cents: Math.round(cost * 100),
      is_approved: false,
    });

    return res.json({
      id,
      caption,
      provider,
      cost,
      characterCount: caption.length,
    });
  } catch (error) {
    logger.error("Generation failed", { error, topic, userId });
    return res.status(500).json({ error: "Generation failed. Try again or write manually." });
  }
}

export async function batchGenerateHandler(req, res) {
  const { topics } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(topics) || topics.length > 10) {
    return res.status(400).json({ error: "Max 10 topics per batch" });
  }

  const results = [];
  const llm = new LLMService();

  for (const topic of topics) {
    try {
      const { caption, provider, cost } = await llm.generate(topic, "casual");
      
      const [id] = await db("generated_captions").insert({
        user_id: userId,
        topic,
        generated_text: caption,
        provider,
        cost_cents: Math.round(cost * 100),
      });

      results.push({ id, topic, caption, provider });
    } catch (error) {
      results.push({ topic, error: "Failed to generate" });
    }
  }

  return res.json({ results });
}

export async function bestTimeHandler(req, res) {
  // Get top posting hour from heatmap
  const topHour = await db("posting_heatmap")
    .orderBy("total_engagement", "desc")
    .first();

  if (!topHour) {
    return res.json({ suggestion: "Best times: 14:00-20:00" });
  }

  return res.json({
    suggestion: `${topHour.day_of_week} ${String(topHour.hour_of_day).padStart(2, '0')}:00`,
    engagement: topHour.total_engagement,
  });
}
```

**Checklist:**
- [ ] Endpoints create and respond correctly
- [ ] Test with curl: `curl -X POST http://localhost:3000/v1/ai/generate-caption -d '{"topic":"test"}'`
- [ ] Data stores in `generated_captions` table

---

### Task 2.2: Frontend UI Component

**File:** `src/components/GenerateCaptionModal.tsx`

```typescript
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Select,
  MenuItem,
  CircularProgress,
  Box,
  Chip,
  Typography,
} from "@mui/material";
import { generateCaption } from "../api/ai";

export function GenerateCaptionModal({ onUseCaption, onClose }) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("casual");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await generateCaption(topic, tone);
      setCaption(result.caption);
    } catch (err) {
      setError("Generation failed. Try again or write manually.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Generate Caption</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Product launch tips"
            fullWidth
            multiline
            rows={2}
          />

          <Select value={tone} onChange={(e) => setTone(e.target.value)}>
            <MenuItem value="casual">Casual</MenuItem>
            <MenuItem value="professional">Professional</MenuItem>
          </Select>

          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={!topic || loading}
          >
            {loading ? <CircularProgress size={24} /> : "Generate"}
          </Button>

          {error && <Typography color="error">{error}</Typography>}

          {caption && (
            <Box sx={{ p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
              <Chip label="Generated" color="primary" size="small" />
              <Typography sx={{ mt: 1 }}>{caption}</Typography>
              <Typography variant="caption">{caption.length}/500 chars</Typography>

              <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => onUseCaption(caption)}
                >
                  Use Caption
                </Button>
                <Button size="small" onClick={() => setCaption("")}>
                  Discard
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
```

**Checklist:**
- [ ] Component renders in editor
- [ ] Generate button calls API
- [ ] Caption displays with character count
- [ ] "Use Caption" populates text field

---

## Phase 3: Schedule & Analytics (Week 2-3)

### Task 3.1: Best Time Heatmap

**File:** `src/jobs/updateHeatmap.job.ts`

```typescript
import { db } from "../db";

export async function updateHeatmapJob() {
  // Fetch last 30 days of posts
  const posts = await db("posts")
    .where("published_at", ">", db.raw("NOW() - INTERVAL 30 DAY"))
    .select("published_at", "likes", "replies");

  // Group by day + hour
  const heatmap: Record<string, number> = {};
  
  for (const post of posts) {
    const date = new Date(post.published_at);
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
    const hour = date.getHours();
    const key = `${day}_${hour}`;
    
    const engagement = (post.likes || 0) + (post.replies || 0);
    heatmap[key] = (heatmap[key] || 0) + engagement;
  }

  // Store in DB
  for (const [key, engagement] of Object.entries(heatmap)) {
    const [day, hour] = key.split("_");
    
    await db("posting_heatmap")
      .where({ day_of_week: day, hour_of_day: parseInt(hour) })
      .update({ total_engagement: engagement, updated_at: db.fn.now() })
      .orCreate({ day_of_week: day, hour_of_day: parseInt(hour), total_engagement: engagement });
  }

  logger.info("Heatmap updated");
}

// Schedule daily at 02:00 UTC
schedule.scheduleJob("0 2 * * *", updateHeatmapJob);
```

**Checklist:**
- [ ] Cron job runs daily
- [ ] Heatmap table populated
- [ ] Best time endpoint returns correct data

---

### Task 3.2: Usage Dashboard

**File:** `src/components/AIUsageDashboard.tsx`

```typescript
import React, { useEffect, useState } from "react";
import { Box, Card, Typography, BarChart, Bar, XAxis, YAxis } from "@mui/material";
import { getUsageStats } from "../api/ai";

export function AIUsageDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getUsageStats().then(setStats);
  }, []);

  if (!stats) return <div>Loading...</div>;

  return (
    <Box>
      <Typography variant="h5">AI Usage & Cost</Typography>

      <Card sx={{ mt: 2, p: 2 }}>
        <Typography variant="subtitle2">Cost by Provider</Typography>
        <BarChart data={stats.costByProvider} width={400} height={300}>
          <XAxis dataKey="provider" />
          <YAxis />
          <Bar dataKey="cost" />
        </BarChart>
      </Card>

      <Card sx={{ mt: 2, p: 2 }}>
        <Typography>This month: ${stats.totalCost}</Typography>
        <Typography>Captions generated: {stats.totalCaptions}</Typography>
        <Typography>Avg cost per caption: ${stats.avgCost}</Typography>
      </Card>
    </Box>
  );
}
```

---

## Phase 4: Polish & Testing (Week 3-4)

### Task 4.1: Validation Layer

```typescript
export async function validateCaption(text: string) {
  const errors: string[] = [];
  
  // Check length
  if (text.length > 500) {
    errors.push("Exceeds 500 character limit");
  }
  
  // Check hashtag count
  const hashtags = (text.match(/#\w+/g) || []).length;
  if (hashtags > 5) {
    errors.push("Too many hashtags (max 5)");
  }
  
  // Basic grammar check
  if (!text.match(/[.!?]$/)) {
    errors.push("Should end with punctuation");
  }
  
  return { passed: errors.length === 0, errors };
}
```

### Task 4.2: Testing

```typescript
describe("LLM Service", () => {
  it("should generate caption", async () => {
    const llm = new LLMService();
    const { caption } = await llm.generate("test topic", "casual");
    
    expect(caption).toBeDefined();
    expect(caption.length).toBeLessThan(500);
  });

  it("should switch providers", async () => {
    process.env.LLM_PROVIDER = "claude";
    const llm1 = new LLMService();
    expect(llm1.provider.getProviderName()).toBe("claude");
    
    process.env.LLM_PROVIDER = "openrouter";
    const llm2 = new LLMService();
    expect(llm2.provider.getProviderName()).toBe("openrouter");
  });

  it("should cost track", async () => {
    const llm = new LLMService();
    const { cost } = await llm.generate("test", "casual");
    expect(cost).toBeGreaterThan(0);
  });
});
```

**Run tests:**
```bash
npm test -- ai
```

---

## Quick Start (Local Dev)

```bash
# 1. Clone & setup
cd auto
npm install
npm install @anthropic-ai/sdk

# 2. Environment
echo "LLM_PROVIDER=claude" >> .env
echo "ANTHROPIC_API_KEY=sk-..." >> .env

# 3. Migrate
npm run db:migrate

# 4. Start
npm run dev

# 5. Test
curl -X POST http://localhost:3000/v1/ai/generate-caption \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic":"AI productivity tips","tone":"casual"}'
```

---

## Environment Switching

```bash
# Use Claude (default)
LLM_PROVIDER=claude npm start

# Use GitHub Codex (if available)
LLM_PROVIDER=codex GITHUB_API_KEY=ghp_*** npm start

# Use OpenRouter (cheapest often)
LLM_PROVIDER=openrouter OPENROUTER_API_KEY=sk-*** npm start
```

---

## Cost Optimization Tips

1. **OpenRouter is cheapest** for GPT-4 ($0.01/1K tokens)
2. **Claude is most reliable** ($0.003/1K input)
3. **Codex is fastest** (lower latency)
4. **Switch based on need:** fast → Codex, cheap → OpenRouter, best quality → Claude

---

## Success Criteria

- ✅ Can generate 10 captions/day
- ✅ <3s generation time
- ✅ <$0.10 total cost per day
- ✅ Team uses it for daily posts
- ✅ Captions sound like DN Tech

---

**Ship it! 🚀**
