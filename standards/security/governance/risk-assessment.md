---
identifier: "SEC-GOV-004"
name: "Security Risk Assessment Framework"
version: "1.0.0"
status: "MANDATORY"

domain: "SECURITY"
documentType: "governance"
category: "governance"
appliesTo: ["all"]

lastUpdated: "2026-05-05"
owner: "Security Architecture Board"

standardsCompliance:
  iso: ["ISO/IEC-27001:2022", "ISO/IEC-27005:2022"]
  rfc: []
  w3c: []
  other: ["NIST-CSF-2.0", "PCI-DSS-4.0-Req.12.3", "CIS-Controls-v8"]

taxonomy:
  capability: "risk-management"
  subCapability: "security-risk-assessment"
  layer: "governance"

enforcement:
  method: "process"
  rejectionCriteria:
    - "No documented risk assessment methodology"
    - "No risk register maintained for the service or system"
    - "Risk acceptance decisions not documented with approver and review date"
    - "PCI DSS customised controls implemented without a Targeted Risk Analysis"
  reviewChecklist:
    - "Risk assessment methodology documented and aligned to ISO 27001 Clause 6.1.2"
    - "Risk register contains mandatory fields (asset, threat, likelihood, impact, risk score, owner)"
    - "Risk tolerance thresholds defined and approved by accountable authority"
    - "All accepted risks have a review date not exceeding 12 months"
    - "PCI DSS customised controls have a documented Targeted Risk Analysis"

dependsOn: ["SEC-GOV-000", "SEC-GDL-001"]
supersedes: ""
---

# Security Risk Assessment Framework

## Purpose

This governance document defines a **MANDATORY** methodology for conducting security risk assessments. It establishes the minimum requirements for risk identification, analysis, evaluation, and acceptance that satisfy ISO/IEC 27001:2022 Clause 6.1.2, NIST CSF 2.0 GV.RM, and PCI DSS 4.0 Requirement 12.3. Organisations define their own risk tolerance values; this document defines the process and artefact requirements that make those values verifiable.

> *Normative language (**MUST**, **MUST NOT**, **SHOULD**, **MAY**) follows RFC 2119 semantics.*

## Rules

### R-1: When a Risk Assessment Is Required

A security risk assessment **MUST** be conducted:

- Before a new service or system is deployed to production for the first time
- Before a significant change: new external integration, change in data classification tier, expansion of authentication scope, or introduction of a new technology stack
- After a P1 or P2 security incident (post-incident risk assessment)
- On an annual cadence for all services processing Confidential or Restricted data per SEC-GDL-001
- When a compliance framework (ISO 27001, PCI DSS, SOC 2) requires it as part of certification scope

Lightweight services with no external exposure and no Confidential or Restricted data **MAY** conduct a documented scope-limitation statement in lieu of a full assessment, subject to approval by the Security Architecture Board.

### R-2: Risk Assessment Methodology

Risk assessments **MUST** follow a structured, repeatable methodology. The following steps are required in sequence:

**Step 1 — Asset Identification:** Identify all assets in scope: systems, data stores, APIs, credentials, people, third-party dependencies. Each asset **MUST** be classified per SEC-GDL-001.

**Step 2 — Threat Identification:** For each asset, identify credible threat scenarios. Use STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) as the threat modelling method unless an equivalent methodology is documented and approved. Document each threat with a description and the attacker motivation or capability required to execute it.

**Step 3 — Vulnerability Identification:** For each threat, identify existing controls and their adequacy. Note vulnerabilities (absent, insufficient, or incorrectly implemented controls).

**Step 4 — Risk Analysis:** For each threat-vulnerability pair, assign:
- **Likelihood**: probability of occurrence given current controls (1 = Rare, 2 = Unlikely, 3 = Possible, 4 = Likely, 5 = Almost Certain)
- **Impact**: business impact if the threat is realised (1 = Negligible, 2 = Minor, 3 = Moderate, 4 = Major, 5 = Catastrophic)
- **Inherent Risk Score**: Likelihood × Impact (range 1–25)

