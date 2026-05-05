---
identifier: "SEC-BP-002"
name: "Post-Quantum Cryptography Migration"
version: "1.0.0"
status: "RECOMMENDED"

domain: "SECURITY"
documentType: "best-practice"
category: "cryptography"
appliesTo: ["api", "web", "mobile", "events", "grpc", "batch", "a2a", "mcp"]

lastUpdated: "2026-05-05"
owner: "Security Architecture Board"

standardsCompliance:
  iso: []
  rfc: ["RFC-9180", "RFC-9258"]
  w3c: []
  other: ["NIST-FIPS-203", "NIST-FIPS-204", "NIST-FIPS-205", "NIST-SP-800-131A-r3", "CNSA-2.0", "BSI-PQC-Migration"]

taxonomy:
  capability: "cryptography"
  subCapability: "post-quantum-migration"
  layer: "security"

enforcement:
  method: "advisory"
  reviewChecklist:
    - "CBOM maintained for all production services (MUST for this document)"
    - "RSA and ECC key lengths comply with SEC-STD-003 minimums"
    - "Services with expected lifetime >2030 have PQC migration plan documented"
    - "Hybrid key exchange evaluated for new TLS deployments"
    - "PQC algorithm selection follows NIST FIPS 203/204/205"

dependsOn: ["SEC-GOV-000", "SEC-STD-003"]
supersedes: ""
---

# Post-Quantum Cryptography Migration

## Purpose

This best practice document provides implementation guidance for migrating to post-quantum cryptography (PQC) algorithms. It specifies how to build and maintain a Cryptographic Bill of Materials (CBOM) — which is **MANDATORY** in this document for PQC migration planning, even though SEC-STD-003 makes CBOM a SHOULD for general use — and how to plan and execute a phased PQC transition aligned with NIST standardisation (FIPS 203/204/205, finalized August 2024).

> *Normative language (**MUST**, **MUST NOT**, **SHOULD**, **MAY**) follows RFC 2119 semantics.*

## Background

**Why act now?** Cryptographically-relevant quantum computers (CRQCs) capable of breaking RSA-2048 and ECC-256 do not exist today, but the "harvest now, decrypt later" (HNDL) threat is active: adversaries are recording encrypted traffic today to decrypt it once a CRQC is available. Data encrypted today with classical algorithms that has confidentiality requirements extending beyond 2030 is at risk. NIST SP 800-131A Rev 3 (draft, October 2024) schedules RSA-2048/ECC-256 for disallowance by 2030.

**Which algorithms are standardised?** NIST finalised three PQC standards in August 2024:
- **ML-KEM** (FIPS 203) — Module-Lattice Key Encapsulation Mechanism; replaces RSA-KEM and ECDH for key exchange
- **ML-DSA** (FIPS 204) — Module-Lattice Digital Signature Algorithm; replaces RSA signatures and ECDSA
- **SLH-DSA** (FIPS 205) — Stateless Hash-Based Digital Signature Algorithm; conservative alternative signature scheme

**What is not yet standardised?** NIST Round 4 candidates (BIKE, Classic McEliece, HQC) for alternative KEMs are still under evaluation. Do not deploy unstandardised candidates in production.

## Rules

### R-1: Cryptographic Bill of Materials (CBOM) — MANDATORY

Every production service **MUST** maintain a Cryptographic Bill of Materials documenting all cryptographic algorithms and key material in use. This is elevated to MUST in this document (compared to SHOULD in SEC-STD-003) because the CBOM is the prerequisite for all subsequent PQC migration planning.

The CBOM **MUST** include for each cryptographic usage:

| Field | Description |
|-------|-------------|
| `usage_id` | Unique identifier for this usage |
| `purpose` | What the algorithm is used for (TLS, JWT signing, at-rest encryption, code signing, etc.) |
| `algorithm` | Algorithm name and key length (e.g., `RSA-2048`, `ECDSA-P256`, `AES-256-GCM`) |
| `implementation` | Library and version (e.g., `OpenSSL 3.3.1`, `BouncyCastle 1.78`) |
| `location` | Service name and component (e.g., `payment-service / mTLS client certificate`) |
| `data_sensitivity` | Classification tier of data protected (per SEC-GDL-001) |
| `classical_vulnerable` | Boolean: is this algorithm vulnerable to a CRQC (RSA, ECC, DH)? |
| `migration_priority` | High / Medium / Low (see G-2) |
| `target_algorithm` | The PQC algorithm planned to replace this usage |
| `migration_deadline` | Target date for migration |

