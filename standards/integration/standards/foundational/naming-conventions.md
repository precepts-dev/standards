---
identifier: "INTG-STD-004"
name: "Integration Naming Conventions"
version: "1.1.0"
status: "MANDATORY"

domain: "INTEGRATION"
documentType: "standard"
category: "naming"
appliesTo: ["api", "events", "a2a", "files", "mcp", "webhooks", "grpc", "graphql", "batch", "streaming"]

lastUpdated: "2026-04-10"
owner: "Integration Architecture Board"

standardsCompliance:
  iso: []
  rfc: ["RFC-9110", "RFC-9457", "RFC-6648"]
  w3c: []
  other: ["Google-AIP-140", "Google-AIP-190", "Zalando-RESTful-API-Guidelines"]

taxonomy:
  capability: "naming"
  subCapability: "conventions"
  layer: "contract"

enforcement:
  method: "automated"
  validationRules:
    fieldNames: "snake_case"
    urlPaths: "kebab-case"
    eventTypes: "dot.notation.past.tense"
  rejectionCriteria:
    - "Mixed case conventions within a single API"
    - "Verbs in URL path segments"
    - "Abbreviations without prior approval"

dependsOn: []
supersedes: ""
---

# Naming Conventions

## Purpose

This standard defines **MANDATORY** naming conventions for all artifacts exchanged across integration boundaries - JSON fields, REST API paths, event types, queue topics, HTTP headers, enum values, query parameters, and file names. Consistent naming eliminates mapping ambiguity between services, enables automated CI/CD linting, and ensures AI agents operate on predictable structures.

> *Normative language follows RFC 2119 semantics.*

| Context | Convention | Example |
|---------|-----------|---------|
| JSON field names | `snake_case` | `order_total` |
| URL path segments | `kebab-case` | `/shipping-addresses` |
| Event type names | `dot.notation` | `order.payment.completed` |
| Queue/topic names | `dot.notation` | `retail.orders.created.v1` |
| HTTP headers | `Kebab-Case` | `X-Correlation-Id` |
| Enum values | `UPPER_SNAKE_CASE` | `PAYMENT_PENDING` |
| Query parameters | `snake_case` | `page_size` |
| File/directory names | `kebab-case` | `order-export-2026-03.csv` |

---

## Rules

#### General

### R-1: American English

All names **MUST** use American English (`color` not `colour`).

### R-2: Descriptive Names

- Names **MUST** be descriptive.
- Single-character or opaque abbreviations **MUST NOT** be used.
- Names **MUST NOT** encode internal system names, table names, or infrastructure details. Use `customer_address` not `tbl_cust_addr`.

### R-3: Approved Abbreviations

Pre-approved abbreviations (all others **MUST** go through the registry):

| Abbreviation | Full Form | Abbreviation | Full Form |
|---|---|---|---|
| `id` | identifier | `config` | configuration |
| `info` | information | `spec` | specification |
| `stats` | statistics | `auth` | authentication |
| `msg` | message | `org` | organization |
| `env` | environment | `max` | maximum |
| `min` | minimum | `avg` | average |
| `src` | source | `dest` | destination |
| `prev` | previous | `temp` | temporary |
| `num` | number | `qty` | quantity |

### R-4: Name Syntax

- Names **MUST NOT** begin with a digit.
- Names **MUST NOT** contain leading, trailing, or consecutive separators.
- Reserved words (`class`, `new`, `type`, `default`) **SHOULD** be avoided. Where unavoidable, **MUST** be domain-qualified (`account_type`).

#### JSON Field Names

### R-5: snake_case for JSON Fields

- **MUST** use `snake_case`.
- **MUST NOT** use `camelCase`, `PascalCase`, or `kebab-case`.

### R-6: Plural Arrays and Singular Scalars

- Arrays **MUST** be plural (`line_items`).
- Scalars/objects **MUST** be singular (`order`).

