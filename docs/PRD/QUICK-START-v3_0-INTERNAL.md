# Threads Automation v3.0 — Quick Start (Internal)

## 🎯 What It Does

```
Old: "I'll write a caption" (20 min) → "Schedule post" → publish
New: "Topic: AI tips" → AI write caption (2 min) → approve → publish
```

**Result:** 10x faster content creation, consistent brand voice, smarter posting times.

---

## 🛠️ Tech Stack

- **Backend:** Express (existing v2.0)
- **LLM:** Claude, Codex, or OpenRouter (pick any, can switch anytime)
- **DB:** PostgreSQL (add 3 tables)
- **Timeline:** 4 weeks to ship

---

## 📦 What You're Getting

| File | Purpose |
|------|---------|
| **PRD-v3_0-AI-Content-Generation-INTERNAL.md** | Full specification (read this first) |
| **IMPLEMENTATION-GUIDE-v3_0-INTERNAL.md** | Code tasks + snippets (developers use this) |
| **QUICK-START-v3_0-INTERNAL.md** | This file (reference) |

---

## 🚀 4-Week Implementation

```
Week 1: LLM abstraction layer + basic API endpoint
        ↓
Week 2: Frontend UI + batch generation
        ↓
Week 3: Smart scheduling (heatmap) + cost tracking
        ↓
Week 4: Testing, polish, go-live
```

---

## 💻 Core Features (v3.0)

✅ **Topic → Caption** — Describe what to post, AI writes it  
✅ **Brand Voice** — Automatically matches DN Tech style  
✅ **Approval Required** — Review before posting (safety first)  
✅ **Batch Generate** — Create 5-10 captions in one go  
✅ **Smart Timing** — "Best time to post: Wed 18:00"  
✅ **Cost Tracking** — See spend per provider  
✅ **Flexible LLM** — Switch between Claude/Codex/OpenRouter anytime  

---

## 🔧 Setup (5 minutes)

```bash
# 1. Install dependency
npm install @anthropic-api/sdk

# 2. Add to .env
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-***

# 3. Migrate DB
npm run db:migrate

# 4. Start
npm run dev

# 5. Test
curl -X POST http://localhost:3000/v1/ai/generate-caption \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"topic":"AI productivity tips","tone":"casual"}'
```

---

## 💰 Cost Reference

| Provider | Cost/1K tokens | Speed | Quality |
|----------|---|---|---|
| **Claude** | $0.003 | Medium | Best |
| **Codex** | $0.015 | Fast ⚡ | Good |
| **OpenRouter** | $0.01 | Fast | Good |

**Recommendation:** Start with Claude (most reliable), switch to OpenRouter if cost matters.

---

## 📝 LLM Provider Switching

All 3 providers work the same way. To switch:

```bash
# Switch to Codex
LLM_PROVIDER=codex GITHUB_API_KEY=ghp_*** npm start

# Switch to OpenRouter
LLM_PROVIDER=openrouter OPENROUTER_API_KEY=sk-*** npm start

# Back to Claude
LLM_PROVIDER=claude npm start
```

**No code changes needed!** The abstraction layer handles all 3.

---

## 📊 Metrics That Matter

| Metric | Target |
|--------|--------|
| **Generation time** | <3 seconds |
| **Team adoption** | 100% using it within 2 weeks |
| **Caption approval rate** | ≥85% (users don't reject) |
| **Posts/week** | 10+ (vs. 3-4 today) |
| **Monthly cost** | <$50 |

---

## 🎬 User Workflow

```
1. Dashboard → "Generate Caption" button
2. Input: topic = "Shipped new feature"
3. Click "Generate"
4. AI writes: "🚀 Just shipped X. Here's why it matters..."
5. Click "Approve & Schedule"
6. Bot suggests: "Best time: Wed 18:00"
7. Click "Use this time"
8. Done! Post queued at Wed 18:00
9. At due time → Playwright auto-publishes to Threads
```

---

## 📋 Implementation Checklist

### Week 1
- [ ] LLM service layer (abstraction for 3 providers)
- [ ] Claude provider working
- [ ] API endpoint `/v1/ai/generate-caption` responding
- [ ] DB tables created

### Week 2
- [ ] Frontend modal component
- [ ] Batch generation endpoint
- [ ] "Generate Caption" button in editor
- [ ] Cost tracking

### Week 3
- [ ] Heatmap computation (best posting time)
- [ ] Time suggestion UI
- [ ] Usage dashboard (cost by provider)

### Week 4
- [ ] Validation layer (grammar, brand fit)
- [ ] Tests + QA
- [ ] Go-live

---

## 🔒 Security & Safety

✅ API keys in `.env` only (not in code)  
✅ Mandatory user approval before posting  
✅ Audit logging (who generated what)  
✅ Quality validation (catch bad AI output)  
✅ Cost alerts (warn if spending too much)  

---

## 🤔 FAQ

**Q: Can I switch LLM providers after launching?**  
A: Yes! Zero code changes. Just update `.env` and restart.

**Q: What if Claude API goes down?**  
A: Fallback to manual caption writing (works like v2.0).

**Q: Will AI-generated posts look bad?**  
A: No. Mandatory human review before posting. Plus validation layer catches issues.

**Q: How much will this cost?**  
A: ~$10-20/month for DN Tech usage (~100 captions/month @ $0.01-0.015 each).

**Q: Can I use this for other projects?**  
A: This is internal-only. Not a product we sell to clients.

---

## 📚 Documentation

- **Full PRD:** PRD-v3_0-AI-Content-Generation-INTERNAL.md
- **Dev Guide:** IMPLEMENTATION-GUIDE-v3_0-INTERNAL.md
- **Architecture:** See v2.0 ARCHITECTURE.md (v3.0 extends it)

---

## 👥 Who Does What?

| Role | Responsibility |
|------|---|
| **Backend Lead** | LLM service + API endpoints (Week 1-2) |
| **Frontend Lead** | UI components (Week 2) |
| **Dozer** | Brand guidelines, testing, go-live (Week 4) |
| **DevOps** | Monitoring, cost alerts (Week 3) |

---

## 🎉 Definition of Done

✅ Can generate 10 captions in <30 seconds  
✅ Captions sound like DN Tech  
✅ Team uses it for daily posts  
✅ Cost <$50/month  
✅ All v2.0 features still work  

---

## 📞 Need Help?

1. **Technical questions:** Check PRD §7 (Architecture)
2. **Code reference:** See IMPLEMENTATION-GUIDE-v3_0-INTERNAL.md
3. **Feature questions:** See PRD §4 (User Stories)

---

**Status:** Ready to kick off  
**Owner:** Dozer (DN Tech)  
**Created:** 25 Juli 2026  

**Let's ship this and make DN Tech's content game unstoppable!** 🚀
