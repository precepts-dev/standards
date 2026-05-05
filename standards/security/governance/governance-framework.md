---
identifier: "SEC-GOV-000"
name: "Security Governance Framework"
version: "1.0.0"
status: "MANDATORY"

domain: "SECURITY"
documentType: "governance"
category: "governance"
appliesTo: ["all"]

lastUpdated: "2026-05-04"
owner: "Security Architecture Board"

standardsCompliance:
  iso: ["ISO/IEC-27001:2022", "ISO/IEC-27002:2022"]
  rfc: []
  w3c: []
  other: ["NIST-CSF-2.0", "CIS-Controls-v8"]

taxonomy:
  capability: "security-governance"
  subCapability: "framework"
  layer: "governance"

enforcement:
  method: "stage-gate"
  reviewChecklist:
    - "Security governance scope documented and approved"
    - "Roles and responsibilities defined for security decisions"
    - "SEC domain standards inventory maintained"
    - "Exception process documented and accessible"
    - "Annual review cycle scheduled"

dependsOn: []
supersedes: ""
---

# Security Governance Framework

## Purpose

This document establishes the **governance meta-layer** for the Precepts Security (`SEC`) domain. It defines the scope of the SEC standards set, the authority model for security decisions, the exception process, and the lifecycle policy for SEC documents. All other SEC documents operate within the structure this document establishes.

This document maps directly to the **GOVERN** function introduced in NIST CSF 2.0, which frames security governance as the foundation from which all other security functions (IDENTIFY, PROTECT, DETECT, RESPOND, RECOVER) derive their mandate.

## Conceptual Model

The Precepts SEC domain organizes security requirements into four document types:

| Type | Purpose | Status Levels |
|---|---|---|
| **Standard (STD)** | Mandatory, enforceable rules with automated or review-based verification | MANDATORY |
| **Guideline (GDL)** | Advisory direction with expected compliance; deviation requires rationale | RECOMMENDED or MANDATORY |
| **Governance (GOV)** | Frameworks, processes, and accountability structures | MANDATORY |
| **Best Practice (BP)** | Emerging or context-specific recommendations | RECOMMENDED |

The SEC domain covers cross-cutting security concerns applicable to all software produced or operated by the organization. Protocol-level security rules embedded in the INTEGRATION domain (INTG-STD-008 R-10, INTG-STD-029, INTG-STD-033) are not duplicated here; SEC standards extend and complement them.

## Roles and Responsibilities

| Role | Responsibility |
|---|---|
| **Security Architecture Board** | Owns all SEC documents; approves new standards and major version changes |
| **Service Owner** | Responsible for compliance of their service with applicable SEC standards |
| **Security Champion** | Embedded in each team; first-line reviewer of SEC standard applicability |
| **Platform Security Team** | Maintains automated enforcement tooling; triage for SEC violations |
| **Chief Information Security Officer (CISO)** | Signs off on risk exceptions; approves MANDATORY standard waivers |

## Rules

### R-1: Scope of the SEC Domain

The Precepts SEC domain **MUST** govern all software systems that:
- Process, store, or transmit data classified as Internal, Confidential, or Restricted (per SEC-GDL-001)
- Expose externally accessible integration endpoints
- Execute with elevated privilege or service identity
- Are subject to regulatory compliance obligations (GDPR, SOC 2, HIPAA, PCI-DSS, or equivalent)

Systems processing only Public-tier data with no external network access **MAY** apply SEC standards at RECOMMENDED level unless otherwise mandated by regulatory context.

### R-2: Standards Hierarchy

When security requirements conflict across domains, the following precedence applies (highest to lowest):

1. Applicable regulatory requirements (GDPR, HIPAA, PCI-DSS)
2. SEC domain MANDATORY standards
3. Domain-specific MANDATORY standards (e.g., INTG-STD)
4. SEC domain RECOMMENDED guidelines
5. Domain-specific RECOMMENDED guidelines

Where a domain-specific standard contains a security requirement that is stricter than the SEC standard, the stricter requirement applies.

### R-3: Exception Process

Every deviation from a MANDATORY SEC standard **MUST** follow this process:

1. **Document** the specific rule(s) being waived and the technical or business rationale
2. **Assess** residual risk using SEC-GOV-004 (Risk Assessment Framework)
3. **Compensating controls** — identify alternative controls that partially mitigate the risk
4. **Approval** — obtain written sign-off from the CISO or designated delegate
5. **Time-bound** — every exception **MUST** have an expiry date not exceeding 90 days; renewal requires repeating steps 1–4
6. **Register** — log the exception in the organization's risk register

No exception may be self-approved by the service owner or their direct chain of command.

### R-4: Document Lifecycle

SEC standards **MUST** follow this lifecycle:

- **DRAFT** — under active development; **MUST NOT** be enforced
- **MANDATORY** / **RECOMMENDED** — active; enforced per their status
- **DEPRECATED** — superseded; teams **MUST** migrate within the documented timeline before the document is removed from the published set

Every MANDATORY standard **MUST** be reviewed at minimum annually. The review **MUST** assess: continued relevance, alignment with current threat landscape, feasibility of enforcement, and alignment with updated external standards.

### R-5: New Standard Proposals

Proposals for new SEC domain documents **MUST** include:
- Clear scope that does not duplicate existing SEC or INTG standards
- At least one citation to an authoritative external standard (NIST, OWASP, ISO, IETF)
- Multi-order impact analysis covering developer workflow, security posture, and compliance cost
- A named owner from the Security Architecture Board

### R-6: Cross-Domain Security Requirements

Security requirements embedded in non-SEC domain standards (e.g., INTG-STD-008 R-10, INTG-STD-029 structured logging, INTG-STD-033 resilience security constraints) **MUST** be treated as normatively equivalent to SEC standards. The Security Architecture Board **MUST** review all new non-SEC domain standards for embedded security requirements and register them in the SEC domain cross-reference index.

## Selection Framework

When determining which SEC standards apply to a given system or service, apply the following decision sequence:

1. **Data classification** — classify all data the service handles per SEC-GDL-001; this determines baseline applicability
2. **Exposure surface** — does the service expose external endpoints? Apply SEC-STD-001, SEC-STD-003
3. **Identity handling** — does the service authenticate users or issue tokens? Apply SEC-STD-001, SEC-STD-008
4. **Secrets** — does the service consume any credentials, API keys, or certificates? Apply SEC-STD-002
5. **Dependencies** — does the service build or deploy software? Apply SEC-STD-006, SEC-STD-007
6. **Regulatory** — does the service process data under GDPR, HIPAA, PCI-DSS? Apply SEC-GDL-001 + applicable supplementary docs

## Examples

### Applicability determination for a new microservice

A payment processing service that:
- Stores card tokenization references (Confidential tier data)
- Exposes REST API endpoints to a web frontend
- Calls a third-party payment gateway
- Is deployed in Kubernetes

Applicable SEC standards: SEC-GDL-001 (data classification), SEC-STD-001 (IAM + JWT), SEC-STD-002 (secrets management for API keys), SEC-STD-003 (TLS to payment gateway), SEC-STD-004 (security logging), SEC-STD-005 (input validation), SEC-STD-006 (supply chain for container image), SEC-STD-007 (vulnerability management), SEC-GOV-001 (Secure SDLC), SEC-GDL-002 (security configuration).

## References

- [NIST CSF 2.0 — GOVERN Function](https://www.nist.gov/cyberframework)
- [NIST SP 800-53 Rev 5 — PM (Program Management) Control Family](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [ISO/IEC 27001:2022 — Clause 6 (Planning) and Clause 9 (Performance Evaluation)](https://www.iso.org/standard/82875.html)
- [CIS Controls v8 — Control 1 (Inventory), Control 18 (Application Software Security)](https://www.cisecurity.org/controls/v8)

## Rationale

**Why a meta-governance document?** Individual SEC standards define WHAT to do. Without a governance layer, teams have no canonical answer to: which rules apply to my service? What happens when I can't comply? Who approves exceptions? NIST CSF 2.0's GOVERN function addition (the only new function in the 2024 revision) validates this need.

**Why 90-day exception expiry?** Permanent exceptions accumulate technical debt and become invisible risk. A 90-day forcing function ensures risk is re-evaluated as the threat landscape and system design evolve. SOC 2 auditors routinely flag permanent waivers as a control weakness.

**Why CISO sign-off on exceptions?** Self-approved exceptions are the root cause of most high-severity compliance findings. Elevating approval to the CISO ensures exceptions receive appropriate scrutiny and are visible to the organization's leadership.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-05-04 | Initial definition |
