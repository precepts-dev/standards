---
identifier: "INTG-STD-005"
name: "Character Encoding"
version: "1.0.0"
status: "MANDATORY"

domain: "INTEGRATION"
documentType: "standard"
category: "format"
appliesTo: ["api", "events", "a2a", "files", "mcp", "webhooks", "grpc", "graphql", "batch", "streaming"]

lastUpdated: "2026-03-28"
owner: "Integration Architecture Board"

standardsCompliance:
  iso: ["ISO-10646"]
  rfc: ["RFC-3629", "RFC-8259", "RFC-5198", "RFC-2277"]
  w3c: ["Character-Model-for-the-World-Wide-Web"]
  other: []

taxonomy:
  capability: "data-format"
  subCapability: "character-encoding"
  layer: "contract"

enforcement:
  method: "automated"
  validationRules:
    encoding: "UTF-8"
    normalization: "NFC"
    bom: "forbidden-in-json"
  rejectionCriteria:
    - "Non-UTF-8 encoded payloads"
    - "BOM in JSON payloads"
    - "Unassigned or surrogate code points"

dependsOn: []
supersedes: ""
---

# Character Encoding

## Purpose

This standard defines the **REQUIRED** character encoding for all text data exchanged across integration boundaries. Inconsistent encoding causes data corruption, security vulnerabilities, and integration failures. All integration surfaces **MUST** use UTF-8 with NFC normalization to guarantee round-trip fidelity and deterministic string comparison.

> *Normative language (**MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, **MAY**) follows RFC 2119 semantics.*

---

## Rules

### R-1: UTF-8 as Sole Encoding

All text data crossing integration boundaries **MUST** be encoded in UTF-8 (RFC 3629).

- UTF-16, UTF-32, ISO-8859-x, Windows-125x, Shift_JIS, and all other encodings **MUST NOT** be used at integration boundaries.
- Internal representations **MAY** use other encodings, but **MUST** convert to UTF-8 before crossing any boundary.

### R-2: Valid UTF-8 Sequences Only

All byte sequences **MUST** be well-formed per RFC 3629. The following **MUST** be rejected:

- Overlong encodings (e.g., `C0 80` for U+0000)
- Surrogate halves (U+D800 through U+DFFF)
- Code points beyond U+10FFFF
- Truncated multi-byte sequences
- Unexpected continuation bytes without a valid leading byte

### R-3: NFC Normalization

All text **MUST** be normalized to NFC (RFC 5198) before transmission.

- Producers **MUST** emit NFC-normalized text.
- Consumers **SHOULD** verify NFC normalization on input.
- String comparison at integration boundaries **MUST** compare NFC-normalized forms.
- NFKC or NFKD **MUST NOT** be applied at integration boundaries - compatibility decomposition is lossy.

### R-4: BOM (Byte Order Mark) Handling

The UTF-8 BOM (`EF BB BF`) **MUST** be handled per format:

| Format | BOM Rule | Rationale |
|---|---|---|
| JSON | **MUST NOT** be present | RFC 8259 forbids it |
| XML | **MAY** be present; parsers **MUST** tolerate | XML spec permits BOM |
| CSV | **SHOULD** be present for spreadsheet interop | Required for UTF-8 detection in common tools |
| Protocol Buffers / gRPC | **MUST NOT** be present | Binary framing; BOM is meaningless |
| GraphQL | **MUST NOT** be present | Spec treats BOM as insignificant |
| Plain text (logs, config) | **SHOULD NOT** be present | Breaks concatenation and Unix tools |
| HTTP bodies | **MUST NOT** be present in JSON/API responses | Redundant with Content-Type header |

If a BOM is encountered where forbidden, the system **MUST** strip it before processing and **MAY** log a warning.

### R-5: Encoding Declaration

The encoding **MUST** be declared through the appropriate mechanism:

| Surface | Declaration Mechanism |
|---|---|
| HTTP responses | `Content-Type` header with `charset=utf-8` |
| HTTP requests | `Content-Type` header **MUST** include `charset=utf-8` for text payloads |
| XML documents | `<?xml version="1.0" encoding="UTF-8"?>` **MUST** be present |
| HTML documents | `<meta charset="UTF-8">` **MUST** appear within first 1024 bytes |
| CSV files | UTF-8 BOM as first bytes; `text/csv; charset=utf-8` in HTTP |
| Event payloads | Schema registry or envelope **MUST** declare encoding |
| Message queues | Message metadata **MUST** declare `charset=utf-8` |
| gRPC / Protobuf | Implicit - `string` type is defined as UTF-8 |
| File transfers | Filename convention or manifest **MUST** declare encoding |

### R-6: Rejection Policy

Systems receiving data at integration boundaries **MUST** validate encoding:

- **API gateways** **MUST** reject non-UTF-8 payloads with HTTP 400 and a descriptive error.
- **Event consumers** **MUST** route non-UTF-8 messages to a dead-letter queue and emit an alert.
- **File processors** **MUST** reject non-UTF-8 files and log the detected encoding.
- **Batch jobs** **MUST** fail the individual record (not the entire batch) and report violations in the summary.

