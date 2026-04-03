---
identifier: "INTG-STD-033"
name: "Integration Resilience Patterns"
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
  rfc: []
  w3c: []
  other: ["Microsoft-Resilience-Patterns", "Resilience4j", "Release-It-Nygard"]

taxonomy:
  capability: "reliability"
  subCapability: "resilience-patterns"
  layer: "infrastructure"

enforcement:
  method: "review-based"
  reviewChecklist:
    - "Circuit breaker configured for all external dependencies"
    - "Bulkhead isolation between independent dependency pools"
    - "Fallback strategy defined for critical paths"
    - "Health check endpoints implemented"
    - "Resilience metrics exposed to monitoring"

dependsOn: ["INTG-STD-029", "INTG-STD-034", "INTG-STD-035"]
supersedes: ""
---

# Resilience Patterns

## Purpose

This standard defines **MANDATORY** resilience patterns for all integration points to ensure graceful degradation, automatic recovery, and full observability under failure. It covers circuit breaking, bulkhead isolation, fallback strategies, health checking, load shedding, pattern composition, and observability.

This standard works with INTG-STD-034 (Retry Policies) and INTG-STD-035 (Timeout Standards) to form a complete reliability framework. Retry and timeout behaviors are governed by those companion standards; this document governs the structural patterns that contain, isolate, and recover from failures.

## Rules

### R-1: Circuit Breaker Pattern

Every outbound integration call to an external dependency **MUST** be protected by a circuit breaker implementing three states:

```
               failure threshold
                  reached
  [CLOSED] -----------------> [OPEN]
     ^                           |
     |  all probes     timeout   |
     |  succeed        expires   v
     +---------- [HALF-OPEN] ---+
                     |
                  probe fails -> back to OPEN
```

**State definitions:**

- **CLOSED** - Normal operation. Requests pass through. When failure rate in the sliding window exceeds the threshold, transitions to OPEN.
- **OPEN** - Fail-fast mode. All requests rejected immediately. After the wait duration, transitions to HALF-OPEN.
- **HALF-OPEN** - A limited number of trial requests are permitted. If all succeed, transitions to CLOSED. If any fail, transitions back to OPEN.

**Configuration parameters** - all circuit breakers **MUST** be configurable with:

| Parameter | Description | Required Default |
|---|---|---|
| `failureRateThreshold` | Percentage of failures that triggers OPEN state | 50% |
| `slowCallRateThreshold` | Percentage of slow calls that triggers OPEN state | 80% |
| `slowCallDurationThreshold` | Duration above which a call is considered slow | Per INTG-STD-035 |
| `slidingWindowType` | COUNT_BASED or TIME_BASED | COUNT_BASED |
| `slidingWindowSize` | Number of calls (count) or seconds (time) in the window | 100 calls or 60s |
| `minimumNumberOfCalls` | Minimum calls before failure rate is calculated | 20 |
| `waitDurationInOpenState` | Time in OPEN before transitioning to HALF-OPEN | 30s |
| `permittedNumberOfCallsInHalfOpen` | Trial calls allowed in HALF-OPEN state | 5 |
| `automaticTransitionEnabled` | Whether to auto-transition from OPEN to HALF-OPEN | true |

Teams **MAY** override defaults per dependency based on documented SLA characteristics, but **MUST NOT** set `failureRateThreshold` below 25% or `waitDurationInOpenState` below 5 seconds to prevent flapping.

**Failure classification:**

- HTTP 5xx and 429 responses **MUST** be counted as failures
- Connection timeouts and read timeouts **MUST** be counted as failures
- HTTP 4xx responses (except 429) **MUST NOT** be counted as failures (client errors, not dependency failures)
- Responses exceeding `slowCallDurationThreshold` **MUST** be counted as slow calls

**Security constraints:**

- Circuit breakers **MUST NOT** cache or replay authentication tokens when probing in HALF-OPEN state. Each probe **MUST** carry fresh credentials.
- Circuit breaker state **MUST NOT** be externally modifiable without administrative authorization. Manual override endpoints **MUST** require RBAC permissions and **MUST** log every override with actor identity.

