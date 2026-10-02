# 🛡️ SecureDoc DMS: Threat Model & Security Posture

## 1. Threat Actors & Capabilities

| Threat Actor | Motivation | Capabilities | Mitigation in SecureDoc |
|---|---|---|---|
| **Malicious Insider / Rogue Officer** | Tamper with evidence or alter statements | Authorized credentials, access to internal network | AES-256-GCM authentication tags fail on bit modifications; hash-chained audit blocks expose any record tampering; Merkle root anchoring prevents backdating. |
| **External Cyber Attacker** | Data exfiltration, ransomware, injection | Network attacks, NoSQL injection, brute force | Strict sanitization against NoSQL operators (`$`), bcrypt cost 12, account lockout after 5 failures, rate limiting, JWT in memory only (no localStorage). |
| **Discredited Party in Court** | Challenge electronic evidence admissibility | Legal scrutiny, claims of fabricated timestamp | Auto-generated Section 63 BSA 2023 certificate with system host digest, officer ECDSA signature, and verifiable Merkle proof. |

## 2. Cryptographic Security Controls

- **Envelope Encryption:** NIST SP 800-38D AES-256-GCM with unique 256-bit data keys wrapped under master KMS key.
- **Integrity Fingerprinting:** SHA-256 stream digests computed on raw pre-encryption streams.
- **Immutability Ledger:** Audit blocks are hash-chained (`hash = SHA256(index, ts, action, prevHash, data)`). Verification walks every block to pinpoint any altered records.
- **Merkle Roots:** Batches of evidence leaves are grouped into Merkle trees and linked sequentially (`prevRoot`).
