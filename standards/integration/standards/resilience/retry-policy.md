---
identifier: "INTG-STD-034"
name: "Retry Policy"
version: "1.0.0"
status: "MANDATORY"

domain: "INTEGRATION"
documentType: "standard"
category: "reliability"
appliesTo: ["api", "events", "a2a", "mcp", "webhooks", "grpc", "graphql", "batch"]

lastUpdated: "2026-03-28"
owner: "Integration Architecture Board"

standardsCompliance:
  iso: []
  rfc: ["RFC-9110", "RFC-6585"]
  w3c: []
  other: ["AWS-Builders-Library", "Google-Cloud-Retry-Strategy"]

taxonomy:
  capability: "reliability"
  subCapability: "retry-policy"
  layer: "infrastructure"

enforcement:
  method: "hybrid"
  validationRules:
    algorithm: "exponential-backoff-with-jitter"
    maxRetries: 5
    maxRetryDuration: "30s"
  rejectionCriteria:
    - "Fixed-interval retry without backoff"
    - "Retry on 4xx client errors (except 429 and 408)"
    - "Retry without idempotency guarantee on non-idempotent operations"
    - "Missing Retry-After header respect"

dependsOn: ["INTG-STD-029", "INTG-STD-035"]
supersedes: ""
---

# Retry Policy

## Purpose

Uncontrolled retries are a leading cause of cascading failures. When clients retry simultaneously with correlated timing, the resulting "thundering herd" overwhelms recovering services. This standard mandates exponential backoff with jitter, retry budgets, and idempotency requirements across all integration boundaries.

Companion standards: INTG-STD-033 (Resilience), INTG-STD-035 (Timeout).

> Normative language follows RFC 2119 semantics.

## Rules

### R-1: Exponential Backoff with Full Jitter

All retry implementations **MUST** use exponential backoff with full jitter as the default algorithm:

```
sleep = random_between(0, min(cap, base * 2 ^ attempt))
```

- `base` **MUST** default to 1 second
- `cap` **MUST** default to 30 seconds
- Decorrelated jitter **MAY** be used as an alternative
- Equal jitter and fixed-interval retry **MUST NOT** be used

### R-2: Maximum Retry Count

All retry implementations **MUST** enforce a maximum retry count.

| Context | Default | Allowed Range |
|---------|---------|---------------|
| Synchronous API calls | 3 | 1-5 |
| Async event processing | 5 | 1-10 |
| Webhook delivery | 5 | 3-8 |
| Batch job items | 3 | 1-5 |
| gRPC unary calls | 3 | 1-5 |

Exceeding the upper bound requires Integration Architecture Board approval.

### R-3: Total Retry Duration

All retry loops **MUST** enforce a total duration cap regardless of retry count:

- Synchronous API calls: **MUST NOT** exceed 30 seconds
- Async events / webhooks: **MUST NOT** exceed 24 hours

Webhook retry schedule **SHOULD** use increasing intervals:

| Attempt | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---------|---|---|---|---|---|---|---|---|
| Delay | 0s | 1s | 5s | 30s | 2m | 15m | 1h | 4h |

After the final attempt, the message **MUST** be routed to a DLQ and an alert **MUST** fire.

### R-4: Retryable vs Non-Retryable Classification

Implementations **MUST** classify failures before deciding whether to retry.

Retryable (**MUST** retry with backoff):

| HTTP | gRPC | Network |
|------|------|---------|
| 408 Request Timeout | UNAVAILABLE (14) | Connection refused |
| 429 Too Many Requests | DEADLINE_EXCEEDED (4) | Connection reset |
| 500 Internal Server Error | RESOURCE_EXHAUSTED (8) | Socket timeout |
| 502 Bad Gateway | ABORTED (10) | DNS failure (max 2 attempts) |
| 503 Service Unavailable | | TLS handshake timeout |
| 504 Gateway Timeout | | |

Non-retryable (**MUST NOT** retry):

| HTTP | gRPC | Other |
|------|------|-------|
| 400 Bad Request | INVALID_ARGUMENT (3) | TLS certificate error |
| 401 Unauthorized | NOT_FOUND (5) | Serialization error |
| 403 Forbidden | PERMISSION_DENIED (7) | Invalid configuration |
| 404 Not Found | UNAUTHENTICATED (16) | Token permanently revoked |
| 409 Conflict | UNIMPLEMENTED (12) | |
| 422 Unprocessable Entity | | |

### R-5: Retry-After Compliance

When a response includes a `Retry-After` header (RFC 9110 Section 10.2.3):

1. The client **MUST** wait at least the specified duration
2. `Retry-After` **MUST** take precedence over calculated backoff when greater
3. If `Retry-After` exceeds remaining retry budget, the client **MUST** fail immediately

### R-6: Idempotency Requirements

Retries **MUST** be safe. A retry is safe only when the operation is idempotent or protected by an idempotency mechanism.

Safe to retry without additional measures: GET, HEAD, OPTIONS, PUT, DELETE.

