---
identifier: "INTG-STD-029"
name: "Integration Observability"
version: "1.0.0"
status: "MANDATORY"

domain: "INTEGRATION"
documentType: "standard"
category: "observability"
appliesTo: ["api", "events", "a2a", "files", "mcp", "webhooks", "grpc", "graphql", "batch", "streaming"]

lastUpdated: "2026-03-28"
owner: "Integration Architecture Board"

standardsCompliance:
  iso: []
  rfc: []
  w3c: ["Trace-Context"]
  other: ["OpenTelemetry-Specification", "OWASP-Logging-Cheat-Sheet"]

taxonomy:
  capability: "observability"
  subCapability: "logging-tracing-metrics"
  layer: "infrastructure"

enforcement:
  method: "hybrid"
  validationRules:
    traceContextHeader: "traceparent"
    logFormat: "JSON"
    requiredLogFields: ["timestamp", "level", "trace_id", "service", "message"]
  rejectionCriteria:
    - "Missing traceparent header propagation"
    - "Unstructured (non-JSON) log output"
    - "PII or secrets in log entries"
    - "Missing correlation ID in API responses"

dependsOn: ["INTG-STD-004"]
supersedes: ""
---

# Observability

## Purpose

Every integration action - API call, event, file transfer, or agent handshake - **MUST** be traceable from origin to destination. This standard establishes mandatory requirements for distributed tracing (W3C Trace Context), structured logging (JSON), and metrics collection (OpenTelemetry) across all integration touchpoints. It also codifies what **MUST NOT** appear in logs to prevent data leakage per the OWASP Logging Cheat Sheet.

## Rules

### R-1: W3C Trace Context Propagation

All integration endpoints **MUST** propagate the `traceparent` HTTP header per the W3C Trace Context specification:

```
traceparent: {version}-{trace-id}-{parent-id}-{trace-flags}
Example:     00-0af7651916cd43dd8448eb211c80319c-b9c7c989f97918e1-01
```

Services **MUST NOT** generate all-zero `trace-id` or `parent-id` values. If a request arrives without `traceparent`, the receiving service **MUST** generate a new trace context.

Services **SHOULD** propagate the `tracestate` header alongside `traceparent` and **MUST NOT** modify or strip `tracestate` entries they do not own.

For non-HTTP transports, trace context **MUST** be propagated via the protocol's native metadata mechanism (gRPC metadata keys, Kafka message headers, AMQP application properties, batch file manifest metadata).

### R-2: Correlation IDs

All API responses **MUST** include an `X-Request-ID` header containing a UUID v4 or ULID. If the incoming request includes `X-Request-ID`, the service **MUST** echo that value; otherwise it **MUST** generate one.

The `X-Request-ID` **MUST** be included in all log entries for that request via the `request_id` field. The `X-Request-ID` is distinct from `trace-id` - it is a business-level identifier that **MAY** be shared with API consumers for support purposes.

### R-3: Structured Logging Format

All integration components **MUST** emit logs in JSON format. Unstructured log output **MUST NOT** be used beyond local development.

**Required fields:**

| Field | Type | Description | Example |
| ----- | ---- | ----------- | ------- |
| `timestamp` | string | ISO 8601 with UTC (`Z`), microsecond precision | `"2026-03-28T14:32:01.482319Z"` |
| `level` | string | Log severity (uppercase) | `"INFO"` |
| `trace_id` | string | W3C trace identifier (32 hex chars) | `"0af7651916cd43dd8448eb211c80319c"` |
| `span_id` | string | Current span identifier (16 hex chars) | `"b9c7c989f97918e1"` |
| `service` | string | Service name (lowercase, hyphenated) | `"order-service"` |
| `message` | string | Human-readable event description | `"Payment authorization completed"` |

Optional fields **SHOULD** be included when applicable: `request_id`, `environment`, `version`, `operation`, `duration_ms`, `http.method`, `http.status_code`, `http.url` (sensitive parameters redacted), `error.type`, `error.message`.

The `service` field **MUST** match the OpenTelemetry `service.name` resource attribute.

### R-4: Prohibited Log Content

Log entries **MUST NOT** contain:

| Category | Examples |
| -------- | -------- |
| PII | Names, emails, phone numbers, government IDs, dates of birth |
| Authentication credentials | Passwords, API keys, bearer tokens, JWTs, session IDs |
| Cryptographic material | Private keys, certificates, encryption keys |
| Financial data | Full card numbers, bank account numbers, CVV codes |
| Health data | Medical records, diagnoses, treatment information |
| Full request/response bodies | Use truncated or summarized representations instead |

If debugging requires logging intersecting data, it **MUST** be masked before writing (e.g., `"d***@example.com"`, `"****-****-****-4242"`, `"sk-prod-****"`, or log schema shape only: `"body_keys: [\"name\", \"address\"]"`).

Log entries **MUST** be sanitized against log injection - newlines, control characters, and ANSI escape sequences **MUST** be escaped or stripped from user-supplied values (ref: OWASP CWE-117). Stack traces **SHOULD** only appear at `ERROR` or `FATAL` level and **MUST** be reviewed for leaked secrets.

### R-5: Log Levels

Services **MUST** use the following log levels consistently:

| Level | When to Use |
| ----- | ----------- |
| `FATAL` | Unrecoverable failure; service cannot continue |
| `ERROR` | Operation failed; requires attention but service continues |
| `WARN` | Unexpected condition that does not prevent operation |
| `INFO` | Normal operational events worth recording |
| `DEBUG` | Diagnostic detail for troubleshooting |
| `TRACE` | Protocol-level verbosity |