Systems **MUST NOT** silently replace invalid bytes with U+FFFD at integration boundaries. Replacement characters are acceptable only for internal display or logging.

### R-7: Database Storage

Integration-facing tables **MUST** use UTF-8-compatible character sets and collation. Notably, 3-byte "utf8" in MySQL **MUST NOT** be used - it cannot represent characters outside the Basic Multilingual Plane. Use the full 4-byte UTF-8 character set instead.

### R-8: Special Character Handling

| Context | Rule |
|---|---|
| JSON strings | Control characters (U+0000 - U+001F) **MUST** be escaped per RFC 8259 |
| XML content | Syntax-conflicting characters **MUST** use entities or CDATA; control chars other than TAB, LF, CR **MUST NOT** appear |
| URL parameters | Non-ASCII characters **MUST** be percent-encoded after UTF-8 encoding (RFC 3986) |
| SQL | Parameterized queries **MUST** be used; string concatenation with user Unicode input **MUST NOT** be used |
| Log output | Non-printable characters **SHOULD** be escaped using `\uXXXX` notation |

---

## Examples

### Valid: UTF-8 JSON with Encoding Declaration

A JSON payload containing multilingual text, served with the correct Content-Type header (`application/json; charset=utf-8`). All characters are valid UTF-8, NFC-normalized, and no BOM is present.

### Invalid: Non-UTF-8 Payload

A payload containing bare `0xE9` (Latin-1 "e-acute") without valid UTF-8 continuation bytes. Rejected at the gateway with error code `INVALID_ENCODING` and the byte offset of the invalid sequence.

---

## Enforcement Rules

| Violation | Action | Error Code |
|---|---|---|
| Non-UTF-8 encoding detected | Reject (HTTP 400 or equivalent) | `INVALID_ENCODING` |
| Invalid UTF-8 byte sequence | Reject (HTTP 400 or equivalent) | `INVALID_UTF8` |
| BOM present in JSON payload | Strip, process, and log warning | `UNEXPECTED_BOM` |
| Surrogate code point | Reject (HTTP 400 or equivalent) | `SURROGATE_CODEPOINT` |
| Non-character code point | Reject (HTTP 400 or equivalent) | `NONCHARACTER` |
| Forbidden control character (C0 other than TAB/LF/CR, or C1) | Reject (HTTP 400 or equivalent) | `FORBIDDEN_CONTROL` |
| NULL (U+0000) in JSON or XML | Reject (HTTP 400 or equivalent) | `FORBIDDEN_CONTROL` |
| Private-use code points without bilateral agreement | Reject or log warning | `PRIVATE_USE` |
| Missing encoding declaration | Log warning; assume UTF-8 | `MISSING_CHARSET` |

Enforcement **MUST** occur at the outermost integration boundary (API gateway, message broker ingress, file intake). Interior services **MAY** rely on gateway validation.

---

## Security Considerations

| Threat | Attack Vector | Mitigation |
|---|---|---|
| Encoding injection | Overlong UTF-8 sequences bypass path/input filters (e.g., `C0 AF` encodes `/`) | R-2 eliminates overlong sequences; R-6 rejects non-UTF-8 before application logic |
| Normalization bypass | Visually identical strings with different byte representations bypass auth checks | R-3 mandates NFC; comparison **MUST** use normalized forms |
| Homoglyph spoofing | Characters from different scripts appear identical (Latin "a" vs Cyrillic "a") | Systems processing user-visible identifiers **SHOULD** apply confusable detection (UTS #39) |
| Null byte injection | Embedded U+0000 truncates strings in C-based systems, enabling filter bypass | Enforcement rules forbid NULL in text payloads |

---

## References

- [**RFC 3629**](https://www.rfc-editor.org/rfc/rfc3629) - UTF-8 (STD 63)
- [**RFC 8259**](https://datatracker.ietf.org/doc/html/rfc8259) - JSON Data Interchange Format
- [**RFC 5198**](https://www.rfc-editor.org/rfc/rfc5198) - Unicode Format for Network Interchange
- [**RFC 2277 / BCP 18**](https://www.rfc-editor.org/rfc/rfc2277.html) - IETF Policy on Character Sets and Languages
- [**RFC 3986**](https://www.rfc-editor.org/rfc/rfc3986) - URI Generic Syntax
- [**W3C Character Model**](https://www.w3.org/TR/charmod/) - Fundamentals
- [**Unicode Standard Annex #15**](https://unicode.org/reports/tr15/) - Normalization Forms
- [**Unicode Technical Standard #39**](https://unicode.org/reports/tr39/) - Security Mechanisms

---

## Rationale

**UTF-8 exclusively:** UTF-8 encodes every Unicode code point, is mandated by RFC 8259 (JSON) and BCP 18 (IETF protocols), is ASCII-compatible, self-synchronizing, and used by over 98% of web pages.

**NFC over other forms:** NFC is the most compact canonical form, preserves compatibility characters (unlike lossy NFKC/NFKD), and is recommended by both W3C and RFC 5198.

**Per-format BOM rules:** No single BOM policy fits all consumers - JSON forbids it (RFC 8259), while spreadsheet tools require it for reliable UTF-8 detection.

---

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-03-28 | Initial definition |
