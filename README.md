# 🛡️ SecureDoc DMS: Legal & Investigation Document Management System

> **Ministry of Home Affairs · NCRB · Women Safety Division**  
> **Theme:** Blockchain & Cybersecurity · **Stack:** React (Bootstrap 5) · Node.js (Express) · MongoDB (GridFS)

---

## 🌟 Overview

SecureDoc DMS is a centralized, tamper-evident digital evidence repository architected specifically for Indian law enforcement, prosecutors, forensic laboratories, and courts under the **Bharatiya Sakshya Adhiniyam 2023 (BSA 2023)** and **Bharatiya Nagarik Suraksha Sanhita 2023 (BNSS 2023)**.

---

## 🚀 Quickstart

### Prerequisites

- Node.js 20 LTS or newer
- MongoDB 7 or MongoDB Atlas
- npm 10 or newer

### Local development

```bash
git clone <repository-url>
cd SecureDoc
npm run install:all
copy server\.env.example server\.env
```

Edit `server/.env` with a local MongoDB URI and generated secrets. Generate secure values with:

```bash
node -e "const c=require('crypto'); console.log('JWT_ACCESS_SECRET=' + c.randomBytes(32).toString('hex')); console.log('JWT_REFRESH_SECRET=' + c.randomBytes(32).toString('hex')); console.log('MASTER_KEY_HEX=' + c.randomBytes(32).toString('hex'))"
```

Start the API and frontend in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

