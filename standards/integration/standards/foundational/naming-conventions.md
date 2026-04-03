---
identifier: "INTG-STD-004"
name: "Integration Naming Conventions"
version: "1.0.0"
status: "MANDATORY"

domain: "INTEGRATION"
documentType: "standard"
category: "naming"
appliesTo: ["api", "events", "a2a", "files", "mcp", "webhooks", "grpc", "graphql", "batch", "streaming"]

lastUpdated: "2026-03-28"
owner: "Integration Architecture Board"

standardsCompliance:
  iso: []
  rfc: ["RFC-9110", "RFC-9457"]
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

Names **MUST** be descriptive. Single-character or opaque abbreviations **MUST NOT** be used. Names **MUST NOT** encode internal system names or infrastructure details. Use `customer_address` not `tbl_cust_addr`.

### R-3: Approved Abbreviations

Pre-approved abbreviations (all others **MUST** go through the registry):

| `id` identifier | `config` configuration | `info` information | `spec` specification |
|---|---|---|---|
| `stats` statistics | `auth` authentication | `msg` message | `org` organization |
| `env` environment | `max` maximum | `min` minimum | `avg` average |
| `src` source | `dest` destination | `prev` previous | `temp` temporary |
| `num` number | `qty` quantity | | |

### R-4: Name Syntax

Names **MUST NOT** begin with a digit. Names **MUST NOT** contain leading, trailing, or consecutive separators. Reserved words (`class`, `new`, `type`, `default`) **SHOULD** be avoided. Where unavoidable, **MUST** be domain-qualified (`account_type`).

#### JSON Field Names

### R-5: snake_case for JSON Fields

**MUST** use `snake_case`. **MUST NOT** use `camelCase`, `PascalCase`, or `kebab-case`.

### R-6: Plural Arrays and Singular Scalars

Arrays **MUST** be plural (`line_items`). Scalars/objects **MUST** be singular (`order`).

### R-7: Boolean Field Names

Booleans **MUST** use adjective/past-participle form (`active`, `verified`). **SHOULD** omit `is_` unless the bare word is reserved (`is_new`).

### R-8: Temporal Suffixes

Date/time fields **SHOULD** use temporal suffixes: `_at` (timestamp), `_on` (date), `_until` (expiry), `_after` (lower bound), `_duration` (elapsed).

### R-9: Field Name Word Order

**MUST NOT** include structural prepositions: `error_reason` not `reason_for_error`. Adjectives **MUST** precede the noun: `primary_address` not `address_primary`. Fields **MUST** represent state, not intent: `collected_items` not `collect_items`.

### R-10: URI and URL Suffixes

URI/URL fields **SHOULD** use `_url` (locator) or `_uri` (identifier) suffixes.

#### REST API URL Paths

### R-11: kebab-case URL Paths

Path segments **MUST** use `kebab-case`. **MUST NOT** include trailing slashes.

### R-12: Plural Resource Nouns

Resources **MUST** be plural nouns. Singular only for singletons (`/users/{user_id}/profile`).

### R-13: No Verbs in Paths

**MUST NOT** contain verbs. Model actions as sub-resources: `POST /orders/{id}/cancellation` not `POST /orders/{id}/cancel`.

### R-14: snake_case Path Parameters

Path parameters **MUST** use `snake_case`: `/orders/{order_id}` not `/orders/{orderId}`.

### R-15: Version Prefix

**SHOULD NOT** include `/api`. Version prefix **MUST** use `/v{major}`: `/v1/orders`.

### R-16: Maximum Nesting Depth

Nesting **MUST NOT** exceed three levels. Use query filters for deeper relationships.

#### Event Type Names

### R-17: Dot-Notation Event Types

**MUST** use dot-notation: `{domain}.{resource}.{action}` with past-tense action. Multi-word segments **MUST** use `snake_case`: `order_management.purchase_order.approved`. Valid: `order.payment.completed`. Invalid: `order.payment.complete` (not past tense), `ORDER.PAYMENT.COMPLETED` (uppercase).

