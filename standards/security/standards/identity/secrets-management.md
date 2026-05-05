---
identifier: "SEC-STD-002"
name: "Secrets Management"
version: "1.0.0"
status: "MANDATORY"

domain: "SECURITY"
documentType: "standard"
category: "identity"
appliesTo: ["all"]

lastUpdated: "2026-05-04"
owner: "Security Architecture Board"

standardsCompliance:
  iso: ["ISO/IEC-27001:2022"]
  rfc: []
  w3c: []
  other: ["NIST-SP-800-57", "OWASP-ASVS-5.0-V6", "CIS-Controls-v8-Control-3"]

taxonomy:
  capability: "secrets-management"
  subCapability: "credential-lifecycle"
  layer: "security"

enforcement:
  method: "hybrid"
  validationRules:
    secretScanPatterns: "API keys, private keys, passwords, connection strings MUST NOT appear in version control"
  rejectionCriteria:
    - "Secrets in source code or version control"
    - "Secrets in environment variables set at build time and baked into container images"
    - "Secrets shared between environments (production secrets in development)"
    - "Secrets without defined rotation schedule"
    - "Service accounts with non-expiring credentials"
  reviewChecklist:
    - "Secrets accessed from a secrets manager, not environment injection at build time"
    - "Secret rotation schedule defined"
    - "Pre-commit secret scanning configured"
    - "Audit logging enabled on secrets manager"
    - "Emergency rotation runbook documented"

dependsOn: ["SEC-GOV-000"]
supersedes: ""
---

# Secrets Management

## Purpose

This standard defines **MANDATORY** requirements for the storage, access, rotation, and revocation of secrets: API keys, passwords, database credentials, private keys, certificates, and other sensitive credentials used by software systems.

Secrets are the keys to the kingdom. A single leaked secret can result in full system compromise. This standard addresses the most common sources of secret exposure: source code, container images, environment variables at build time, and unrotated long-lived credentials.

> *Normative language (**MUST**, **MUST NOT**, **SHOULD**, **MAY**) follows RFC 2119 semantics.*

## Rules

### R-1: No Secrets in Source Code or Version Control

Secrets **MUST NOT** be stored in any of the following locations:

- Source code files (any language)
- Configuration files committed to version control (including `.env` files, `config.yaml`, `application.properties`, Helm values files)
- Commit messages or pull request descriptions
- CI/CD pipeline definitions (unless using native secrets injection mechanisms)
- Container images or Dockerfiles (`ARG`, `ENV` instructions that receive secret values at build time **MUST NOT** be used)
- Documentation or comments

This rule applies regardless of whether the repository is private or public, and regardless of whether the secret appears to be expired or rotated.

### R-2: Secrets Storage

All secrets used in production systems **MUST** be stored in a dedicated secrets management system:

- The secrets manager **MUST** enforce access control at the secret level (not just vault/namespace level)
- The secrets manager **MUST** provide audit logging of all read and write operations per SEC-STD-004
- The secrets manager **MUST** support secret versioning to enable zero-downtime rotation
- Secrets **MUST** be encrypted at rest; the encryption keys **MUST NOT** be stored alongside the secrets

Non-production secrets **MUST** be stored in a separate vault or namespace from production secrets. Production credentials **MUST NOT** be used in development or test environments.

**Compliance implementation guide (non-normative):** HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, and GCP Secret Manager all satisfy these requirements. The choice of implementation is organization-specific.

### R-3: Secret Injection

Secrets **MUST** be injected at runtime, not at build time:

- Container workloads **MUST** receive secrets via one of: (a) volume-mounted files from the secrets manager, (b) environment variables injected at pod/task startup by the orchestrator secrets integration, or (c) direct API calls to the secrets manager at application startup
- Secrets **MUST NOT** be baked into container images, deployment artifacts, or source bundles at build time
- Applications **MUST NOT** log secret values, even at debug level; secrets **MUST** be masked in all logging output
- Memory containing secret values **SHOULD** be cleared as soon as the secret is no longer needed; secrets **MUST NOT** be placed in caches that survive process boundaries

### R-4: Secret Rotation

Every secret **MUST** have a defined rotation schedule:

| Secret Type | Maximum Lifetime | Rotation Method |
|---|---|---|
| API keys (third-party services) | 90 days | Manual or automated |
| Database credentials | 90 days | Automated preferred |
| TLS certificates | Per SEC-STD-003 | Automated (ACME/cert-manager) |
| OAuth client secrets | 180 days | Manual with overlap period |
| Signing keys (JWT, HMAC) | 180 days | Key rotation with `kid` claim |
| SSH keys (human) | 1 year | Manual |
| Service account keys | 90 days | Automated preferred |
| Shared symmetric keys | 90 days | Out-of-band re-keying |

