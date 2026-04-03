---
identifier: "INTG-STD-015"
name: "Event Envelope Standard"
version: "1.0.0"
status: "MANDATORY"

domain: "INTEGRATION"
documentType: "standard"
category: "protocol"
appliesTo: ["events", "streaming", "webhooks"]

lastUpdated: "2026-03-28"
owner: "Integration Architecture Board"

standardsCompliance:
  iso: []
  rfc: []
  w3c: []
  other: ["CNCF-CloudEvents-v1.0.2"]

taxonomy:
  capability: "event-driven"
  subCapability: "event-envelope"
  layer: "contract"

enforcement:
  method: "automated"
  validationRules:
    requiredAttributes: ["specversion", "id", "source", "type"]
    specversion: "1.0"
    sourceFormat: "URI-reference"
    idUniqueness: "unique-per-source"
  rejectionCriteria:
    - "Missing required CloudEvents context attributes"
    - "Invalid specversion value"
    - "Non-URI source attribute"
    - "Duplicate event ID from same source"

dependsOn: ["INTG-STD-004", "INTG-STD-005"]
supersedes: ""
---

# Event Envelope

## Purpose

This standard mandates **CloudEvents v1.0.2** as the universal event envelope for all events produced, consumed, or relayed across integration boundaries. Without a uniform envelope, each team invents its own metadata schema, making cross-system correlation, schema evolution, and observability prohibitively expensive. CloudEvents - a CNCF graduated specification - provides a vendor-neutral, protocol-agnostic envelope with broad ecosystem support (Knative, Azure Event Grid, Amazon EventBridge, Google Eventarc).

> *Normative language (**MUST**, **MUST NOT**, **SHOULD**, **MAY**) follows RFC 2119 semantics.*

---

## Rules

### R-1: Mandatory CloudEvents Adoption

All events crossing a service boundary **MUST** use the CloudEvents v1.0.2 envelope. The `specversion` attribute **MUST** be `"1.0"`. Non-conforming events **MUST** be rejected by gateways, brokers, and consumers.

### R-2: Required Context Attributes

Every CloudEvent **MUST** include these four context attributes:

| Attribute | Type | Constraint | Description |
|-----------|------|------------|-------------|
| `specversion` | String | Exactly `"1.0"` | CloudEvents specification version |
| `id` | String | Non-empty; unique within scope of `source` | Event identifier; UUID v4 or ULID **RECOMMENDED** |
| `source` | URI-reference | Non-empty; absolute URI **RECOMMENDED** | Identifies the producing system and context |
| `type` | String | Non-empty; reverse-DNS prefix **REQUIRED** | Describes the kind of occurrence |

The combination of `source` + `id` **MUST** be globally unique for distinct events. A producer **MAY** reuse the same `id` when re-delivering the same logical event (idempotency).

### R-3: Recommended Context Attributes

Producers **SHOULD** include the following optional attributes:

| Attribute | Type | Constraint | Recommendation |
|-----------|------|------------|----------------|
| `time` | Timestamp | RFC 3339, UTC (`Z` suffix) | **SHOULD** be included for audit trail. **MUST** use UTC per INTG-STD-002 when present. |
| `datacontenttype` | String | RFC 2046 media type | **SHOULD** be included when data is present. Defaults to `application/json` when omitted. |
| `dataschema` | URI | Absolute URI | **SHOULD** be included for schema-governed events. **MUST** point to a versioned schema endpoint. |
| `subject` | String | Non-empty | **SHOULD** be included when the event pertains to a specific resource within the source. |

### R-4: Event Type Naming

Event types **MUST** follow INTG-STD-004 (Naming Standard):

- **MUST** use reverse-DNS prefix rooted at the organization domain.
- **MUST** follow the pattern: `{reverse-dns}.{domain}.{entity}.{action}[.{version}]`
- **MUST** use lowercase with dots as separators.
- A version suffix (e.g., `.v2`) **SHOULD** be appended for breaking schema changes.

### R-5: Source Attribute Formatting

The `source` attribute **MUST** be a valid URI-reference per RFC 3986. Producers **SHOULD** use absolute URIs. The source **MUST** identify the producing system and **MAY** include a path to narrow context. The source **MUST NOT** expose internal hostnames, IP addresses, port numbers, or infrastructure identifiers (see R-14).

### R-6: Extension Attributes

Extension attribute names **MUST** contain only lowercase ASCII letters (`a`-`z`) and digits (`0`-`9`), with a recommended maximum length of 20 characters.

Recommended extensions:

