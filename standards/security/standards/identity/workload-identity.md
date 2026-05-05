---
identifier: "SEC-STD-008"
name: "Workload Identity"
version: "1.0.0"
status: "MANDATORY"

domain: "SECURITY"
documentType: "standard"
category: "identity"
appliesTo: ["api", "events", "grpc", "batch", "a2a", "mcp"]

lastUpdated: "2026-05-05"
owner: "Security Architecture Board"

standardsCompliance:
  iso: ["ISO/IEC-27001:2022"]
  rfc: ["RFC-7519", "RFC-8693"]
  w3c: []
  other: ["SPIFFE-v1.0", "NIST-SP-800-207", "OAuth-2.1-draft", "OWASP-ASVS-5.0-V2"]

taxonomy:
  capability: "identity-access-management"
  subCapability: "workload-identity"
  layer: "security"

enforcement:
  method: "hybrid"
  validationRules:
    credentialLifetime: "Workload credentials MUST NOT have a lifetime exceeding 1 hour"
    staticSecrets: "Long-lived static credentials for service-to-service authentication MUST NOT be used"
  rejectionCriteria:
    - "Long-lived static API keys or passwords for service-to-service authentication"
    - "Shared credentials between multiple services"
    - "Workload credentials with lifetime exceeding 1 hour without rotation"
    - "Service account tokens mounted by default in all pods (automountServiceAccountToken not disabled)"
  reviewChecklist:
    - "Service-to-service auth uses short-lived credentials (cloud workload identity, SPIFFE/SVID, or equivalent)"
    - "Each service has its own distinct identity (no shared service accounts)"
    - "Credential rotation is automatic and does not require human intervention"
    - "mTLS or equivalent mutual authentication in place for all internal service calls"
    - "Service account permissions follow least privilege"

dependsOn: ["SEC-GOV-000", "SEC-STD-001", "SEC-STD-003"]
supersedes: ""
---

# Workload Identity

## Purpose

This standard defines **MANDATORY** requirements for machine-to-machine (service-to-service) authentication using workload identity. Human user authentication is governed by SEC-STD-001. This standard covers service accounts, short-lived credentials, mutual authentication between services, and integration with cloud-native workload identity systems.

> *Normative language (**MUST**, **MUST NOT**, **SHOULD**, **MAY**) follows RFC 2119 semantics.*

## Rules

### R-1: No Long-Lived Static Credentials for Service-to-Service Auth

Services **MUST NOT** authenticate to other services using long-lived static credentials (long-lived API keys, shared passwords, hard-coded tokens). Specifically:

- Static API keys with no expiry or with expiry exceeding 24 hours **MUST NOT** be used for service-to-service authentication
- Shared credentials used by more than one service **MUST NOT** be used; each service **MUST** have a distinct, non-shared identity
- Credentials embedded in application code, Docker images, or committed configuration files are a violation of SEC-STD-002 and this standard; this rule applies even when the credential is a service account

Cloud-native credential types that are acceptable: AWS IAM Role credentials (STS-issued, 1h default lifetime), GCP Workload Identity Federation tokens, Azure Managed Identity tokens, SPIFFE SVIDs (short-lived X.509 certificates or JWTs), Kubernetes service account tokens (projected, with explicit `expirationSeconds` ≤ 3600).

### R-2: Short-Lived Credential Lifetime

Workload credentials **MUST** have an automatic expiry and rotation:

- Maximum credential lifetime: **1 hour** (3600 seconds) for access tokens and JWT SVIDs
- For mTLS X.509 certificates used as workload identities (SPIFFE/SPIRE or service mesh), maximum certificate validity: **24 hours**; rotation **MUST** be automated by the certificate issuer
- Credential rotation **MUST** be fully automated and **MUST NOT** require human intervention; services **MUST** handle credential refresh transparently without downtime
- Services **MUST** be designed to tolerate brief credential rotation events; assume credential will be refreshed mid-request lifecycle

### R-3: Workload Identity Platforms

Use platform-provided workload identity where available. The following implementations satisfy the requirements of R-1 and R-2:

| Platform | Mechanism | Notes |
|---------|-----------|-------|
| AWS | IAM Roles for EC2/ECS/Lambda; IRSA (IAM Roles for Service Accounts) for EKS | Prefer IRSA over node-level instance roles for per-pod identity granularity |
| GCP | Workload Identity Federation; GKE Workload Identity | Bind Kubernetes service accounts to GCP IAM service accounts |
| Azure | Managed Identity (system-assigned preferred); Azure Workload Identity for AKS | System-assigned MI scoped to one resource; avoid user-assigned MI shared across services |
| Kubernetes | Projected service account tokens with `expirationSeconds` | Disable auto-mounting: set `automountServiceAccountToken: false` on all pods/service accounts; mount explicitly where needed |
| On-premises / multi-cloud | SPIFFE/SPIRE | Issues X.509 SVIDs and JWT SVIDs; integrates with service mesh; platform-agnostic |

