# 🚀 SecureDoc DMS — Complete Production Deployment Roadmap

> **Ministry of Home Affairs · NCRB · Women Safety Division**  
> **Stack:** React 18 (Vite) · Node.js (Express 5) · MongoDB (GridFS) · Docker · Nginx · Merkle Ledger · AES-256-GCM

---

## 📑 Table of Contents
1. [Architecture & Deployment Models](#1-architecture--deployment-models)
2. [What Was Changed & Configured](#2-what-was-changed--configured)
3. [Pre-Deployment Security Checklist (Secrets & KMS)](#3-pre-deployment-security-checklist)
4. [Deployment Option A: Cloud PaaS (Render / Railway + MongoDB Atlas)](#4-deployment-option-a-cloud-paas)
5. [Deployment Option B: Docker Compose on VPS (DigitalOcean / AWS EC2)](#5-deployment-option-b-docker-compose-on-vps)
6. [Deployment Option C: Bare Metal Ubuntu (PM2 + Nginx + SSL)](#6-deployment-option-c-bare-metal-ubuntu)
7. [Deployment Option D: Split Architecture (Vercel + Backend API)](#7-deployment-option-d-split-architecture)
8. [Post-Deployment Verification & Seeding](#8-post-deployment-verification--seeding)

---

## 1. Architecture & Deployment Models

SecureDoc DMS supports two deployment paradigms:

| Model | Description | Pros | Recommended For |
|---|---|---|---|
| **Unified Monolith (Configured Default)** | Express serves both `/api/*` endpoints and static compiled React SPA assets (`client/dist`) from port 5000 | Zero CORS issues, single domain, single container/process, simplest setup | Render, Railway, Docker, VPS |
| **Separated Split Architecture** | React SPA deployed to Vercel/Netlify/Cloudflare; Express API deployed to Render/Fly.io/AWS | Edge CDN distribution for frontend, independent autoscaling | High-traffic enterprise |

---

## 2. What Was Changed & Configured

The repository is now pre-configured for instant production deployment:

1. **`client/src/api/axiosInstance.js`:**
   - Dynamically resolves `API_BASE`: uses `VITE_API_URL` if defined; otherwise defaults to empty relative path `''` in production (unified mode) or `http://localhost:5000` in dev.
2. **`client/src/pages/SearchPage.jsx` & `VerifyPage.jsx`:**
   - Replaced all hardcoded `http://localhost:5000` references with `${API_BASE}`, allowing PDF certificates and API requests to work on any production domain.
3. **`server/src/app.js`:**
   - Added production static client serving (`client/dist`).
   - Integrated Express 5 compatible SPA fallback middleware (`index.html`).
   - Configured Helmet with `contentSecurityPolicy: false` to ensure React SPA, SVGs, and Charts render cleanly.
4. **Root `package.json`:**
   - Added unified orchestration scripts: `npm run build`, `npm run start`, `npm run seed`, `npm run install:all`.
5. **Multi-Stage `Dockerfile` & `docker-compose.yml`:**
   - Alpine-based image that builds React in Stage 1 and runs Express with an unprivileged `node` user in Stage 2.
6. **Production Configuration Templates:**
   - `nginx.conf`, `ecosystem.config.js` (PM2), `server/.env.production.example`, `client/.env.production.example`.

---

## 3. Pre-Deployment Security Checklist

Before deploying, generate high-entropy cryptographic secrets on your local machine using Node.js. The JWT secrets below are 32 random bytes (64 hexadecimal characters), and `MASTER_KEY_HEX` is exactly 32 random bytes encoded as 64 hexadecimal characters. Never commit the resulting `.env` file.

```bash
# Generate all three entries (run from the repository root):
node -e "const c=require('crypto'); console.log('JWT_ACCESS_SECRET=' + c.randomBytes(32).toString('hex')); console.log('JWT_REFRESH_SECRET=' + c.randomBytes(32).toString('hex')); console.log('MASTER_KEY_HEX=' + c.randomBytes(32).toString('hex'))"
```

Copy the output into the appropriate `.env` file, for example:

```dotenv
JWT_ACCESS_SECRET=<first generated value>
JWT_REFRESH_SECRET=<second generated value>
MASTER_KEY_HEX=<third generated value>
```

On Windows PowerShell, this writes the generated values directly to a local root `.env` file:

```powershell
$crypto = "const c=require('crypto'); process.stdout.write(c.randomBytes(32).toString('hex'))"
$access = node -e "$crypto"
$refresh = node -e "$crypto"
$master = node -e "$crypto"
@"
NODE_ENV=production
PORT=5000
JWT_ACCESS_SECRET=$access
JWT_REFRESH_SECRET=$refresh
MASTER_KEY_HEX=$master
CLIENT_ORIGIN=https://securedoc.yourdomain.gov.in
"@ | Set-Content -Encoding utf8 .env
```

For Docker Compose, run the PowerShell command from the repository root. Compose automatically reads the ignored root `.env` file. For Render, Railway, or another PaaS, paste the generated values into its encrypted environment-variable settings instead of creating a committed file.

### Production Environment Variables Table

| Variable | Description | Example Value |
|---|---|---|
| `PORT` | Listening port for Node server | `5000` |
| `NODE_ENV` | Environment mode | `production` |
| `MONGO_URI` | MongoDB Atlas or replica set URI | `mongodb+srv://admin:pass@cluster0.mongodb.net/legal_dms` |
| `JWT_ACCESS_SECRET` | Secret key for signing 15-minute access JWTs | *(Generated 64-char string)* |
| `JWT_REFRESH_SECRET` | Secret key for signing 7-day refresh JWTs | *(Generated 64-char string)* |
| `MASTER_KEY_HEX` | 32-byte hex key for wrapping document data keys | *(Generated 64-hex string)* |
| `CLIENT_ORIGIN` | Public domain of the frontend | `https://securedoc.yourdomain.com` |

---

## 4. Deployment Option A: Cloud PaaS (Render / Railway + MongoDB Atlas)

*Easiest, zero-devops method with generous free tiers.*

### Step 1: Set up MongoDB Atlas (Free Cloud Database)
1. Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a free **M0 Sandbox** cluster (choose AWS, region closest to your users, e.g. Mumbai / Frankfurt / N. Virginia).
3. Under **Database Access**, create a user `securedoc_admin` with a strong password.
4. Under **Network Access**, click **Add IP Address** → choose **Allow Access From Anywhere (`0.0.0.0/0`)**.
5. Click **Connect** → **Drivers** → Copy connection string:
   ```
   mongodb+srv://securedoc_admin:<PASSWORD>@cluster0.xxxxx.mongodb.net/legal_dms?retryWrites=true&w=majority
   ```

### Step 2: Deploy on Render.com (Unified Web Service)
1. Push your repository to GitHub / GitLab.
2. Sign in to [render.com](https://render.com) and click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Configure service settings:
   - **Name:** `securedoc-dms`
   - **Environment:** `Node`
   - **Region:** Closest to your MongoDB cluster
   - **Branch:** `main`
   - **Build Command:**
     ```bash
     npm --prefix server install && npm --prefix client install && npm --prefix client run build
     ```
   - **Start Command:**
     ```bash
     node server/src/server.js
     ```
5. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `PORT` = `5000`
   - `MONGO_URI` = *(Your MongoDB Atlas connection string)*
   - `JWT_ACCESS_SECRET` = *(Your generated secret)*
   - `JWT_REFRESH_SECRET` = *(Your generated secret)*
   - `MASTER_KEY_HEX` = *(Your generated 64-hex key)*
   - `CLIENT_ORIGIN` = `https://securedoc-dms.onrender.com`
6. Click **Deploy Web Service**.
7. Once deployed, open the Render URL (`https://securedoc-dms.onrender.com`). Both the frontend and backend are live!

---

## 5. Deployment Option B: Docker Compose on VPS (DigitalOcean / AWS EC2)

*Best for full sovereignty, on-premise government hosting, or isolated environments.*

### Step 1: Provision Server & Install Docker
On a fresh Ubuntu 22.04 / 24.04 LTS server:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git
sudo systemctl enable --now docker
```

### Step 2: Clone & Configure
```bash
git clone https://github.com/your-org/SecureDoc.git
cd SecureDoc

# Create production environment file
cat <<EOF > .env
NODE_ENV=production
PORT=5000
JWT_ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
MASTER_KEY_HEX=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
CLIENT_ORIGIN=https://securedoc.yourdomain.gov.in
EOF
```

### Step 3: Launch with Docker Compose
```bash
# Build and start both MongoDB and the SecureDoc Application
docker-compose up -d --build

# Verify running containers
docker-compose ps
```

### Step 4: Seed Database inside Container
```bash
docker-compose exec app node src/utils/seedData.js
```

---

## 6. Deployment Option C: Bare Metal Ubuntu (PM2 + Nginx + SSL)

### Step 1: Install Node.js & Nginx
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx
sudo npm install -g pm2
```

### Step 2: Build Project
```bash
cd /var/www/SecureDoc
npm --prefix server install --omit=dev
npm --prefix client install
npm --prefix client run build
```

### Step 3: Configure PM2 Clustering
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Step 4: Nginx & Free Let's Encrypt SSL
```bash
sudo cp nginx.conf /etc/nginx/sites-available/securedoc
sudo ln -s /etc/nginx/sites-available/securedoc /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Generate automatic SSL certificate
sudo certbot --nginx -d securedoc.yourdomain.gov.in
```

---

## 7. Deployment Option D: Split Architecture (Vercel + Backend API)

If you prefer hosting the React frontend on **Vercel** and the backend on **Render/Railway**:

1. **Deploy Backend:**
   - Follow Option A for the `server/` directory on Render/Railway.
   - Note the API URL: `https://api.securedoc.onrender.com`.
2. **Deploy Frontend on Vercel:**
   - Import repository on [vercel.com](https://vercel.com).
   - Set **Root Directory** to `client`.
   - Set **Framework Preset** to `Vite`.
   - Add Environment Variable:
     - `VITE_API_URL` = `https://api.securedoc.onrender.com`
   - Click **Deploy**.
3. **Update Backend CORS:**
   - In backend Render settings, set `CLIENT_ORIGIN` to your Vercel URL (`https://securedoc.vercel.app`).

---

## 8. Post-Deployment Verification & Seeding

After your deployment is online:

1. **Health Check:**
   ```bash
   curl -i https://your-domain.com/api/health
   # Expected response: {"success":true,"status":"ok","ts":"..."}
   ```
2. **Run Initial Data Seed:**
   If using cloud terminal or SSH:
   ```bash
   node server/src/utils/seedData.js
   ```
   *Creates official demo credentials:*
   - `admin@securedoc.gov` (Super Admin, Secret clearance)
   - `io@securedoc.gov` (Investigating Officer, Confidential clearance)
   - `forensic@securedoc.gov` (Forensic Analyst)
   - Password: `Demo@1234`
3. **Verify Public Portal:**
   Navigate to `https://your-domain.com/verify` and click any sample preset button to test Section 63 BSA 2023 verification and PDF generation.