### R-7: Boolean Field Names

- Booleans **MUST** use adjective or past-participle form (`active`, `verified`, `enabled`).
- The `is_` prefix **SHOULD** be omitted. It is redundant because the boolean type is already apparent from field type and context. Exception: use `is_` when the bare word is a reserved keyword in major languages (`is_new`, because `new` is reserved in Java, JavaScript, and others).

### R-8: Temporal Suffixes

Date/time fields **SHOULD** use temporal suffixes: `_at` (timestamp), `_on` (date), `_until` (expiry), `_after` (lower bound), `_duration` (elapsed).

### R-9: Field Name Word Order

- **MUST NOT** include structural prepositions: `error_reason` not `reason_for_error`.
- Adjectives **MUST** precede the noun: `primary_address` not `address_primary`.
- Fields **MUST** represent state, not intent: `collected_items` not `collect_items`.

### R-10: URI and URL Suffixes

URI/URL fields **SHOULD** use the `_url` suffix for web-locatable resources (e.g., `profile_url`, `avatar_url`) and the `_uri` suffix for logical identifiers that are not necessarily HTTP-dereferenceable (e.g., `schema_uri`, `namespace_uri`).

#### REST API URL Paths

### R-11: kebab-case URL Paths

- Path segments **MUST** use `kebab-case`.
- **MUST NOT** include trailing slashes.

### R-12: Plural Resource Nouns

- Resources **MUST** be plural nouns.
- Singleton sub-resources (exactly one instance per parent) **MAY** use a singular noun: `/users/{user_id}/profile`.

### R-13: No Verbs in Paths

- **MUST NOT** contain verbs in path segments.
- Actions **MUST** be modeled as sub-resources: `POST /orders/{id}/cancellation` not `POST /orders/{id}/cancel`.

### R-14: snake_case Path Parameters

Path parameters **MUST** use `snake_case`: `/orders/{order_id}` not `/orders/{orderId}`. This enforces consistency with JSON field naming (R-5) — path parameters are typically mapped directly to request/response field names in code and OpenAPI schemas, so diverging case conventions introduce unnecessary translation logic.

### R-15: Version Prefix

- **SHOULD NOT** include `/api` as a path segment. The API nature is implied by the URL structure; this segment adds length without semantic value.
- Version prefix **MUST** use `/v{major}` as the first path segment: `/v1/orders`.

### R-16: Maximum Nesting Depth

- Nesting **MUST NOT** exceed three levels of resource hierarchy. Example: `/v1/orders/{order_id}/items/{item_id}/attachments` is three levels (orders → items → attachments) and is the maximum allowed depth.
- Deeper relationships **MUST** use query filters instead: `/v1/attachments?item_id={item_id}` rather than adding a fourth nesting level.

#### Event Type Names

### R-17: Dot-Notation Event Types

- **MUST** use dot-notation with the structure: `{domain}.{resource}.{action}`.
- The action segment **MUST** be past tense: `completed`, `created`, `cancelled`.
- Multi-word segments **MUST** use `snake_case`: `order_management.purchase_order.approved`.
- Event types **MUST NOT** use uppercase or camelCase.

Valid: `order.payment.completed`
Invalid: `order.payment.complete` (not past tense), `ORDER.PAYMENT.COMPLETED` (uppercase)

### R-18: Event Segment Depth

- Additional context segments **MAY** be appended to the base `{domain}.{resource}.{action}` structure when needed for disambiguation. For example: `order.payment.international.completed` (4 segments) or `order.payment.failed.insufficient_funds` (4 segments, last segment qualifying the action).
- Total segment depth (dot-separated parts) **SHOULD NOT** exceed five.

### R-19: Event Catalog Registration

- Event types **MUST** be registered in the organization's event catalog before use. The event catalog is a centralized registry of all permitted event type names, their schemas, owning domain, and documentation — analogous to a schema registry but for event type identities.
- Unregistered event types **MUST** be rejected by the event bus or API gateway at publish time.