**Observability:**

- Every state transition **MUST** be logged at WARN level with: timestamp, dependency name, previous state, new state, failure rate, and sliding window statistics.
- **MUST** expose metrics: `circuit_breaker_state` (gauge), `circuit_breaker_failure_rate` (gauge), `circuit_breaker_calls_total` (counter by outcome), `circuit_breaker_state_transitions_total` (counter by from/to state).
- Teams **MUST** alert on: any transition to OPEN, OPEN state lasting longer than 5 minutes, and flapping (>3 transitions in 5 minutes).

### R-2: Bulkhead Isolation

Every integration point **MUST** be isolated using bulkhead patterns so that resource exhaustion in one dependency does not starve others. Teams **MUST** implement at least one strategy per dependency:

- **Thread pool isolation** - dedicated thread pool per dependency. **SHOULD** be used when the dependency has unpredictable latency or full isolation is required.
- **Semaphore isolation** - counting semaphore limiting concurrent calls. **SHOULD** be used for predictable-latency dependencies or single-threaded/async runtimes.
- **Connection pool isolation** - separate connection pools per dependency. **MUST** be used for all database and persistent-connection dependencies regardless of other strategies.

**Sizing** - bulkhead sizes **MUST** be calculated from measured dependency characteristics:

```
maxConcurrent = (peakRPS * p99LatencySeconds) * safetyFactor(1.5-2.0)
```

Example: Payment API at 200 RPS, 150ms p99 - maxConcurrent = (200 * 0.15) * 1.5 = 45 slots. Teams **MUST** review sizes quarterly or after significant traffic changes.

**Rejection handling** - when a bulkhead rejects a request, the system **MUST**: return immediately (fail-fast), count the rejection as a circuit breaker signal, log at WARN level, route to the fallback handler, and increment `bulkhead_rejections_total`.

### R-3: Fallback Strategies

Every integration point on a critical user-facing path **MUST** define a fallback strategy. Background processes **SHOULD** define fallbacks where feasible. A fallback is invoked when the circuit breaker is OPEN, the bulkhead rejects, retries are exhausted, or the timeout is exceeded.

Teams **MUST** select and document one or more strategies per dependency:

| Strategy | Description | When to Use |
|---|---|---|
| **Static Default** | Predefined hardcoded response | When a reasonable default exists |
| **Cache Fallback** | Last known good response from cache | When stale data is acceptable for a bounded period |
| **Graceful Degradation** | Reduced functionality, service stays operational | When partial results beat no results |
| **Alternative Service** | Route to a backup service | When a redundant provider exists |
| **Queued Retry** | Accept and process asynchronously later | When eventual consistency is acceptable |
| **Fail with Context** | Structured error with degradation info | When the caller must know and adapt |

**Security constraints** - fallback strategies **MUST NOT** bypass authentication or authorization. Cache fallbacks **MUST** be keyed to include the caller's authorization context (tenant, role, scope). If a fallback returns stale data, the response **MUST** include staleness metadata (e.g., `X-Fallback-Active: true` header and a `data-age` field).

### R-4: Health Check Patterns

Every service exposing integration endpoints **MUST** implement health check endpoints. Every service consuming external dependencies **MUST** perform dependency health checks. Services **MUST** implement at least two levels:

**Shallow health check (liveness)** - `GET /health/live`
- Verifies the process is running and can accept requests
- **MUST NOT** call external dependencies
- **MUST** respond within 100ms
- **MUST** return HTTP 200 if alive, 503 if not

**Deep health check (readiness)** - `GET /health/ready`
- Verifies all critical dependencies are operational
- **MUST** check connectivity to each critical dependency
- **MUST** respect a 5-second total timeout for all checks combined
- **MUST** return HTTP 200 if ready, 503 if any critical dependency is unhealthy
- **MUST** return structured health status in the response body

