---
identifier: "SEC-GOV-001"
name: "Secure Software Development Lifecycle"
version: "1.0.0"
status: "MANDATORY"

domain: "SECURITY"
documentType: "governance"
category: "governance"
appliesTo: ["all"]

lastUpdated: "2026-05-04"
owner: "Security Architecture Board"

standardsCompliance:
  iso: ["ISO/IEC-27001:2022", "ISO/IEC-27034-1:2011"]
  rfc: []
  w3c: []
  other: ["NIST-SP-800-218", "NIST-SSDF-1.1", "OWASP-SAMM-2.0", "SAFECode-Fundamental-Practices"]

taxonomy:
  capability: "secure-development"
  subCapability: "sdlc"
  layer: "governance"

enforcement:
  method: "stage-gate"
  reviewChecklist:
    - "Security requirements captured in design phase"
    - "Threat model documented for new services and major changes"
    - "SAST configured in CI pipeline"
    - "SCA/dependency scan configured"
    - "Security acceptance criteria in Definition of Done"
    - "Post-deployment security monitoring active"

dependsOn: ["SEC-GOV-000", "SEC-GDL-001"]
supersedes: ""
---

# Secure Software Development Lifecycle

## Purpose

This document defines the **mandatory security activities** that **MUST** occur at each phase of the software development lifecycle (SDLC). It implements the NIST Secure Software Development Framework (SSDF) SP 800-218 and provides concrete gate criteria for teams building or significantly modifying software systems.

The goal is to shift security left — detecting and resolving issues when they are cheapest to fix (design and code) rather than after deployment (where cost increases by 6–100× according to IBM Systems Sciences Institute research).

## Conceptual Model

The Secure SDLC applies across five phases:

```
[PLAN] → [DESIGN] → [BUILD] → [VERIFY] → [DEPLOY & OPERATE]
   ↑                                              |
   +-------------------FEEDBACK-------------------+
```

Each phase has mandatory security activities. A system **MUST NOT** advance to the next phase without completing the mandatory activities for the current phase. Minor patches may use an accelerated path (Build → Verify → Deploy only) provided no new attack surface is introduced.

## Roles and Responsibilities

| Role | Responsibility |
|---|---|
| **Security Champion** | Embedded in team; conducts threat modeling; reviews security findings |
| **Developer** | Implements secure coding practices per SEC-STD-005; fixes identified vulnerabilities |
| **Tech Lead / Architect** | Approves threat model; ensures security requirements are captured |
| **Security Architecture Board** | Sets SDLC requirements; performs periodic process audits |
| **Release Manager** | Enforces security stage gates before production deployments |

## Rules

### R-1: Plan Phase — Security Requirements

Before development begins on any new service or feature that introduces new data handling or external interfaces, the team **MUST**:

- Identify the data classification tier(s) involved per SEC-GDL-001
- Document applicable regulatory constraints (GDPR Article 25 Privacy by Design, HIPAA, PCI-DSS as applicable)
- Capture security acceptance criteria alongside functional acceptance criteria in the backlog
- Identify which SEC domain standards apply (per SEC-GOV-000 R-1 scope criteria)

For minor enhancements with no new data types or interfaces, this phase **MAY** be abbreviated to a checklist review.

### R-2: Design Phase — Threat Modeling

New services and any change that introduces new authentication flows, data stores, external integrations, or privilege boundaries **MUST** undergo threat modeling before implementation begins.

Threat modeling **MUST**:

- Identify trust boundaries and data flows using a recognized framework (STRIDE, PASTA, or equivalent)
- Enumerate threats against each trust boundary
- Assign risk ratings per SEC-GOV-004 criteria
- Identify mitigating controls for each HIGH and CRITICAL risk
- Produce a threat model artifact stored with the service documentation

For services processing data classified as Restricted per SEC-GDL-001, the threat model **MUST** be reviewed by the Security Architecture Board before implementation.

Threat models **MUST** be updated when: a new external dependency is introduced, authentication or authorization logic changes, a new data classification tier is added to the service, or a significant infrastructure change occurs.

### R-3: Build Phase — Secure Coding Gates

All code repositories **MUST** have the following automated security tooling configured in CI:

- **SAST (Static Application Security Testing)** — run on every pull request targeting a protected branch. Findings at CRITICAL or HIGH severity **MUST** block merge once the tool has been tuned to less than 30% false positive rate (teams **MAY** use a 90-day tuning period before activating blocking). MEDIUM findings **MUST** be triaged within one sprint.
- **SCA (Software Composition Analysis)** — scan all dependencies for known CVEs. Findings with CVSS ≥ 9.0 (CRITICAL) **MUST** block merge. CVSS 7.0–8.9 (HIGH) **MUST** be triaged within 7 days.
- **Secret scanning** — detect accidentally committed secrets. Any detection **MUST** block merge immediately and trigger SEC-STD-002 remediation procedures.
- **IaC security scanning** — for services deploying infrastructure as code (Terraform, CloudFormation, Helm), IaC files **MUST** be scanned for misconfiguration before deployment.

Teams **MUST NOT** bypass these gates without a documented exception per SEC-GOV-000 R-3.

### R-4: Verify Phase — Security Testing

Before any release to production, the following verification **MUST** be completed:

- **Dependency vulnerability check** — no unmitigated CRITICAL CVEs in the dependency tree
- **Security acceptance criteria** — all security acceptance criteria defined in the Plan phase marked as passing
- **Authentication and authorization testing** — new or modified auth flows **MUST** include tests covering: unauthenticated access rejection, authorization boundary enforcement, and token/session expiry behavior

For services rated HIGH risk in their threat model:

- **Dynamic testing (DAST)** — automated DAST scan against a staging environment **MUST** be completed before production release, or within 30 days of initial production deployment
- **Penetration testing** — systems classified as Restricted-tier or subject to regulatory audit **MUST** undergo penetration testing at least annually and after major architecture changes

### R-5: Deploy and Operate Phase — Security Monitoring

After production deployment, the following controls **MUST** be active:

- Security logging per SEC-STD-004 **MUST** be enabled before traffic is accepted
- Alert rules per SEC-STD-004 **MUST** be configured and validated (confirm alerts fire in staging before production cutover)
- Vulnerability management scanning per SEC-STD-007 **MUST** be active and the service registered in the asset inventory
- For externally exposed services: WAF or equivalent layer-7 filtering **SHOULD** be deployed

### R-6: Developer Security Training

All engineers with commit access to production codebases **MUST** complete security training covering: OWASP Top 10, secure coding practices relevant to their primary language stack, and the organization's SEC domain standards. Training **MUST** be completed within 30 days of joining and refreshed annually.

## Examples

### Threat modeling scope decision

A team adds a new REST endpoint to an existing service. The endpoint reads from an existing database table using the existing authentication middleware, with no new data types or external calls. This is a minor enhancement — it **MAY** use the abbreviated Plan phase checklist and skip a full threat model update, because no new trust boundaries, data stores, or external integrations are introduced.

If the same team adds a new endpoint that calls an external payment processor API, a threat model update is **MANDATORY** because a new external integration (trust boundary) is introduced.

### SAST tuning period

A team newly integrates Semgrep into their CI pipeline. In the first two weeks, the tool flags 300 findings — after review, 200 are false positives related to framework-specific patterns. During the 90-day tuning period, the team configures suppression rules and custom rule sets. Once the FP rate drops below 30%, blocking mode is activated. During the tuning period, findings are reported to the team but do not block merge.

## References

- [NIST SP 800-218 — Secure Software Development Framework (SSDF) v1.1](https://csrc.nist.gov/publications/detail/sp/800-218/final)
- [OWASP SAMM 2.0 — Software Assurance Maturity Model](https://owaspsamm.org/)
- [ISO/IEC 27034-1:2011 — Application Security](https://www.iso.org/standard/44378.html)
- [SAFECode Fundamental Practices for Secure Software Development v3.0](https://safecode.org/wp-content/uploads/2018/03/SAFECode_Fundamental_Practices_for_Secure_Software_Development.pdf)
- SEC-GDL-001 — Data Classification and Handling
- SEC-GOV-004 — Risk Assessment Framework
- SEC-STD-004 — Security Logging
- SEC-STD-005 — Input Validation and Injection Prevention
- SEC-STD-006 — Supply Chain Security
- SEC-STD-007 — Vulnerability Management

## Rationale

**Why mandate threat modeling at design time?** Microsoft SDL data shows that 50% of security vulnerabilities in shipped software could have been identified and eliminated during design. Threat modeling is the only technique that systematically exposes architectural risks before implementation.

**Why allow a 90-day SAST tuning period?** Blocking PRs with 67% false positives (GitLab Security Report 2024) destroys developer trust in tooling. The tuning period allows teams to configure SAST correctly before activating enforcement, rather than encouraging blanket suppression of all findings.

**Why require DAST for high-risk systems only?** DAST against staging environments requires significant setup and maintenance effort. Applying it universally creates noise for low-risk services while the high-risk surface (payment flows, auth systems, PII storage) genuinely needs it.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-05-04 | Initial definition |
