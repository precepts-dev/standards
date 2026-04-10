---
identifier: "INTG-STD-006"
name: "Backward and Forward Compatibility"
version: "2.0.0"
status: "MANDATORY"

domain: "INTEGRATION"
documentType: "standard"
category: "versioning"
appliesTo: ["api", "events", "a2a", "files", "mcp", "webhooks", "grpc", "graphql", "batch", "streaming"]

lastUpdated: "2026-04-10"
owner: "Integration Architecture Board"

standardsCompliance:
  iso: []
  rfc: ["RFC-9110"]
  w3c: []
  other: ["Zalando-RESTful-API-Guidelines", "Protobuf-Wire-Compatibility", "Avro-Schema-Resolution"]

taxonomy:
  capability: "versioning"
  subCapability: "compatibility"
  layer: "contract"

enforcement:
  method: "hybrid"
  validationRules:
    schemaCompatibility: "backward-transitive"
  rejectionCriteria:
    - "Removal of existing fields"
    - "Renaming of existing fields"
    - "Changing field types in incompatible ways"
    - "Narrowing enum value sets"

dependsOn: ["INTG-STD-004"]
supersedes: ""
---

# Backward and Forward Compatibility

## Purpose

Integration contracts are long-lived shared agreements. Once a producer publishes a field, consumers depend on it in ways the producer cannot observe. This standard defines how contracts evolve without breaking existing participants. **Full compatibility** (both backward and forward) is required for all shared contracts.

## Rules

### Compatibility Definitions

| Term | Definition |
|---|---|
| Backward compatible | New schema reads data written by old schema. Consumers survive producer upgrades. |
| Forward compatible | Old schema reads data written by new schema. Consumers tolerate unknown fields/values. |
| Full compatible | Both backward and forward compatible. **Required** for all shared contracts. |
| Breaking change | Modification causing existing, correct consumers to fail at parse, validation, or runtime. |
| Non-breaking change | Modification preserving behavior for all existing, correct consumers. |
| Additive-only evolution | Evolving contracts exclusively through non-breaking additions. |

### R-1: Additive-Only Evolution (Provider Rules)

**R-1-1:** Providers **MUST** evolve published contracts using additive-only changes as the default policy.

**R-1-2:** Providers **MUST NOT** make any breaking change without following the Breaking Change Process.

**R-1-3:** Providers **MUST NOT** remove a field from a published response or event payload. Deprecated fields **MUST** continue to be populated until the next major version.

**R-1-4:** Providers **MUST NOT** rename a field in a published contract. A rename equals a remove-plus-add — both sides break.

**R-1-5:** Providers **MUST NOT** change the type of an existing field. Type widening is permitted only where the wire format guarantees lossless representation (see Protocol-Specific Rules).

**R-1-6:** Providers **MUST NOT** change the semantic meaning of an existing field. Repurposing a field is a breaking change even if the type is unchanged.

**R-1-7:** Providers **MUST NOT** make an optional field mandatory in request contracts.

**R-1-8:** Providers **MUST NOT** make a mandatory field optional in response contracts if consumers depend on its presence.

**R-1-9:** New fields added to responses or events **MUST** be optional or **MUST** include a default value.

**R-1-10:** Providers **MUST NOT** tighten validation constraints on existing fields. Loosening constraints is permitted.

### R-2: Consumer Resilience

**R-2-1:** Consumers **MUST** ignore unknown fields in responses and events. Unknown fields **MUST NOT** cause deserialization failure, validation rejection, or runtime error.

**R-2-2:** Consumers **MUST** tolerate the absence of optional fields. Default/fallback behavior **MUST** be defined for every optional field a consumer depends on.

**R-2-3:** Consumers **MUST** handle unknown enum values gracefully by applying a documented fallback rather than failing. The recommended fallback is to treat the unknown value as `UNKNOWN` (per INTG-STD-004 R-27). The fallback **MUST** be documented in the consumer's code and specification so all systems consuming the same contract apply a consistent interpretation. This rule ensures forward compatibility — it does **not** mean silently ignoring enum values that drive business logic. Consumers receiving an unknown enum value **MUST** log it and apply a conservative default (e.g., route to manual review rather than auto-processing with an incorrect assumption).

**R-2-4:** Consumers **MUST** handle unknown HTTP status codes by falling back to the class-level code (e.g., unrecognized `432` treated as `400`).

**R-2-5:** Consumers **MUST** follow HTTP redirects (301, 302, 307, 308) rather than failing.

