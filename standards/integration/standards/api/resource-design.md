---
identifier: "INTG-STD-008"
name: "API Resource Design and Naming"
version: "1.1.0"
status: "MANDATORY"

domain: "INTEGRATION"
documentType: "standard"
category: "protocol"
appliesTo: ["api"]

lastUpdated: "2026-04-10"
owner: "Integration Architecture Board"

standardsCompliance:
  iso: []
  rfc: ["RFC-9110", "RFC-9205"]
  w3c: []
  other: ["Google-Cloud-API-Design-Guide", "Zalando-RESTful-API-Guidelines", "Microsoft-REST-API-Guidelines"]

taxonomy:
  capability: "api-design"
  subCapability: "resource-modeling"
  layer: "contract"

enforcement:
  method: "hybrid"
  validationRules:
    urlPattern: "^/v[0-9]+/[a-z][a-z0-9-]*(/{[a-z_]+}(/[a-z][a-z0-9-]*)*)*$"
  rejectionCriteria:
    - "Verbs in URL path segments"
    - "Singular nouns for collection endpoints"
    - "Missing pagination on collection endpoints"

dependsOn: ["INTG-STD-004"]
supersedes: ""
---

# Resource Design

## Purpose

This standard defines the required structure for RESTful API resources, URL paths, HTTP method usage, collection patterns, and operation semantics across all integration boundaries. Consistent resource design makes APIs predictable, securable, and machine-governable. Field naming within payloads is governed by INTG-STD-004; this standard covers URL structure, HTTP semantics, and collection-level patterns.

> *Normative language (**MUST**, **MUST NOT**, **SHOULD**, **MAY**) follows RFC 2119 semantics.*

---

## Rules

### R-1: URL Structure

Every API URL **MUST** follow this pattern:

```
/v{major}/{collection}/{resource_id}/{sub-collection}/{sub_resource_id}
```

- The version prefix **MUST** be `v` + major version number as the first path segment.
- Path segments after the version **MUST** alternate between collection names and resource identifiers.
- Collection path segments **MUST** use plural nouns in kebab-case. They **MUST NOT** contain verbs.
- Resource identifier path parameter names **MUST** use `snake_case` (e.g., `{order_id}` not `{orderId}`). snake_case is required for consistency with JSON field naming (INTG-STD-004 R-5) — parameters are mapped directly to field names in most frameworks, so diverging conventions require unnecessary translation logic.
- Identifier values **SHOULD** use a type prefix with an opaque string (e.g., `ord_82f3k`).
- Identifier values **MUST** be URL-safe and **MUST NOT** expose sequential integers as the sole identifier.
- URL paths **SHOULD NOT** exceed three levels of resource nesting. Example: `/v1/orders/{order_id}/items/{item_id}/attachments` is three levels and is the recommended maximum. Deeper relationships should be accessed via query parameters (e.g., `/v1/attachments?item_id={item_id}`).
- URLs **MUST NOT** contain trailing slashes or empty path segments.
- All API paths **MUST** match: `^/v[0-9]+/[a-z][a-z0-9-]*(/{[a-z_]+}(/[a-z][a-z0-9-]*)*)*$`

**Valid URLs:**
```
/v1/orders
/v1/line-items
/v1/orders/ord_82f3k
/v1/users/usr_19dk2/addresses/addr_7fj29
```

**Invalid URLs:**
```
/v1/order              # singular
/v1/getOrders          # verb, camelCase
/v1/order_items        # snake_case path segment
/v1/orders/12345       # sequential integer
/v1/orders/ord_82f3k/  # trailing slash
```

### R-2: HTTP Method Semantics

APIs **MUST** use HTTP methods per RFC 9110.

| Operation | Method | URL Target | Body | Idempotent | Safe |
|-----------|--------|------------|------|------------|------|
| List collection | `GET` | `/v1/resources` | None | Yes | Yes |
| Get resource | `GET` | `/v1/resources/{id}` | None | Yes | Yes |
| Create resource | `POST` | `/v1/resources` | Resource | No | No |
| Full replace | `PUT` | `/v1/resources/{id}` | Complete | Yes | No |
| Partial update | `PATCH` | `/v1/resources/{id}` | Partial | No* | No |
| Delete resource | `DELETE` | `/v1/resources/{id}` | None | Yes | No |

*PATCH **SHOULD** be designed to be idempotent where possible.

- `GET` **MUST** be safe (read-only and without side effects per RFC 9110).
- `GET` **MUST NOT** accept a request body.
- `GET` responses **MUST** be cacheable unless explicitly marked otherwise (e.g., `Cache-Control: no-store`).
- `POST` to a collection **MUST** return `201 Created` with a `Location` header pointing to the created resource.
- `POST` **SHOULD** accept an `Idempotency-Key` header for safe retries.
- `POST` **MUST NOT** be used for retrieval. `GET` is semantically correct for safe, cacheable reads. If query complexity requires a body (e.g., complex multi-field filters), prefer GraphQL (see INTG-GOV-001) rather than overloading `POST` semantics on a REST endpoint.
- `PUT` **MUST** replace the entire resource state and **MUST** be idempotent. Omitted fields **MUST** reset to documented defaults.
- `PATCH` **MUST** use JSON Merge Patch (RFC 7396).
- `PATCH`: only fields present in the patch body **MUST** be updated; absent fields **MUST** remain unchanged.
- To null a field via `PATCH`, send JSON `null` for that field.
- `DELETE` **MUST** be idempotent.
- `DELETE` **MUST NOT** accept a request body. Return `204 No Content` or `200 OK`.
- `PUT` **MUST NOT** be used for partial updates.

