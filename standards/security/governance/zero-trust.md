---
identifier: "SEC-GOV-002"
name: "Zero Trust Architecture"
version: "1.0.0"
status: "RECOMMENDED"

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
  other: ["NIST-SP-800-207", "CISA-ZTA-Maturity-Model-v2.0", "DoD-ZTA-Strategy-2022", "NCSC-ZTA-Principles"]

taxonomy:
  capability: "security-architecture"
  subCapability: "zero-trust"
  layer: "governance"

enforcement:
  method: "advisory"
  reviewChecklist:
    - "New services designed assuming no implicit network trust"
    - "Authentication required on every request, not only at network perimeter"
    - "Per-request authorisation enforced at application layer"
    - "Workload identity in use per SEC-STD-008 (no perimeter-only trust)"
    - "ZTA maturity level self-assessed and documented"

dependsOn: ["SEC-GOV-000", "SEC-STD-001", "SEC-STD-008"]
supersedes: ""
---

# Zero Trust Architecture

## Purpose

This governance document provides **RECOMMENDED** guidance for adopting Zero Trust Architecture (ZTA) principles. ZTA is the correct long-term security posture for cloud-native and distributed systems, but implementation maturity varies significantly across organisations. This document is advisory rather than prescriptive to avoid mandating infrastructure changes that would create compliance theatre for teams at early ZTA maturity.

For new services and greenfield infrastructure, the principles in this document are **RECOMMENDED** at design time. The five mandatory ZTA principles for *new services* are identified explicitly in R-1.

> *Normative language (**MUST**, **MUST NOT**, **SHOULD**, **MAY**) follows RFC 2119 semantics.*

## ZTA Design Principles

Zero Trust operates on the principle: *never trust implicitly; always verify explicitly; apply least privilege at every layer*. This contrasts with perimeter-based security, which trusts traffic that originates from inside the network boundary.

The five core ZTA principles:

1. **Verify every access request** — authenticate and authorise every request, regardless of network origin
2. **Least privilege access** — grant minimum necessary permissions; apply time and scope boundaries to access grants
3. **Assume breach** — design as if the network is already compromised; lateral movement must be detectable and contained
4. **Verify workload identity** — use cryptographic workload identity (SEC-STD-008) rather than implicit network-based trust
5. **Continuous telemetry** — collect and analyse security telemetry on every request to detect anomalous access patterns (SEC-STD-004)

## Rules

### R-1: Mandatory ZTA Principles for New Services

The following principles are **MANDATORY** for all newly designed services (not retroactive for existing services):

- Services **MUST NOT** rely on network location (IP address, VPC membership, subnet) as the sole basis for authorising access; application-layer authentication per SEC-STD-001 **MUST** be applied
- Every internal service-to-service call **MUST** carry a cryptographic workload identity credential per SEC-STD-008; implicit trust from shared network namespace is not sufficient
- Service permissions **MUST** follow least privilege per SEC-STD-008 R-5; blanket "internal network" permissions are not acceptable
- Security telemetry per SEC-STD-004 **MUST** be enabled on all new services from day one of production deployment
- Data classification per SEC-GDL-001 **MUST** be applied to all data the service processes; the classification tier **MUST** inform access controls

Existing services are encouraged to adopt these principles as part of their next significant refactor or infrastructure migration. A retroactive hard mandate would disproportionately penalise organisations with large legacy footprints without meaningfully improving security for new systems.

### R-2: ZTA Maturity Assessment

Organisations **SHOULD** self-assess their ZTA maturity annually using a recognised maturity model. The CISA ZTA Maturity Model v2.0 (five pillars: Identity, Devices, Networks, Applications and Workloads, Data) is the **RECOMMENDED** framework.

The five maturity levels (Traditional → Initial → Advanced → Optimal) for each pillar:

| Pillar | Traditional | Initial | Advanced | Optimal |
|--------|-------------|---------|----------|---------|
| Identity | Usernames/passwords, perimeter auth | MFA, SSO in place | Per-request auth, risk-adaptive MFA | Continuous validation, passwordless |
| Devices | Managed devices with implicit trust | Device compliance checks at login | Continuous device health posture | Real-time posture-based access |
| Networks | Flat internal network, VPN for remote | Micro-segmentation in progress | Per-session network access | Software-defined perimeter, encrypted traffic everywhere |
| Applications | Implicit trust for internal apps | App-level auth on all internal services | Per-request authorisation, ABAC | Continuous authorisation with anomaly detection |
| Data | No classification | Classification defined | Classification-driven access | Automated enforcement of classification at every access |

Maturity assessment results **SHOULD** be documented and used to prioritise ZTA adoption investments.

### R-3: Cloud-Native ZTA Implementations

The following cloud-native capabilities are first-class implementations of ZTA principles; organisations **SHOULD** prefer them over building equivalent functionality from scratch:

| ZTA principle | AWS | GCP | Azure |
|-------------|-----|-----|-------|
| Workload identity | IAM Roles + IRSA | Workload Identity Federation | Managed Identity + Workload Identity |
| Zero-trust network access | AWS Verified Access | BeyondCorp Enterprise | Azure AD Application Proxy + Conditional Access |
| Service mesh / mTLS | AWS App Mesh, AWS VPC Lattice | Traffic Director, Anthos Service Mesh | Azure Service Fabric |
| Per-request authorisation | AWS IAM Conditions | IAM Conditions + VPC Service Controls | Azure AD Conditional Access Policies |
| Continuous telemetry | CloudTrail, VPC Flow Logs, GuardDuty | Cloud Audit Logs, VPC Flow Logs, Security Command Center | Azure Monitor, Defender for Cloud |