**R-2-6:** Consumers **MUST NOT** exploit definition gaps in provider contracts. Providers **MAY** tighten undocumented constraints without a major version bump.

**R-2-7:** Consumers performing PUT/PATCH **SHOULD** preserve unknown fields and send them back unmodified to prevent data loss.

### R-3: Security Constraints

**R-3-1:** Ignoring unknown fields (R-2-1) **MUST NOT** override security validation. Providers **SHOULD** reject unexpected fields in request bodies (HTTP 400) to prevent mass-assignment attacks.

**R-3-2:** Providers **MUST NOT** accept deprecated authentication or encryption parameters with known vulnerabilities solely for backward compatibility. Security breaking changes **MAY** bypass standard deprecation timelines.

**R-3-3:** All fields — known and unknown — **MUST** be subject to size limits, encoding validation, and injection-prevention controls.

### R-4: Enum Evolution

**R-4-1:** Providers **MUST NOT** remove values from an enum in a response or event payload.

**R-4-2:** Providers **MAY** add new values to a response/event enum, provided consumers handle unknown values (R-2-3). Extensible enums **SHOULD** be documented as such.

**R-4-3:** Providers **MUST NOT** add new values to a request enum if the provider previously validated against a closed set.

**R-4-4:** For enums used in both input and output, the safe path is: (1) provider adds the value to processing and response schema, (2) provider documents it, (3) consumers adopt it in requests at their own pace.

### R-5: Type-Specific Compatibility

| Change | Compatible? | Notes |
|---|---|---|
| String: increase `maxLength` | Yes | Widening |
| String: decrease `maxLength` | **No** | Narrowing |
| String: add `pattern` | **No** | Narrowing - rejects previously valid values |
| String: remove `pattern` | Yes | Widening |
| Integer: `int32` to `int64` | Conditional | Safe in length-encoded formats; unsafe in JSON |
| Integer: `int64` to `int32` | **No** | Truncation risk |
| Number: increase precision | Yes | Widening |
| Number: decrease precision | **No** | Loss of information |
| Boolean: to enum | **No** | Type change - requires new field |
| Array: change item type | **No** | Breaking for all items |
| Array: increase `maxItems` | Yes | Widening |
| Array: decrease `maxItems` | **No** | Narrowing |
| Object: add optional property | Yes | Additive |
| Object: add required property | **No** | Breaking for both request and response |
| Object: remove property | **No** | Consumers may depend on it |
| Nullable: non-null to nullable | Yes (response) | Consumer **SHOULD** already handle null |
| Nullable: nullable to non-null | **No** | Consumers may be sending null |

### R-6: Audit and Traceability

**R-6-1:** All schema changes **MUST** be version-controlled with full commit history.

**R-6-2:** Each schema version **MUST** be immutable once published to a registry or catalog.

**R-6-3:** Breaking change approvals **MUST** be recorded in the architecture decision log with justification, impact assessment, and migration plan.

**R-6-4:** Consumer migration progress **MUST** be tracked. Providers **MUST** retain traffic metrics sufficient to identify consumers still using deprecated versions.

## Examples

### Non-Breaking Change

Adding an optional field to a response:

```
Before:                        After:
  order:                         order:
    id: "ORD-123"                  id: "ORD-123"
    total: 99.95                   total: 99.95
                                   currency: "USD"   <-- new optional field
```

Existing consumers ignore `currency` and continue working. No version bump required.

### Breaking Change

Renaming a field in a response:

```
Before:                        After:
  { "user_name": "alice" }       { "username": "alice" }
```

Consumers reading `user_name` now get null/missing. This is equivalent to removing one field and adding another - both sides break. Requires the Breaking Change Process and a major version bump.

## Protocol-Specific Rules

