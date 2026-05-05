---
identifier: "SEC-GDL-001"
name: "Data Classification and Handling"
version: "1.0.0"
status: "MANDATORY"

domain: "SECURITY"
documentType: "guideline"
category: "data-governance"
appliesTo: ["all"]

lastUpdated: "2026-05-04"
owner: "Security Architecture Board"

standardsCompliance:
  iso: ["ISO/IEC-27001:2022", "ISO/IEC-27002:2022"]
  rfc: []
  w3c: []
  other: ["NIST-SP-800-53-Rev5-RA", "CIS-Controls-v8-Control-3", "GDPR-Article-5", "SOC-2-CC6"]

taxonomy:
  capability: "data-governance"
  subCapability: "classification"
  layer: "governance"

enforcement:
  method: "review-based"
  reviewChecklist:
    - "Data classification documented in service catalog or architecture doc"
    - "Data flows mapped for Confidential and Restricted tiers"
    - "Retention policy defined per classification tier"
    - "Handling controls implemented per tier"
    - "Regulatory obligations identified for Restricted-tier data"

dependsOn: ["SEC-GOV-000"]
supersedes: ""
---

# Data Classification and Handling

## Purpose

This guideline defines a **four-tier data classification framework** for all data processed, stored, or transmitted by organization systems. Classification determines which security controls apply, what handling behaviors are required, and which regulatory obligations are triggered.

This guideline is elevated to MANDATORY because it is the prerequisite for applying the correct security controls throughout the SEC domain — SEC-STD-001, SEC-STD-003, SEC-STD-004, and SEC-GOV-001 all reference classification tiers defined here.

> *Normative language (**MUST**, **SHOULD**, **MAY**) follows RFC 2119 semantics.*

## When to Apply

Apply this guideline:
- When onboarding a new service: classify all data types the service will process
- When adding a new data type to an existing service: determine its tier and update the service's data register
- When evaluating security control applicability: use tier to determine which SEC standards apply
- When responding to a data subject access request or regulatory inquiry: use the data register to locate and classify the relevant data

## Classification Tiers

### Tier 1 — Public

**Definition:** Information intended for unrestricted disclosure to the public.

**Examples:** Marketing materials, public documentation, open-source code, published blog posts, publicly announced financial results.

**Handling requirements:**
- No encryption at rest required (but permitted)
- No access control requirements beyond preventing unauthorized modification
- No special logging requirements

**Regulatory triggers:** None standard.

---

### Tier 2 — Internal

**Definition:** Information intended for internal use only, which if disclosed externally would cause minor operational impact but not significant harm.

**Examples:** Internal wiki content, meeting notes, non-sensitive business metrics, general internal communications.

**Handling requirements:**
- **MUST** be accessible only to authenticated organization members
- **MUST** be transmitted over encrypted channels (TLS per SEC-STD-003) when traversing untrusted networks
- Encryption at rest **SHOULD** be applied
- Standard access control applies; no need for need-to-know restriction beyond role membership

**Regulatory triggers:** None standard, but subject to general data protection principles under GDPR Article 5 if personal data is involved.

---

### Tier 3 — Confidential

**Definition:** Sensitive business or personal information whose unauthorized disclosure would cause material harm: financial loss, legal liability, reputational damage, or harm to individuals.

**Examples:** Employee personal data (HR records, salary, performance reviews), customer contact data (names, email addresses, phone numbers), business strategy documents, source code for proprietary systems, security vulnerability details, authentication credentials (all credentials are at least Confidential regardless of other classification), financial records, contracts with NDAs.

**Handling requirements:**
- **MUST** be encrypted at rest using AES-256-GCM or equivalent per SEC-STD-003
- **MUST** be transmitted over TLS 1.2 minimum per SEC-STD-003
- **MUST** be subject to role-based or attribute-based access control with documented roles
- Access **MUST** be logged per SEC-STD-004 R-1
- **MUST NOT** be transmitted via unencrypted messaging platforms (email without TLS, SMS, plain HTTP APIs)
- Retention **MUST** follow defined data retention schedules; data **MUST** be deleted when retention period expires
- Backups containing Confidential data **MUST** be encrypted