#### Message Queue and Topic Names

### R-20: Topic Name Structure

- Topic names **MUST** use the structure: `{domain}.{resource}.{event_type}.v{major}`. Valid: `retail.orders.created.v1`.
- Multi-word segments **MUST** use `snake_case`. The dot (`.`) is the sole segment separator; using `kebab-case` inside segments would create ambiguous sub-separators and break broker wildcard patterns such as `retail.orders.*`.
- Topic names **MUST NOT** contain application names or team names — they describe the business event, not the producer.
- Topic names **MUST NOT** be absent a version suffix.

### R-21: Dead Letter and Retry Suffixes

- Dead letter queues **MUST** append the `.dlq` suffix: `retail.orders.created.v1.dlq`.
- Retry topics **MUST** append the `.retry.{attempt}` suffix: `retail.orders.created.v1.retry.1`.
- Suffixes (rather than prefixes) preserve the canonical topic hierarchy for prefix-based wildcard subscriptions. A subscription to `retail.orders.*` naturally encompasses the canonical topic and its DLQ/retry variants.

#### HTTP Header Names

### R-22: Custom Header Casing

- Custom headers **MUST** use `Kebab-Case` (each word title-capitalized, separated by hyphens).
- The `X-` prefix **SHOULD** be used for organization-specific proprietary headers that will not be broadly adopted or standardized (e.g., `X-Correlation-Id`, `X-Tenant-Id`). These are headers unique to a platform or organization.
- Headers intended for broad adoption or eventual standardization **SHOULD NOT** include the `X-` prefix per RFC 6648. RFC 6648 deprecated `X-` for headers that might eventually become IETF standards — it was never meant to prohibit `X-` on proprietary headers. For organization-specific headers, `X-` remains the conventional signal that the header is non-standard and distinguishes it from any future HTTP specification header.

### R-23: Standard Header Names

**MUST** use these exact names when semantics match:

| Header | Purpose |
|--------|---------|
| `X-Correlation-Id` | Distributed trace correlation |
| `X-Request-Id` | Unique request identifier |
| `X-Tenant-Id` | Multi-tenant context |
| `X-Flow-Id` | Business process flow |
| `X-Idempotency-Key` | Client-supplied idempotency token |

### R-24: No Internal Details in Headers

**MUST NOT** leak internal system names, service mesh topology, or infrastructure details in header names or values.

#### Enum Values

### R-25: UPPER_SNAKE_CASE Enums

- **MUST** use `UPPER_SNAKE_CASE`.
- **MUST NOT** use numeric codes, abbreviations, or single characters.

### R-26: Self-Descriptive Enum Values

Values **MUST** be self-descriptive without the field name: `PAYMENT_PENDING` not `PP`.

### R-27: UNKNOWN Default Value

Every enum **MUST** include `UNKNOWN` as the default/zero value for forward compatibility. Consumers receiving an unrecognized value **SHOULD** treat it as `UNKNOWN`.

### R-28: Deprecated Value Preservation

Deprecated enum values **MUST** be preserved until all consumers have migrated.

#### Query Parameter Names

### R-29: Query Parameter Conventions

- Query parameters **MUST** use `snake_case`.
- Standard pagination parameters **MUST** follow: `page_size` (integer), `page` (integer, 1-based), `cursor` (string).
- Sorting parameters **MUST** follow: `sort_by` (field name), `sort_order` (`asc`/`desc`).
- Filter parameters **SHOULD** use the field name directly.
- Complex filters **MAY** use bracket notation: `created_at[gte]=2026-01-01T00:00:00Z`.

### R-30: Boolean Query Parameters

- Boolean parameters **MUST** accept `true`/`false` string values.
- Presence of a parameter alone (e.g., `?deleted`) **MUST NOT** imply truth; explicit `?deleted=true` is required.