| Protocol | Key Compatibility Rules |
|---|---|
| **REST/JSON** | Top-level responses **MUST** be objects (not bare arrays). **MUST NOT** use `additionalProperties: false` on responses. Providers **SHOULD** reject unknown request fields (HTTP 400). URL paths **MUST NOT** change for existing resources. |
| **gRPC/Protobuf** | Field numbers are permanent - **MUST NOT** reuse or change. Removed fields require `reserved` for both number and name. Field renames are wire-safe but break JSON transcoding. Adding fields to `oneof` is safe; moving existing fields into `oneof` is not. |
| **Avro Events** | New fields **MUST** have a default value. Schema registry **MUST** use `FULL_TRANSITIVE` mode. Type promotions follow Avro rules (`int` to `long`, `float` to `double`, `string` to `bytes`). |
| **Protobuf Events** | Same field number rules as gRPC. Schema registry **MUST** use `FULL_TRANSITIVE`. The `optional` keyword provides built-in forward compatibility. |
| **JSON Schema Events** | Same field-level rules as REST responses. **MUST NOT** set `additionalProperties: false`. Schema registry **MUST** use `FULL_TRANSITIVE`. |
| **GraphQL** | Adding fields/types/optional arguments is non-breaking. Removing fields requires `@deprecated` before removal. Making nullable fields non-nullable is breaking. New arguments **MUST** be optional with defaults. |
| **File/Batch** | Column additions at end of CSV/TSV are non-breaking. Column removals, reordering, or renames are breaking. Version identifiers **SHOULD** be embedded in file headers. |
| **MCP** | Adding tools/resources is non-breaking. Removing tools/resources is breaking. Parameter schema changes follow REST request body rules. Changing tool output semantics is breaking even if structure is unchanged. |

## Enforcement Rules

- **CI gate:** All PRs modifying shared contracts **MUST** pass automated compatibility checks before merge. Use protocol-appropriate tooling (e.g., `oasdiff` for OpenAPI, `buf breaking` for Protobuf, `graphql-inspector` for GraphQL, schema registry checkers for Avro/JSON Schema).
- **Schema registry gate:** Event schemas **MUST** be validated against the registry's compatibility mode before registration. Incompatible schemas **MUST** be rejected.
- **Manual review:** Changes that automated tools cannot assess (semantic or behavioral changes) **MUST** be reviewed by the Integration Architecture Board.
- **Boundary:** Enforcement occurs at contract publish time (CI, schema registry, API gateway), not at runtime.
- **Rejection:** Any change failing compatibility checks **MUST** be rejected unless it follows the Breaking Change Process with a major version bump.

## Breaking Change Process

When a breaking change is unavoidable, follow these steps:

| Step | Requirement |
|---|---|
| **1. Justify** | Document why compatible evolution is impossible, which consumers are affected, and any security/regulatory driver. |
| **2. Approve** | Breaking changes **MUST** be approved by the Integration Architecture Board. Security changes **MAY** use an expedited process. |
| **3. Version** | Bump to a new major version. The old version **MUST** remain available during migration. |
| **4. Migrate** | Old version **MUST** remain operational for minimum 6 months (30 days for actively exploited security vulnerabilities). Monitor traffic to both versions. |
| **5. Communicate** | Notify all consumers via: changelog entry, deprecation/sunset HTTP headers, direct team notification, and schema registry annotations. |
| **6. Sunset** | Old version **MAY** be removed only after the migration period has elapsed, traffic confirms negligible usage, a final shutdown notice has been sent, and removal is recorded in the changelog. |

## Rationale

**Additive-only default:** The alternative - arbitrary changes with coordinated deployment - does not scale. Every major API platform converges on this principle because breaking a consumer costs more than maintaining additive discipline.

**Consumer resilience with security asymmetry:** Consumers should tolerate unknown fields (Postel's Law), but providers must validate strictly. Providers are trust boundaries; consumers are not. Uncritical tolerance of malformed input creates attack surface.

**FULL_TRANSITIVE for event registries:** Non-transitive compatibility permits drift chains where version N is compatible with N-1 but not N-2. Event consumers may lag multiple versions, making transitive checks essential.

**6-month migration period:** Aligns with industry practice (Google Cloud, Stripe, Atlassian) and reflects that large organizations need multiple release cycles to absorb breaking changes.

## References

- [Zalando RESTful API Guidelines - Compatibility](https://opensource.zalando.com/restful-api-guidelines/#compatible-extensions)
- [Protocol Buffers Language Guide (proto3)](https://protobuf.dev/programming-guides/proto3/)
- [Confluent Schema Registry - Schema Evolution](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)
- [RFC 9110 - HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [Eric Allman, "The Robustness Principle Reconsidered" (ACM Queue, 2011)](https://queue.acm.org/detail.cfm?id=1999945)

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-03-28 | Initial definition |
| 2.0.0   | 2026-04-10 | **Breaking:** Renumbered sub-rules from R-COMPAT-NNN to R-N-M format for consistency with the standard's own rule numbering scheme; updated all internal cross-references; expanded R-2-3 (unknown enum handling) with clarification on documented fallback semantics and the UNKNOWN sentinel |
