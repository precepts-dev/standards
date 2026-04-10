---
identifier: "INTG-STD-035"
name: "Timeout Standard"
version: "1.1.0"
status: "MANDATORY"

domain: "INTEGRATION"
documentType: "standard"
category: "reliability"
appliesTo: ["api", "events", "a2a", "mcp", "webhooks", "grpc", "graphql", "batch"]

lastUpdated: "2026-04-10"
owner: "Integration Architecture Board"

standardsCompliance:
  iso: []
  rfc: ["RFC-9110"]
  w3c: []
  other: ["Zalando-Engineering-Timeouts", "AWS-Builders-Library", "gRPC-Deadlines"]

taxonomy:
  capability: "reliability"
  subCapability: "timeout-management"
  layer: "infrastructure"

enforcement:
  method: "hybrid"
  validationRules:
    connectionTimeout: "2s"
    readTimeout: "5s"
    totalTimeout: "30s"
  rejectionCriteria:
    - "Missing timeout configuration on any external call"
    - "Infinite or unset timeouts"
    - "Timeout longer than upstream caller's deadline"

dependsOn: ["INTG-STD-029"]
supersedes: ""
---

# Timeout

## Purpose

Every external call - whether to an API, database, message broker, or file system - **MUST** have an explicit timeout. Unbounded waits are the single most common cause of cascading failures in distributed systems. This standard defines mandatory timeout categories, default values by integration type, deadline propagation rules, and observability requirements. It complements INTG-STD-033 (Resilience) and INTG-STD-034 (Retry).

## Rules

### R-1: Explicit Timeout on Every External Call

Every outbound call to an external dependency **MUST** have an explicit timeout configured. This includes HTTP/REST, gRPC, database queries, message broker operations, file/object storage, DNS lookups, cache reads/writes, and any third-party SDK call performing network I/O. Relying on language or library default timeouts is **NOT** acceptable - many libraries default to infinite timeouts.

### R-2: Separate Connection and Read Timeouts

Services **MUST** configure connection timeout and read timeout as independent values. Connection timeout governs TCP handshake completion; read timeout governs time waiting for the server response after the connection is established.

Connection timeout **SHOULD** follow: `connection_timeout = round_trip_time * 3`. For most intra-region calls, 2 seconds provides ample headroom. Read timeout **MUST** be based on measured downstream latency percentiles (p99.9 recommended), not guesswork.

### R-3: Default Timeout Values by Integration Type

The following defaults **MUST** be used unless a documented exception exists with architectural approval:

| Integration Type       | Connection | Read  | Total  | Rationale                                     |
| ---------------------- | ---------- | ----- | ------ | --------------------------------------------- |
| REST/HTTP API          | 2s         | 5s    | 10s    | Most API calls complete within 1-2s at p99    |
| gRPC (unary)           | 2s         | 5s    | 10s    | Comparable to REST for request-response       |
| gRPC (streaming)       | 2s         | 30s   | 300s   | Streams require longer read windows           |
| Database query         | 2s         | 3s    | 5s     | Queries beyond 3s indicate missing indexes    |
| Database transaction   | 2s         | 3s    | 10s    | Multi-statement transactions need headroom    |
| Message publish        | 2s         | 5s    | 10s    | Broker acknowledgment should be fast          |
| Message consume        | 2s         | 30s   | 60s    | Long-poll patterns require extended waits     |
| Cache (Redis/Memcache) | 1s         | 1s    | 2s     | Cache misses should fail fast                 |
| File/Object storage    | 5s         | 60s   | 120s   | Large transfers need proportional budgets     |
| SMTP/Email             | 5s         | 30s   | 60s    | Mail servers vary widely in response time     |
| DNS resolution         | 2s         | N/A   | 2s     | DNS should resolve from local cache           |
| MCP tool invocation    | 2s         | 10s   | 15s    | AI tool calls may involve upstream LLM calls  |
| Webhook delivery       | 2s         | 5s    | 10s    | Receiver should acknowledge quickly           |