#### File and Directory Names

### R-31: File Naming Pattern

- File and directory names **MUST** use `kebab-case`.
- Pattern: `{resource}-{qualifier}-{date}.{extension}`.

### R-32: File Extension Conventions

- Extensions **MUST** be lowercase.
- Schema files **MUST** follow the pattern: `{resource}.{version}.schema.json`.

---

## Examples

```
GET /v1/purchase-orders/{purchase_order_id}/line-items?status=SHIPPED&sort_by=created_at&page_size=10

Headers:
  X-Correlation-Id: 8f14e45f-ceea-467f-a8dc-e67e2d16eb68
  X-Tenant-Id: tenant-acme-corp

Response:
{
  "line_items": [
    {
      "line_item_id": "li-001",
      "product_name": "Wireless Keyboard",
      "quantity": 5,
      "unit_price": { "amount": "49.99", "currency_code": "USD" },
      "status": "SHIPPED",
      "shipped": true,
      "created_at": "2026-03-27T14:30:00Z",
      "tracking_url": "https://tracking.example.com/pkg/12345"
    }
  ],
  "pagination": { "page": 1, "page_size": 10, "total_items": 1 }
}

Event:  procurement.line_item.shipped
Topic:  procurement.line_items.shipped.v1
File:   line-item-shipments-2026-03-28.csv
```

---

## Enforcement Rules

| Boundary | Validates | Rejection |
|----------|-----------|-----------|
| CI/CD Pipeline | OpenAPI paths, field names, enum values | Build fails, PR blocked |
| Schema Registry | Field names, event types | Registration rejected |
| API Gateway | URL path segments, header names | Route deployment rejected |
| Event Bus | Event type names, topic names | Publish rejected with error |
| Contract Review | All naming contexts | Review blocked |

### Hard Rejections (**MUST** reject)

Mixed case conventions in a single contract; verbs in URL path segments; non-past-tense event actions; unapproved abbreviations; internal system names in public contracts; missing version segment in topic names; enum values not in `UPPER_SNAKE_CASE`.

### Soft Warnings (**SHOULD** fix)

`is_` prefix on booleans (unless bare word is reserved); URL nesting beyond three levels; missing temporal suffix on date/time fields; query parameter names inconsistent with JSON fields.

### Validation Regex

| Context | Pattern |
|---------|---------|
| JSON fields | `^[a-z][a-z0-9]*(_[a-z0-9]+)*$` |
| URL path segments | `^[a-z][a-z0-9]*(-[a-z0-9]+)*$` |
| Path parameters | `\{[a-z][a-z0-9]*(_[a-z0-9]+)*\}` |
| Event types | `^[a-z][a-z0-9]*(_[a-z0-9]+)*(\.[a-z][a-z0-9]*(_[a-z0-9]+)*){2,4}$` |
| Queue/topic names | `^[a-z][a-z0-9]*(_[a-z0-9]+)*(\.[a-z][a-z0-9]*(_[a-z0-9]+)*){2,}\.v[0-9]+(\.(dlq\|retry\.[0-9]+))?$` |
| Enum values | `^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$` |
| Custom HTTP headers | `^X-([A-Z][a-z0-9]*(-[A-Z][a-z0-9]*)*)$` |
| File names | `^[a-z][a-z0-9]*(-[a-z0-9]+)*\.[a-z]+$` |

OpenAPI specs **MUST** be validated via Spectral or equivalent in CI/CD. AsyncAPI specs **MUST** be validated for event/topic naming. Schema registries **MUST** reject non-conforming field names. API gateways **SHOULD** enforce path conventions at route registration.

---

## References

### Normative