| Extension | Source Specification | Purpose |
|-----------|---------------------|---------|
| `traceparent` | W3C Trace Context | Distributed tracing. Producers **SHOULD** propagate from the originating request. |
| `tracestate` | W3C Trace Context | Vendor-specific tracing data. **SHOULD** accompany `traceparent`. |
| `partitionkey` | CloudEvents Partitioning | Ordered delivery within a partition. **SHOULD** be set for causally ordered events. |
| `sequence` | CloudEvents Sequence | Event ordering from a source. **MAY** be used with `partitionkey`. |

Custom extensions **MUST** be namespaced to avoid collisions (e.g., `examplecorrelationid`). Custom extensions **MUST NOT** redefine semantics of documented CloudEvents extensions. Intermediaries **SHOULD** forward all extension attributes, even unrecognized ones.

### R-7: Structured Content Mode

In structured mode, the entire CloudEvent **MUST** be serialized as a single JSON object per the CloudEvents JSON Format. The transport content-type **MUST** be `application/cloudevents+json; charset=utf-8`. JSON payloads **MUST** be embedded directly in `data` (not string-escaped). Binary payloads **MUST** use `data_base64` instead. The `data` and `data_base64` fields **MUST NOT** both be present.

### R-8: Binary Content Mode

In binary mode, context attributes **MUST** be mapped to transport-native headers and the data payload **MUST** occupy the message body directly. For HTTP, headers use the `ce-` prefix. For Kafka, headers use the `ce_` prefix with UTF-8 encoded values. The transport content-type header **MUST** reflect the actual data media type. The `datacontenttype` attribute **MUST NOT** appear as a separate header in HTTP binary mode.

### R-9: Content Mode Selection

| Transport | Default Mode | Guidance |
|-----------|-------------|----------|
| HTTP (webhooks, REST callbacks) | Structured | Binary **MAY** be used when payload size dominates and header inspection is not needed. |
| Kafka | Structured | Binary **MAY** be used on high-throughput internal topics with tightly coupled consumers. |
| AMQP | Binary | Leverages AMQP application properties for context attributes. |
| MQTT | Structured | **MUST** use structured for MQTT v3.1 (no user-defined headers). MQTT v5 **MAY** use binary. |

Producers **MUST** document which content mode they emit in their API or AsyncAPI definition.

### R-10: Batch Delivery

Batch delivery **MUST** use the CloudEvents JSON Batch Format. The content-type **MUST** be `application/cloudevents-batch+json; charset=utf-8`. The body **MUST** be a JSON array of complete CloudEvents. An empty batch **MUST** be `[]`. Each event **MUST** independently satisfy all attribute requirements. Consumers **MUST NOT** assume ordering unless events share the same `partitionkey` and include `sequence` values.

A single batch **MUST NOT** exceed 1 MiB unless producer and consumer have an explicit bilateral agreement. Producers **SHOULD** target 100 events or fewer per batch.

### R-11: Event Size Constraints

| Constraint | Limit | Rationale |
|-----------|-------|-----------|
| Single event (envelope + data) | **MUST NOT** exceed 256 KiB | Lowest common denominator across major brokers and webhook receivers |
| Context attributes only | **SHOULD NOT** exceed 4 KiB | Keep headers lightweight for binary mode |
| `data` payload | **SHOULD NOT** exceed 252 KiB | Envelope overhead budget |

Events exceeding 256 KiB **MUST** use the claim-check pattern: store the payload externally and include a retrieval URI in the `data` field with `claimCheckUri` and `claimCheckContentType` fields.

### R-12: HTTP Protocol Binding

HTTP-bound CloudEvents **MUST** comply with the CloudEvents HTTP Protocol Binding v1.0.2. Events **MUST** be sent as HTTP POST requests. Receivers **MUST** return `2xx` for successfully received events. A `429` response **MUST** trigger sender-side backoff. A `5xx` response **SHOULD** trigger retry with exponential backoff. Senders **SHOULD** support the CloudEvents webhook validation handshake (HTTP OPTIONS with `WebHook-Request-Origin`).

### R-13: Kafka Protocol Binding

Kafka-bound CloudEvents **MUST** comply with the CloudEvents Kafka Protocol Binding v1.0.2. The Kafka message key **SHOULD** be set to the `partitionkey` extension value when present, or to the `subject` attribute, to colocate related events. Producers **MUST** set `partitionkey` when causal ordering is required.

### R-14: Security - Metadata Hygiene

Event envelope metadata **MUST NOT** leak internal infrastructure details:

- `source` **MUST NOT** contain internal hostnames, private IPs, container/pod identifiers, or internal ports.
- Extension attributes **MUST NOT** carry credentials, tokens, session identifiers, or PII.
- `dataschema` **MUST** be reachable only from authorized networks or **MUST** be a logical identifier (URN).
- Gateways at trust boundaries **SHOULD** validate and sanitize envelope attributes before forwarding externally.