**Step 5 — Risk Evaluation:** Compare the inherent risk score against the organisation's defined risk tolerance thresholds to determine whether the risk is Acceptable, Tolerable (requires monitoring), or Unacceptable (requires treatment).

**Step 6 — Risk Treatment:** For each Unacceptable risk, select one treatment:
- **Mitigate**: implement or improve controls to reduce likelihood or impact
- **Transfer**: shift risk to a third party (insurance, contractual obligation)
- **Avoid**: eliminate the activity or asset that introduces the risk
- **Accept**: document a residual risk acceptance decision (see R-4)

After treatment, calculate the **Residual Risk Score** based on the expected effectiveness of the treatment.

### R-3: Risk Register

Every service in scope **MUST** maintain a risk register. The risk register **MUST** be a persistent, versioned document (not ephemeral meeting notes). The following fields are **MANDATORY** for every risk entry:

| Field | Description |
|-------|-------------|
| `risk_id` | Unique identifier (e.g., `SVC-RISK-001`) |
| `asset` | Asset or component affected |
| `threat` | Threat scenario description |
| `vulnerability` | Gap or weakness that enables the threat |
| `likelihood` | 1–5 score |
| `impact` | 1–5 score |
| `inherent_risk_score` | Likelihood × Impact |
| `treatment` | Mitigate / Transfer / Avoid / Accept |
| `control_description` | What control is in place or planned |
| `residual_risk_score` | Likelihood × Impact after treatment |
| `risk_owner` | Named individual accountable for monitoring |
| `status` | Open / In Treatment / Accepted / Closed |
| `review_date` | Next scheduled review (MUST NOT exceed 12 months) |
| `accepted_by` | For accepted risks: name and title of approving authority |
| `acceptance_date` | Date of acceptance decision |

### R-4: Risk Acceptance

Residual risks that remain above the Acceptable threshold after treatment **MUST** be subject to a formal risk acceptance decision:

- Risk acceptance **MUST** be approved by an authority at least one organisational level above the risk owner (e.g., if the risk owner is an Engineering Lead, acceptance requires a Director or VP)
- The acceptance decision **MUST** document: the residual risk score, why no further treatment is feasible or proportionate, the review date (maximum 12 months), and the approver's name and title
- Accepted risks **MUST** be reviewed at each review date; continued acceptance requires a new decision and updated documentation
- Risks above the Unacceptable threshold that cannot be treated to Tolerable or below **MUST** be escalated to the Security Architecture Board and the accountable executive

Risk acceptance **MUST NOT** be used to defer treatment of Critical or High severity vulnerabilities that have a defined remediation SLA per SEC-STD-007.

### R-5: Risk Tolerance Definition

Organisations **MUST** define their risk tolerance thresholds. The following defaults apply unless a higher authority has formally approved different thresholds:

| Score range | Classification | Default treatment requirement |
|-------------|----------------|-------------------------------|
| 1–4 | Acceptable | Document; review annually |
| 5–9 | Tolerable | Monitor; mitigate within 6 months |
| 10–14 | Unacceptable | Mitigate within 30 days or accept with Board approval |
| 15–25 | Critical — Unacceptable | Mitigate within 7 days; acceptance requires executive approval |

Risk tolerance thresholds **MUST** be documented, approved by the Security Architecture Board, and reviewed at minimum annually.

### R-6: PCI DSS Targeted Risk Analysis

Organisations subject to PCI DSS 4.0 that implement customised controls (i.e., controls that differ from the defined requirements in PCI DSS v4) **MUST** conduct a Targeted Risk Analysis (TRA) per PCI DSS Requirement 12.3.2 for each customised control:

The TRA **MUST** document:
- The objective of the PCI DSS requirement being addressed
- The specific risk(s) the customised control is designed to address
- How the customised control achieves an equivalent or greater level of protection
- How the effectiveness of the customised control will be monitored
- The frequency of the TRA review (at minimum annually)