### R-3: Collection Response Envelope

All collection responses **MUST** return a JSON object (never a bare array) with these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `data` | array | **MUST** | The array of resource objects |
| `pagination` | object | **MUST** | Pagination metadata |

**Valid collection response:**
```json
{
  "data": [
    { "id": "ord_82f3k", "status": "confirmed" },
    { "id": "ord_93g4l", "status": "draft" }
  ],
  "pagination": {
    "has_more": true,
    "next_cursor": "eyJpZCI6Im9yZF85M2c0bCJ9"
  }
}
```

### R-4: Pagination

All collection endpoints **MUST** support pagination. Cursor-based pagination **MUST** be the default. Offset-based pagination (`?page=`, `?offset=`) **MUST NOT** be used.

**Cursor request parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Max items to return. **MUST** default to a service-defined value (recommended: 20). **MUST NOT** exceed 100. |
| `starting_after` | string | Return items after this resource ID |
| `ending_before` | string | Return items before this resource ID |

`starting_after` and `ending_before` are mutually exclusive; sending both **MUST** return `400 Bad Request`.

**Cursor response fields:**

| Field | Type | Description |
|-------|------|-------------|
| `has_more` | boolean | `true` if additional items exist beyond this page |
| `next_cursor` | string or null | Opaque cursor for next page. `null` when `has_more` is `false`. |

Collection endpoints **SHOULD NOT** return `total_count` by default. `COUNT(*)` with complex filter predicates on large tables can be significantly more expensive than the data query itself. Making it opt-in via `?include_total=true` ensures only consumers that genuinely need the total incur the cost. If required, it **MAY** be opt-in via `?include_total=true`.

### R-5: Filtering and Sorting

Filtering **MUST** use query parameters with snake_case names. Range operators **SHOULD** use suffixed names:

| Suffix | Meaning | Example |
|--------|---------|---------|
| (none) | Exact match | `?status=confirmed` |
| `_gt`, `_gte` | Greater than (or equal) | `?created_at_gt=2026-03-01T00:00:00Z` |
| `_lt`, `_lte` | Less than (or equal) | `?amount_lte=500` |
| `_ne` | Not equal | `?status_ne=cancelled` |
| `_in` | In set (comma-separated) | `?status_in=draft,confirmed` |

Sorting **MUST** use the `sort` query parameter with field names optionally prefixed by `-` for descending. Multiple fields **MUST** be comma-separated. Default sort **MUST** be stable.

### R-6: Field Selection and Expansion

APIs **MAY** support `fields` (comma-separated field names) for sparse fieldsets. The `id` field **MUST** always be included regardless.

APIs **MAY** support `expand` (comma-separated relationship names) to inline related resources. Expansion depth **MUST** be limited to one level - nested expansion **MUST NOT** be supported.

### R-7: Sub-resources

A resource **MUST** be modeled as a sub-resource only when it cannot exist without its parent, is never accessed independently, and shares authorization context with its parent. Otherwise it **SHOULD** be a top-level resource with a foreign key reference.

Singleton sub-resources (one instance per parent) **MUST** use a singular noun, **MUST** support `GET` and `PUT`/`PATCH`, and **MUST NOT** support `POST`, `DELETE`, or list operations independently.

### R-8: Bulk Operations

Bulk operations **MUST** use `POST /v1/{collection}:bulk-{verb}`. The request **MUST** contain an array of identifiers or representations. The response **MUST** return per-item results including individual success or failure. Maximum item count **MUST** be enforced (recommended: 100).

Batch operations (heterogeneous) **SHOULD** be avoided. If required, the endpoint **MUST** be `/v1/batch` and the response **MUST** use `207 Multi-Status`.

### R-9: Long-running Operations

Operations that cannot complete synchronously **MUST** return `202 Accepted` with an `Operation-Location` header pointing to a status monitor resource. The status field **MUST** use one of: `pending`, `running`, `succeeded`, `failed`, `cancelled`. The server **SHOULD** return a `Retry-After` header. On completion, the response **MUST** include `result` (success) or `error` (failure). Cancellation **SHOULD** be supported via `POST /v1/operations/{op_id}:cancel`.

### R-10: Security

- Resource identifiers **MUST NOT** be sequential integers. Use opaque, high-entropy identifiers.
- Authorization checks **MUST** occur on every request.
- Sub-resource access **MUST** validate the entire parent chain (not just the sub-resource itself).
- Error responses **MUST NOT** distinguish between "does not exist" and "no access" — return `404` (or `403` consistently) for both to prevent resource enumeration.
- Collection endpoints **MUST** apply authorization filters before pagination is applied.
- URLs **MUST NOT** contain PII or sensitive data (names, email addresses, government IDs).