### R-15: Auditability

- Producers **MUST** set `id` to a value traceable in the producing system's logs.
- Producers **SHOULD** set `time` for temporal correlation and `traceparent` for distributed trace correlation.
- Consumers **MUST** log `id`, `source`, `type`, and `time` upon receipt.
- The combination of `source` + `id` + `time` **MUST** be sufficient to locate the originating event in producer logs.

### R-16: Allowed Serialization Formats

The CloudEvents JSON Event Format **MUST** be the default serialization. All implementations **MUST** support it. Producers and consumers **MAY** use CloudEvents Protobuf or Avro formats by bilateral agreement, but **MUST** still carry all required context attributes.

---

## Examples

### Valid Event - Structured Content Mode

```json
{
  "specversion": "1.0",
  "id": "01HZX3KQVB8E72GQJHF5RM6YWN",
  "source": "//orders.example.com/checkout",
  "type": "com.example.order.created",
  "time": "2026-03-28T14:22:31.482Z",
  "datacontenttype": "application/json",
  "dataschema": "https://schemas.example.com/orders/created/v1.json",
  "subject": "order-8842",
  "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  "data": {
    "orderId": "order-8842",
    "customerId": "cust-1029",
    "totalAmount": { "value": "149.99", "currency": "USD" }
  }
}
```

### Invalid Event - Missing Required Attributes

The following event is **non-compliant** and **MUST** be rejected:

```json
{
  "id": "evt-100",
  "type": "OrderCreated",
  "data": { "orderId": "order-100" }
}
```

**Violations:** Missing `specversion` (required). Missing `source` (required). `type` uses PascalCase without reverse-DNS prefix (violates R-4).

---

## Enforcement Rules

### Gateway Enforcement

API gateways and event brokers at trust boundaries **MUST** enforce:

1. **Ingress validation** - All required context attributes present and well-formed (`specversion` matches `^1\.0$`; `id` is non-empty; `source` is a valid URI-reference; `type` matches `^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*(-[a-z0-9]+)*){3,}$`).
2. **Source sanitization** - Reject `source` values matching internal infrastructure patterns (private IPs, `.internal`, `.local`, `localhost`, `k8s://`).
3. **Size enforcement** - Reject events exceeding 256 KiB with HTTP 413 or equivalent.
4. **Time validation** - When present, `time` **MUST** match RFC 3339 UTC format (`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$`).
5. **Extension name validation** - Extension attribute names **MUST** match `^[a-z][a-z0-9]{0,19}$`.

### Producer Enforcement

Build pipelines **SHOULD** include a CloudEvents linting step validating required attributes, `source`/`type` naming per INTG-STD-004, and approved extension names.

### Consumer Enforcement

Consumers **MUST** reject events missing any required context attribute, log `id`/`source`/`type`/`time` of every received event, and forward unrecognized extension attributes when re-emitting.

---

## References

| Reference | URI |
|-----------|-----|
| CloudEvents Specification v1.0.2 | https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md |
| CloudEvents JSON Event Format v1.0.2 | https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/formats/json-format.md |
| CloudEvents HTTP Protocol Binding v1.0.2 | https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/bindings/http-protocol-binding.md |
| CloudEvents Kafka Protocol Binding v1.0.2 | https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/bindings/kafka-protocol-binding.md |
| W3C Trace Context | https://www.w3.org/TR/trace-context/ |
| INTG-STD-004 - Naming Standard | Internal |

---

## Rationale

**Why CloudEvents over a custom envelope?** CloudEvents is the only CNCF graduated event envelope specification with broad industry adoption across Azure Event Grid, Amazon EventBridge, Google Eventarc, and Knative. A custom envelope would forgo ecosystem compatibility and impose a perpetual translation tax.

**Why structured mode as default?** Structured mode keeps envelope and data together as a single unit, eliminating header-body mismatches during transport hops. Binary mode is permitted for documented performance-sensitive paths.

**Why the 256 KiB size limit?** This is the lowest common denominator across major event infrastructure. The claim-check pattern provides an escape hatch for large payloads.

**Why prohibit internal topology in source?** Event metadata flows across trust boundaries - a `source` containing internal hostnames or IPs reveals cloud provider, VPC structure, and service ports to external consumers.

**Why `time` is SHOULD rather than MUST?** Some producers (legacy adapters, IoT gateways) cannot guarantee accurate clocks. Systems requiring strict temporal ordering should use the `sequence` extension.

**Why ULID or UUID v4 for event IDs?** Both provide strong uniqueness without centralized coordination. ULIDs add temporal sortability. Sequential integers are discouraged as they require coordination and leak volume information.

---

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-03-28 | Initial definition |
