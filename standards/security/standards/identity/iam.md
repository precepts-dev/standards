---
identifier: "SEC-STD-001"
name: "Identity and Access Management"
version: "1.0.0"
status: "MANDATORY"

domain: "SECURITY"
documentType: "standard"
category: "identity"
appliesTo: ["api", "web", "mobile", "cli", "events"]

lastUpdated: "2026-05-04"
owner: "Security Architecture Board"

standardsCompliance:
  iso: ["ISO/IEC-27001:2022"]
  rfc: ["RFC-6749", "RFC-7519", "RFC-7636", "RFC-9068", "RFC-8693"]
  w3c: []
  other: ["NIST-SP-800-63B", "OWASP-ASVS-5.0-V2", "OWASP-ASVS-5.0-V4", "OAuth-2.1-draft"]

taxonomy:
  capability: "identity-access-management"
  subCapability: "authentication-authorization"
  layer: "security"

enforcement:
  method: "hybrid"
  validationRules:
    jwtAlgorithm: "RS256 or ES256 required; HS256 prohibited for multi-party tokens; alg:none prohibited"
    tokenExpiry: "access tokens MUST NOT exceed 1 hour; refresh tokens MUST NOT exceed 30 days without rotation"
  rejectionCriteria:
    - "JWT alg:none or HS256 for shared-secret tokens in multi-service environments"
    - "Access tokens with expiry exceeding 1 hour"
    - "No de-provisioning process defined"
    - "Implicit OAuth grant flow in use"
    - "ROPC (Resource Owner Password Credentials) grant in use"
  reviewChecklist:
    - "Authentication required on all non-public endpoints"
    - "Authorization check on every request, not just at login"
    - "Token expiry and rotation implemented"
    - "Phishing-resistant MFA available for privileged users"
    - "Rate limiting configured per client identity"
    - "De-provisioning process defined and tested"

dependsOn: ["SEC-GOV-000", "SEC-GDL-001"]
supersedes: ""
---

# Identity and Access Management

## Purpose

This standard defines **MANDATORY** requirements for authentication, authorization, session management, and de-provisioning across all systems. It covers human user identity (authentication flows, MFA, session tokens) and machine-to-machine authorization using OAuth 2.x / JWT patterns.

Workload identity (service-to-service authentication without human credentials) is governed by SEC-STD-008. API-level authorization checks (per-resource, BOLA prevention) are also governed by INTG-STD-008 R-10; this standard covers the identity layer those checks depend on.

> *Normative language (**MUST**, **MUST NOT**, **SHOULD**, **MAY**) follows RFC 2119 semantics.*

## Rules

### R-1: Authentication Requirements

Every endpoint that accesses non-public data or performs state-changing operations **MUST** require authentication. Anonymous access **MUST** be an explicit decision documented in the service's threat model.

Authentication implementations **MUST**:

- Use a centralized Identity Provider (IdP) or OAuth 2.x Authorization Server; local credential stores in application code **MUST NOT** be used for human authentication
- Support phishing-resistant multi-factor authentication (MFA) for all accounts with access to Confidential or Restricted data per SEC-GDL-001; WebAuthn/FIDO2 passkeys **SHOULD** be offered as the primary MFA method (see SEC-BP-001)
- Implement account lockout or exponential backoff after 5 consecutive failed authentication attempts within a 10-minute window; lockout duration **MUST** be at least 15 minutes
- Never reveal whether a failure is due to an unknown username or incorrect password — return a generic authentication failure message for both

Password-based authentication, when required, **MUST** adhere to NIST SP 800-63B:

- Minimum length: 8 characters (12 **RECOMMENDED**)
- Maximum length: **MUST NOT** be less than 64 characters
- **MUST NOT** enforce periodic rotation without evidence of compromise; forced rotation reduces password strength
- **MUST** check new passwords against a list of commonly used or previously breached passwords
- **MUST NOT** require special character composition rules that reduce entropy

### R-2: Token Standards

Systems issuing or consuming bearer tokens **MUST** comply with:

- **Algorithm**: JWT tokens **MUST** use RS256 or ES256. HS256 **MUST NOT** be used in any environment where the token is consumed by a service that does not hold the signing key. `alg:none` **MUST** be rejected unconditionally.
- **Mandatory claims**: every JWT **MUST** include `iss` (issuer), `sub` (subject), `aud` (intended audience), `exp` (expiry), `iat` (issued at), and `jti` (unique token identifier).
- **Claim validation**: consumers **MUST** validate all five claims (`iss`, `aud`, `exp`, `iat`, `nbf` if present) on every token processing operation; validation **MUST NOT** be skipped in any code path.
- **Expiry**: access tokens **MUST NOT** have an expiry exceeding 1 hour. Refresh tokens **MUST NOT** exceed 30 days without rotation; refresh token rotation **MUST** be implemented (each use issues a new refresh token and invalidates the old one).
- **Storage**: tokens **MUST NOT** be stored in `localStorage` or `sessionStorage` in browser contexts; `HttpOnly`, `Secure`, `SameSite=Strict` cookies **MUST** be used for web applications.
- **Transmission**: tokens **MUST** only be transmitted over TLS-encrypted channels per SEC-STD-003.

### R-3: OAuth Grant Flows

Systems implementing OAuth 2.x authorization **MUST**:

- Use Authorization Code flow with PKCE (RFC 7636) for all user-facing applications; the `code_verifier` **MUST** use at least 43 characters of cryptographically random data
- **MUST NOT** implement Implicit grant flow (removed in OAuth 2.1 due to token leakage in redirect URIs)
- **MUST NOT** implement Resource Owner Password Credentials (ROPC) grant (removed in OAuth 2.1 due to direct credential exposure)
- Use Client Credentials flow only for machine-to-machine scenarios with no human in the loop
- Validate redirect URIs against an exact-match allowlist; wildcard redirect URIs **MUST NOT** be accepted
- Issue short-lived authorization codes (maximum 10 minutes); codes **MUST** be single-use

### R-4: Authorization Model

Every system **MUST** implement explicit authorization on every request:

- Authorization checks **MUST** occur on the server side; client-side permission hiding is not authorization
- The authorization model **MUST** be one of: Role-Based Access Control (RBAC), Attribute-Based Access Control (ABAC), or a combination; the model **MUST** be documented in the service's architecture documentation
- Permissions **MUST** follow the principle of least privilege; default access **MUST** be deny-all
- For multi-tenant systems: tenant isolation **MUST** be enforced at the authorization layer; cross-tenant data access **MUST** be impossible without explicit cross-tenant permission grants
- Authorization decisions **MUST** be logged per SEC-STD-004

Privilege escalation paths (e.g., admin impersonation, assume-role) **MUST**:

- Require explicit re-authentication or step-up authentication
- Be logged with the original identity, target identity, and justification
- Be time-limited (not permanent role assumption)

### R-5: Rate Limiting by Identity

Systems **MUST** implement per-identity rate limiting to prevent credential stuffing, brute force, and API abuse:

- Authentication endpoints **MUST** be rate-limited per source IP and per account identifier
- API endpoints **MUST** be rate-limited per authenticated client identity (OAuth `client_id` or equivalent)
- Rate limit responses **MUST** return HTTP 429 with a `Retry-After` header
- Rate limiting state **MUST** persist across service instances (not in-process memory only)

Cross-reference: INTG-STD-008 — API Resource Design for endpoint-level rate limiting patterns. Infrastructure-level rate limiting (API gateway) complements but does not replace identity-scoped limits.

### R-6: Session Management

For applications maintaining server-side sessions:

- Session identifiers **MUST** be cryptographically random with at least 128 bits of entropy
- Sessions **MUST** be invalidated on logout; the server **MUST** track active sessions and reject invalidated session identifiers
- Session fixation: a new session identifier **MUST** be issued upon successful authentication, even if a pre-auth session existed
- Absolute session timeout: sessions **MUST** expire regardless of activity after a maximum of 12 hours for standard users and 8 hours for users with access to Restricted-tier data
- Idle session timeout: sessions **MUST** be invalidated after 30 minutes of inactivity for web applications

