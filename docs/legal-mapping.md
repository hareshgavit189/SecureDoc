# ⚖️ Statutory Legal Mapping: Indian Criminal Justice System

| Statutory Law | Relevant Sections | Old Law Equivalence | System Implementation |
|---|---|---|---|
| **Bharatiya Sakshya Adhiniyam 2023 (BSA)** | **Section 63** (Electronic Records Admissibility & Certificate) | Section 65B, Indian Evidence Act 1872 | Automated PDF certificate generation containing SHA-256 hash, device identifiers, officer signature, and public QR verification link. |
| **Bharatiya Sakshya Adhiniyam 2023 (BSA)** | **Section 57 & 61** (Primary Evidence & Admissibility) | Section 62-65, IEA 1872 | Ensures electronic records cannot be denied admissibility solely because they are electronic. |
| **Bharatiya Nagarik Suraksha Sanhita 2023 (BNSS)** | **Section 173** (Information in cognizable cases, e-FIR & Zero FIR) | Section 154 CrPC | 72-hour e-FIR signature tracker, Zero-FIR cryptographic inter-station transfer wizard. |
| **Bharatiya Nagarik Suraksha Sanhita 2023 (BNSS)** | **Section 187** (Detention in custody & Default Bail limits) | Section 167 CrPC | Automated default bail risk monitoring at 60-day and 90-day custody thresholds. |
| **Bharatiya Nagarik Suraksha Sanhita 2023 (BNSS)** | **Section 193** (Report of police officer on completion of investigation) | Section 173 CrPC | Digital bundling of charge sheet with digitally signed statements and forensic FSL reports. |
| **POCSO / BNSS Mandate** | 60-Day Investigation Completion for Sexual Offences | CrPC amendment / POCSO s.35 | Dynamic progress tracker: Green (<45d), Amber (45-49d IO alert), Orange (50-59d SP escalation), Red (>=60d breach). |
| **Information Technology Act 2000** | Sections 3, 3A, 4, 5 (Electronic & Digital Signatures) | IT Act 2000 | ECDSA NIST P-256 signing and simulated Aadhaar eSign ESP challenge-response flows. |
| **DPDP Act 2023** | Purpose Limitation & Data Minimization | - | Strict clearance-based RBAC, client-side PII redaction pipeline, access logging. |
