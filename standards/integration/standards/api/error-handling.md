---
identifier: "INTG-STD-009"
name: "API Error Handling"
version: "1.0.0"
status: "MANDATORY"

domain: "INTEGRATION"
documentType: "standard"
category: "error-handling"
appliesTo: ["api", "webhooks"]

lastUpdated: "2026-03-28"
owner: "Integration Architecture Board"

standardsCompliance:
  iso: []
  rfc: ["RFC-9457", "RFC-9110", "RFC-2119"]
  w3c: []
  other: ["Zalando-RESTful-API-Guidelines", "OWASP-API-Security-Top-10"]

taxonomy:
  capability: "api-design"
  subCapability: "error-handling"
  layer: "contract"

enforcement:
  method: "automated"
  validationRules:
    contentType: "application/problem+json"
    requiredFields: ["type", "title", "status"]
  rejectionCriteria:
    - "Stack traces in error responses"
    - "Internal implementation details in error messages"
    - "Non-standard error response format"
    - "Missing correlation ID in error responses"

dependsOn: ["INTG-STD-004", "INTG-STD-008"]
supersedes: ""
---

# Error Handling

## Purpose

All HTTP API error responses **MUST** use the RFC 9457 Problem Details format (`application/problem+json`). This eliminates bespoke error formats, enables machine-readable error processing by clients and AI agents, and prevents information leakage. RFC 9457 obsoletes RFC 7807 and aligns with industry guidelines from Zalando, Microsoft, and Google.

## Rules

### R-1: Content-Type

- All error responses **MUST** use media type `application/problem+json`.
- Servers **MUST** set `Content-Type: application/problem+json` for all 4xx and 5xx responses carrying a body.
- Servers **MUST NOT** return errors using `application/json` or any other media type.

### R-2: Required Fields

Every Problem Details response **MUST** include:

| Field           | Type    | Description                                              |
| --------------- | ------- | -------------------------------------------------------- |
| `type`          | string  | URI reference identifying the problem type               |
| `title`         | string  | Short, human-readable summary of the problem type        |
| `status`        | integer | HTTP status code (**MUST** match actual response status) |
| `detail`        | string  | Human-readable explanation specific to this occurrence   |
| `instance`      | string  | URI reference identifying this specific occurrence       |
| `correlationId` | string  | UUID v4 for end-to-end correlation                       |

### R-3: Recommended Extension Fields

The following fields **SHOULD** be included where applicable:

| Field       | Type   | Description                                    |
| ----------- | ------ | ---------------------------------------------- |
| `errorCode` | string | Machine-readable error code (see R-6)         |
| `timestamp` | string | ISO-8601 UTC timestamp of the error occurrence |
| `errors`    | array  | Per-field validation errors (see R-5)         |

### R-4: Type URI Requirements

- The `type` field **MUST** be an absolute URI following the pattern `https://{domain}/problems/{error-category}`.
- Organizations **SHOULD** host human-readable documentation at the `type` URI.
- When no specific problem type applies, `"about:blank"` **MUST** be used and `title` **SHOULD** match the standard HTTP status phrase from RFC 9110.

### R-5: Validation Error Array

For 400 and 422 responses involving input validation, the response **MUST** include an `errors` array. Each entry **MUST** contain:

| Field     | Type   | Req.         | Description                                               |
| --------- | ------ | ------------ | --------------------------------------------------------- |
| `field`   | string | **MUST**     | JSON Pointer (RFC 6901) or dot-notation path to the field |
| `message` | string | **MUST**     | Human-readable description of the validation failure      |
| `code`    | string | **SHOULD**   | Machine-readable validation error code                    |
| `value`   | any    | **MAY**      | The rejected value (**MUST NOT** include sensitive data)   |

### R-6: Machine-Readable Error Codes

- Each problem type **SHOULD** define a unique `errorCode` in `UPPER_SNAKE_CASE`.
- Error codes **MUST** be stable across releases and **MUST NOT** be removed without a major version increment.
- Error codes **SHOULD** follow the pattern `{DOMAIN}_{CATEGORY}_{SPECIFIC}` (e.g., `ORDER_VALIDATION_INVALID_QUANTITY`).

### R-7: Correlation ID

- Every error response **MUST** include `correlationId` in the body and `X-Correlation-ID` in the response header; values **MUST** match.
- If the inbound request includes `X-Correlation-ID`, the server **MUST** propagate that value.
- If absent, the server **MUST** generate a new UUID v4.
- The `correlationId` **MUST** appear in all log entries related to the failed request.

### R-8: Status Code Consistency

- The `status` field **MUST** match the HTTP response status code.
- Servers **MUST** use the most specific status code applicable and **MUST NOT** use generic codes (e.g., 400) when a more specific code (e.g., 422) applies.

### R-9: HTTP Status Code Usage

| Status | Title                 | When to Use                                                                          |
| ------ | --------------------- | ------------------------------------------------------------------------------------ |
| 400    | Bad Request           | Malformed syntax, invalid JSON, missing required headers                             |
| 401    | Unauthorized          | Missing, expired, or malformed authentication credentials                            |
| 403    | Forbidden             | Valid credentials but insufficient permissions                                       |
| 404    | Not Found             | Requested resource does not exist                                                    |
| 409    | Conflict              | State conflict (optimistic locking, duplicate creation)                              |
| 422    | Unprocessable Content | Well-formed but semantically invalid (business rules, field validation)              |
| 429    | Too Many Requests     | Rate limit exceeded; **MUST** include `Retry-After` header                           |
| 500    | Internal Server Error | Unexpected server failure; **MUST NOT** expose internals                             |
| 502    | Bad Gateway           | Upstream dependency returned an invalid response                                     |
| 503    | Service Unavailable   | Temporary outage or maintenance; **SHOULD** include `Retry-After`                    |

