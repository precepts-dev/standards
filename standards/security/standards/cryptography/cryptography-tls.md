---
identifier: "SEC-STD-003"
name: "Cryptography and Transport Security"
version: "1.0.0"
status: "MANDATORY"

domain: "SECURITY"
documentType: "standard"
category: "cryptography"
appliesTo: ["api", "web", "mobile", "events", "grpc", "a2a", "mcp"]

lastUpdated: "2026-05-04"
owner: "Security Architecture Board"

standardsCompliance:
  iso: ["ISO/IEC-27001:2022"]
  rfc: ["RFC-8446", "RFC-9001", "RFC-5280", "RFC-8555"]
  w3c: ["Web-Cryptography-API"]
  other: ["NIST-SP-800-131A-Rev3", "NIST-FIPS-140-3", "OWASP-ASVS-5.0-V6", "OWASP-ASVS-5.0-V9"]

taxonomy:
  capability: "cryptography"
  subCapability: "transport-security"
  layer: "security"

enforcement:
  method: "hybrid"
  validationRules:
    minimumTlsVersion: "TLS 1.2 minimum; TLS 1.3 preferred"
    prohibitedCiphers: "RC4, DES, 3DES, MD5, SHA-1 for signatures, export-grade ciphers"
    certificateMinimumValidity: "90 days maximum for externally issued; automate renewal"
  rejectionCriteria:
    - "TLS 1.0 or TLS 1.1 enabled on any endpoint"
    - "Self-signed certificates on production external endpoints"
    - "MD5 or SHA-1 in certificate signature algorithms"
    - "RSA keys below 2048 bits"
    - "Symmetric keys below 128 bits"
    - "HTTP (unencrypted) accepted on production endpoints"
  reviewChecklist:
    - "TLS 1.2 minimum enforced; TLS 1.3 preferred"
    - "Certificate renewal automated"
    - "HSTS header configured for web endpoints"
    - "Cipher suite restricted to approved list"
    - "Cryptographic algorithm inventory maintained (CBOM as SHOULD)"

dependsOn: ["SEC-GOV-000"]
supersedes: ""
---

# Cryptography and Transport Security

## Purpose

This standard defines **MANDATORY** requirements for cryptographic algorithm selection, key lengths, transport security (TLS), and certificate management across all systems. It ensures that systems use cryptographically sound primitives resistant to current attack capabilities, and establishes a migration path toward post-quantum readiness (see SEC-BP-002).

> *Normative language (**MUST**, **MUST NOT**, **SHOULD**, **MAY**) follows RFC 2119 semantics.*

## Rules

### R-1: Transport Security

All data transmitted over a network **MUST** be encrypted in transit:

- All production endpoints **MUST** accept only TLS 1.2 or TLS 1.3; TLS 1.0, TLS 1.1, and SSLv3 **MUST** be disabled
- TLS 1.3 **SHOULD** be the preferred version; TLS 1.2 is the minimum floor
- HTTP (port 80, unencrypted) **MUST NOT** be served on production endpoints; HTTP requests **MUST** be redirected to HTTPS (301 redirect) or rejected
- Mutual TLS (mTLS) **MUST** be used for service-to-service communication in environments where network-level isolation cannot be guaranteed; see SEC-STD-008 for workload identity integration
- QUIC/HTTP3 connections (RFC 9001) **MAY** be used; when used they **MUST** comply with TLS 1.3 requirements

