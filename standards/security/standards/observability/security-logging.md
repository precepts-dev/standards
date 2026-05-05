---
identifier: "SEC-STD-004"
name: "Security Logging and Monitoring"
version: "1.0.0"
status: "MANDATORY"

domain: "SECURITY"
documentType: "standard"
category: "observability"
appliesTo: ["api", "web", "mobile", "events", "grpc", "batch", "a2a", "mcp"]

lastUpdated: "2026-05-04"
owner: "Security Architecture Board"

standardsCompliance:
  iso: ["ISO/IEC-27001:2022"]
  rfc: ["RFC-5424"]
  w3c: []
  other: ["NIST-SP-800-92", "OWASP-ASVS-5.0-V7", "CIS-Controls-v8-Control-8", "SOC-2-CC7"]

taxonomy:
  capability: "security-observability"
  subCapability: "audit-logging"
  layer: "security"

enforcement:
  method: "hybrid"
  validationRules:
    requiredFields: ["timestamp", "event_type", "actor_id", "resource", "outcome", "correlation_id"]
    retentionHot: "90 days minimum hot storage"
    retentionCold: "12 months total (anonymized after 6 months for GDPR-scoped logs)"
  rejectionCriteria:
    - "Authentication events not logged"
    - "Authorization failures not logged"
    - "Secrets or PII in log output"
    - "Log entries modifiable or deleteable by application process"
    - "No alerts configured for security events"
  reviewChecklist:
    - "All authentication and authorization events logged"
    - "Log schema includes required fields"
    - "PII excluded or anonymized at write time"
    - "Log integrity protection configured"
    - "Alert rules configured and tested"
    - "Retention policy implemented"

dependsOn: ["SEC-GOV-000", "SEC-GDL-001"]
supersedes: ""
---

# Security Logging and Monitoring

## Purpose

This standard defines **MANDATORY** requirements for security event logging, log integrity, retention, and alerting. Security logs are the primary artifact for detecting breaches, supporting incident response, and satisfying audit and compliance obligations (SOC 2 CC7, ISO 27001 A.8.15, NIST CSF DETECT).

This standard defines **security event** logging requirements. General observability (distributed tracing, structured request logs, metrics) is governed by INTG-STD-029. Both apply simultaneously; this standard adds the security-specific layer on top of the general observability foundation.

> *Normative language (**MUST**, **MUST NOT**, **SHOULD**, **MAY**) follows RFC 2119 semantics.*

## Rules

### R-1: Mandatory Security Events

Every system **MUST** log the following security-relevant events:

**Authentication events:**
- Successful authentication (user login, token issuance, service authentication)
- Failed authentication attempt
- Multi-factor authentication success and failure
- Password change, reset, and account unlock
- Account lockout triggered

**Authorization events:**
- Authorization failure (access denied) — every instance
- Privilege escalation or assume-role operations
- Access to Restricted or Confidential data (per SEC-GDL-001)
- Administrative operations (user creation, role assignment, permission changes)

**Session events:**
- Session creation and termination
- Session timeout
- Concurrent session detection

**Data events:**
- Bulk export or bulk query operations (>100 records in a single request)
- Export of Restricted-tier data
- Data deletion operations

**Security-relevant configuration events:**
- Security configuration changes (firewall rules, access policies, TLS settings)
- Secret or credential rotation
- Certificate installation or renewal

### R-2: Log Schema

Every security event log entry **MUST** be structured JSON containing these fields:

| Field | Type | Description |
|---|---|---|
| `timestamp` | string (ISO-8601 UTC) | Event time to millisecond precision |
| `event_type` | string | Enumerated event type (e.g., `auth.login.success`, `authz.denied`) |
| `actor_id` | string | Identity of the entity performing the action (user ID, service account, client ID) |
| `actor_ip` | string | Source IP address (anonymized per R-4 for GDPR-scoped systems) |
| `resource` | string | The resource being acted upon (e.g., `/v1/orders/ord_82f3k`) |
| `outcome` | string | `success` or `failure` |
| `correlation_id` | string | Request correlation ID linking to distributed traces per INTG-STD-029 |
| `service` | string | Service name emitting the log |
| `environment` | string | `production`, `staging`, etc. |