### R-7: De-provisioning

Every system with persistent access grants **MUST** define and implement a de-provisioning process:

- De-provisioning **MUST** occur within 24 hours of an account being terminated, suspended, or having a role removed
- Systems **MUST** maintain an audit trail of access grants and revocations per SEC-STD-004
- Service accounts and API keys **MUST** be reviewed quarterly; unused credentials **MUST** be revoked
- Automated de-provisioning via IdP lifecycle events (SCIM provisioning, HR system integration) **SHOULD** be implemented for systems with more than 50 users

## Examples

### JWT claim validation

```
// Every consumer MUST validate all claims — example pseudocode
token = parse_jwt(bearer_token)
assert token.alg in ["RS256", "ES256"]          // R-2: algorithm check
assert token.iss == expected_issuer              // R-2: issuer
assert expected_audience in token.aud           // R-2: audience
assert token.exp > current_unix_time()          // R-2: not expired
assert token.iat <= current_unix_time()         // R-2: not future-issued
assert not token_blacklisted(token.jti)         // R-6: revocation check
```

### OAuth PKCE flow

```
// Authorization Code + PKCE — pseudocode
code_verifier = base64url(random_bytes(32))     // 43 chars minimum
code_challenge = base64url(sha256(code_verifier))
redirect_to_auth_server(
  response_type="code",
  code_challenge=code_challenge,
  code_challenge_method="S256",
  redirect_uri="https://app.example.com/callback"  // exact match only
)
// On callback: exchange code + code_verifier for tokens
```

## Enforcement Rules

The following **MUST** be rejected at design review or CI gate:

1. JWT tokens with `alg:none` or `alg:HS256` in multi-service environments
2. Access tokens with `exp` exceeding 3600 seconds (1 hour) from issuance
3. Implicit OAuth grant flow usage
4. ROPC grant flow usage
5. Wildcard redirect URIs in OAuth client registration
6. Token storage in `localStorage` or `sessionStorage`
7. Missing claim validation (especially missing `aud` or `exp` check)
8. De-provisioning not addressed in service documentation

## References

- [RFC 6749 — OAuth 2.0 Authorization Framework](https://www.rfc-editor.org/rfc/rfc6749)
- [RFC 7519 — JSON Web Token (JWT)](https://www.rfc-editor.org/rfc/rfc7519)
- [RFC 7636 — PKCE for OAuth 2.0](https://www.rfc-editor.org/rfc/rfc7636)
- [RFC 9068 — JWT Profile for OAuth 2.0 Access Tokens](https://www.rfc-editor.org/rfc/rfc9068)
- [OAuth 2.1 Draft (draft-ietf-oauth-v2-1)](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/)
- [NIST SP 800-63B — Digital Identity Guidelines: Authentication](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [OWASP ASVS 5.0 — V2 Authentication, V3 Sessions, V4 Access Control](https://owasp.org/www-project-application-security-verification-standard/)
- SEC-STD-008 — Workload Identity
- INTG-STD-008 R-10 — API Resource Design, Security Rules

## Rationale

**Why RS256/ES256 over HS256?** In multi-service environments, HS256 requires sharing the signing secret with every consumer service. Any compromised consumer can forge tokens for any other service. Asymmetric signing (RS256/ES256) distributes only the public key — only the issuer can mint tokens.

**Why no periodic password rotation?** NIST SP 800-63B (2017, reaffirmed 2020) explicitly recommends against forced rotation. Rotation leads to predictable incremental passwords (Password1 → Password2) that reduce overall entropy. Rotation on evidence of compromise remains mandatory.

**Why 1-hour access token expiry?** Stolen access tokens are valid until they expire. 1 hour caps the window of abuse; 24-hour tokens give attackers a full business day of access from a single token theft.

**Why prohibit Implicit and ROPC flows?** Implicit flow embeds tokens in redirect URIs (browser history, server logs, referrer headers). ROPC requires the client application to handle the user's plaintext password — violating the principle that only the IdP should see credentials. Both were removed from OAuth 2.1 for these reasons.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-05-04 | Initial definition |
