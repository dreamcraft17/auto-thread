# Threads Automation — Deploy (1 URL · 1 PM2)

Deploy target: **satu process Node (PM2)** yang melayani **API + frontend SPA + worker** di **satu domain**. Tidak ada subdomain API terpisah.

| | |
|---|---|
| Contoh URL | `https://ai.dntech.id` |
| PM2 name | `ai-thread` |
| Proses | Express :3000 → `/v1`, `/media`, `/health`, dan static `frontend/dist` |
| Nginx | Hanya reverse-proxy TLS → `127.0.0.1:3000` |

```
Browser ──https://ai.dntech.id──► Nginx ──proxy──► PM2 ai-thread (Node)
                                                   ├── GET /           → React SPA
                                                   ├── /v1/*           → API
                                                   ├── /media/*        → uploads
                                                   └── Bull + cron     → Playwright
```

---

## Prasyarat VPS

- Ubuntu 22.04+ (atau setara)
- Node.js **20 LTS**
- PostgreSQL **15+**, Redis **7+**
- **PM2** (`npm i -g pm2`)
- **Nginx** + certbot (HTTPS)
- Chromium deps: `npx playwright install --with-deps chromium`

---

## 1. Install runtime (Ubuntu)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx
sudo apt-get install -y postgresql postgresql-contrib redis-server
sudo systemctl enable --now postgresql redis-server nginx

sudo npm i -g pm2
```

---

## 2. Database

```bash
sudo -u postgres psql <<'SQL'
CREATE USER threads WITH PASSWORD 'CHANGE_ME_STRONG';
CREATE DATABASE threads_automation OWNER threads;
GRANT ALL PRIVILEGES ON DATABASE threads_automation TO threads;
SQL

sudo -u postgres psql -d threads_automation -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'
```

---

## 3. App + build (same-origin)

```bash
# contoh path
sudo mkdir -p /opt/ai-thread
sudo chown -R $USER:$USER /opt/ai-thread
cd /opt/ai-thread
# clone / rsync kode ke sini (isi monorepo auto/)

cp .env.example .env
# edit .env — lihat §4

npm install
npx playwright install --with-deps chromium
npm run db:migrate

# PENTING: FE harus hit /v1 di domain yang sama (bukan api.* terpisah)
npm run build:prod
# = VITE_API_URL=/v1 + build backend + frontend
```

`build:prod` memastikan axios memakai **`/v1` relatif** → satu origin dengan UI.

---

## 4. Env produksi

```env
NODE_ENV=production
DATABASE_URL=postgresql://threads:CHANGE_ME_STRONG@127.0.0.1:5432/threads_automation
REDIS_URL=redis://127.0.0.1:6379
API_PORT=3000

# Satu URL publik (bukan api.xxx + fe.xxx)
PUBLIC_BASE_URL=https://ai.dntech.id

JWT_SECRET=<long-random>
ENCRYPTION_KEY=<32-char-or-longer>
PLAYWRIGHT_DRY_RUN=false
UPLOAD_DIR=/var/lib/ai-thread/uploads

# SPA dilayani Node (default ON jika frontend/dist ada)
SERVE_FRONTEND=true
# FRONTEND_DIST=   # opsional; default = <repo>/frontend/dist

# Frontend build-time (sudah di-set oleh npm run build:prod)
# VITE_API_URL=/v1
```

**AI (opsional):**

```env
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
AI_MONTHLY_BUDGET_CENTS=5000
```

```bash
sudo mkdir -p /var/lib/ai-thread/uploads
sudo chown -R $USER:$USER /var/lib/ai-thread
```

---

## 5. PM2 — satu process `ai-thread`

File [`ecosystem.config.cjs`](../ecosystem.config.cjs) di root repo:

```bash
cd /opt/ai-thread
pm2 start ecosystem.config.cjs
pm2 status          # harus ada: ai-thread │ online
pm2 logs ai-thread
pm2 save
pm2 startup         # ikut instruksi yang dicetak (systemd hook)
```

Reload setelah deploy ulang:

```bash
git pull   # atau rsync
npm install
npm run db:migrate
npm run build:prod
pm2 reload ai-thread
```

Helper scripts: `npm run pm2:start` · `pm2:reload` · `pm2:logs`.

**Jangan** jalankan frontend Vite / `serve` terpisah di produksi — sudah termasuk di process yang sama.

---

## 6. Nginx — satu `server_name`, proxy semua ke PM2

Tidak perlu `location` terpisah untuk static FE vs API. Semua ke Node.

```nginx
# /etc/nginx/sites-available/ai-thread
server {
  listen 80;
  server_name ai.dntech.id;

  client_max_body_size 6m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 120s;
  }
}
```

```bash
sudo ln -sf /etc/nginx/sites-available/ai-thread /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# HTTPS
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d ai.dntech.id
```

Setelah TLS, browser hanya pakai **`https://ai.dntech.id`** — UI di `/`, API di `/v1/...`, media di `/media/...`.

---

## 7. Cek sehat

```bash
curl -s https://ai.dntech.id/health
# {"status":"ok",...}

curl -sI https://ai.dntech.id/ | head -5
# HTML dari React

curl -s https://ai.dntech.id/v1/settings -H "Authorization: Bearer …"
pm2 status
```

Live publish: [RUNBOOK.md](./RUNBOOK.md).

---

## 8. Lokal (dev) — tetap 2 process

Dev tetap terpisah (hot reload):

```bash
brew services start postgresql@15 redis   # macOS
cd auto && cp .env.example .env
npm install && npm run db:migrate
npm run dev   # API :3000 + Vite :5173 (proxy /v1 → API)
```

Vite mem-proxy `/v1`, `/api`, `/media` ke backend. Produksi tidak memakai Vite.

---

## Ringkas: yang tidak dilakukan

| Jangan | Kenapa |
|--------|--------|
| `api.ai.dntech.id` + `ai.dntech.id` | User minta **satu URL** |
| 2 PM2 (api + web) | FE sudah di-serve Express |
| Nginx `root frontend/dist` + proxy hanya `/v1` | Boleh, tapi lebih rumit; model resmi = **proxy all → PM2** |
| `VITE_API_URL=https://api…` saat build | Memecah same-origin; pakai **`/v1`** |
