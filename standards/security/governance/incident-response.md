---
identifier: "SEC-GOV-003"
name: "Security Incident Response"
version: "1.0.0"
status: "MANDATORY"

domain: "SECURITY"
documentType: "governance"
category: "governance"
appliesTo: ["all"]

lastUpdated: "2026-05-05"
owner: "Security Architecture Board"

standardsCompliance:
  iso: ["ISO/IEC-27001:2022"]
  rfc: []
  w3c: []
  other: ["NIST-SP-800-61r3", "SOC-2-CC7.4", "GDPR-Art.33", "HIPAA-164.308(a)(6)", "PCI-DSS-4.0-Req.12.10"]

taxonomy:
  capability: "security-operations"
  subCapability: "incident-response"
  layer: "governance"

enforcement:
  method: "process"
  rejectionCriteria:
    - "No documented incident classification criteria"
    - "No defined detection-to-escalation time targets"
    - "No regulatory notification timeline documented for services processing personal data"
    - "No evidence preservation procedure referencing SEC-STD-004 logs"
  reviewChecklist:
    - "Incident severity classification criteria defined"
    - "Maximum detection-to-escalation times defined per severity"
    - "Regulatory notification timelines documented for applicable frameworks"
    - "Log retention and evidence preservation procedures reference SEC-STD-004"
    - "Annual tabletop exercise completed and documented"
    - "Post-incident review artifact template defined"

dependsOn: ["SEC-GOV-000", "SEC-STD-004"]
supersedes: ""
---

# Security Incident Response

## Purpose

This governance document defines **MANDATORY** requirements for the technical layer of security incident response: detection-to-escalation chains, incident classification, evidence preservation, regulatory notification timelines, and post-incident review. It does not prescribe organisation-specific runbooks, communication chains, or role assignments — those vary by organisation size, jurisdiction, and team structure. The standard specifies *what the IRP must cover*; organisations define *how*.

> *Normative language (**MUST**, **MUST NOT**, **SHOULD**, **MAY**) follows RFC 2119 semantics.*

## Rules

### R-1: Incident Response Plan (IRP)

Every organisation operating production systems **MUST** maintain a documented Incident Response Plan. The IRP **MUST** cover:

- Incident classification criteria and severity definitions (see R-2)
- Detection-to-escalation time targets per severity tier (see R-3)
- Evidence preservation procedures (see R-4)
- Regulatory notification timelines for each applicable framework (see R-5)
- Post-incident review process (see R-7)

The IRP **MUST** be reviewed and updated at minimum annually and after any severity P1 or P2 incident.

### R-2: Incident Classification

Every detected security event **MUST** be classified by severity within 30 minutes of initial detection. The following four-tier model **MUST** be used or mapped to an equivalent organisational scheme:

| Severity | Criteria | Examples |
|----------|----------|---------|
| **P1 — Critical** | Active breach; data exfiltration confirmed or suspected; complete system compromise; ransomware active | Confirmed credential theft at scale; active exfiltration of Restricted-tier data; encryption by ransomware |
| **P2 — High** | Unauthorised access confirmed; significant data exposure; service integrity compromised | Exposed database credentials in public repo; unauthenticated access to internal API; supply chain compromise detected |
| **P3 — Medium** | Attempted attack, no confirmed impact; suspicious activity requiring investigation | Brute-force campaign on authentication endpoints; anomalous data access patterns; unpatched critical CVE in production |
| **P4 — Low** | Policy violations; informational; no confirmed malicious activity | Misconfigured logging; failed security scan; phishing email reported by user (no click) |

Initial classification **MAY** be revised as investigation reveals more information. Revision **MUST** be recorded with rationale.

### R-3: Detection-to-Escalation Timelines

The following maximum times apply from the moment a security event is first detected (logged, alerted, or reported) to the moment it is escalated to the designated incident owner:

| Severity | Detection to Escalation | Escalation to Investigation Start |
|----------|------------------------|----------------------------------|
| P1 — Critical | **15 minutes** | **30 minutes** |
| P2 — High | **1 hour** | **2 hours** |
| P3 — Medium | **4 hours** | **24 hours** |
| P4 — Low | **24 hours** | **72 hours** |

Timelines apply 24×7 for P1 and P2. Organisations **MUST** define an on-call rotation or equivalent that ensures P1/P2 escalation can occur outside business hours.

After investigation start, a containment action **MUST** be taken or explicitly documented as infeasible (with reasoning) within:
- P1: **2 hours**
- P2: **8 hours**

### R-4: Evidence Preservation

From the moment a P1 or P2 incident is declared, evidence **MUST** be preserved:

- Security logs per SEC-STD-004 **MUST** be flagged for preservation and **MUST NOT** be deleted or overwritten for the duration of the incident plus 90 days, regardless of normal retention policies
- System snapshots, memory dumps, or container images **SHOULD** be captured before any remediation action that would destroy forensic state; if operational necessity requires immediate remediation without prior capture, the decision **MUST** be logged with timestamp and approver
- All incident-related evidence **MUST** maintain chain of custody: record what was collected, when, by whom, and where it is stored; evidence **MUST NOT** be modified after collection
- For incidents involving regulatory notification (see R-5), preserve all evidence until legal hold is explicitly lifted

Evidence **MUST** be stored in a location separate from the affected systems and accessible only to authorised incident responders.

### R-5: Regulatory Notification Timelines

Services that process personal data or operate under regulated frameworks **MUST** document and meet the following notification timelines:

| Framework | Notification trigger | Deadline | Recipient |
|-----------|---------------------|----------|-----------|
| **GDPR Art. 33** | Breach of personal data likely to result in risk to individuals | **72 hours** from awareness | Lead supervisory authority (e.g., ICO, CNIL, BfDI) |
| **GDPR Art. 34** | Breach likely to result in *high* risk to individuals | **Without undue delay** | Affected data subjects directly |
| **HIPAA §164.308(a)(6)** | Breach of unsecured PHI | **Without unreasonable delay; max 60 days** from discovery | HHS OCR; affected individuals; media if >500 in a state |
| **PCI DSS Req. 12.10.4** | Compromise of cardholder data | **Immediately** (within 24 hours recommended) | Affected card brands and acquirers |
| **NIS2 Art. 23** | Significant incident affecting essential/important entity | **24 hours** (early warning); **72 hours** (notification) | National CSIRT or competent authority |

"Awareness" for GDPR purposes begins when the organisation has reasonable certainty that a breach has occurred — not when investigation is complete.

For P1 incidents, the responsible incident owner **MUST** evaluate regulatory notification obligations within **1 hour** of incident classification and document the outcome (notify or justified no-notify).

### R-6: Containment, Eradication, and Recovery Standards

Containment actions **MUST** be documented with timestamps and approver names. The incident owner **MUST** confirm before eradication that:

- The attack vector has been identified or the most likely vector is documented
- Logs and evidence have been preserved per R-4
- Regulatory notification obligations have been assessed per R-5

Eradication **MUST** include verification that the indicator of compromise (IOC) has been removed and not merely hidden. Recovery **MUST** include a smoke test that validates affected functionality before declaring the incident closed.

### R-7: Post-Incident Review

Every P1 and P2 incident **MUST** produce a post-incident review (PIR) artifact within 5 business days of incident closure. The PIR **MUST** include:

- Incident timeline (detection, escalation, containment, eradication, recovery)
- Root cause analysis (not just the proximate cause — the systemic contributing factors)
- What worked and what failed during response
- Corrective actions with assigned owners and due dates
- Whether detection and escalation timelines (R-3) were met; if not, why not

PIR artifacts **MUST** be retained for a minimum of 3 years.

### R-8: Tabletop Exercise

Organisations **MUST** conduct a security incident response tabletop exercise at minimum once per calendar year. The exercise **MUST**:

- Simulate at minimum one P1-severity scenario relevant to the organisation's threat model
- Test the detection-to-escalation chain and regulatory notification timelines
- Produce a written debrief identifying gaps and corrective actions
- Be repeated after any significant change to the detection toolchain or incident ownership structure

## Examples

### Incident classification walkthrough

```
Event: Monitoring alert — authentication failures spike to 500/min on /auth/token
Initial classification: P3 (attempted attack, no confirmed impact)

Investigation (within 4 hours):
  - Source: single IP, credential-stuffing pattern (known username list)
  - No successful authentications from attack IP
  - Rate limiting blocked further attempts after 200 failures

Revised classification: P4 (rate limiting working; no breach; policy violation logged)
Action: Block source IP at WAF; update rate limit thresholds; log to vulnerability register
PIR: Not required (P4); lightweight retrospective note added to runbook
```

### Regulatory notification decision

```
Event: Database backup file found exposed on public S3 bucket for 6 hours
Data: Contains 12,000 user records (name, email, hashed passwords) — Confidential tier

GDPR notification assessment (within 1 hour of P2 classification):
  - Personal data? Yes — names and email addresses
  - Risk to individuals? Likely — email addresses enable phishing even without plaintext passwords
  - Notification required? YES — Article 33 applies
  - Deadline: 72 hours from awareness (awareness = 14:00 UTC Tuesday)
  - Deadline: 14:00 UTC Friday
  - Notify: ICO (UK), CNIL (France) — two supervisory authorities as data crosses EU/UK borders

Action: File with ICO via casework portal by Thursday 14:00 UTC; supplement with forensic
        report when investigation complete
```

## References

- [NIST SP 800-61r3 — Computer Security Incident Handling Guide](https://doi.org/10.6028/NIST.SP.800-61r3)
- [GDPR Article 33 — Notification of breach to supervisory authority](https://gdpr-info.eu/art-33-gdpr/)
- [GDPR Article 34 — Communication of breach to data subject](https://gdpr-info.eu/art-34-gdpr/)
- [HIPAA 164.308(a)(6) — Security Incident Procedures](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
- [PCI DSS 4.0 — Requirement 12.10](https://www.pcisecuritystandards.org/)
- [NIS2 Directive — Article 23](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555)
- [SOC 2 Trust Services Criteria — CC7.3–CC7.5](https://www.aicpa.org/)
- SEC-STD-004 — Security Event Logging and Monitoring (log preservation)
- SEC-GOV-000 — Security Domain Governance Framework (exception authority)
- SEC-GOV-004 — Security Risk Assessment Framework (incident risk rating)

## Rationale

**Why govern the technical layer only?** Organisational runbooks (who calls whom, communication templates, escalation paths) vary by headcount, jurisdiction, and structure. Prescribing them in a standard either produces compliance theatre (orgs copy the template without customising) or creates a standard that is outdated the moment teams restructure. The standard defines the verifiable, standardisable properties: timelines, classification criteria, notification obligations, evidence preservation. Each organisation implements these in a runbook appropriate to their context.

**Why 72-hour GDPR notification instead of "when investigation is complete"?** The 72-hour clock starts at awareness of a likely breach — not at completion of forensics. Waiting for certainty is not a valid reason to miss the deadline. When in doubt, notify provisionally with information available, then supplement.

**Why mandatory PIR for P1/P2 only?** P3/P4 incidents are valuable learning opportunities but requiring a formal PIR for every low-severity event creates process fatigue. Teams **SHOULD** apply lightweight retrospectives to P3 incidents. The formal PIR requirement for P1/P2 ensures the highest-risk events receive structured analysis.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-05-05 | Initial definition |