CBOM **SHOULD** be maintained in CycloneDX format (`cryptography` component type) to enable automated tooling integration. Store the CBOM alongside the SBOM per SEC-STD-006 R-3.

### G-2: Migration Priority Assessment

Not all classical cryptographic usages carry equal risk. Prioritise migration based on three factors:

**Factor 1 — Data sensitivity and confidentiality period:**
- Restricted-tier data with confidentiality requirements beyond 2030: **High priority**
- Confidential data with long retention (financial records, health records, legal documents): **High priority**
- Session encryption for ephemeral data (expires within hours or days): **Low priority**

**Factor 2 — Classical vulnerability:**
- RSA (all key lengths), ECDSA, ECDH, DH: **Quantum-vulnerable** → must migrate
- AES-256, SHA-384/512, HMAC-SHA-256: **Quantum-resistant** (key lengths adequate against Grover's algorithm) → no migration required
- AES-128, SHA-256: **Marginally resistant** — monitor NIST guidance; 256-bit migration RECOMMENDED for long-lived systems

**Factor 3 — System lifetime:**
- Systems with expected operational lifetime beyond 2030: **High priority**
- Systems planned for decommission before 2028: **Low priority** (document the rationale)

### G-3: Algorithm Selection for New Deployments

For new systems and significant cryptographic capability additions, use quantum-resistant algorithms where tooling maturity permits:

**Key encapsulation / key exchange:**
- Prefer: **ML-KEM-768** (FIPS 203, 192-bit security level) for general use
- Alternative: **ML-KEM-1024** for high-security / long-lived key material
- For TLS: use **X25519Kyber768Draft00** or **ML-KEM + X25519 hybrid** (see G-4); do not use ML-KEM alone until browser/client support matures

**Digital signatures:**
- Prefer: **ML-DSA-65** (FIPS 204, equivalent to ECDSA-P256 security) for general signing
- Alternative: **SLH-DSA-SHA2-128s** (FIPS 205) as a conservative, hash-based signature — significantly larger signature size (7.9 KB) but relies only on hash function security
- Code signing: **ML-DSA-87** (highest security level) for signing long-lived artefacts (firmware, software releases)

**At-rest encryption:**
- AES-256-GCM remains quantum-resistant; no migration required for symmetric encryption

**MUST NOT** deploy CRYSTALS-Dilithium, CRYSTALS-Kyber, Falcon, or SPHINCS+ by their pre-standardisation names in new systems; use their FIPS-standardised equivalents (ML-DSA, ML-KEM, FN-DSA, SLH-DSA).

### G-4: Hybrid Key Exchange During Transition

For TLS and key exchange scenarios, deploy **hybrid key exchange** that combines a classical algorithm with a PQC algorithm:

- Hybrid exchange provides security against both classical and quantum attacks simultaneously; if either component is broken, the other provides the security guarantee
- IETF-standardised hybrid: **X25519MLKEM768** (RFC 9258 / TLS 1.3 key share extension); supported in BoringSSL (Chrome), LibreSSL, OpenSSL 3.3+, and Rustls
- For services where clients are under your control (internal services, mobile apps): deploy hybrid key exchange as a migration step; transition to PQC-only when client ecosystem support is confirmed
- For public-facing TLS: enable hybrid key exchange as an additional key share; it will be negotiated with clients that support it without breaking compatibility with classical-only clients

### G-5: Migration Execution Phases

A PQC migration **SHOULD** follow these phases:

**Phase 1 — Inventory (now → Q4 2026):**
- Complete CBOM for all production services
- Classify each usage by priority (G-2)
- Identify cryptographic dependencies in libraries and cloud services; many are handled automatically by library/TLS upgrades

**Phase 2 — Hybrid deployment (2026 → 2028):**
- Deploy hybrid TLS key exchange (G-4) on all public-facing TLS endpoints
- Add ML-DSA or ML-KEM to code signing pipelines alongside existing ECDSA
- Update TLS libraries to versions with PQC hybrid support (OpenSSL 3.3+, BoringSSL)

**Phase 3 — PQC primary (2028 → 2030):**
- Transition long-lived key material (code signing keys, CA certificates, SSH host keys) to PQC-primary, classical-secondary
- Migrate internal service-to-service mTLS to PQC certificates via SPIFFE/SPIRE or service mesh CA
- Retire RSA-2048 and ECC-P256 for new key generation; existing deployed certificates may continue until expiry

**Phase 4 — Classical retirement (by 2030):**
- Complete retirement of RSA and ECC for all operations per NIST SP 800-131A disallowance schedule
- Archive or re-encrypt stored ciphertext protected by quantum-vulnerable key encapsulation

### G-6: Library and Tooling Readiness

Current PQC support status (as of 2026):

| Component | PQC Status | Notes |
|-----------|-----------|-------|
| OpenSSL 3.3+ | ML-KEM hybrid TLS, ML-DSA | Production-ready |
| BoringSSL | X25519MLKEM768 | Used by Chrome; mature |
| Java (BouncyCastle 1.78+) | ML-KEM, ML-DSA, SLH-DSA | Production-ready |
| Python (cryptography 43+) | ML-KEM via oqs-provider | Requires liboqs |
| AWS KMS | ML-KEM hybrid | Preview as of 2025 |
| GCP Cloud KMS | Roadmap; not GA | Monitor release notes |
| Azure Key Vault | Roadmap | Monitor |
| TLS 1.3 hybrid | X25519MLKEM768 | Chrome 130+, Firefox 132+ |

Use the Open Quantum Safe (liboqs) library as an integration layer for languages and frameworks not yet natively supporting FIPS 203/204/205; it provides a consistent API wrapping the reference implementations.

## Examples

### CBOM entry (CycloneDX JSON)

```json
{
  "type": "cryptography",
  "name": "mTLS client certificate",
  "version": "1.0",
  "properties": [
    {"name": "algorithm", "value": "ECDSA-P256"},
    {"name": "purpose", "value": "service-to-service mTLS authentication"},
    {"name": "classical_vulnerable", "value": "true"},
    {"name": "migration_priority", "value": "High"},
    {"name": "target_algorithm", "value": "ML-DSA-65"},
    {"name": "migration_deadline", "value": "2028-06-01"}
  ]
}
```

### Hybrid TLS configuration (nginx)

```nginx
ssl_protocols TLSv1.3;
# Offer both hybrid (PQC+classical) and classical-only key exchange
ssl_ecdh_curve X25519MLKEM768:X25519:prime256v1;
```

## References

- [NIST FIPS 203 — ML-KEM (Kyber)](https://doi.org/10.6028/NIST.FIPS.203)
- [NIST FIPS 204 — ML-DSA (Dilithium)](https://doi.org/10.6028/NIST.FIPS.204)
- [NIST FIPS 205 — SLH-DSA (SPHINCS+)](https://doi.org/10.6028/NIST.FIPS.205)
- [NIST SP 800-131A Rev 3 (draft) — Transitioning Cryptographic Algorithms](https://csrc.nist.gov/pubs/sp/800/131/a/r3/ipd)
- [Open Quantum Safe Project (liboqs)](https://openquantumsafe.org/)
- [CycloneDX Cryptography Extension — CBOM](https://cyclonedx.org/capabilities/cbom/)
- [CNSA 2.0 — US National Security Systems migration timeline](https://media.defense.gov/2022/Sep/07/2003071834/-1/-1/0/CSA_CNSA_2.0_ALGORITHMS_.PDF)
- [BSI PQC Migration Guide (German Federal Office for Information Security)](https://www.bsi.bund.de/EN/Themen/Unternehmen-und-Organisationen/Informationen-und-Empfehlungen/Quantentechnologien-und-Post-Quanten-Kryptografie/Post-Quanten-Kryptografie/)
- SEC-STD-003 — Cryptography and TLS (CBOM SHOULD baseline; algorithm requirements)
- SEC-STD-006 — Software Supply Chain Security (CBOM stored alongside SBOM)

## Rationale

**Why is CBOM MUST here but SHOULD in SEC-STD-003?** Maintaining a CBOM is operationally useful but not urgently critical for organisations not yet planning a PQC migration. For organisations engaging with this document — i.e., those actively planning PQC migration — the CBOM is a non-negotiable prerequisite; you cannot plan a migration without knowing what you are migrating. The MUST here applies specifically to the PQC migration planning context.

**Why hybrid rather than PQC-only for TLS?** ML-KEM and ML-DSA are new algorithms with less deployment history than RSA and ECC. A hybrid scheme ensures that even if a vulnerability is discovered in the PQC algorithm (as happened with SIKE, eliminated from NIST consideration after a classical attack), the classical component still provides security. The cost is a modest increase in key share size (negligible in practice for TLS).

**Why not wait until 2029 to start?** The CBOM inventory and library upgrade work takes 12–24 months for large organisations. Starting the inventory now means being ready to deploy hybrids in 2026–2027 and complete the transition before the 2030 NIST disallowance deadline. Organisations that wait until 2028 will face a compressed, high-risk migration under deadline pressure.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-05-05 | Initial definition |