Additional context fields **SHOULD** be included where applicable:

| Field | Optional Description |
|---|---|
| `failure_reason` | Machine-readable failure code (not user-facing error message) |
| `session_id` | Session identifier (opaque hash, not raw session token) |
| `user_agent` | HTTP User-Agent header value |
| `request_id` | Per-request unique identifier |

### R-3: What MUST NOT Appear in Logs

Security logs **MUST NOT** contain:

- Plaintext passwords, tokens, API keys, or any form of secret credential
- Full payment card numbers (PAN), CVV codes, or magnetic stripe data
- Raw session tokens, JWT values, or cookie contents
- Sensitive PII fields in plaintext: government ID numbers, full financial account numbers, biometric identifiers
- Private keys or symmetric key material

Partial masking rules:
- Email addresses **SHOULD** be logged as `sha256(lowercase(email))` or truncated (e.g., `a***@example.com`) to support correlation without exposing PII
- IP addresses are pseudonymous and **MUST** be anonymized per R-4 for GDPR-scoped systems

Log injection prevention: all user-controlled input that appears in log fields **MUST** be sanitized to prevent log injection attacks; newline characters (`\n`, `\r`) **MUST** be escaped or stripped from user-supplied values before logging.

### R-4: GDPR and Data Protection Compliance

For systems subject to GDPR (Article 5(1)(e) storage limitation):

- Log entries containing personal data (IP addresses, user IDs that are directly linked to identifiable individuals) **MUST** be anonymized or pseudonymized at write time or within 6 months of collection
- After 6 months, log data **MUST** not allow re-identification of individuals without a separate linking table; if that linking table is deleted, the logs become anonymized
- Anonymized logs **MAY** be retained for 12 months for security and audit purposes
- The legal basis for retaining pseudonymized security logs for 6 months **SHOULD** be documented in the organization's Records of Processing Activities (RoPA) under GDPR Article 30

Where local data protection laws impose stricter retention limits, those limits apply.

### R-5: Log Integrity and Tamper Protection

Security logs **MUST** be protected against unauthorized modification:

- Application processes **MUST NOT** have write-after-close or delete permissions on log storage
- Log shipping **MUST** forward security events to a centralized SIEM or log management system that is separate from the service's infrastructure
- Log integrity **SHOULD** be protected using append-only storage, log signing, or WORM (Write Once Read Many) storage for Restricted-tier and compliance-mandated logs
- Log access **MUST** be restricted to authorized security and operations personnel; developers **MUST NOT** have default production log access for logs containing authorization decisions or personal data

### R-6: Retention

| Log Type | Hot Retention | Cold Retention | Notes |
|---|---|---|---|
| Authentication events | 90 days | 12 months | Anonymize PII fields after 6 months |
| Authorization failures | 90 days | 12 months | |
| Administrative events | 90 days | 24 months | SOC 2 and ISO 27001 audit trail |
| Data export events | 90 days | 24 months | |
| Security config changes | 90 days | 24 months | |

"Hot" means immediately queryable; "cold" means archival storage with retrieval time ≤ 24 hours.

### R-7: Security Alerting

Systems **MUST** configure real-time alerts for the following conditions:

| Condition | Response SLA | Severity |
|---|---|---|
| 5+ authentication failures from same IP in 5 minutes | 15 minutes | Warning |
| Account lockout triggered | 15 minutes | Warning |
| Authentication failure rate exceeds 10× baseline | 5 minutes | High |
| Authorization failure rate exceeds 5× baseline | 5 minutes | High |
| Successful authentication from a new country/region for a privileged account | 15 minutes | Warning |
| Bulk data export (> 1000 records in < 1 minute) | 5 minutes | High |
| Administrative privilege grant | 15 minutes | Warning |
| Security configuration change | 15 minutes | Warning |
| Any access to Restricted-tier data outside business hours | 15 minutes | Warning |

