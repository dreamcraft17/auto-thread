# Threads Automation — Briefing Dasar PRD Berikutnya

| | |
|---|---|
| **Dokumen** | Satu file utuh untuk menulis PRD produk berikutnya |
| **Tanggal** | 24 Juli 2026 |
| **Baseline kode** | MVP Phase 1 + sebagian besar Phase 2 **sudah di repo** |
| **Spec lama** | PRD/SRS/SDD **v1.0 Draft** (22 Jun 2026) — checkbox Phase belum di-update |
| **Owner** | Dozer (CEO + Tech Lead) · DN Tech |
| **Path** | `auto/` |
| **Ganti dokumen ini?** | Setelah PRD berikutnya di-sign-off atau baseline berubah |

> **Cara pakai:** Baca atas → bawah. Jangan janjikan ulang §3 sebagai fitur baru. Tulis PRD hanya untuk §5–§6. Setiap story wajib memenuhi §8.

---

## 1. Keputusan singkat: PRD berikutnya tentang apa?

Pilih **satu** jalur (atau pecah jadi dua dokumen berurutan):

| Jalur | Isi | Kapan |
|-------|-----|--------|
| **A — Harden & ship live** | Test suite, runbook live Playwright, secret hardening, observability, UAT publish nyata | Jika tool mau dipakai tim setiap hari |
| **B — Produk Phase 3** | Media posts, schedule templates, multi-account | Setelah A stabil atau paralel tipis |
| **C — Platform bet** | Migrasi ke Official Threads API (saat tersedia) + analytics | Hanya jika API/partner ready |

**Rekomendasi P0:** **Jalur A + media (potongan Phase 3)** sebagai **PRD v1.1** atau **v2.0 — Live Publish & Media**.

Alasan: dry-run default = produk belum “benar-benar publish”; tanpa tests, regresi Playwright mudah; media adalah value terbesar berikutnya yang sudah punya kolom DB.

Nomor versi spek berikutnya yang wajar: **v1.1** (hardening) atau **v2.0** (media + multi-account).

---

## 2. Snapshot produk saat ini (jangan di-rebuild)

| Item | Nilai |
|------|--------|
| Produk | Scheduler + auto-publish ke Meta Threads |
| Frontend | React/Vite/MUI · 3 halaman (login, dashboard, settings) |
| Backend | Express `/v1` · auth · posts · dashboard |
| Data | PostgreSQL + Knex · 5 tabel |
| Queue | Redis + Bull · cron due-scan |
| Automation | Playwright · **DRY_RUN default true** |
| Auth | JWT per user · no RBAC roles |
| Tests | **0** automated |
| Email | SendGrid Conditional |

---

## 3. Yang sudah Done (jangan ulangi di PRD sebagai “baru”)

- Login Threads (dry-run atau live) + enkripsi kredensial + lockout
- Schedule single post, edit/cancel, CSV bulk import
- Auto-publish pipeline (cron → queue → worker → Playwright)
- Retry 3x + manual retry + failed list
- Dashboard stats / timeline / queue / in-app notifications
- Settings notification preferences

Detail: [CURRENT-IMPLEMENTATION.md](./CURRENT-IMPLEMENTATION.md) · [FEATURE-CATALOG.md](./FEATURE-CATALOG.md).

---

## 4. Conditional (bukan “belum dikode”)

- Live publish: `PLAYWRIGHT_DRY_RUN=false` + Chromium
- Email: `SENDGRID_API_KEY`
- Production secrets: `JWT_SECRET`, `ENCRYPTION_KEY`
- `db:seed` script tanpa folder seeds

---

## 5. Greenfield / fokus yang valid untuk PRD berikutnya

| Prioritas | Tema | Catatan |
|-----------|------|---------|
| **P0** | Automated tests (API + worker dry-run + smoke live gated) | Gap terbesar vs NFR |
| **P0** | Live publish runbook + selector resilience + alerting | Meta UI sering berubah |
| **P0 product** | Media attach (image) end-to-end | Kolom `media_urls` sudah ada |
| **P1** | Schedule templates | Phase 3 |
| **P1** | Multi-account | OOS di SRS v1 — butuh keputusan keamanan |
| **P2** | Engagement analytics | Butuh sumber data |
| **P2** | Official API migration | Tunggu ketersediaan Meta |

### Out of scope kecuali PRD eksplisit
- Mobile app
- AI caption generator
- Rebuild queue/DB stack tanpa alasan
- Janji “100% tahan deteksi ban” Meta

---

## 6. Outline disarankan PRD v2.0 (Live Publish & Media) — skeleton

### 6.1 Outcome
User bisa: (1) publish nyata ke Threads dengan SLA on-time terukur, (2) lampirkan ≥1 gambar per post, (3) melihat hasil/gagal dengan bukti log, (4) menjalankan regresi otomatis di CI (minimal dry-run).

### 6.2 In scope
1. Mode `dry-run` vs `live` eksplisit di UI/admin flag  
2. Media upload (tipe/ukuran/batas Threads) + wiring Playwright  
3. Test plan: unit services, API integration, worker dry-run, optional nightly live canary  
4. Runbook: rotate credentials, selector break, rate limit  
5. Audit: siapa publish apa kapan  

### 6.3 Out of scope
- Multi-account (PRD terpisah)  
- Official API (PRD terpisah saat ready)  
- Mobile  

### 6.4 Risks wajib ditulis
- Pelanggaran ToS / challenge login / CAPTCHA  
- Selector Threads berubah  
- Credential leakage  

---

## 7. Checklist story (wajib)

| # | Pertanyaan |
|---|------------|
| 1 | Acceptance Criteria testable? |
| 2 | Berlaku di dry-run **dan** live (atau eksplisit dry-run only)? |
| 3 | Kred ke enkripsi kredensial / JWT? |
| 4 | Failure path + retry + notifikasi? |
| 5 | Perlu migration DB? |
| 6 | Ada tes otomatis di DoD? |
| 7 | Risiko Meta/ToS disebutkan? |

---

## 8. Definition of Done dokumen PRD (sebelum coding)

- [ ] Satu fokus yang jelas (bukan “semua Phase 3”)  
- [ ] In/out scope  
- [ ] Mapping ke baseline (file ini + CURRENT-IMPLEMENTATION)  
- [ ] NFR: latency publish window, retention log  
- [ ] Security & ToS section  
- [ ] Test strategy  
- [ ] Update rencana ke FEATURE-CATALOG setelah ship  

---

## 9. Satu kalimat penutup

> Threads Automation **sudah punya MVP scheduler + queue**; PRD berikutnya **bukan** “bikin scheduler lagi”, melainkan **live publish andal + media (dan/atau tests/ops)**.