Exceptions **MUST** be documented in the service's integration manifest with the dependency name, overridden value, justification, architecture team approval, and a review date no longer than 6 months out.

### R-4: Deadline Propagation

Services that receive inbound requests with a deadline **MUST** propagate a reduced deadline to downstream calls:

```
downstream_deadline = incoming_deadline - elapsed_time - safety_margin
```

A safety margin of 100-500ms is **RECOMMENDED**. Protocol-specific mechanisms:

| Protocol | Mechanism                                         | Notes                                       |
| -------- | ------------------------------------------------- | ------------------------------------------- |
| gRPC     | `grpc-timeout` header (automatic)                 | Framework propagates via context             |
| HTTP     | `X-Request-Deadline` header (epoch millis)        | Application layer must read and propagate    |
| Kafka    | Message header `x-deadline` or record timestamp + TTL | Consumer checks before processing        |
| GraphQL  | `extensions.deadline` field                       | Resolver checks remaining budget per field   |

For gRPC, services **MUST NOT** create new contexts that discard the incoming deadline. For HTTP, services **SHOULD** include and honor the `X-Request-Deadline` header.

### R-5: Deadline Budget Enforcement

A service **MUST NOT** initiate a downstream call if the remaining deadline budget is less than the minimum time required to complete it. This rule prevents "wasted work": starting a call that will certainly exceed its deadline consumes downstream resources (threads, connections, compute) without any possibility of the result being used — the upstream caller has already timed out or will before the response arrives. Failing fast with a budget-exhausted error is always preferable to starting a doomed call.

A service **MUST** return immediately with a timeout error, log the budget exhaustion event, and increment the `timeout.budget_exhausted` metric when remaining budget is insufficient.

```
function call_downstream(incoming_deadline, safety_margin, downstream_min):
    remaining = incoming_deadline - now() - safety_margin
    if remaining < downstream_min:
        log_warn("Deadline budget exhausted",
            remaining_ms=remaining, required_ms=downstream_min)
        emit_metric("timeout.budget_exhausted_total")
        return TIMEOUT_ERROR

    downstream_deadline = now() + remaining
    return call(downstream, deadline=downstream_deadline)
```

### R-6: Protocol-Specific Timeout Rules

Services **MUST** apply the following protocol-specific rules:

| Protocol        | Rule                                                                                   | Severity |
| --------------- | -------------------------------------------------------------------------------------- | -------- |
| HTTP/REST       | Return `408` when server terminates a slow client; `504` when gateway times out upstream | ERROR    |
| HTTP/REST       | TLS handshake timeout **MUST** be included in total timeout budget                      | ERROR    |
| gRPC            | Every RPC **MUST** have a deadline set; calls without deadlines are unbounded            | ERROR    |
| gRPC            | Servers **MUST** check context cancellation and abort work on expired deadlines          | ERROR    |
| Kafka           | `request.timeout.ms` on producer and `max.poll.interval.ms` on consumer **MUST** be set | ERROR    |
| RabbitMQ        | Consumer ack timeout **MUST** be configured; message TTL **SHOULD** be set               | ERROR    |
| SQS             | `VisibilityTimeout` **MUST** be at least 6x expected processing time                    | ERROR    |
| Database        | `statement_timeout` and `idle_in_transaction_session_timeout` **MUST** be configured     | ERROR    |
| File/Object     | Per-part upload timeout and stalled transfer detection (30s recommended) **MUST** be set | ERROR    |

### R-7: Client-Side and Server-Side Timeouts

Both client and server **MUST** configure timeouts independently. Client-side timeouts protect against slow servers; server-side timeouts protect against slow or malicious clients.

The client-side timeout **MUST** be at most the server-side timeout for the same operation. If the client times out first, the server wastes resources processing a request whose result will be discarded.

### R-8: Timeout and Circuit Breaker Interaction

Timeouts and circuit breakers (INTG-STD-033) **MUST** work together:

1. Each timeout event **MUST** increment the circuit breaker's failure counter. When the threshold is reached, the circuit **MUST** open.
2. When the circuit is open, requests **MUST** fail immediately without waiting for a timeout.
3. Half-open probe requests **SHOULD** use 50% of the normal timeout for faster degradation detection.

### R-9: Security - Timeouts as Defense

Timeouts **MUST** defend against resource exhaustion attacks:

- **Slowloris prevention:** Server read-header timeout **MUST** be 5s or less. Slowloris is a denial-of-service attack where an attacker opens many connections and sends HTTP headers very slowly (one byte at a time), keeping connections open indefinitely and exhausting the server's connection pool. A short read-header timeout forcibly closes stalled connections.
- **Slow POST prevention:** Server **MUST** enforce a minimum data rate; connections transmitting less than 500 bytes/second for more than 10 seconds **MUST** be terminated. Slow POST is the body-phase equivalent of Slowloris — the attacker slowly dribbles POST body bytes to hold connections open. The 500 bytes/second threshold is intentionally strict: legitimate clients on any reasonable network exceed this rate. APIs receiving very small payloads (under 1 KB) effectively get this protection for free from their read timeout. APIs receiving large file uploads **MAY** use a higher byte budget but **MUST** document the exception.
- **Connection pool exhaustion:** Idle connections beyond 120s **SHOULD** be closed to reclaim pool slots.
- **Query of death:** Database statement timeouts **MUST** prevent single queries from monopolizing resources.

Services **MUST NOT** extend timeouts under load. Longer timeouts during overload consume more resources and accelerate cascading failures. The correct response to overload is to shed load via circuit breakers or rate limiting.

### R-10: Timeout Metrics

Services **MUST** emit the following metrics for every timed external call:

| Metric                                | Type      | Labels                                    |
| ------------------------------------- | --------- | ----------------------------------------- |
| `external_call.duration_ms`           | Histogram | `dependency`, `operation`, `result`       |
| `external_call.timeout_total`         | Counter   | `dependency`, `operation`, `timeout_type` |
| `external_call.deadline_remaining_ms` | Histogram | `dependency`, `operation`                 |
| `timeout.budget_exhausted_total`      | Counter   | `dependency`, `operation`                 |

Where `timeout_type` is one of: `connection`, `read`, `write`, `total`, `deadline_exceeded`. `result` is one of: `success`, `timeout`, `error`.

### R-11: Timeout Logging

Every timeout event **MUST** be logged with at minimum: `dependency`, `operation`, `timeout_type`, `configured_timeout_ms`, and `elapsed_ms`. Additional **RECOMMENDED** fields: `trace_id`, `span_id`, `deadline_remaining_ms`, `retry_attempt`, `circuit_breaker_state`.

### R-12: Timeout Alerting

Services **MUST** configure alerts for:

| Condition                                  | Severity | Action                                         |
| ------------------------------------------ | -------- | ---------------------------------------------- |
| Timeout rate above 5% for a dependency     | WARNING  | Investigate dependency health                  |
| Timeout rate above 20% for a dependency    | CRITICAL | Trigger incident; circuit breaker should open  |
| Budget exhaustion rate above 1%            | WARNING  | Review timeout budgets and call chain          |
| p99 latency above 80% of configured timeout | WARNING  | Timeout too tight or dependency is degrading   |

## Enforcement Rules

The following **MUST** be enforced via static analysis, configuration scanning, or integration tests:

| Rule    | Check                                                             | Severity |
| ------- | ----------------------------------------------------------------- | -------- |
| TMO-001 | Every HTTP client has explicit connection timeout                 | ERROR    |
| TMO-002 | Every HTTP client has explicit read timeout                       | ERROR    |
| TMO-003 | Connection timeout is at most 5s                                  | ERROR    |
| TMO-004 | Read timeout is at most 30s (exceptions require approval)         | WARNING  |
| TMO-005 | Total timeout is at most 120s (exceptions require approval)       | WARNING  |
| TMO-006 | Database `statement_timeout` is configured                        | ERROR    |
| TMO-007 | Kafka `max.poll.interval.ms` is at most 300s                      | WARNING  |
| TMO-008 | No infinite or zero timeout values in config                      | ERROR    |
| TMO-009 | Server read-header timeout is at most 5s                          | ERROR    |
| TMO-010 | gRPC calls have deadline set                                      | ERROR    |

Additional enforcement:

- **Gateway:** API gateways **MUST** enforce a maximum total timeout; requests exceeding it receive `504`.
- **Code review:** PRs introducing new external calls **MUST** include timeout configuration.
- **Runtime:** Services **SHOULD** log a warning when any call exceeds 80% of its configured timeout.

## Examples

### Deadline Propagation

The following pseudocode illustrates how a service receives an upstream deadline and propagates a reduced deadline to each downstream call:

```
function handle_request(request):
    deadline = parse_deadline_header(request)
    if deadline is null:
        deadline = now() + DEFAULT_TIMEOUT

    # Local processing
    result_a = fetch_from_service_a(request, deadline)

    # Recalculate remaining budget before next call
    remaining = deadline - now() - SAFETY_MARGIN
    if remaining < MIN_DOWNSTREAM_TIMEOUT:
        return error(408, "Deadline budget exhausted")

    result_b = fetch_from_service_b(request, deadline)
    return combine(result_a, result_b)

function fetch_from_service_a(request, upstream_deadline):
    remaining = upstream_deadline - now() - SAFETY_MARGIN
    if remaining < MIN_DOWNSTREAM_TIMEOUT:
        raise TimeoutError("Budget exhausted before calling Service A")

    return http_call(
        url = SERVICE_A_URL,
        timeout = remaining,
        headers = {"X-Request-Deadline": upstream_deadline}
    )
```

## Rationale

**Why separate connection and read timeouts?** They measure different failure modes. Connection timeout detects network unreachability (host down); read timeout measures server processing speed. Conflating them either slows failure detection or sets unrealistic response expectations.

**Why mandate deadline propagation?** Without it, a 5-service chain with 10s timeouts per hop can block the originator for 50s - long after the client has disconnected - while downstream services continue wasted work.

**Why aggressive defaults?** Short timeouts force architectural discipline. A 3s database timeout surfaces missing indexes during development, not production incidents. Services needing longer timeouts can request documented exceptions.

**Why not just circuit breakers?** Timeouts bound a single call's duration; circuit breakers prevent repeated calls to failing dependencies. Without timeouts, circuit breakers have no signal for slow failures. Both are required; neither is sufficient alone.

**Why never extend timeouts under load?** Longer timeouts during overload mean more in-flight requests, more consumed resources, and faster cascading failure. The correct response is load shedding, not longer waits.

## References

- [**RFC 9110**](https://httpwg.org/specs/rfc9110.html) - HTTP Semantics (408 Request Timeout, 504 Gateway Timeout)
- [**Zalando Engineering - Timeouts**](https://engineering.zalando.com/posts/2023/07/all-you-need-to-know-about-timeouts.html) - Connection timeout formula, latency percentile baselines
- [**AWS Builders' Library - Timeouts, Retries, and Backoff**](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/) - False-timeout rate, retry multiplication risks
- [**gRPC Deadlines**](https://grpc.io/docs/guides/deadlines/) - Automatic deadline propagation, DEADLINE_EXCEEDED
- **INTG-STD-033** - Resilience Standard (circuit breakers, bulkheads, fallbacks)
- **INTG-STD-034** - Retry Standard (retry policies, backoff, idempotency)

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-03-28 | Initial definition |
| 1.1.0   | 2026-04-10 | R-5: added justification for deadline budget enforcement; R-9: added explanation of Slowloris attack, Slow POST attack, and justification for the 500 bytes/s threshold |
