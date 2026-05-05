---
identifier: "SEC-STD-005"
name: "Input Validation and Injection Prevention"
version: "1.0.0"
status: "MANDATORY"

domain: "SECURITY"
documentType: "standard"
category: "application"
appliesTo: ["api", "web", "mobile", "cli"]

lastUpdated: "2026-05-05"
owner: "Security Architecture Board"

standardsCompliance:
  iso: ["ISO/IEC-27001:2022"]
  rfc: []
  w3c: ["CSP-Level-3"]
  other: ["OWASP-ASVS-5.0-V5", "OWASP-Top-10-2021-A03", "OWASP-Top-10-2021-A10", "OWASP-API-Security-Top-10-2023-API8", "CWE-20", "CWE-79", "CWE-89"]

taxonomy:
  capability: "application-security"
  subCapability: "input-validation"
  layer: "security"

enforcement:
  method: "hybrid"
  validationRules:
    inputValidation: "All inputs MUST be validated against a defined schema before processing"
    outputEncoding: "All output MUST be encoded for the rendering context before emission"
  rejectionCriteria:
    - "Dynamic query construction with unparameterised user input"
    - "OS command construction with user-controlled data"
    - "File upload endpoints that execute or serve uploaded content from the same origin"
    - "Outbound HTTP requests to user-supplied URLs without an allowlist"
    - "Deserialisation of untrusted data without schema validation"
  reviewChecklist:
    - "All input validated against schema or allowlist before use"
    - "All database queries use parameterised statements or ORMs"
    - "All OS commands built from allowlisted strings only"
    - "SSRF allowlist in place for any server-side outbound HTTP"
    - "File upload path isolated from webroot and execution environment"
    - "Output encoding applied at each rendering context boundary"

dependsOn: ["SEC-GOV-000"]
supersedes: ""
---

# Input Validation and Injection Prevention

## Purpose

This standard defines **MANDATORY** requirements for validating all inbound data and preventing injection attacks across all system boundaries. It specifies the highest-impact rules directly and references OWASP ASVS 5.0 as the normative source for complete coverage — this dual model avoids dual maintenance while ensuring engine-checkable rules.

> *Normative language (**MUST**, **MUST NOT**, **SHOULD**, **MAY**) follows RFC 2119 semantics.*

## ASVS Compliance Baseline

Systems **MUST** meet OWASP ASVS 5.0 Level 1 requirements for all production services. Systems that are externally facing, process Confidential or Restricted data per SEC-GDL-001, or handle financial or health data **MUST** meet ASVS 5.0 Level 2.

ASVS Level 2 assessment **MUST** include:
- Automated DAST scan (e.g., OWASP ZAP, Burp Suite Pro) run at minimum on every release candidate
- Annual penetration test performed by a qualified assessor covering ASVS Level 2 controls not detectable by automated scanning

The rules in this document are the highest-impact subset of ASVS V5 (Input Validation, Sanitisation, and Encoding). Passing these rules is necessary but not sufficient for ASVS Level 2 compliance.

## Rules

### R-1: Schema-First Input Validation

All inputs **MUST** be validated against a defined schema before any processing, persistence, or forwarding:

- Define an explicit schema for every API request body, query parameter, path parameter, and header consumed by the service
- Validation **MUST** reject inputs that fail type checks, length constraints, format requirements, or allowlist matching; do not attempt to sanitise and continue
- Validation **MUST** occur on the server side; client-side validation is defence-in-depth only and **MUST NOT** be the sole gate
- Maximum lengths **MUST** be enforced for all string inputs; no field **SHOULD** accept unbounded strings unless explicitly justified
- Numeric inputs **MUST** have explicit range constraints; reject values outside the expected domain

### R-2: Injection Prevention

Systems **MUST** prevent all classes of injection by construction, not by sanitisation:

**SQL and ORM injection:**
- All database interactions **MUST** use parameterised queries or prepared statements; string concatenation to build queries **MUST NOT** be used
- ORM query builders **MUST** be used in parameterised mode; raw query escape bypasses (`raw()`, `unsafe()`, `literal()`) **MUST NOT** be used with user-supplied data

**OS command injection:**
- OS command execution **MUST NOT** accept user-supplied data in any position (command name, arguments, flags) unless the input is compared against an explicit allowlist of known-safe values
- Shell string interpolation with user input **MUST NOT** be used; use `exec` form rather than `shell` form where available

**LDAP and XML/XPath injection:**
- LDAP queries **MUST** use parameterised constructors; user input **MUST** be escaped per RFC 4515 if raw filter construction cannot be avoided
- XPath queries **MUST** use parameterised expressions; string-concatenated XPath with user data **MUST NOT** be used

**Path traversal:**
- File path operations using user-supplied data **MUST** canonicalise the resolved path and verify it remains within the intended root directory before access
- Reject paths containing `..`, null bytes, or encoded equivalents before canonicalisation

### R-3: SSRF Prevention

Systems that make outbound HTTP or network requests based on user-supplied URLs or hostnames **MUST** implement allowlist-based controls:

- Maintain an explicit allowlist of permitted destination hosts and ports; deny all others
- Resolve hostnames to IP addresses and reject requests to private, loopback, link-local, and cloud metadata ranges before connection; specifically block:
  - `169.254.169.254` and `fd00:ec2::254` (AWS and GCP instance metadata)
  - `100.100.100.200` (Alibaba Cloud metadata)
  - RFC 1918 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  - `127.0.0.0/8` and `::1` (loopback)