- [RFC 9110 - HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [RFC 9457 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457)
- [RFC 2119 - Key Words for Use in RFCs](https://www.rfc-editor.org/rfc/rfc2119)
- [RFC 6648 - Deprecating the X- Prefix](https://www.rfc-editor.org/rfc/rfc6648)

### Informative

- [Google AIP-140: Field Names](https://google.aip.dev/140) | [AIP-190: Naming](https://google.aip.dev/190) | [AIP-122: Resources](https://google.aip.dev/122)
- [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/)
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)
- [CloudEvents Specification](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)
- [Confluent Kafka Topic Naming](https://www.confluent.io/learn/kafka-topic-naming-convention/)

---

## Rationale

**snake_case for JSON fields:** Aligns with Google AIP-140 and Zalando. Most interoperable convention — valid identifier in Python, Ruby, Rust, SQL; maps cleanly to camelCase via serialization libraries.

**kebab-case for URLs:** Most readable in browser bars and logs, avoids case-sensitivity ambiguity. Google, Zalando, and Microsoft converge here.

**snake_case for path parameters (not camelCase):** Path parameters are directly mapped to JSON field names and OpenAPI schema property names in most frameworks. Consistent casing (snake_case in both JSON and path params) eliminates translation tables and documentation confusion. camelCase in path parameters would require consumers to maintain two naming maps.

**Dot-notation for events/topics:** Enables wildcard subscription (`order.payment.*`) in brokers like RabbitMQ and NATS. Slashes conflict with URL semantics; hyphens prevent wildcard matching in most broker implementations.

**snake_case within topic segments:** The dot (`.`) is the exclusive segment delimiter in topic names. Using kebab-case inside segments (e.g., `retail-orders.created.v1`) would create a secondary delimiter that ambiguates segment boundaries and breaks broker wildcard patterns. snake_case keeps dot as the sole separator.

**Suffixes for DLQ/retry topics:** A prefix approach (`dlq.retail.orders.created.v1`) would break the topic hierarchy used for wildcard subscriptions. `retail.orders.*` would no longer enumerate all order-domain topics including their DLQ variants. Suffix appended to the canonical name preserves hierarchy while clearly marking the variant type.

**X- prefix for proprietary headers:** RFC 6648 deprecated `X-` specifically for headers intended to eventually become IETF standards (similar to how `X-Gzip` became `Content-Encoding`). For proprietary, organization-specific headers like `X-Correlation-Id` or `X-Tenant-Id` that will never be standardized, `X-` remains the conventional marker distinguishing them from standard HTTP headers and preventing future name collisions.

**UPPER_SNAKE_CASE for enums:** Near-universal constant convention across languages. Visually distinct from field names and URL segments.

**Omitting is_ prefix:** The boolean type makes the `is_` prefix redundant. `active`, `verified`, and `enabled` are universally understood as boolean adjectives. `is_active` adds three characters with no semantic gain. Google AIP-140 explicitly recommends against it. Exception for reserved words prevents naming conflicts at the language/framework layer.

**No /api path segment:** The URL is already an API endpoint — `/api` conveys nothing a consumer doesn't already know. It makes paths longer and is absent from major production APIs (GitHub, Stripe, Twilio, AWS). The version prefix `/v{N}` already signals a versioned API contract.

**Maximum three URL nesting levels:** Deeper nesting creates URLs that are difficult to document, test, and reason about. Beyond three levels, the relationship structure is better represented via query parameters (e.g., `/v1/attachments?item_id=X`) which are easier to discover, filter, and authorize independently.

**Security:** Business-domain naming prevents leaking internal table names, service mesh topology, or infrastructure details that aid reconnaissance.

**Observability:** Uniform naming enables distributed trace aggregation without per-service field mapping. Predictable event structures enable pattern-based alerting (`*.payment.failed`).

---

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-03-28 | Initial definition |
| 1.1.0   | 2026-04-10 | Converted rules to bullet-point format; fixed approved-abbreviations table header; added inline rationale for R-7, R-14, R-15, R-16, R-18, R-19, R-20, R-21, R-22; expanded Rationale section |
