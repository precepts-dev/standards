---
identifier: "INTG-STD-001"
name: "Date Format"
version: "1.0.0"
status: "MANDATORY"

domain: "INTEGRATION"
documentType: "standard"
category: "format"
appliesTo: ["api", "events", "a2a", "mcp"]

lastUpdated: "2026-02-16"
owner: "Integration Architecture Board"

standardsCompliance:
  iso: ["ISO-8601"]
  rfc: []
  w3c: []
  other: []

taxonomy:
  capability: "data-format"
  subCapability: "date"
  layer: "contract"

enforcement:
  method: "automated"
  validationRules:
    dateFormat: "YYYY-MM-DD"
    regex: "^\\d{4}-\\d{2}-\\d{2}$"
  rejectionCriteria:
    - "Unix Epoch format"
    - "Local timezone offsets"
    - "Non-ISO date separators (slash, space)"
  supportedFormats: ["ISO-8601"]
  authoritativeModel: "ISO-8601"

dependsOn: []
supersedes: ""
---

# Date

## Purpose

All date values transmitted across any interface **MUST** follow the ISO-8601 format. This ensures deterministic interpretation across all systems, languages, and timezones.

## Conceptual Model

A date represents a calendar day without time-of-day or timezone information. The canonical representation is the ISO-8601 extended format: `YYYY-MM-DD`.

## Rules

- All date fields **MUST** use the `YYYY-MM-DD` format
- Unix Epoch representations **MUST** be rejected
- Local timezone offsets **MUST NOT** be included in date-only fields
- Non-ISO separators (slash, space) **MUST** be rejected

## Examples

### Valid

```json
{ "created_at": "2026-02-16" }
```

### Invalid

```json
{ "created_at": "16-02-2026" }
```
```json
{ "created_at": "16/02/2026" }
```
```json
{ "created_at": "02-16-2026" }
```

## Validation Rules

**Regex:** `^\d{4}-\d{2}-\d{2}$`

Validation **MUST** occur at contract boundary (API gateway, event schema registry, message broker).

## Enforcement Rules

- **Constraint:** Reject any payload using Unix Epoch or local timezone offsets.
- **Reference:** [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)

## References

- [**ISO-8601**](https://en.wikipedia.org/wiki/ISO_8601) - Date and time format standard

## Rationale

ISO-8601 `YYYY-MM-DD` is unambiguous across locales (unlike `DD/MM/YYYY` vs `MM/DD/YYYY`), sorts lexicographically, and is natively supported by all major programming languages and databases.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-02-16 | Initial definition |