Production environments **MUST** default to `INFO`. `DEBUG` and `TRACE` **MUST** be activatable at runtime without redeployment. `ERROR` **MUST** be reserved for conditions requiring investigation - client 4xx errors **SHOULD** be logged at `WARN`, not `ERROR`.

### R-6: Metrics

All custom integration metrics **MUST** follow OpenTelemetry semantic naming conventions: dot-separated namespaces, lowercase, no units in names.

**Required metrics for every integration endpoint:**

| Metric Name | Type | Unit | Description |
| ----------- | ---- | ---- | ----------- |
| `integration.request.duration` | Histogram | `s` | Request-to-response time |
| `integration.request.count` | Counter | `{request}` | Total requests |
| `integration.request.error.count` | Counter | `{request}` | Failed requests |
| `integration.request.active` | UpDownCounter | `{request}` | In-flight requests |

**Additional metrics for event-driven integrations:**

| Metric Name | Type | Unit | Description |
| ----------- | ---- | ---- | ----------- |
| `integration.event.publish.count` | Counter | `{event}` | Events published |
| `integration.event.consume.count` | Counter | `{event}` | Events consumed |
| `integration.event.consume.duration` | Histogram | `s` | Event processing time |
| `integration.event.consume.lag` | Gauge | `{event}` | Consumer lag |
| `integration.event.dlq.count` | Counter | `{event}` | Dead-letter queue events |

All metrics **MUST** include resource attributes `service.name`, `service.version`, and `deployment.environment.name`. Common attributes **MUST** include `integration.type`, `integration.target`, `network.protocol.name`, and `error.type` where applicable.

### R-7: Span Attributes

All integration operations **MUST** be instrumented as OpenTelemetry spans. Span names **MUST** follow protocol conventions (e.g., `GET /api/v2/orders` for HTTP, `orders.created publish` for messaging).

HTTP spans **MUST** include: `http.request.method`, `http.response.status_code`, `url.path`, `server.address`. Messaging spans **MUST** include: `messaging.system`, `messaging.destination.name`, `messaging.operation.type`.

Spans **MUST** set appropriate `SpanKind`: `SERVER`/`CLIENT` for HTTP/gRPC, `PRODUCER`/`CONSUMER` for messaging, `INTERNAL` for local processing. Span status **MUST** be set to `ERROR` on failure; HTTP 5xx **MUST** set span error status, 4xx **SHOULD NOT**.

### R-8: Audit Traceability

Every state-changing integration operation **MUST** produce an `INFO` log entry including at minimum: `trace_id`, `span_id`, `request_id`, `operation`, `service`, and outcome. It **MUST** be possible to reconstruct the complete execution path of any transaction using `trace_id` across all participating services. Audit-relevant entries **MUST** be retained per the organization's data retention policy.

## Examples

### Structured Log Entry

```json
{
  "timestamp": "2026-03-28T14:32:01.482319Z",
  "level": "INFO",
  "trace_id": "0af7651916cd43dd8448eb211c80319c",
  "span_id": "b9c7c989f97918e1",
  "service": "order-service",
  "request_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "operation": "createOrder",
  "http.method": "POST",
  "http.status_code": 201,
  "duration_ms": 142.7,
  "message": "Order created successfully"
}
```

### Trace Context Headers

```http
GET /api/v2/orders/12345 HTTP/1.1
Host: order-service.internal
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b9c7c989f97918e1-01
tracestate: vendorA=eyJhbGciOiJIUzI,vendorB=abc123
X-Request-ID: f47ac10b-58cc-4372-a567-0e02b2c3d479
```

## Enforcement Rules

- **Gateway enforcement**: API gateways **MUST** generate `traceparent` and `X-Request-ID` for incoming external requests that lack them. Internal service-to-service requests missing `traceparent` **SHOULD** be flagged.
- **Build-time enforcement**: CI/CD pipelines **MUST** validate that all log output is valid JSON with required fields (`timestamp`, `level`, `trace_id`, `span_id`, `service`, `message`), ISO 8601 timestamps, and valid log levels. Non-JSON log output **MUST** fail validation.
- **Runtime enforcement**: Log aggregation systems **SHOULD** reject or quarantine entries missing required fields.
- **Security enforcement**: Log pipelines **SHOULD** include automated PII/credential pattern detection. Matches **MUST** trigger security team alerts. Repeated violations **MAY** result in deployment blocks.
- **Correlation ID check**: API gateways or integration test suites **MUST** verify all responses include `X-Request-ID`.

**Validation patterns:**

- traceparent: `^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$`
- X-Request-ID (UUID v4): `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`
- X-Request-ID (ULID): `^[0-9A-HJKMNP-TV-Z]{26}$`
- Timestamp (ISO 8601 UTC): `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$`

## References

- [W3C Trace Context Specification](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

## Rationale

**W3C Trace Context over proprietary headers** - Vendor-neutral W3C Recommendation supported by all major observability platforms, preventing lock-in and ensuring partner interoperability.

**JSON structured logging** - Machine-parseable without custom grammars, natively supported by all major log aggregation platforms, and enables field-level indexing for correlation across services.

**Separate X-Request-ID from trace-id** - The trace-id is an internal tracing concern that may be regenerated at trust boundaries; X-Request-ID is a business-facing identifier consumers can reference in support tickets.

**Prohibit PII in logs** - Logs are stored with broader access controls than production databases, making aggregated log stores high-value targets (ref: OWASP CWE-532). Prevention is far more effective than post-hoc redaction.

**OpenTelemetry naming conventions** - CNCF-backed industry standard ensuring metrics and spans from different teams, languages, and frameworks are consistent and correlatable without manual mapping.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-03-28 | Initial definition |