Circuit breakers **MAY** use dedicated health check endpoints to probe recovery in HALF-OPEN state. Health check probes **MUST NOT** be counted in circuit breaker failure statistics. Health check endpoints **MUST NOT** expose sensitive information. Deep health checks **SHOULD** require authentication when they expose dependency topology.

### R-5: Load Shedding

Services on critical paths **MUST** implement load shedding to maintain quality for high-priority traffic under pressure.

All inbound requests **MUST** be classifiable into at least three priority tiers:

| Priority | Shedding Behavior |
|---|---|
| **CRITICAL** (revenue/safety-impacting) | Shed last - only under catastrophic load |
| **NORMAL** (standard business operations) | Shed when utilization exceeds 85% |
| **LOW** (deferrable operations) | Shed first when utilization exceeds 70% |

Shedding decisions **MUST** be based on measurable signals: bulkhead utilization, queue depth, p99 latency relative to SLA, CPU/memory utilization, or upstream circuit breaker states.

When shedding, the service **MUST**: return HTTP 503 with a `Retry-After` header, include a structured body indicating load shedding, log at INFO level (shedding is a designed behavior), and increment `load_shedding_total{priority="<tier>"}`.

### R-6: Pattern Composition

Resilience patterns **MUST** be composed in the following order (outermost to innermost):

```
Load Shedder -> Bulkhead -> Circuit Breaker -> Retry(STD-034) -> Timeout(STD-035) -> Call
```

This means:
- Retry wraps the timeout-bounded call. A single retry attempt **MUST NOT** exceed the per-call timeout.
- Circuit breaker wraps retry. If the circuit is OPEN, retries do not execute.
- Bulkhead wraps circuit breaker. A rejected bulkhead request does not consume circuit breaker capacity.
- Load shedder wraps bulkhead. Shed requests never reach the resource pool.

**Timeout budget coordination** - the total timeout **MUST** satisfy:

```
totalOperationTimeout >= retryAttempts * perCallTimeout + retryDelayBudget

Example: perCallTimeout=2s, retries=3, backoff=[0.5s,1.0s] -> 3*2s + 1.5s = 7.5s -> set totalTimeout=8s
```

If the circuit breaker transitions to OPEN during a retry sequence, remaining retries **MUST** be abandoned immediately. Circuit breaker rejections are non-retryable.

**Anti-patterns that MUST be avoided:**

| Anti-Pattern | Correct Approach |
|---|---|
| Retry outside circuit breaker without coordination | Retry inside circuit breaker; CB rejection is non-retryable |
| Timeout longer than CB wait duration | Per-call timeout **MUST** be shorter than `waitDurationInOpenState` |
| Bulkhead inside circuit breaker | Bulkhead outside circuit breaker |
| Retry on circuit-breaker-rejected calls | Treat CB rejection as non-retryable |
| Per-call timeout exceeding total operation timeout | `perCallTimeout < totalOperationTimeout / retryAttempts` |

### R-7: Observability

Every service **MUST** expose a resilience dashboard covering: circuit breaker state, bulkhead utilization, fallback activation rate, load shedding rate by tier, and health check status for all dependencies.

**Required metrics** (Prometheus, OpenTelemetry, or equivalent):

| Metric | Type | Labels |
|---|---|---|
| `circuit_breaker_state` | Gauge | `dependency` |
| `circuit_breaker_failure_rate` | Gauge | `dependency` |
| `circuit_breaker_calls_total` | Counter | `dependency`, `outcome` |
| `circuit_breaker_state_transitions_total` | Counter | `dependency`, `from`, `to` |
| `bulkhead_available_concurrent_calls` | Gauge | `dependency` |
| `bulkhead_max_concurrent_calls` | Gauge | `dependency` |
| `bulkhead_rejections_total` | Counter | `dependency` |
| `fallback_activations_total` | Counter | `dependency`, `strategy` |
| `load_shedding_total` | Counter | `priority` |
| `health_check_status` | Gauge | `dependency`, `level` |
| `health_check_duration_seconds` | Histogram | `dependency`, `level` |

