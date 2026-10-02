# 🛡️ SecureDoc DMS: Legal & Investigation Document Management System

> **Ministry of Home Affairs · NCRB · Women Safety Division**  
> **Theme:** Blockchain & Cybersecurity · **Stack:** React (Bootstrap 5) · Node.js (Express) · MongoDB (GridFS)

---

## 🌟 Overview

SecureDoc DMS is a centralized, tamper-evident digital evidence repository architected specifically for Indian law enforcement, prosecutors, forensic laboratories, and courts under the **Bharatiya Sakshya Adhiniyam 2023 (BSA 2023)** and **Bharatiya Nagarik Suraksha Sanhita 2023 (BNSS 2023)**.

---

## 🚀 Live Demo & Quickstart

### 1. Servers Currently Running
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
