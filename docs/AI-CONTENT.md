# Threads Automation — AI Content (v3.0)

**UpdatedAt:** 25 Juli 2026  
**Spek:** [PRD/PRD-v3_0-AI-Content-Generation-INTERNAL.md](./PRD/PRD-v3_0-AI-Content-Generation-INTERNAL.md)

## Cara pakai (singkat)

1. Dashboard → **Generate Caption** → isi topic → Generate  
2. Review (badge Generated) → **Use Caption** atau **Approve & Schedule**  
3. Atau **Batch Generate** (1 topic/baris, max 10) → Schedule Selected  
4. Settings → **Brand Guidelines** + **AI Usage & Cost**

Default lokal: `LLM_PROVIDER=mock` (tanpa API key). Produksi: set `claude` / `codex` / `openrouter` + key.

## Cara kerja

```
Topic → LLMService (claude|codex|openrouter|mock)
  → brand_guidelines in prompt
  → validateCaption (heuristic)
  → generated_captions row
  → UI approve → schedule via existing /v1/posts flow
```

Best time: `posting_heatmap` (seed + daily refresh dari volume publish 30 hari).

## API

| Method | Path |
|--------|------|
| POST | `/v1/ai/generate-caption` |
| POST | `/v1/ai/batch-generate` |
| GET | `/v1/ai/best-time` |
| GET | `/v1/ai/usage` |
| GET/PUT | `/v1/ai/brand-guidelines` |
| POST | `/v1/ai/captions/:id/approve` |
| POST | `/v1/ai/captions/:id/approve-schedule` |

## Env

```
LLM_PROVIDER=mock|claude|codex|openrouter
ANTHROPIC_API_KEY=
GITHUB_API_KEY=
OPENROUTER_API_KEY=
AI_MONTHLY_BUDGET_CENTS=5000
```

Migrate: `npm run db:migrate` (tabel `generated_captions`, `brand_guidelines`, `posting_heatmap`).