**Structured logging** - all resilience events **MUST** be logged as structured JSON with: `timestamp` (ISO-8601), `level`, `dependency`, `pattern`, `event`, and `correlationId`.

**Alerting** - teams **MUST** configure alerts for:

| Condition | Severity |
|---|---|
| Circuit breaker transitions to OPEN | Warning - ack within 15 min |
| Circuit breaker OPEN > 5 minutes | High - ack within 5 min |
| Circuit breaker flapping (>3 transitions in 5 min) | High - ack within 5 min |
| Bulkhead utilization > 90% sustained 2 min | Warning - ack within 15 min |
| Fallback activation rate > 10% over 5 min | Warning - ack within 15 min |
| Load shedding CRITICAL tier requests | Critical - ack within 2 min |
| Deep health check failing > 2 min | High - ack within 5 min |

## Examples

### Circuit breaker composition ordering

```
Inbound Request
  -> Load Shedder (reject low-priority if overloaded)
    -> Bulkhead (limit concurrency per dependency)
      -> Circuit Breaker (fail-fast if dependency down)
        -> Retry (recover from transient failures, per INTG-STD-034)
          -> Timeout (bound call duration, per INTG-STD-035)
            -> External Call
```

If the circuit is OPEN, the request skips retry and timeout, goes directly to the fallback handler.

## Enforcement Rules

- Every service exposing or consuming integration points **MUST** implement these resilience patterns before production deployment.
- Architecture reviews **MUST** verify implementation against the following checklist: circuit breaker configured per dependency, bulkhead isolation with measured sizing, fallback strategy documented and authZ-compliant, liveness/readiness endpoints implemented, patterns composed in correct order, timeout budgets consistent, all metrics exposed and alerts configured, and RBAC on circuit breaker overrides.
- Services without circuit breakers for external dependencies **MUST NOT** be approved for production.
- Fallback strategies **MUST** be tested via resilience testing (chaos engineering, dependency failure injection).
- Non-compliance discovered post-deployment **MUST** be remediated within one sprint or documented with an accepted risk exception signed by the service owner and integration architecture lead.
- Where tooling permits, CI/CD **SHOULD** validate: resilience config parsing, timeout budget consistency, HTTP client references to circuit breaker/bulkhead config, and health check endpoint definitions.

## References

- [Microsoft Azure - Circuit Breaker Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- [Resilience4j - CircuitBreaker](https://resilience4j.readme.io/docs/circuitbreaker)
- [Release It! Second Edition](https://pragprog.com/titles/mnee2/release-it-second-edition/) - Michael Nygard's stability patterns
- [AWS - Advanced Multi-AZ Resilience Patterns](https://docs.aws.amazon.com/whitepapers/latest/advanced-multi-az-resilience-patterns/pattern-1-health-check-circuit-breaker.html)

## Rationale

**Why these specific patterns?** The six patterns represent the minimum viable resilience set validated by over a decade of production experience at Netflix, Amazon, Google, and Microsoft, codified in Nygard's "Release It!" and implemented in Hystrix, Resilience4j, and Polly.

**Why mandate composition order?** Incorrect composition is a common, subtle failure source - e.g., retry outside circuit breaker causes retries to fight the breaker, delaying fail-fast and wasting resources.

**Why include security constraints?** Resilience patterns introduce alternative code paths that can inadvertently bypass security controls - cache fallbacks can leak data across authorization boundaries, and HALF-OPEN probes can replay stale tokens.

**Why detailed observability?** Without mandatory metrics and logging, teams cannot distinguish "breaker correctly protecting from failure" from "breaker incorrectly blocking all traffic due to misconfigured threshold."

**Why not mandate specific libraries?** This standard specifies behavior and configuration, not implementations. Resilience4j, Polly, and custom implementations all satisfy these requirements without limiting technology choice.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-03-28 | Initial definition |