### R-18: Event Segment Depth

Additional segments **MAY** be appended; total depth **SHOULD NOT** exceed five.

### R-19: Event Catalog Registration

Types **MUST** be registered in the event catalog. Unregistered types **MUST** be rejected.

#### Message Queue and Topic Names

### R-20: Topic Name Structure

**MUST** use: `{domain}.{resource}.{event_type}.v{major}`. Valid: `retail.orders.created.v1`. Multi-word segments **MUST** use `snake_case`. **MUST NOT** contain application or team names. Describe the business event.

### R-21: Dead Letter and Retry Suffixes

Dead letter queues **MUST** append `.dlq`. Retry topics **MUST** append `.retry.{attempt}`.

#### HTTP Header Names

### R-22: Custom Header Casing

Custom headers **MUST** use `Kebab-Case` (title capitalized). `X-` prefix only for organization-specific headers; omit for broad adoption per RFC 6648.

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

**MUST NOT** leak internal system names or infrastructure details.

#### Enum Values

### R-25: UPPER_SNAKE_CASE Enums

**MUST** use `UPPER_SNAKE_CASE`. **MUST NOT** use numeric codes, abbreviations, or single characters.

### R-26: Self-Descriptive Enum Values

Values **MUST** be self-descriptive without the field name: `PAYMENT_PENDING` not `PP`.

### R-27: UNKNOWN Default Value

Every enum **MUST** include `UNKNOWN` as the default for forward compatibility.

### R-28: Deprecated Value Preservation

Deprecated values **MUST** be preserved until all consumers migrate.

#### Query Parameter Names

### R-29: Query Parameter Conventions

**MUST** use `snake_case`. Standard pagination: `page_size` (integer), `page` (integer, 1-based), `cursor` (string). Sorting: `sort_by`, `sort_order` (`asc`/`desc`). Filters **SHOULD** use the field name directly. Complex filters **MAY** use brackets: `created_at[gte]=2026-01-01T00:00:00Z`.

### R-30: Boolean Query Parameters

Boolean parameters **MUST** accept `true`/`false` strings. Presence alone **MUST NOT** imply truth.

#### File and Directory Names

### R-31: File Naming Pattern

**MUST** use `kebab-case`. Pattern: `{resource}-{qualifier}-{date}.{extension}`.

### R-32: File Extension Conventions

Extensions **MUST** be lowercase. Schema files **MUST** follow `{resource}.{version}.schema.json`.

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
- [RFC 6648 - Deprecating X- Prefix](https://www.rfc-editor.org/rfc/rfc6648)

### Informative

- [Google AIP-140: Field Names](https://google.aip.dev/140) | [AIP-190: Naming](https://google.aip.dev/190) | [AIP-122: Resources](https://google.aip.dev/122)
- [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/)
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)
- [CloudEvents Specification](https://github.com/cloudevents/spec/blob/main/cloudevents/spec.md)
- [Confluent Kafka Topic Naming](https://www.confluent.io/learn/kafka-topic-naming-convention/)

---

## Rationale

**snake_case for JSON fields:** Aligns with Google AIP-140 and Zalando. Most interoperable convention - valid identifier in Python, Ruby, Rust, SQL; maps cleanly to camelCase via serialization libraries.

**kebab-case for URLs:** Most readable in browser bars and logs, avoids case-sensitivity ambiguity. Google, Zalando, and Microsoft converge here.

**Dot-notation for events/topics:** Enables wildcard subscription (`order.payment.*`) in brokers like RabbitMQ and NATS. Slashes conflict with URL semantics; hyphens prevent wildcard matching.

**UPPER_SNAKE_CASE for enums:** Near-universal constant convention across languages. Visually distinct from field names and URL segments.

**Security:** Business-domain naming prevents leaking internal table names, service mesh topology, or infrastructure details that aid reconnaissance.

**Observability:** Uniform naming enables distributed trace aggregation without per-service field mapping. Predictable event structures enable pattern-based alerting (`*.payment.failed`).

---

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-03-28 | Initial definition |
