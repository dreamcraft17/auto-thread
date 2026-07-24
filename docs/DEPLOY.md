# Threads Automation — Deploy tanpa Docker (VPS)

Deploy target: **Node process + PostgreSQL + Redis** di host (tanpa Docker/Compose).

## Prasyarat VPS

- Ubuntu 22.04+ (atau distro setara)
- Node.js **18+** (disarankan 20 LTS)
- PostgreSQL **15+**
- Redis **7+**
- Chromium deps untuk Playwright (`npx playwright install --with-deps chromium`)

## 1. Install runtime (Ubuntu)

```bash
# Node 20 (contoh via NodeSource) — sesuaikan preferensi tim
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

sudo apt-get install -y postgresql postgresql-contrib redis-server
sudo systemctl enable --now postgresql redis-server
```

## 2. Buat database & user

```bash
sudo -u postgres psql <<'SQL'
CREATE USER threads WITH PASSWORD 'CHANGE_ME_STRONG';
CREATE DATABASE threads_automation OWNER threads;
GRANT ALL PRIVILEGES ON DATABASE threads_automation TO threads;
SQL
```

Untuk Postgres 15+, di DB tersebut:

```bash
sudo -u postgres psql -d threads_automation -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'
# atau pastikan gen_random_uuid tersedia (pgcrypto / pg 13+)
```

## 3. App setup

```bash
cd /opt/threads-automation   # atau path deploy kamu
cp .env.example .env
# edit .env — lihat bagian env di bawah
npm install
npx playwright install --with-deps chromium
npm run db:migrate
npm run build
```

## 4. Env produksi (wajib)

```env
DATABASE_URL=postgresql://threads:CHANGE_ME_STRONG@127.0.0.1:5432/threads_automation
REDIS_URL=redis://127.0.0.1:6379
API_PORT=3000
PUBLIC_BASE_URL=https://threads.example.com
JWT_SECRET=<long-random>
ENCRYPTION_KEY=<32-char-or-longer>
PLAYWRIGHT_DRY_RUN=false
# Live toggle tetap di Settings UI (default OFF sampai diaktifkan)
UPLOAD_DIR=/var/lib/threads-automation/uploads
```

Buat folder upload:

```bash
sudo mkdir -p /var/lib/threads-automation/uploads
sudo chown -R $USER:$USER /var/lib/threads-automation
```

## 5. Jalankan dengan systemd (contoh)

Satu proses backend sudah menjalankan API + worker (Bull + cron). Frontend: serve `frontend/dist` via Nginx, atau reverse-proxy ke Vite preview hanya untuk staging.

**`/etc/systemd/system/threads-api.service`:**

```ini
[Unit]
Description=Threads Automation API + worker
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/threads-automation/backend
EnvironmentFile=/opt/threads-automation/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now threads-api
sudo systemctl status threads-api
```

## 6. Nginx (API + static UI + media)

```nginx
server {
  listen 80;
  server_name threads.example.com;

  client_max_body_size 6m;

  location /media/ {
    alias /var/lib/threads-automation/uploads/;
    # atau proxy_pass ke Node jika static di-serve Express
  }

  location /v1/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location /health {
    proxy_pass http://127.0.0.1:3000;
  }

  location / {
    root /opt/threads-automation/frontend/dist;
    try_files $uri /index.html;
  }
}
```

Pastikan frontend build memakai `VITE_API_URL=/v1` (same-origin) agar tidak hardcode localhost.

## 7. Lokal (dev) tanpa Docker

macOS:

```bash
brew install postgresql@15 redis
brew services start postgresql@15
brew services start redis
createdb threads_automation   # atau createuser + createdb seperti di atas
```

Linux: sama seperti langkah VPS (apt + systemctl).

Lalu:

```bash
cd auto
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

## 8. Cek sehat

```bash
curl -s http://127.0.0.1:3000/health
sudo systemctl status postgresql redis-server threads-api
journalctl -u threads-api -f
```

Live mode: ikut [RUNBOOK.md](./RUNBOOK.md).
