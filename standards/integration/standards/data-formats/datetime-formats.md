---
identifier: "INTG-STD-002"
name: "Date and Time"
version: "2.0.0"
status: "MANDATORY"

domain: "INTEGRATION"
documentType: "standard"
category: "format"
appliesTo: ["api", "events", "a2a", "mcp"]

lastUpdated: "2026-01-29"
owner: "Integration Architecture Board"

standardsCompliance:
  iso: ["ISO-8601"]
  rfc: ["RFC-3339", "RFC-9557"]
  w3c: []
  other: []

taxonomy:
  capability: "data-format"
  subCapability: "date-time"
  layer: "contract"

enforcement:
  method: "automated"
  absolute:
    format: "RFC3339_UTC"
    allowOffset: false
    allowUnixEpoch: false
    timezoneRequired: true
    regex: "^d{4}-d{2}-d{2}Td{2}:d{2}:d{2}(.d{1,9})?Z$"
  scheduled:
    zoneRequired: true
    allowOffsetOnly: false
    authoritativeTuple: ["local_timestamp", "zone"]
    supportedFormats:
      - "RFC9557"
      - "TRIPLE_FIELD_MODEL"

classifications: ["ABSOLUTE", "SCHEDULED"]
dependsOn: ["INTG-STD-001"]
supersedes: ""
---

# Date and Time

## Purpose

This standard defines the **REQUIRED** representation of date and time values exchanged across all integration boundaries.

The objective is to,

- Deterministic interpretation
- Cross-platform interoperability
- DST and timezone resilience
- Machine-governable validation
- Long-term scheduling correctness

> *Normative language (MUST, MUST NOT, SHOULD) follows RFC 2119 semantics.*

---

## Classifications

There are two distinct semantic classifications of date-time representations.

| Classification| Description                                  | Deterministic at creation time |
|---------------|----------------------------------------------|--------------------------------|
| **ABSOLUTE**  | Represents a past or present instant in time | Yes                            |
| **SCHEDULED** | Represents a future planned occurrence       | No (offset subject to change)  |

Representation strategy depends on the applicable classification.

---

## Rules

### ABSOLUTE Timestamp Standard

### Rules

All **ABSOLUTE** timestamps **MUST**,
1. Conform to RFC 3339
2. Be expressed in UTC
3. Use the literal `Z` suffix
4. NOT use Unix Epoch format
5. NOT use timezone offsets (`+01:00`)
6. Represent a single unambiguous instant

### Canonical Format

`YYYY-MM-DDTHH:mm:ssZ`

Optionally, fractional seconds **MAY** be allowed, with a maximum of 9 fractional digits.

`YYYY-MM-DDTHH:mm:ss.SSSZ`

### Validation Regex

`^d{4}-d{2}-d{2}Td{2}:d{2}:d{2}(.d{1,9})?Z$`

---

### SCHEDULED (Future) Timestamp Standard

### Distinction

Future timestamps are not deterministic because,
- DST (*Daylight Saving Time*) rules may change
- Jurisdictions may modify timezone legislation
- Offsets are derived values
- Offset alone does not uniquely identify a timezone

→ Offsets **MUST NOT** be authoritative for future scheduled timestamps.

### Rules

If a date-time represents a **SCHEDULED** future event,
- An IANA (*Internet Assigned Numbers Authority*) timezone identifier (ZoneId) is **MANDATORY**
- Zone **MUST** take precedence over offset
- Offset-only representations **MUST** be rejected

### Canonical Formats

#### Timezone-Aware Systems (Preferred)

Use **RFC-9557** format

`YYYY-MM-DDTHH:mm:ss[Area/Location]`

This preserves timezone identity independent of offset.

#### Timezone-Unaware Systems (Fallback)

Use the *Triple-Field Model*
- `local_timestamp`: LocalDateTime without offset
- `zone`: Valid IANA ZoneId
- `utc_timestamp`: RFC-3339 canonical UTC

Here, the authoritative representation is `(local_timestamp, zone)`, while `utc_timestamp` is a derived projection.

### Interpretation Algorithm

To compute execution instant,
- Read `zone`
- Apply current **tzdb** (*Timezone DB*) rules
- Derive offset
- Compute `utc_timestamp`
- Execute at derived instant

**NEVER** reverse this order.

---

## Examples

### ABSOLUTE Timestamps

#### Valid

```json
{ "created_at": "2026-02-16T09:30:45Z" }
```

```json
{ "created_at": "2026-02-16T09:30:45.123Z" }
```

#### Invalid

```json
{ "created_at": "1698393600" }
```

```json
{ "created_at": "2026-02-16T10:30:45+01:00" }
```

### SCHEDULED Timestamps

#### Valid

```json
{ "scheduled_at": "2027-12-01T11:00:00[America/New_York]" }
```

```json
{
  "local_timestamp": "2027-12-01T11:00:00",
  "zone": "America/New_York",
  "utc_timestamp": "2027-12-01T16:00:00Z"
}
```

#### Invalid

```json
{ "scheduled_at": "2027-12-01T11:00:00Z" }
```

```json
{ "scheduled_at": "2026-02-16T10:30:45+01:00" }
```

```json
{ "scheduled_at": "1698393600" }
```

---

## Enforcement Rules

The following payloads **MUST** be *rejected*,

For **ABSOLUTE** timestamps:
- Unix Epoch format
- Offset-based timestamps
- Missing timezone indicator
- Local timestamps without Z

For **SCHEDULED** timestamps:
- Missing zone
- Invalid IANA (*Internet Assigned Numbers Authority*) ZoneId
- Offset-only representation
- UTC timestamp inconsistent with tzdb projection

Validation **MUST** occur at contract boundary.

---

## Rationale

This standard ensures,
- Deterministic event replay (event-driven systems)
- Cross-language interoperability
- Protection against DST drift
- Regulatory resilience
- AI-governable timestamp validation
- Future-proof scheduling semantics

UTC guarantees stability for **ABSOLUTE** time.

Zone-based representation guarantees correctness for **SCHEDULED** time.

---

## References

- [**ISO-8601**](https://en.wikipedia.org/wiki/ISO_8601) (Date)
- [**RFC-3339**](https://www.rfc-editor.org/rfc/rfc3339.html#page-4) ((Z Form))
- [**RFC-9557**](https://www.rfc-editor.org/rfc/rfc9557#name-internet-extended-date-time)
- [**TZDB**](https://www.iana.org/time-zones)
  - Current [**TZDB Explorer**](https://nodatime.org/TimeZones), with historic versions

---

## Version History

| Version | Date       | Change                               |
| ------- | ---------- | ------------------------------------ |
| 2.0.0   | 2026-02-16 | Introduced scheduled timestamp model |
| 1.1.0   | 2026-02-16 | Added fractional seconds             |
| 1.0.0   | 2023-10-27 | Initial definition                   |
