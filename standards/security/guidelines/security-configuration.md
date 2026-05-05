---
identifier: "SEC-GDL-002"
name: "Security Configuration Hardening"
version: "1.0.0"
status: "RECOMMENDED"

domain: "SECURITY"
documentType: "guideline"
category: "configuration"
appliesTo: ["api", "web", "mobile", "events", "grpc", "batch", "a2a", "mcp"]

lastUpdated: "2026-05-05"
owner: "Security Architecture Board"

standardsCompliance:
  iso: ["ISO/IEC-27001:2022"]
  rfc: ["RFC-6454", "RFC-7034", "RFC-8288"]
  w3c: ["CSP-Level-3", "Fetch-Metadata"]
  other: ["CIS-Benchmarks", "OWASP-ASVS-5.0-V14", "OWASP-Secure-Headers-Project"]

taxonomy:
  capability: "security-configuration"
  subCapability: "hardening"
  layer: "security"

enforcement:
  method: "advisory"
  reviewChecklist:
    - "HTTP security headers present and correctly configured"
    - "CORS policy uses explicit allowlist, not wildcard"
    - "Content-Security-Policy deployed (report-only or enforced)"
    - "Error responses do not include stack traces or internal paths"
    - "Container workloads run as non-root UID"
    - "TLS configuration meets SEC-STD-003 minimum requirements"

dependsOn: ["SEC-GOV-000", "SEC-STD-003"]
supersedes: ""
---

# Security Configuration Hardening

## Purpose

This guideline defines **RECOMMENDED** configuration hardening practices for HTTP services, containers, and infrastructure. Rules labelled **MUST** within this document have been elevated because they address high-frequency vulnerabilities with low implementation cost and are verifiable by automated tooling. This guideline is advisory except where individual rules explicitly state otherwise.

> *Normative language (**MUST**, **MUST NOT**, **SHOULD**, **MAY**) follows RFC 2119 semantics.*

## Rules

### R-1: HTTP Security Headers

All HTTP services **MUST** set the following response headers on every non-error response:

| Header | Required value | Purpose |
|--------|---------------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | HSTS — force HTTPS for 1 year; add `preload` for public domains |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` | Clickjacking prevention (use CSP `frame-ancestors` for finer control) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Prevent leaking full URL in cross-origin referrer |
| `Permissions-Policy` | At minimum `geolocation=(), microphone=(), camera=()` | Opt-out of browser feature access |

The following headers **SHOULD** be set:

| Header | Recommended value | Notes |
|--------|------------------|-------|
| `Content-Security-Policy` | See R-3 | Strongest XSS mitigation available |
| `Cache-Control` | `no-store` for responses containing personal or session data | Prevent caching of sensitive responses |
| `X-DNS-Prefetch-Control` | `off` | Prevent unintended DNS prefetching |

The `Server` and `X-Powered-By` response headers **SHOULD NOT** be present; remove or suppress them to avoid revealing technology stack information to attackers.

### R-2: CORS Configuration

Cross-Origin Resource Sharing (CORS) **MUST** be configured using an explicit allowlist of permitted origins:

- The `Access-Control-Allow-Origin` header **MUST NOT** be set to `*` for any endpoint that requires authentication or returns sensitive data
- Permitted origins **MUST** be validated against a compile-time or configuration-time allowlist; do not construct the `Access-Control-Allow-Origin` value by echoing the request `Origin` header without validation
- `Access-Control-Allow-Credentials: true` **MUST NOT** be combined with `Access-Control-Allow-Origin: *`
- The CORS preflight response (`OPTIONS`) **MUST** include `Access-Control-Allow-Methods` and `Access-Control-Allow-Headers` scoped to only the methods and headers the endpoint actually uses
- Public read-only endpoints (health checks, public API documentation) **MAY** use `Access-Control-Allow-Origin: *` if they return no user-specific or sensitive data

```
// Correct — allowlist validation
allowed_origins = ["https://app.example.com", "https://admin.example.com"]
if request.origin in allowed_origins:
    response.header("Access-Control-Allow-Origin", request.origin)
    response.header("Vary", "Origin")

// MUST NOT — reflect without validation
response.header("Access-Control-Allow-Origin", request.origin)  // open CORS
```

### R-3: Content Security Policy (CSP)

All web-facing services **MUST** deploy a Content Security Policy. Deployment **MUST** follow a staged rollout:

1. **Report-only phase (minimum 14 days):** deploy `Content-Security-Policy-Report-Only` with a `report-uri` or `report-to` endpoint; monitor and resolve all violations before proceeding
2. **Enforce phase:** switch to `Content-Security-Policy`; violations are now blocked by the browser

Enforcement **MUST** be activated before a service handles Restricted-tier data per SEC-GDL-001.

CSP directives **SHOULD** include at minimum:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'nonce-{random}';
  img-src 'self' data: https:;
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

`unsafe-inline` and `unsafe-eval` **SHOULD NOT** appear in the enforced policy. If a third-party script requires `unsafe-inline`, use a CSP nonce instead. If `unsafe-eval` cannot be avoided (e.g., legacy templating library), document the exception in the service threat model.

### R-4: Error Response Hardening

Production error responses **MUST NOT** reveal internal implementation details:

- Stack traces **MUST NOT** be included in HTTP responses returned to clients in production environments; stack traces **MUST** be logged server-side and a correlation ID returned to the client instead
- Internal file paths, class names, database query text, or technology-specific error codes **MUST NOT** appear in client-facing error messages
- Error messages **SHOULD** be generic and consistent; do not reveal whether a user account exists in authentication failure messages (per SEC-STD-001 R-1)
- Unhandled exceptions **MUST NOT** result in a response that exposes default framework error pages (e.g., Django debug page, Spring Whitelabel Error Page) in production

```
// Correct error response
{
  "error": "An unexpected error occurred.",
  "correlation_id": "req-a1b2c3d4"
}