The frontend is available at [http://localhost:5173](http://localhost:5173), the API at [http://localhost:5000](http://localhost:5000), and the readiness check at [http://localhost:5000/api/health](http://localhost:5000/api/health).

> Never commit `.env` files. Production startup rejects missing or weak JWT secrets and invalid master keys.

### Production build

```bash
npm run build
NODE_ENV=production npm start
```

For Docker Compose, copy `.env.example` to `.env`, replace every placeholder, then run:

```bash
docker compose up -d --build
```

### Seed demo data

```bash
npm run seed
```

The seeder is intended for demonstrations and development only. Replace all demo credentials before any real deployment.

### Render + Vercel deployment

For a split production deployment:

1. Create a MongoDB Atlas production cluster with a private/network-restricted access policy, backups, and a least-privilege database user.
2. Create a Render Web Service from this repository. The included [`render.yaml`](./render.yaml) uses the API and serves the built client as a fallback.
3. Set `MONGO_URI`, `MASTER_KEY_HEX`, and `CLIENT_ORIGIN` in Render. `CLIENT_ORIGIN` must be the exact HTTPS Vercel URL.
4. Create a Vercel project with `client` as the root directory.
5. Set Vercel `VITE_API_URL` to the Render API URL, for example `https://securedoc-api.onrender.com`.
6. Set `COOKIE_SAME_SITE=none` on Render and use HTTPS on both domains.
7. Do not run `npm run seed` against production. Use a separate demo database and `npm run seed:demo` only for isolated demonstrations.

Render and Vercel account creation, DNS, MongoDB network allowlists, TLS issuance, backups, monitoring, and security approval must be completed by the deployment owner.

Production restrictions:

- Public registration creates only approved normal citizen accounts. Administrators approve privileged role assignments through the admin console; approval status and authority metadata are stored with each user record.
- Demo seeding is blocked when `NODE_ENV=production`.
- Mock Aadhaar eSign callbacks are disabled in production.
- MongoDB is not published by the included Docker Compose configuration.
- Refresh tokens rotate on refresh and are revoked on logout.
- Signing private keys are encrypted with `MASTER_KEY_HEX` before database storage.

## 🎬 Recommended 10-minute jury demonstration

1. **Problem and users (1 minute):** Explain fragmented evidence storage, unauthorized access, and weak tamper detection.
2. **Secure login and RBAC (1 minute):** Sign in as the Investigating Officer and show role-specific navigation.
3. **Case and encrypted upload (2 minutes):** Open a case, upload a forensic PDF, and show its SHA-256 fingerprint and classification.
4. **Integrity verification (2 minutes):** Download the document, open the public verifier, and show the Section 63 certificate.
5. **Tamper-evident proof (2 minutes):** Demonstrate that changing a stored GridFS chunk causes AES-GCM verification to fail and raises a tamper alert.
6. **Operational value (1 minute):** Show deadlines, chain of custody, controlled sharing, and audit history.
7. **Technical summary (1 minute):** Explain React/Vite, Express REST APIs, MongoDB/GridFS, JWT/RBAC, envelope encryption, hash-chained audit blocks, and Merkle batches.

Use demo data only and clearly identify mocked integrations such as Aadhaar eSign, CCTNS, e-Courts, and NDSO.

### Local URLs
- **Frontend App (React / Vite):** [http://localhost:5173](http://localhost:5173)
- **Backend API (Node.js / Express):** [http://localhost:5000](http://localhost:5000)
- **API Health Check:** [http://localhost:5000/health](http://localhost:5000/health)
- **Public Integrity Verifier:** [http://localhost:5173/verify](http://localhost:5173/verify)

### 2. Pre-Seeded Demo Credentials
All seeded accounts use the password: **`Demo@1234`**

| Role | Email | Clearance Level | Key Capabilities |
|---|---|---|---|
| **Investigating Officer (IO)** | `io@securedoc.gov` | Confidential | Upload, encrypt, sign, bundle evidence |
| **Superintendent of Police (SP)** | `sp@securedoc.gov` | Secret | Create cases, assign officers, approve shares & escalations |
| **System Admin** | `admin@securedoc.gov` | Secret | RBAC, clearance administration, audit review |
| **Forensic Analyst** | `forensic@securedoc.gov` | Confidential | Upload forensic FSL reports, update chain of custody |
| **Prosecutor / Legal** | `prosecutor@securedoc.gov` | Restricted | View shared bundles, court filings, comments |
| **Citizen (Informant)** | `citizen@example.com` | Public | Sign own e-FIR within 72h, download free FIR copy |

---

## 🔐 Cryptography & Tamper-Evident Architecture

1. **Envelope Encryption (AES-256-GCM):**
   - Each uploaded evidentiary asset generates a random 256-bit data key.
   - The data key is wrapped under the master KMS key.
   - GridFS stores cipher chunks with an authentication tag. Any single bit flip triggers an authentication failure and flags the file as **`TAMPERED`**.

2. **SHA-256 Digest & Merkle Tree Ledger:**
   - Pre-encryption stream hash computed and stored with the document.
   - Sequential audit blocks are grouped into hourly Merkle batches.
   - Proof path generated on demand for court admissibility.

3. **Section 63 BSA 2023 Automated Certificates:**
   - Auto-generated PDF replacing Section 65B IEA certificates.
   - Contains device details, officer digital signature, cryptographic hash, and QR code to `/public/verify/:hash`.

4. **Women Safety Division Module:**
   - **60-day POCSO / Sexual Offence Charge Sheet Tracker:** Automated timeline warning at 45 days (amber), SP escalation at 50 days (alert), and red warning at 60 days.
   - **Default-Bail Risk Monitor:** Tracks cases approaching 60/90-day custody limits under BNSS Section 187.
   - **e-FIR 72-Hour Signature Window:** Countdown for informant authentication under BNSS Section 173.
   - **Zero FIR Transfer Wizard:** Cryptographically bundled cross-jurisdiction transfer to competent stations.
   - **NDSO Sample Offender Registry Cross-Check:** Query repeat offenders across districts.

---

## 📁 Project Structure

```
SecureDoc/
├─ client/                  # React 18 + Vite + Bootstrap 5 Frontend
│  ├─ src/
│  │  ├─ pages/             # 10 Screen Implementations
│  │  │  ├─ LoginPage.jsx
│  │  │  ├─ DashboardPage.jsx
│  │  │  ├─ CasesPage.jsx
│  │  │  ├─ CaseDetailPage.jsx
│  │  │  ├─ UploadPage.jsx
│  │  │  ├─ DocumentViewerPage.jsx
│  │  │  ├─ AuditPage.jsx
│  │  │  ├─ VerifyPage.jsx
│  │  │  ├─ DeadlinesPage.jsx
│  │  │  ├─ SearchPage.jsx
│  │  │  ├─ AdminPage.jsx
│  │  │  └─ ProfilePage.jsx
│  │  ├─ components/        # Badges, HashDisplay, Layout, TamperAlert
│  │  ├─ context/           # AuthContext (JWT in-memory + refresh cookie)
│  │  └─ utils/             # formatters.js
├─ server/                  # Node.js + Express Backend
│  ├─ src/
│  │  ├─ models/            # User, Case, Document, AuditBlock, MerkleBatch, etc.
│  │  ├─ services/          # cryptoService, gridfsService, ledgerService, merkleService, certificateService
│  │  ├─ controllers/       # Auth, Case, Document, Integrity, Signature, Women Safety, etc.
│  │  ├─ routes/            # REST API Routes
│  │  ├─ middleware/        # auth, rbac, auditMiddleware
│  │  ├─ jobs/              # node-cron hourly Merkle batch & deadline alerts
│  │  ├─ utils/seedData.js  # Database seeder
│  │  ├─ app.js             # Express configuration & sanitization
│  │  └─ server.js          # Server entry point
└─ README.md
```