Use **400** for structurally malformed requests (bad JSON, wrong content type). Use **422** for well-formed requests that violate business rules or field validation.

### R-10: Title Stability

- The `title` field **SHOULD NOT** change between occurrences of the same problem type.
- Clients **MUST NOT** parse `title` or `detail` for programmatic decisions; use `type`, `status`, and `errorCode` instead.

### R-11: Security Requirements

- Error responses **MUST NOT** include stack traces, exception class names, internal method names, SQL queries, database details, internal hostnames, IP addresses, file paths, or software version numbers.
- The `detail` field **MUST** describe the problem from the client's perspective, not internal state.
- For 5xx errors, `detail` **SHOULD** use a generic message and log full diagnostics server-side via `correlationId`.
- Validation error `value` fields **MUST NOT** echo sensitive data (passwords, tokens, personal identifiers).

### R-12: Retry Guidance

- 429 responses **MUST** include a `Retry-After` header.
- 503 responses **SHOULD** include a `Retry-After` header when the outage duration is known.
- Retryable errors **MAY** include a `retryAfterSeconds` integer extension field.

### R-13: Content Negotiation

- If a client sends `Accept: application/problem+json`, the server **MUST** respond with Problem Details JSON.
- If a client sends `Accept: application/json`, the server **SHOULD** still respond with Problem Details JSON using `Content-Type: application/problem+json`.
- XML representation (`application/problem+xml`) **MAY** be supported but is not required.

## Examples

### Standard Error Response

```json
{
  "type": "https://api.example.com/problems/malformed-request",
  "title": "Malformed Request",
  "status": 400,
  "detail": "The request body contains invalid JSON. Expected a comma at position 42.",
  "instance": "/logs/errors/a937b-41f2",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "errorCode": "REQUEST_PARSE_INVALID_JSON",
  "timestamp": "2026-03-28T14:30:00.000Z"
}
```

### Validation Error Response

```json
{
  "type": "https://api.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "The request contains 2 validation errors that must be corrected.",
  "instance": "/logs/errors/f682g-d6h5",
  "correlationId": "3c6e0b8a-9c0a-45af-9db8-0b2e1f4b5c7d",
  "errorCode": "REQUEST_VALIDATION_FAILED",
  "timestamp": "2026-03-28T14:35:00.000Z",
  "errors": [
    {
      "field": "/email",
      "message": "Must be a valid email address.",
      "code": "FIELD_FORMAT_INVALID",
      "value": "not-an-email"
    },
    {
      "field": "/quantity",
      "message": "Must be greater than zero.",
      "code": "FIELD_RANGE_BELOW_MINIMUM",
      "value": -5
    }
  ]
}
```

## Enforcement Rules

### Gateway-Level

- API gateways **MUST** intercept non-compliant error responses and transform them into valid Problem Details format.
- API gateways **MUST** strip fields matching sensitive patterns (stack traces, SQL, internal paths).
- API gateways **MUST** inject `correlationId` and `X-Correlation-ID` if the backend has not provided them.

### Build-Time

- OpenAPI specs **MUST** define `application/problem+json` for all 4xx and 5xx status codes.
- Contract tests **MUST** validate error responses conform to the Problem Details schema.
- Static analysis **SHOULD** flag error response definitions that do not reference the Problem Details schema.

### Automated Checks

The following **MUST** be enforced at the API gateway or integration test layer:

1. All 4xx/5xx responses have `Content-Type: application/problem+json`.
2. Required fields (`type`, `title`, `status`, `detail`, `instance`, `correlationId`) are present.
3. The `status` field matches the HTTP response status code.
4. `X-Correlation-ID` header is present and matches body `correlationId`.
5. Response bodies do not match patterns for stack traces, SQL keywords, or internal hostnames.
6. Responses with status 400 or 422 reporting field issues include the `errors` array.

### Rejection Criteria

CI/CD **MUST** reject: non-`application/problem+json` errors, missing required fields, sensitive data in response bodies (stack traces, SQL, internal paths, hostnames), and missing or mismatched `X-Correlation-ID` headers.

## References

- [RFC 9457 - Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457.html)
- [RFC 9110 - HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119.html) / [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901.html)
- [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/) / [OWASP Error Handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)

## Rationale

**Why RFC 9457?** Current IETF standard for HTTP error responses, widely supported by frameworks and gateways, eliminating the cost of bespoke formats.

**Why require all core fields plus correlationId?** `type` enables deterministic branching, `status` survives proxy transformations, `instance` links alerts to occurrences, and `correlationId` is essential for distributed tracing.

**Why strict security rules?** OWASP identifies error information leakage as a common API vulnerability - stack traces, SQL, and hostnames aid targeted exploits.

**Why the errors[] array?** Returning all validation failures at once avoids trial-and-error loops and improves developer experience.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-03-28 | Initial definition |