A SPIFFE/SPIRE deployment satisfies the workload identity pillar in a cloud-neutral way and is the **RECOMMENDED** approach for multi-cloud or on-premises deployments.

### R-4: Micro-segmentation

Organisations **SHOULD** implement micro-segmentation to limit lateral movement:

- Network policies (Kubernetes NetworkPolicy, AWS Security Groups, GCP VPC Firewall Rules) **SHOULD** follow default-deny-all with explicit allow rules per service pair
- East-west traffic (service to service within the same environment) **SHOULD** be subject to the same authentication and authorisation requirements as north-south traffic (external to internal)
- Blast radius containment: if a service is compromised, network segmentation **SHOULD** limit the attacker's reachable set to services that the compromised service legitimately communicates with

Network segmentation alone is **NOT** sufficient for ZTA compliance; it is a defence-in-depth measure that complements application-layer identity and authorisation.

### R-5: ZTA for Remote Access

Organisations that use VPN for remote access **SHOULD** evaluate replacement with a Zero Trust Network Access (ZTNA) solution:

- ZTNA grants access to specific applications based on verified user identity, device posture, and context — not to the entire internal network
- Cloud-native ZTNA options: AWS Verified Access, GCP BeyondCorp Enterprise, Azure AD Application Proxy; open-source options include Tailscale, Teleport, Cloudflare Access
- If VPN is retained: split-tunnel VPN (routing only corporate traffic through the VPN) is **RECOMMENDED** over full-tunnel; this reduces the blast radius if a user device is compromised
- VPN credentials **MUST** comply with SEC-STD-001 MFA requirements

## Examples

### New service design — applying R-1 mandatory principles

```
Service: Internal reporting API (reads Confidential financial data, no external exposure)

R-1 checklist for new services:
  [x] No implicit network trust: every request carries a JWT from the auth server (SEC-STD-001)
  [x] Workload identity: uses IRSA with a dedicated IAM role scoped to S3 read on the reports bucket
  [x] Least privilege: IAM policy allows s3:GetObject on arn:aws:s3:::reports-bucket/*  only
  [x] Security telemetry: CloudTrail + SEC-STD-004 security logging enabled from day one
  [x] Data classification: all data classified as Confidential per SEC-GDL-001; access logged

Result: Complies with R-1. ZTA maturity assessment: Identity pillar = Advanced
```

### ZTA maturity self-assessment excerpt

```
Organisation: Acme Corp (200 engineers, cloud-native, AWS primary)

Identity pillar:
  Current: MFA deployed for all engineers; SSO on all internal apps
  CISA level: Initial
  Gap to Advanced: No per-request risk-adaptive MFA; no continuous session validation
  Priority action: Evaluate AWS Verified Access for admin tooling (2026 H2)

Networks pillar:
  Current: Security Groups per service; no micro-segmentation beyond VPC subnets
  CISA level: Traditional
  Gap to Initial: Begin Kubernetes NetworkPolicy rollout for new services
  Priority action: Add default-deny NetworkPolicy to all new services (immediate — R-1 compatible)
```

## References

- [NIST SP 800-207 — Zero Trust Architecture](https://doi.org/10.6028/NIST.SP.800-207)
- [CISA Zero Trust Maturity Model v2.0](https://www.cisa.gov/zero-trust-maturity-model)
- [DoD Zero Trust Strategy (2022)](https://dodcio.defense.gov/Portals/0/Documents/Library/DoD-ZTStrategy.pdf)
- [NCSC Zero Trust Architecture Design Principles](https://www.ncsc.gov.uk/blog-post/zero-trust-architecture-design-principles)
- [SPIFFE — Secure Production Identity Framework](https://spiffe.io/)
- SEC-STD-001 — IAM (authentication every request)
- SEC-STD-008 — Workload Identity (cryptographic workload identity)
- SEC-STD-004 — Security Logging (continuous telemetry)
- SEC-GDL-001 — Data Classification (data pillar classification input)

## Rationale

**Why RECOMMENDED rather than MANDATORY?** ZTA adoption is a journey measured in years for most organisations. A blanket MANDATORY requirement would make compliance achievable only by greenfield organisations, leaving legacy systems technically non-compliant while taking no meaningful action. The MANDATORY baseline for new services (R-1) ensures ZTA principles become the default for new work while allowing existing systems to migrate on a risk-prioritised basis.

**Why five mandatory principles for new services despite the advisory status?** These five principles (no implicit network trust, workload identity, least privilege, telemetry, data classification) are the minimum without which ZTA is purely cosmetic. They are achievable at design time for new services with no additional infrastructure cost if cloud-native identity (R-3) is used. The hard mandate is proportionate to the effort required.

**Why cloud-native implementations are first-class?** AWS IAM Roles, GCP Workload Identity Federation, and Azure Managed Identity deliver ZTA-grade workload identity with zero additional infrastructure. Organisations that have already adopted these are practicing ZTA at the identity pillar without necessarily calling it that. The standard should meet practitioners where they are, not demand a new abstraction layer on top of native capabilities.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-05-05 | Initial definition |
