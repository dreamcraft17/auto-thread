# Threads Automation — Briefing Dasar PRD Berikutnya

| | |
|---|---|
| **Dokumen** | Satu file utuh untuk menulis PRD produk berikutnya |
| **Tanggal** | 25 Juli 2026 |
| **Baseline kode** | v1.0 MVP + **v2.0 Live Publish & Media** + **v3.0 AI Content** — semuanya sudah di repo |
| **Spec terakhir** | PRD/SRS/SDD v2.0 · PRD v3.0 (internal) |
| **Owner** | Dozer (CEO + Tech Lead) · DN Tech |
| **Path** | `auto/` |
| **Ganti dokumen ini?** | Setelah PRD berikutnya di-sign-off atau baseline berubah |

> **Cara pakai:** Baca atas → bawah. Jangan janjikan ulang §3 sebagai fitur baru. Tulis PRD hanya untuk §5–§6. Setiap story wajib memenuhi §7.

---

## 1. Keputusan singkat: PRD berikutnya tentang apa?

Pilih **satu** jalur:

| Jalur | Isi | Kapan |
|-------|-----|--------|
| **A — Data & analytics nyata** | Tarik engagement asli (views/likes/replies) → heatmap & rekomendasi AI berbasis performa, bukan proxy volume | Begitu ada cara ambil metrik (scrape terukur atau API) |
| **B — Skala operasional** | Multi-account, schedule templates, content calendar view | Jika tim/klien bertambah |
| **C — Platform bet** | Migrasi ke Official Threads API + analytics resmi | Hanya jika API/partner ready |

**Rekomendasi P0:** **Jalur A** sebagai **PRD v3.1 — Engagement Signals**.

Alasan: v3.0 sudah bisa bikin caption dan menyarankan jam tayang, tapi rekomendasinya masih berbasis **volume publish**, bukan performa. Tanpa sinyal engagement, nilai AI mentok di “hemat waktu nulis”, belum “naikkan hasil”.

Nomor versi berikutnya yang wajar: **v3.1** (engagement) atau **v4.0** (multi-account/platform).

---

## 2. Snapshot produk saat ini (jangan di-rebuild)

| Item | Nilai |
|------|--------|
| Produk | AI caption + scheduler + auto-publish ke Meta Threads |
| Frontend | React/Vite/MUI · 3 halaman + AI modal & batch dialog |
| Backend | Express `/v1` · auth · posts · dashboard · settings · ai |
| Data | PostgreSQL + Knex · 11 tabel |
| Queue | Redis + Bull · cron due-scan + maintenance + heatmap |
| Automation | Playwright · dry-run default + live toggle di DB |
| AI | LLM abstraction (claude/codex/openrouter/mock) + cost tracking |
| Auth | JWT per user · no RBAC roles |
| Tests | 16 automated (`npm test -w backend`) |
| Deploy | Native VPS · **PM2 `ai-thread`** · 1 URL (Nginx proxy) · tanpa Docker |

---

## 3. Yang sudah Done (jangan ulangi di PRD sebagai “baru”)

- Login Threads (dry-run atau live) + enkripsi kredensial + lockout
- Schedule single post, edit/cancel, CSV bulk import
- Media upload (max 4 gambar) + attach saat publish + fallback text-only
- Live/dry-run toggle + banner + audit log
- Auto-publish pipeline (cron → queue → worker → Playwright) + retry 3x + manual retry
- Publish history per attempt + export CSV
- AI generate caption (single + batch), brand guidelines, validasi caption, approval flow
- Best-time suggestion dari heatmap, AI usage & cost di Settings
- Dashboard stats / timeline / queue / in-app notifications
- Test suite backend + runbook + deploy guide

Detail: [CURRENT-IMPLEMENTATION.md](./CURRENT-IMPLEMENTATION.md) · [FEATURE-CATALOG.md](./FEATURE-CATALOG.md).

---

## 4. Conditional (bukan “belum dikode”)

- Live publish: `PLAYWRIGHT_DRY_RUN=false` + toggle ON + Chromium
- LLM sungguhan: `LLM_PROVIDER` + API key (default `mock`)
- Email: `SENDGRID_API_KEY` · Slack alert: `SLACK_WEBHOOK_URL`
- Nightly canary: `ENABLE_CANARY` + akun staging
- Production secrets: `JWT_SECRET`, `ENCRYPTION_KEY`
- `db:seed` script tanpa folder seeds

---

## 5. Greenfield / fokus yang valid untuk PRD berikutnya

| Prioritas | Tema | Catatan |
|-----------|------|---------|
| **P0** | Engagement ingestion (views/likes/replies per post) | Prasyarat semua analytics; tentukan sumber & legalitasnya |
| **P0** | Heatmap & AI recommendation berbasis performa nyata | Ganti proxy volume di `posting_heatmap` |
| **P1** | Content calendar / plan view untuk hasil batch AI | Batch sudah ada, visualisasinya belum |
| **P1** | Schedule templates | Reusable caption + slot |
| **P1** | Multi-account | Butuh keputusan keamanan kredensial |
| **P2** | AI image generation / multi-language | Setelah teks terbukti dipakai |
| **P2** | Official API migration | Tunggu ketersediaan Meta |

### Out of scope kecuali PRD eksplisit
- Mobile app
- Rebuild queue/DB/LLM stack tanpa alasan
- Auto-publish caption AI **tanpa** approval manusia
- Janji “100% tahan deteksi ban” Meta

---

## 6. Outline disarankan PRD v3.1 (Engagement Signals) — skeleton

### 6.1 Outcome
User bisa melihat **performa nyata** tiap post dan mendapat rekomendasi jam/topik yang terbukti, bukan tebakan.

### 6.2 In scope
1. Sumber & mekanisme ingestion metrik (frekuensi, rate limit, kegagalan)  
2. Skema penyimpanan metrik + backfill historis  
3. Heatmap dan best-time dihitung ulang dari engagement  
4. Feedback loop ke prompt AI (topik/tone yang perform)  
5. Dashboard performa: top post, trend mingguan  

### 6.3 Out of scope
- Multi-account (PRD terpisah)  
- Official API (PRD terpisah saat ready)  
- Mobile  

### 6.4 Risks wajib ditulis
- ToS / rate limit saat mengambil metrik  
- Metrik hilang atau tidak konsisten → rekomendasi bias  
- Biaya LLM naik jika prompt membawa banyak konteks metrik  

---

## 7. Checklist story (wajib)

| # | Pertanyaan |
|---|------------|
| 1 | Acceptance Criteria testable? |
| 2 | Berlaku di dry-run **dan** live (atau eksplisit dry-run only)? |
| 3 | Terkait enkripsi kredensial / JWT / API key LLM? |
| 4 | Failure path + retry + notifikasi? |
| 5 | Perlu migration DB? |
| 6 | Ada tes otomatis di DoD? |
| 7 | Risiko Meta/ToS dan biaya AI disebutkan? |

---

## 8. Definition of Done dokumen PRD (sebelum coding)

- [ ] Satu fokus yang jelas  
- [ ] In/out scope  
- [ ] Mapping ke baseline (file ini + CURRENT-IMPLEMENTATION)  
- [ ] NFR: latency publish window, retention log, budget AI  
- [ ] Security & ToS section  
- [ ] Test strategy  
- [ ] Update FEATURE-CATALOG + CHANGELOG setelah ship  

---

## 9. Satu kalimat penutup

> Threads Automation **sudah bisa menulis, menjadwalkan, dan mempublish**; PRD berikutnya **bukan** “bikin scheduler atau AI lagi”, melainkan **membuktikan hasilnya lewat data engagement nyata**.