For web-facing services, the following HTTP security headers **MUST** be set:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains` — instructs browsers to require HTTPS for at least one year
- `Strict-Transport-Security` **MUST** be preloaded via the HSTS preload list for all apex domains and widely-used subdomains

### R-2: Approved Cipher Suites

Services configuring TLS **MUST** restrict cipher suites to AEAD (Authenticated Encryption with Associated Data) constructions:

**TLS 1.3 cipher suites (MUST support):**
- `TLS_AES_256_GCM_SHA384`
- `TLS_AES_128_GCM_SHA256`
- `TLS_CHACHA20_POLY1305_SHA256`

**TLS 1.2 cipher suites (SHOULD support, MAY restrict further):**
- `TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384`
- `TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256`
- `TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384`
- `TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256`

The following cipher suites **MUST NOT** be enabled:

- Any cipher using RC4, DES, 3DES, or export-grade key lengths
- Any cipher suite without forward secrecy (non-ECDHE/DHE key exchange)
- Any cipher using NULL encryption
- `TLS_RSA_*` cipher suites (static RSA key exchange, no forward secrecy)

### R-3: Certificate Management

**Certificate requirements:**

- External-facing services **MUST** use certificates issued by a publicly trusted Certificate Authority (CA) recognized in the Mozilla CA Certificate Program
- Certificate signature algorithms **MUST** use SHA-256 or stronger; MD5 and SHA-1 **MUST NOT** be used
- RSA certificates **MUST** use a minimum key size of 2048 bits; 4096 bits **RECOMMENDED** for CA certificates
- ECDSA certificates **MUST** use a minimum curve of P-256; P-384 **RECOMMENDED** for new deployments

**Certificate lifecycle:**

- Certificate validity periods **MUST NOT** exceed 398 days for publicly trusted certificates (browser policy enforced as of 2020)
- Certificate renewal **MUST** be automated (ACME protocol / Let's Encrypt / cert-manager or equivalent) for all certificates with validity ≤ 90 days
- Certificate expiry monitoring **MUST** alert at 30 days before expiry and again at 14 days
- Expired certificates **MUST NOT** be present on production endpoints at any time

**Certificate pinning** for mobile applications **MAY** be implemented but **MUST** include a backup pin and a pin rotation mechanism; hard pins without rotation **MUST NOT** be shipped to production.

### R-4: Symmetric Cryptography

For data encryption at rest and other symmetric operations:

- **Algorithm**: AES-GCM (Galois/Counter Mode) **MUST** be used for authenticated encryption; AES-CBC **MUST NOT** be used without separate HMAC authentication
- **Key size**: 256-bit AES keys **MUST** be used for new implementations; 128-bit **MAY** be used in constrained environments with documented justification
- **IV/Nonce**: initialization vectors **MUST** be generated using a cryptographically secure random number generator (CSPRNG); IVs **MUST NOT** be reused with the same key; counter-mode nonce reuse results in complete confidentiality loss

Prohibited algorithms:

- DES, 3DES, RC4, RC2, Blowfish — all **MUST NOT** be used in new implementations
- ECB mode **MUST NOT** be used for block cipher encryption; it produces identical ciphertext for identical plaintext blocks

### R-5: Asymmetric Cryptography and Hashing

**Asymmetric key sizes (minimum):**

| Algorithm | Minimum Key Size | Recommended |
|---|---|---|
| RSA (signatures, key exchange) | 2048 bits | 4096 bits |
| DSA | 2048 bits | Not recommended for new use |
| ECDSA | P-256 (256 bits) | P-384 |
| ECDH (key agreement) | P-256 | X25519 |
| Ed25519 | 256 bits | Preferred for new signatures |

Per NIST SP 800-131A Rev 3 (draft October 2024): RSA-2048 and equivalent are scheduled for retirement by 2030. Systems with expected lifetimes beyond 2030 **SHOULD** plan migration to post-quantum algorithms per SEC-BP-002.

**Hash functions:**

- SHA-256 **MUST** be the minimum for all new cryptographic uses
- SHA-384 or SHA-512 **SHOULD** be used for signing operations
- MD5 and SHA-1 **MUST NOT** be used for any cryptographic purpose; they **MAY** be used only for non-security checksums (e.g., file deduplication) with explicit documentation of the non-security use

**Password hashing** — when password hashes must be stored:

- **MUST** use memory-hard algorithms: Argon2id (preferred), scrypt, or bcrypt (cost factor ≥ 12)
- PBKDF2 with SHA-256 and ≥ 310,000 iterations **MAY** be used where Argon2id is unavailable
- MD5, SHA-1, SHA-256, and SHA-512 **MUST NOT** be used as direct password hashing functions without a key derivation function (KDF)

### R-6: Cryptographic Key Management

- Cryptographic keys **MUST** be managed per SEC-STD-002 (Secrets Management)
- Encryption keys and the data they protect **MUST NOT** be stored together; key separation is mandatory
- Key derivation **MUST** use HKDF (RFC 5869) or equivalent when deriving multiple keys from a master key
- Random number generation **MUST** use a CSPRNG provided by the operating system or a FIPS 140-2/3 validated module; user-space PRNGs seeded with low-entropy sources **MUST NOT** be used for cryptographic operations
- Hardware Security Modules (HSMs) or cloud KMS services **SHOULD** be used for key operations on Restricted-tier data

### R-7: Cryptographic Bill of Materials (CBOM)

Organizations **SHOULD** maintain a Cryptographic Bill of Materials (CBOM) in CycloneDX format cataloguing all cryptographic algorithms, key types, and key lengths used in each service. The CBOM **MUST** be maintained for systems processing Restricted-tier data. The CBOM is the prerequisite for post-quantum migration planning per SEC-BP-002.

## Examples

### TLS configuration (pseudocode)

```
server {
  listen 443 ssl;

  # R-1: TLS 1.2 minimum, prefer 1.3
  ssl_protocols TLSv1.2 TLSv1.3;

  # R-2: AEAD cipher suites only
  ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:
              ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-GCM-SHA256;
  ssl_prefer_server_ciphers off;  # TLS 1.3 handles this natively

  # R-1: HSTS header
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

### Invalid cryptographic choices

```
# MUST NOT: MD5 for password hashing
password_hash = md5(password)

# MUST NOT: AES-CBC without HMAC
ciphertext = aes_cbc_encrypt(data, key, iv)   # no authentication!

# MUST NOT: SHA-1 for certificate signing (now rejected by browsers)
cert.sign(private_key, algorithm="SHA1withRSA")

# MUST NOT: ECB mode — identical blocks produce identical ciphertext
ciphertext = aes_ecb_encrypt(data, key)
```

## Enforcement Rules

The following **MUST** be enforced:

1. **TLS version scanning** — automated scans **MUST** verify TLS 1.0/1.1 are disabled on all endpoints; findings block release
2. **Certificate expiry monitoring** — alerts at 30 days; automated renewal for certificates ≤ 90-day validity
3. **Prohibited algorithm detection** — static analysis **MUST** flag use of MD5, SHA-1, DES, RC4 in cryptographic contexts
4. **Design review** — all new services processing Confidential or Restricted data **MUST** have cryptographic design reviewed by Security Architecture Board

## References

- [RFC 8446 — TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446)
- [RFC 8555 — ACME (Automatic Certificate Management Environment)](https://www.rfc-editor.org/rfc/rfc8555)
- [NIST SP 800-131A Rev 3 — Transitioning the Use of Cryptographic Algorithms](https://csrc.nist.gov/publications/detail/sp/800-131a/rev-3/draft)
- [NIST FIPS 140-3 — Security Requirements for Cryptographic Modules](https://csrc.nist.gov/publications/detail/fips/140/3/final)
- [OWASP ASVS 5.0 — V6 Cryptographic Values, V9 Communication](https://owasp.org/www-project-application-security-verification-standard/)
- [Mozilla Server Side TLS Guidelines](https://wiki.mozilla.org/Security/Server_Side_TLS)
- SEC-BP-002 — Post-Quantum Cryptography Migration
- SEC-STD-002 — Secrets Management (key storage requirements)
- SEC-STD-008 — Workload Identity (mTLS for service-to-service)

## Rationale

**Why TLS 1.2 minimum (not 1.3 only)?** TLS 1.3 is preferred and mandated where possible, but 1.2 remains in widespread use with modern cipher suites. An absolute TLS 1.3-only mandate would break legitimate integrations with partners still on TLS 1.2. The minimum floor eliminates known-broken versions (1.0, 1.1) without unnecessary friction.

**Why ECDSA preferred over RSA?** ECDSA keys provide equivalent security at smaller sizes (P-256 ≈ RSA-3072), reducing computational overhead. Ed25519 signatures are faster than RSA-2048 with better security properties. As organizations plan PQC migration, starting with smaller asymmetric keys reduces migration complexity.

**Why CBOM as SHOULD not MUST?** Maintaining a CBOM requires tooling investment not yet standardized across organizations. Marking it SHOULD for most services while MUST for Restricted-tier data applies appropriate rigor where the migration risk is highest, without blocking adoption by organizations just starting their cryptographic inventory.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-05-04 | Initial definition |