**Regulatory triggers:** GDPR applies to any Confidential data that includes personal data of EU/EEA residents. Record in the Records of Processing Activities (RoPA).

---

### Tier 4 — Restricted

**Definition:** Highly sensitive information whose unauthorized disclosure would cause severe harm: significant financial damage, regulatory penalties, personal safety risk to individuals, or critical security compromise.

**Examples:** Passwords and secrets (all forms), private cryptographic keys, payment card data (PAN, CVV), government-issued ID numbers (SSN, passport numbers), medical / health records (ePHI), biometric identifiers, data enabling discrimination (racial/ethnic origin, religious beliefs, political opinions, genetic data as defined in GDPR Article 9), vulnerability exploit code or penetration test findings, security incident details during active response, encryption key material.

**Handling requirements:** All Confidential handling requirements apply, plus:

- Access **MUST** follow need-to-know principle; blanket department or team access **MUST NOT** be granted
- Access requests for Restricted data **MUST** require explicit approval
- Data flows **MUST** be documented in a data flow map; unauthorized copies **MUST NOT** exist
- **MUST NOT** be stored in developer laptops or workstations without full-disk encryption and remote wipe capability
- **MUST NOT** be present in lower environments (development, staging) unless anonymized or replaced with synthetic data
- Bulk export of Restricted data **MUST** require explicit authorization and **MUST** be logged per SEC-STD-004
- Multi-factor authentication **MUST** be required for access to systems containing Restricted data per SEC-STD-001

**Regulatory triggers:** Restricted tier data is the primary trigger for elevated regulatory obligations:
- **GDPR Article 9** special categories: explicit legal basis required; Data Protection Impact Assessment (DPIA) **MUST** be completed before processing (see DEF-013 for DPIA framework details)
- **HIPAA**: health information (ePHI) requires BAA with all processors; minimum necessary standard applies
- **PCI-DSS**: payment card data requires PCI-DSS compliance for all systems in scope
- **CCPA/CPRA**: certain personal data categories require specific consumer rights and sale opt-out handling

## Rules

### R-1: Classification at Onboarding

Every service processing, storing, or transmitting data **MUST** document the classification tier(s) of all data types it handles before production deployment. This inventory **MUST** be stored in the service's architecture documentation or service catalog entry and reviewed during architectural change reviews.

### R-2: Handling Boundaries

Data **MUST NOT** flow from a higher classification tier to a lower classification tier boundary without explicit data de-classification or anonymization:

- Restricted data **MUST NOT** be stored in systems rated for Internal or Public data only
- Log outputs from systems processing Restricted data **MUST** be reviewed to ensure they do not leak Restricted data into log storage
- API responses **MUST NOT** include Restricted fields in contexts where the caller is not authorized for that tier

### R-3: Behavioral DLP Controls

Regardless of tooling, the following behavioral data loss prevention (DLP) rules apply to all Restricted-tier data:

- **MUST NOT** traverse unencrypted channels (HTTP, FTP, SMTP without TLS, plain WebSocket)
- Bulk extraction of Restricted data (>100 records in a single operation) **MUST** require explicit per-operation authorization and **MUST** be logged per SEC-STD-004
- Restricted data **MUST NOT** be included in system prompts, context windows, or training datasets for AI/ML systems without explicit anonymization and documented legal basis
- Restricted data **MUST NOT** be sent to third-party services, analytics platforms, or error tracking tools without explicit data processing agreements and classification-appropriate controls

### R-4: Data Retention and Deletion

Each data type **MUST** have a documented retention period defined by the data owner. When the retention period expires:

- Structured data (database records) **MUST** be deleted or anonymized
- Unstructured data (files, logs, backups) **MUST** be securely deleted using a documented deletion procedure
- Cryptographic erasure (deleting the encryption key so encrypted data becomes irrecoverable) **MAY** be used as an alternative to physical deletion when direct deletion is technically infeasible

Deletion **MUST** be verified: a post-deletion audit **SHOULD** confirm the data is no longer accessible.

### R-5: Third-Party Data Sharing

Before sharing Confidential or Restricted data with a third party:

- A Data Processing Agreement (DPA) **MUST** be in place for GDPR-scoped personal data
- The third party's security controls **MUST** be verified as equivalent or superior to the handling requirements for the data tier being shared
- Third-party data sharing **MUST** be logged in the data flow map

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|---|---|
| Classifying all data as Restricted "to be safe" | Tiering enables proportionate controls; over-classification leads to control fatigue and bypasses |
| Not classifying data at all | Unclassified data defaults to Internal tier for SEC control purposes but **MUST** be explicitly classified |
| Using production Restricted data in development | Anonymize or generate synthetic equivalents for non-production environments |
| Logging Restricted fields in diagnostic output | Mask or exclude Restricted fields in all logging per SEC-STD-004 R-3 |
| Storing classification tier in user-controlled fields | Classification is determined by data content and context, not by user input |

## Examples

### Data classification in a SaaS application

A SaaS platform handles:
- User names and email addresses → **Confidential** (personal data under GDPR)
- Subscription plan (free/pro) → **Internal**
- Payment card last-4 digits → **Confidential** (non-PAN, but still payment context)
- Full PAN during checkout → **Restricted** (PCI-DSS scope)
- Support ticket contents → **Confidential** (may contain user-described issues with personal context)
- Error messages shown to users → **Internal** (sanitized, no secrets or PII)

### Handling control mapping for an order management API

An order object containing customer name, address, and payment method token (vault reference, not raw card data):
- Customer name, address: **Confidential** — encrypted at rest, TLS in transit, access control, 7-year retention per financial regulation
- Payment token (vault reference): **Confidential** — encrypted at rest, access logged
- Order status, line items, pricing: **Internal** — access control, 7-year retention

## References

- [ISO/IEC 27001:2022 — A.5.12 Classification of Information](https://www.iso.org/standard/82875.html)
- [NIST SP 800-53 Rev 5 — RA-2 Risk Categorization, MP-4 Media Storage](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [GDPR Article 5 — Principles Relating to Processing of Personal Data](https://gdpr.eu/article-5-how-to-process-personal-data/)
- [GDPR Article 9 — Processing of Special Categories of Personal Data](https://gdpr.eu/article-9-processing-special-categories-of-personal-data/)
- [CIS Controls v8 — Control 3: Data Protection](https://www.cisecurity.org/controls/v8)
- SEC-STD-001 — IAM (MFA requirement for Restricted tier)
- SEC-STD-003 — Cryptography and TLS (encryption requirements per tier)
- SEC-STD-004 — Security Logging (access logging requirements per tier)

## Rationale

**Why four tiers?** Two tiers (sensitive/non-sensitive) produce binary thinking that leads to over-classification. Six or more tiers create operational confusion. Four tiers (Public, Internal, Confidential, Restricted) map to recognized industry practice and align with GDPR's implicit two-level personal data distinction (regular and special categories) while adding the operational Public/Internal split organizations need.

**Why elevate this guideline to MANDATORY?** Classification underpins every other SEC standard. Without agreed-upon tiers, teams cannot evaluate which controls apply or whether a given control is proportionate. The governance function requires a shared vocabulary for risk conversations.

**Why include behavioral DLP rules?** Tooling-specific DLP (Nightfall, Microsoft Purview, etc.) is organization-specific and tracked as DEF-014. The behavioral rules (no plaintext transmission, no bulk export without authorization, no AI training without anonymization) are tool-agnostic and enforceable through policy and code review regardless of what DLP tooling exists.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-05-04 | Initial definition |