### R-11: Content Types

| Operation | Content-Type | Notes |
|-----------|-------------|-------|
| Request body (create/update) | `application/json` | **MUST** be the default |
| PATCH request body | `application/merge-patch+json` | **MUST** for JSON Merge Patch |
| Response body | `application/json` | **MUST** be the default |

---

## Examples

### Valid API resource structure

```
GET  /v1/orders                     # List orders (paginated)
GET  /v1/orders/{order_id}          # Get single order
POST /v1/orders                     # Create order
GET  /v1/orders/{order_id}/items    # List items in order
POST /v1/orders:bulk-cancel         # Bulk action on orders
```

### Invalid API resource structure

```
GET  /v1/getOrders                  # Verb in path
GET  /v1/order/123                  # Singular collection name
POST /v1/orders/123/cancel          # Action as sub-resource
GET  /api/v1/orders                 # Redundant /api prefix
GET  /v1/orders/                    # Trailing slash
```

## Enforcement Rules

The following **MUST** be rejected at API gateway or design review:

1. **Verbs in URL paths** - path segments containing action words (e.g., `get`, `create`, `delete`).
2. **Singular collection names** - collection path segments that are not plural.
3. **Missing pagination** - collection endpoints returning unbounded arrays.
4. **Offset-based pagination** - use of `page`, `offset`, or `skip` query parameters.
5. **Sequential integer identifiers** - predictable sequential resource IDs.
6. **Request body on GET or DELETE** - any GET or DELETE accepting a body.
7. **PII in URLs** - email addresses, names, or personal data in path segments.
8. **Bare array responses** - collections returning a JSON array instead of `{"data": [], "pagination": {}}`.
9. **URL path validation** - all paths **MUST** match: `^/v[0-9]+/[a-z][a-z0-9-]*(/{[a-z_]+}(/[a-z][a-z0-9-]*)*)*$`
10. **Collection response validation** - `data` **MUST** be an array, `pagination` **MUST** be an object, `pagination.has_more` **MUST** be a boolean.
11. **POST to collection** - **MUST** return `201`.
12. **PUT idempotency** - repeated identical requests **MUST** produce the same result.

Enforcement **MUST** occur at two stages: design time (OpenAPI linting) and runtime (API gateway validation).

---

## References

- [RFC 9110 - HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [RFC 9205 - Building Protocols with HTTP](https://www.rfc-editor.org/rfc/rfc9205)
- [RFC 7396 - JSON Merge Patch](https://www.rfc-editor.org/rfc/rfc7396)
- [Google AIP-121 - Resource-oriented Design](https://google.aip.dev/121)
- [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/)
- [Microsoft REST API Guidelines](https://github.com/microsoft/api-guidelines)
- [OWASP API Security - BOLA](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
- INTG-STD-004 - Naming Conventions

---

## Rationale

**Resource-oriented design over RPC** - Modeling APIs as resources with standard methods reduces cognitive load; learn one resource, understand them all.

**Cursor-based pagination** - Offset pagination breaks under concurrent writes (items shift between pages). Cursor pagination provides stable traversal at any scale.

**Opaque identifiers** - Sequential integers are trivially enumerable and enable BOLA attacks. Prefixed opaque IDs provide type safety and security.

**Kebab-case URLs, snake_case parameters** - Kebab-case is readable in logs and browsers. Snake_case in parameters aligns with JSON field naming per INTG-STD-004, eliminating the need for case transformation code in handlers and clients.

**Three-level nesting limit** - Deeper paths become hard to document, test, and authorize. `GET /v1/orders/{id}/items/{id}/attachments/{id}/tags/{id}` requires four nested authorization checks before serving data. Flat resources with filter parameters (`/v1/tags?attachment_id=...`) are independently addressable, independently securable, and independently cacheable.

**POST not for retrieval** - `POST` is neither safe nor cacheable per RFC 9110, which means gateways, proxies, and clients cannot cache responses. Using `GET` for retrieval enables HTTP caching infrastructure to reduce backend load. If filter complexity cannot be expressed in query parameters, `GraphQL` (per INTG-GOV-001) is the appropriate protocol choice.

**Cursor-based pagination** - Offset pagination breaks under concurrent writes (items shift between pages). Cursor pagination provides stable traversal at any scale.

**Opaque identifiers** - Sequential integers are trivially enumerable and enable BOLA attacks. Prefixed opaque IDs provide type safety and security.

**Collection envelope** - `{"data": [], "pagination": {}}` ensures pagination metadata can be added without breaking changes.

**JSON Merge Patch** - Simpler than JSON Patch (RFC 6902) for common partial updates, using natural JSON structure rather than operation arrays.

**Long-running operations as resources** - Treating operations as pollable resources follows the same pattern used throughout the API, avoiding WebSocket complexity.

---

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-03-28 | Initial definition |
| 1.1.0   | 2026-04-10 | Converted R-2/R-10 to bullet-point format; added rationale for snake_case path params, 3-level nesting, POST retrieval prohibition, and total_count opt-in |