Alerts **MUST** be routed to a Security Operations Center (SOC) or on-call security team. Alert response times are maximums; faster is better.

## Examples

### Correct security event log entry

```json
{
  "timestamp": "2026-05-04T14:23:01.342Z",
  "event_type": "auth.login.failure",
  "actor_id": "f8c3de3d-1fea-4d7c-a8b0-29f63c4c3454",
  "actor_ip": "203.0.113.0",
  "resource": "/v1/auth/token",
  "outcome": "failure",
  "failure_reason": "invalid_credentials",
  "correlation_id": "req_01HZA3B4C5D6E7F8G9",
  "service": "auth-service",
  "environment": "production"
}
```

### Invalid log entries

```json
// MUST NOT: secret in logs
{
  "event_type": "auth.token.issued",
  "token": "eyJhbGciOiJSUzI1NiJ9...",   // token value MUST NOT appear
  "password": "hunter2"                   // MUST NOT appear
}

// MUST NOT: PII in plaintext for GDPR-scoped logs
{
  "event_type": "auth.login.success",
  "email": "alice@example.com"            // use hash or truncated form
}
```

## Enforcement Rules

The following **MUST** be verified before production deployment:

1. **Event coverage audit** — all required R-1 event types generate log entries (verified by integration tests or security review)
2. **Schema validation** — log entries contain all required R-2 fields; automated validation in CI **SHOULD** check against the schema
3. **Secret and PII exclusion** — secret scanning tools (per SEC-STD-002) configured to scan log samples
4. **Alert configuration** — R-7 alert rules configured and validated in staging before production; alert tests **MUST** pass
5. **Retention policy** — log management system configured with correct retention rules per R-6

## References

- [NIST SP 800-92 — Guide to Computer Security Log Management](https://csrc.nist.gov/publications/detail/sp/800-92/final)
- [OWASP ASVS 5.0 — V7 Error Handling and Logging](https://owasp.org/www-project-application-security-verification-standard/)
- [CIS Controls v8 — Control 8: Audit Log Management](https://www.cisecurity.org/controls/v8)
- [SOC 2 Trust Service Criteria CC7.2–CC7.5 — System Operations and Monitoring](https://www.aicpa.org/resources/article/aicpa-trust-services-criteria)
- [GDPR Article 5(1)(e) — Storage Limitation](https://gdpr.eu/article-5-how-to-process-personal-data/)
- INTG-STD-029 — Integration Observability (general request logging)
- SEC-GOV-003 — Incident Response (log use during investigations)
- SEC-GDL-001 — Data Classification (Restricted/Confidential tier triggers)

## Rationale

**Why anonymize-at-write for IP addresses rather than at query time?** Query-time anonymization requires keeping raw logs and applying transformation on every access, which means the raw PII is still persisted. CNIL guidance and GDPR Article 5(1)(e) storage limitation are better satisfied by not persisting the raw form beyond the minimum necessary period. Anonymization at write (or within 6 months) keeps the log data useful for pattern analysis while removing direct re-identification risk.

**Why 90-day hot retention?** Most security incidents are detected within 30–90 days of the initial compromise (IBM Cost of Data Breach Report 2024 mean time to identify: 194 days). 90-day hot retention makes the most forensically relevant recent logs immediately queryable; cold archival extends coverage for regulatory audits that look back 12–24 months.

**Why mandate centralized log shipping?** Logs stored only on the host they were generated on are inaccessible if the host is compromised or destroyed. Centralized shipping to a SIEM operated under separate access control is the minimum viable tamper resistance for security logs.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-05-04 | Initial definition |