// MUST NOT — exposes internals
{
  "error": "NullPointerException at PaymentService.java:142 in method processPayment()",
  "stacktrace": "..."
}
```

### R-5: Container and Workload Hardening

Container workloads **MUST** follow the principle of least privilege:

- Containers **MUST NOT** run as `root` (UID 0); set an explicit non-root UID in the Dockerfile (`USER 1001` or equivalent); runtime enforcement via `runAsNonRoot: true` in Kubernetes securityContext is **REQUIRED** for Kubernetes-hosted workloads
- Container filesystems **SHOULD** be set to read-only where the application does not require write access to the local filesystem (`readOnlyRootFilesystem: true` in Kubernetes securityContext)
- Linux capabilities **MUST** be minimised: drop all capabilities (`drop: [ALL]`) and add back only those explicitly required; most application workloads require no additional capabilities
- Debug ports (remote debugger ports, profiling endpoints) **MUST NOT** be exposed in production container configurations; remove debug flags from production build arguments
- `privileged: true` **MUST NOT** be used in production workload specifications except for explicit infrastructure components (DaemonSets, node-level agents) with documented justification
- Container base images **SHOULD** use distroless or minimal base images (e.g., `gcr.io/distroless`, Alpine) to minimise the attack surface; image size is a proxy for attack surface
- All containers **MUST** have defined CPU and memory resource limits; unlimited resources allow a compromised container to exhaust node capacity

Kubernetes-specific hardening **SHOULD** include:

- `seccompProfile: RuntimeDefault` or a custom seccomp profile
- `allowPrivilegeEscalation: false`
- Network policies restricting ingress and egress to known required routes

### R-6: TLS and Network Configuration

TLS configuration **MUST** meet the requirements in SEC-STD-003. Additional hardening:

- Services **SHOULD NOT** listen on unencrypted ports in production; if plaintext ports are required for health checks or internal mesh traffic, they **MUST** be bound to localhost or internal-only network interfaces
- Internal service-to-service communication **SHOULD** use mutual TLS (mTLS) per SEC-STD-003 R-5 and SEC-STD-008; plain HTTP between internal services in the same cluster is acceptable only when mTLS is enforced at the service mesh layer
- Unnecessary listening ports **MUST** be disabled; the running process **MUST NOT** bind to ports not required for its function
- SSH access to production systems **SHOULD** be disabled; management access **SHOULD** be via a privileged access management (PAM) solution or bastion host with full audit logging

### R-7: Secrets and Sensitive Data in Configuration

Configuration files and environment variables **MUST NOT** contain plaintext secrets in committed code per SEC-STD-002. Additional configuration hygiene:

- Environment variable names containing `SECRET`, `PASSWORD`, `KEY`, `TOKEN`, or `CREDENTIAL` **SHOULD** be treated as secrets and subject to SEC-STD-002 controls regardless of their actual content
- Configuration files checked into version control **MUST NOT** contain production credentials, API keys, or connection strings with passwords; use secret injection at deploy time
- Application configuration **SHOULD** separate security-sensitive values (auth URLs, allowed origins, permitted file types) from application logic configuration; this enables auditing security config independently

## Examples

### Kubernetes securityContext (MUST requirements)

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1001
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
  seccompProfile:
    type: RuntimeDefault
```

### CSP nonce for inline scripts

```html
<!-- Server generates a cryptographically random nonce per request -->
<meta http-equiv="Content-Security-Policy"
      content="script-src 'nonce-abc123xyz'; default-src 'self'">
<script nonce="abc123xyz">
  // Inline script is allowed via nonce — no unsafe-inline required
</script>
```

## References

- [OWASP ASVS 5.0 — V14 Configuration](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Web Docs — Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [CIS Kubernetes Benchmark](https://www.cisecurity.org/benchmark/kubernetes)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [RFC 6454 — The Web Origin Concept](https://www.rfc-editor.org/rfc/rfc6454)
- SEC-STD-003 — Cryptography and TLS (TLS configuration requirements)
- SEC-STD-002 — Secrets Management (configuration secrets)
- SEC-GDL-001 — Data Classification (CSP enforcement trigger for Restricted-tier data)

## Rationale

**Why CORS allowlist over wildcard?** Wildcard CORS (`*`) combined with credentials allows any website to make authenticated requests to your API on behalf of a visiting user, including malicious websites. An allowlist restricts cross-origin access to known, trusted origins. This is particularly critical for APIs that read or write user data.

**Why report-only CSP before enforcement?** A CSP deployed directly in enforcement mode will silently break legitimate functionality if any resource loads violate the policy. Report-only mode reveals violations without impact, allowing teams to fix policy gaps before enforcement. Skipping this phase produces either a broken site or a policy so permissive (with `unsafe-inline`) it provides no protection.

**Why non-root UID for containers?** If an attacker achieves code execution within the container, running as root means they have root-level access to everything the container can reach — other processes, mounted volumes, network interfaces. A non-root UID limits the blast radius to what that UID can access.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-05-05 | Initial definition |