Rotation **MUST** be zero-downtime: the new secret **MUST** be valid before the old secret is invalidated. An overlap window of at least 15 minutes **MUST** be maintained during rotation.

An emergency rotation runbook **MUST** exist for each secret type, covering: how to detect a suspected compromise, how to rotate the secret within 1 hour, how to verify the rotation succeeded, and who to notify per SEC-GOV-003.

### R-5: Pre-commit and CI Secret Scanning

All code repositories **MUST** have secret scanning configured:

- Pre-commit hooks or a CI check **MUST** scan for secret patterns before code reaches the default branch
- Scanning **MUST** cover: API key patterns for common providers, private key PEM blocks, JWT secrets, database connection strings, and environment variable patterns that suggest credential assignment
- Any scan detection **MUST** block the commit or PR and trigger immediate investigation
- If a secret is detected in a historical commit, the secret **MUST** be rotated immediately; git history rewriting alone is insufficient because the secret may already have been cloned or indexed

### R-6: Least Privilege Access to Secrets

Access to secrets **MUST** follow least privilege:

- Each service **MUST** have access only to the specific secrets it needs, not a broad namespace or vault
- Human access to production secrets **MUST** be time-limited (just-in-time access); standing access to production secrets **SHOULD NOT** exist except for break-glass scenarios
- Break-glass access to production secrets **MUST** be logged, alerted, and reviewed within 24 hours
- Secret access patterns **MUST** be monitored; anomalous access (bulk reads, access from unexpected IP ranges, access outside business hours) **MUST** generate security alerts

### R-7: Certificate Lifecycle

TLS certificates and signing certificates are a special class of secret subject to the rotation rules in SEC-STD-003. Additionally:

- Certificate private keys **MUST** be generated in the system where they will be used; private keys **MUST NOT** be transmitted or copied between systems
- Self-signed certificates **MUST NOT** be used in production for external-facing services; public-trust CA certificates are required
- Wildcard certificates (`*.example.com`) **SHOULD** be avoided; they expand the blast radius of a certificate compromise to all subdomains

## Examples

### Correct secret injection pattern

```
# At build time: no secrets
FROM base-image:latest
COPY application.jar /app/
ENTRYPOINT ["java", "-jar", "/app/application.jar"]

# At runtime: secrets injected by orchestrator
# - DATABASE_PASSWORD mounted from secrets manager via orchestrator integration
# - Application reads from /run/secrets/db-password or env var set at start
```

### Incorrect patterns

```
# MUST NOT: secret in Dockerfile build arg
ARG DATABASE_PASSWORD
ENV DB_PASS=${DATABASE_PASSWORD}

# MUST NOT: secret in source code
API_KEY = "sk-proj-abc123xyz..."

# MUST NOT: secret in .env file committed to git
DATABASE_URL=postgres://user:password@host/db
```

### Pre-commit scan detection

```
# Pre-commit hook detects:
# - Private key blocks (-----BEGIN RSA PRIVATE KEY-----)
# - High-entropy strings matching API key patterns
# - Connection string patterns
# Detection immediately blocks commit and alerts the developer
```

## Enforcement Rules

The following **MUST** be enforced:

1. **Secret scanning in CI** — all repositories **MUST** have automated secret scanning; findings **MUST** block merge
2. **No production secrets in lower environments** — verified during deployment pipeline configuration reviews
3. **Rotation schedule documentation** — each service's runbook **MUST** document rotation schedules for all secrets it uses
4. **Audit log verification** — secrets manager audit logs **MUST** be actively monitored; bulk access anomalies **MUST** alert

## References

- [NIST SP 800-57 — Recommendation for Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [OWASP ASVS 5.0 — V6 Cryptographic Values](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [CIS Controls v8 — Control 3.11 (Encrypt Sensitive Data)](https://www.cisecurity.org/controls/v8)
- SEC-STD-003 — Cryptography and TLS
- SEC-STD-004 — Security Logging
- SEC-GOV-003 — Incident Response

## Rationale

**Why prohibit environment variables at build time?** Container images with embedded secrets are distributed across registries, backups, and developer machines. A secret embedded at build time cannot be rotated without rebuilding and redeploying the image. Runtime injection decouples credential lifecycle from deployment lifecycle.

**Why mandate rotation even for non-compromised secrets?** Rotation limits the window of exposure from undetected compromises. A secret that has never been rotated may have been exfiltrated months ago and used quietly. Regular rotation forces re-authentication and surfaces any unauthorized use.

**Why no standing production access for humans?** Permanent human access to production secrets is a top finding in security audits and a root cause in major breaches. Just-in-time access with time limits and mandatory review of break-glass events reduces insider threat and lateral movement risk.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-05-04 | Initial definition |