- Implement DNS rebinding protection: re-resolve the hostname and re-validate the IP immediately before each connection attempt; do not cache the resolved IP across requests
- Follow a maximum of 3 HTTP redirects; validate each redirect destination against the allowlist before following

### R-4: File Upload Security

Systems accepting file uploads **MUST**:

- Validate the MIME type by inspecting the file's magic bytes (not the `Content-Type` header or filename extension); reject files whose magic bytes do not match an accepted list
- Enforce maximum file sizes appropriate to the use case; reject oversized files before reading the full content into memory
- Rename uploaded files to a cryptographically random identifier on storage; never preserve user-supplied filenames in storage paths
- Store uploaded files in a location isolated from the webroot and application execution environment; the upload storage path **MUST NOT** be directly addressable via URL
- Serve uploaded files through a handler that sets `Content-Disposition: attachment` and a safe `Content-Type`; never serve user-uploaded content with `Content-Type: text/html` or `application/javascript`
- Virus/malware scan **SHOULD** be applied to uploaded files before they are made available to other users; this is **MUST** for systems where uploads are shared across organisational boundaries

### R-5: Output Encoding

All output **MUST** be encoded for its rendering context before emission:

- **HTML context**: HTML-entity-encode all user-controlled data inserted into HTML; use a well-maintained library (e.g., OWASP Java Encoder, DOMPurify)
- **JavaScript context**: JSON-encode user data passed to JavaScript; never use string concatenation to build JavaScript
- **URL context**: percent-encode user data inserted into URLs; validate URL scheme is `https` before inserting into `href` or `src` attributes
- **CSS context**: CSS-escape user data inserted into style values; do not allow user input in CSS property names
- Do not implement custom sanitisation logic as a replacement for context-aware encoding

Content Security Policy (CSP) **MUST** be deployed as defence-in-depth:

- Begin with `Content-Security-Policy-Report-Only` and monitor violations for a minimum of 14 days before switching to enforcement mode
- Enforce mode **MUST** be activated before a service handles Restricted-tier data
- `unsafe-inline` and `unsafe-eval` **SHOULD NOT** appear in the enforced CSP directive; exceptions **MUST** be documented in the service's threat model

### R-6: Deserialisation Security

Systems that deserialise data from untrusted sources **MUST**:

- Validate the deserialised object against a strict schema immediately after deserialisation; reject unexpected types or fields
- **MUST NOT** use deserialisation formats that execute arbitrary code during the deserialisation step (e.g., Java native serialisation, Python `pickle`, Ruby `Marshal`) for any data originating outside the trust boundary; use JSON or a schema-validated binary format (Protocol Buffers, Avro, MessagePack)
- If a legacy format cannot be replaced, wrap deserialisation in a sandboxed subprocess with minimal permissions

## Examples

### Parameterised query

```
// SQL — parameterised
query = "SELECT * FROM users WHERE email = ? AND active = ?"
result = db.execute(query, [user_email, true])

// MUST NOT — string concatenation
query = "SELECT * FROM users WHERE email = '" + user_email + "'"
```

### SSRF allowlist check

```
// Pseudocode: validate before request
function fetch_remote(url):
  parsed = parse_url(url)
  assert parsed.scheme in ["https"]
  assert parsed.hostname in ALLOWED_HOSTS
  resolved_ip = dns_resolve(parsed.hostname)
  assert not is_private_or_metadata_ip(resolved_ip)
  return http_get(url, follow_redirects=3, revalidate_each_redirect=true)
```

### File upload handling

```
// Pseudocode
function handle_upload(file_bytes, declared_mime):
  detected_mime = detect_mime_from_magic_bytes(file_bytes)
  assert detected_mime in ALLOWED_MIME_TYPES
  assert len(file_bytes) <= MAX_FILE_SIZE_BYTES
  storage_name = random_uuid() + "." + safe_extension(detected_mime)
  write_to_isolated_storage(file_bytes, "/uploads/" + storage_name)
  return storage_name  // never return user-supplied filename
```

## References

- [OWASP ASVS 5.0 — V5 Validation, Sanitisation, and Encoding](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP Top 10 2021 — A03 Injection, A10 SSRF](https://owasp.org/Top10/)
- [OWASP API Security Top 10 2023 — API8 Security Misconfiguration](https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/)
- [CWE-20 — Improper Input Validation](https://cwe.mitre.org/data/definitions/20.html)
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [W3C Content Security Policy Level 3](https://www.w3.org/TR/CSP3/)
- SEC-GDL-001 — Data Classification (Restricted-tier triggers for ASVS Level 2)
- SEC-STD-003 — Cryptography and TLS (HTTPS requirement for file serving)
- SEC-STD-004 — Security Logging (log injection attempts per R-2)

## Rationale

**Why allowlist over denylist for injection prevention?** Denylists must anticipate every attack variant including encoding, Unicode normalisation, and context-specific bypasses. Allowlists define exactly what is expected — everything else is rejected. The attack surface for an allowlist is zero by default.

**Why DNS rebinding protection?** An attacker can control a DNS name that initially resolves to a public IP (passing the allowlist check) and then quickly resolves to an internal IP before the connection is established. Re-resolving immediately before connection prevents this race condition.

**Why prohibit pickle/Java native serialisation for untrusted data?** Both formats execute arbitrary code during deserialisation. An attacker who controls the serialised bytes can achieve arbitrary code execution on the deserialising server without any other vulnerability. The attack surface is the format itself.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-05-05 | Initial definition |