**MUST** use `Idempotency-Key` header for retries: POST, PATCH.

Idempotency key rules:
- Client **MUST** generate a UUID v4 per logical operation
- Same key **MUST** be reused across all retry attempts
- Servers **MUST** store keys for minimum 24 hours and return cached responses for duplicates
- Keys **MUST** be at most 64 characters

Event consumers **MUST** implement idempotent processing using a deduplication store keyed on event ID (minimum 7-day window).

### R-7: Retry Budget

All services **MUST** enforce a retry budget to prevent amplification:

- Maximum **20%** of total requests **MAY** be retries over a rolling 30-second window
- When budget is exhausted, retries **MUST** be suppressed and original error returned
- Budget **MUST** be tracked per downstream dependency
- Budget exhaustion **SHOULD** trigger circuit breaker open (INTG-STD-033)

### R-8: Dead-Letter Queue Routing

For async integrations (events, webhooks, queues):

1. After retry exhaustion, messages **MUST** be routed to a DLQ
2. DLQ messages **MUST** retain original payload, headers, and retry metadata
3. DLQ messages **MUST** trigger an alert
4. Messages **MUST NOT** be silently dropped

### R-9: Security

Retry logic **MUST NOT** introduce security vulnerabilities:

1. Retries **MUST** use the original auth context (refresh token if expired, never degrade)
2. Retry logs **MUST NOT** include request bodies, tokens, or PII
3. TLS certificate errors **MUST NOT** be retried (potential MITM)
4. Retry budget (R-7) is mandatory to prevent DDoS amplification

### R-10: Observability

Every retry attempt **MUST** be logged with: `correlation_id`, `dependency`, `attempt`, `max_attempts`, `backoff_ms`, `error_type`, `idempotency_key`.

Required metrics:

| Metric | Type |
|--------|------|
| `retry_attempts_total` | Counter (by service, dependency, attempt_number) |
| `retry_exhausted_total` | Counter (by service, dependency) |
| `retry_backoff_duration_seconds` | Histogram |
| `retry_budget_utilization_ratio` | Gauge |
| `dlq_messages_total` | Counter (by queue) |

## Examples

### Retry with full jitter

```
function retry(operation, max_retries=3, base=1.0, cap=30.0, budget):
    deadline = now() + max_duration

    for attempt in 0..max_retries:
        result = operation()
        if result.success:
            return result

        if not is_retryable(result.error):
            fail(result.error)

        remaining = deadline - now()
        if attempt == max_retries or remaining <= 0:
            fail("retries exhausted", attempts=attempt+1)
        if not budget.may_retry():
            fail("retry budget exhausted")

        delay = min(random(0, min(cap, base * 2^attempt)), remaining)
        log(attempt=attempt+1, backoff_ms=delay*1000, error=result.error)
        wait(delay)
```

### Idempotent retry on a non-idempotent operation

First attempt:

```
POST /v1/payments
Idempotency-Key: 7c4a8d09-ca95-4c6d-8f3b-91a7e6e0b9d2

{"amount": 100.00, "currency": "USD"}
```

Retry (same key - server returns cached response, no duplicate side effect):

```
POST /v1/payments
Idempotency-Key: 7c4a8d09-ca95-4c6d-8f3b-91a7e6e0b9d2

{"amount": 100.00, "currency": "USD"}
```

## Enforcement Rules

| Rule | Gate | Action |
|------|------|--------|
| Fixed-interval retry detected | CI lint | Block merge |
| POST/PATCH retry without idempotency key | CI lint | Block merge |
| Retry on non-retryable status code | CI lint | Block merge |
| Missing retry budget | Production readiness | Block deploy |
| Max retries exceeds allowed range | Architecture review | IAB approval |
| DLQ not configured for async consumers | Production readiness | Block deploy |

## References

- [RFC 9110 Section 10.2.3 - Retry-After](https://www.rfc-editor.org/rfc/rfc9110#section-10.2.3)
- [RFC 6585 - 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585)
- [AWS Builders' Library - Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
- [AWS Architecture Blog - Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Google Cloud - Retry Strategy](https://cloud.google.com/storage/docs/retry-strategy)
- [Stripe - Idempotent Requests](https://docs.stripe.com/api/idempotent_requests)

## Rationale

**Full jitter over alternatives:** AWS research shows full jitter produces the least total work across competing clients. Equal jitter's guaranteed minimum floor creates clustering that partially defeats the purpose of jitter.

**20% retry budget:** Google's gRPC default. Without a budget, a service at 1,000 req/s with 50% failure and 3 retries amplifies to 2,500 req/s. At 20%, it stays at 1,200 req/s - manageable headroom for recovery.

**Idempotency keys:** Stripe's pattern makes retries safe at the protocol level without requiring retry logic to understand business semantics.

**DLQ over infinite retry:** Infinite retry causes unbounded queue growth, head-of-line blocking, and masks bugs. DLQ cleanly separates transient failures from problems needing human attention.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-03-28 | Initial definition |