Services **MUST** use one of these mechanisms or an equivalent that provides platform-attested, automatically-rotated, per-service credentials.

### R-4: Mutual Authentication

Service-to-service calls **MUST** authenticate both ends of the connection:

- Mutual TLS (mTLS) **MUST** be implemented for all synchronous service-to-service communication in environments where network-level isolation cannot be guaranteed (i.e., any multi-tenant or cloud environment)
- mTLS certificates **MUST** be issued by a workload identity platform (SPIRE, Istio, Linkerd, cloud provider PKI); self-signed ad-hoc certificates manually distributed between services **MUST NOT** be used in production
- When mTLS is enforced at the service mesh layer (Istio strict mode, Linkerd mTLS, AWS App Mesh), application-layer mTLS is not required — the mesh handles it; however, services **MUST** verify that mesh-enforced mTLS is active and not in permissive mode
- For asynchronous communication (message queues, event streams): the producer **MUST** authenticate to the broker using a per-service identity; consumer services **MUST** authenticate to the broker per R-1

### R-5: Least Privilege for Service Identities

Each service identity **MUST** be scoped to the minimum permissions required:

- Service accounts **MUST** be granted permissions only to the resources the service explicitly needs to access; wildcard (`*`) resource permissions **MUST NOT** be used in production
- Cross-service permission grants **MUST** be reviewed at minimum annually; unused permissions **MUST** be revoked
- In Kubernetes: each workload **MUST** have its own Kubernetes service account; use of the `default` service account **MUST NOT** be used for workloads with any granted permissions
- In cloud environments: IAM policies for service identities **MUST** be scoped to specific resource ARNs/URIs where the cloud provider supports resource-level permissions

### R-6: Workload Identity in CI/CD Pipelines

CI/CD pipelines that deploy to cloud environments **MUST** use workload identity federation rather than stored static credentials:

- GitHub Actions **SHOULD** use OIDC federation with AWS/GCP/Azure to obtain short-lived cloud credentials; storing long-lived cloud credentials as GitHub secrets is **RECOMMENDED** to eliminate in favour of OIDC
- Build pipeline identities **MUST** be separate from production workload identities; the CI pipeline identity **MUST NOT** have the same permissions as the running service
- Deployment credentials **MUST** be scoped to the minimum permissions required for the deployment operation; write access to resources not modified during deployment **MUST** be excluded

## Examples

### IRSA — Kubernetes pod with AWS IAM role

```yaml
# Service account with IRSA annotation
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payment-service
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/payment-service-role
---
# Pod spec: explicit mount, not default
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: payment-service
  automountServiceAccountToken: false  # disable default; IRSA uses projected volume
  volumes:
    - name: aws-token
      projected:
        sources:
          - serviceAccountToken:
              audience: sts.amazonaws.com
              expirationSeconds: 3600
              path: token
```

### SPIFFE SVID validation pseudocode

```
// Service B receives call from Service A
connection = accept_mtls_connection()
peer_svid = connection.peer_certificate_spiffe_id()
assert peer_svid == "spiffe://org.example/ns/payments/sa/payment-service"
// SVID validated — only payment-service can reach this endpoint
```

## References

- [SPIFFE v1.0 — Secure Production Identity Framework For Everyone](https://spiffe.io/docs/latest/spiffe-about/spiffe-concepts/)
- [NIST SP 800-207 — Zero Trust Architecture](https://doi.org/10.6028/NIST.SP.800-207)
- [AWS IAM Roles for Service Accounts (IRSA)](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- [GCP Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Azure Workload Identity for AKS](https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview)
- [Kubernetes Projected Service Account Tokens](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/#serviceaccount-token-volume-projection)
- SEC-STD-001 — IAM (human identity; mTLS TLS requirements)
- SEC-STD-003 — Cryptography and TLS (mTLS certificate requirements)
- SEC-GOV-002 — Zero Trust Architecture (identity-centric network model)

## Rationale

**Why prohibit long-lived static credentials between services?** A static API key that never rotates, if compromised, provides indefinite access. Workload identity credentials expire in minutes to hours — a stolen credential has a strictly bounded window of usefulness. Platform-attested credentials also provide stronger assurance of the caller's identity than a shared secret.

**Why per-service identity rather than shared service accounts?** Shared credentials mean a compromise of any service that uses the credential compromises all services that it can reach. Per-service identity enables blast-radius containment: a compromised service identity can only reach what that specific service is permitted to access.

**Why mTLS over API key header for internal services?** API key headers can be captured from logs, forwarded unintentionally, or exfiltrated by a compromised service. mTLS authenticates at the transport layer using the workload identity certificate — it cannot be trivially exfiltrated and is bound to the TLS connection. The platform-issued certificate also provides stronger attestation than a manually distributed API key.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-05-05 | Initial definition |