TRA documentation **MUST** be retained and available for assessor review.

### R-7: Threat Model Artefact

Risk assessments conducted in the context of new service design or significant change (per R-1) **MUST** produce a threat model artefact:

- A Data Flow Diagram (DFD) or equivalent diagram showing data flows, trust boundaries, and external entities
- STRIDE analysis applied per-element: each process, data store, and external entity evaluated for all six STRIDE categories
- The threat model **MUST** be updated when the architecture changes materially
- For services processing Restricted-tier data per SEC-GDL-001, the threat model **MUST** be reviewed and approved by the Security Architecture Board before production deployment (per SEC-GOV-001 R-3)

## Examples

### Risk register entry

```
risk_id: SVC-RISK-007
asset: User session tokens (JWTs)
threat: Attacker steals token from browser storage via XSS
vulnerability: Tokens stored in localStorage (not HttpOnly cookie)
likelihood: 3 (Possible — XSS vulnerabilities frequently found in web apps)
impact: 4 (Major — full account takeover for any exploited user)
inherent_risk_score: 12 (Unacceptable)
treatment: Mitigate
control_description: Move tokens to HttpOnly Secure SameSite=Strict cookies per SEC-STD-001 R-2
residual_risk_score: 4 (Acceptable — cookie theft still requires network position)
risk_owner: Alice Chen, Lead Engineer
status: In Treatment
review_date: 2026-11-05
```

### STRIDE analysis example (partial)

```
Asset: Authentication API endpoint (POST /auth/token)
Threat category: Brute Force (Spoofing)
Threat: Attacker sends high volume of credential-guessing requests
Existing control: No rate limiting on /auth/token
Vulnerability: Rate limiting absent
Likelihood: 4, Impact: 4 → Score: 16 (Critical)
Treatment: Mitigate — implement rate limiting per SEC-STD-001 R-5
```

## References

- [ISO/IEC 27001:2022 — Clause 6.1.2 Information Security Risk Assessment](https://www.iso.org/standard/82875.html)
- [ISO/IEC 27005:2022 — Information Security Risk Management](https://www.iso.org/standard/80585.html)
- [NIST CSF 2.0 — GV.RM: Risk Management Strategy](https://www.nist.gov/cyberframework)
- [PCI DSS 4.0 — Requirement 12.3.2 Targeted Risk Analysis](https://www.pcisecuritystandards.org/)
- [STRIDE threat modelling methodology (Microsoft)](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- SEC-GDL-001 — Data Classification (asset classification input to risk analysis)
- SEC-GOV-000 — Security Domain Governance Framework (exception authority and SoA)
- SEC-GOV-001 — Secure SDLC (threat model in design phase)
- SEC-GOV-003 — Security Incident Response (post-incident risk assessment trigger)
- SEC-STD-007 — Vulnerability Management (SLA requirements — not replaceable by risk acceptance)

## Rationale

**Why STRIDE over alternative methodologies?** STRIDE is well-documented, tool-supported (Microsoft Threat Modeling Tool, OWASP Threat Dragon), and maps directly to the six categories of security properties. PASTA and LINDDUN are valid alternatives; the key requirement is documented, repeatable methodology — not a specific tool.

**Why Likelihood × Impact as the scoring model?** Multiplication produces a risk matrix where a low-likelihood catastrophic event ranks appropriately higher than a high-likelihood negligible event. The 1–25 scale allows fine-grained differentiation that a 3×3 matrix cannot provide. The thresholds in R-5 are calibrated for enterprise use; organisations **MAY** adjust them if they can demonstrate equivalent or stricter coverage.

**Why mandatory risk acceptance re-approval after 12 months?** Risk profiles change: new vulnerabilities are discovered, attackers develop new capabilities, business context shifts. An accepted risk from 2 years ago may not be acceptable under today's threat landscape. The 12-month review forces a conscious reassessment rather than silent perpetuation.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-05-05 | Initial definition |
