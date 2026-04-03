---
# ┌──────────────────────────────────────────────────────────────────┐
# │  PRECEPTS - Universal Standard/Guideline Template               │
# │                                                                  │
# │  Instructions:                                                   │
# │  1. Copy this file as a starting point for your new document     │
# │  2. Replace placeholder values (marked with <angle brackets>)    │
# │  3. Pick ONE value from pipe-delimited options (a | b | c)       │
# │  4. Delete inline comments once you've filled in the fields      │
# │  5. Include all REQUIRED body sections; omit optional ones       │
# │     that don't apply to your domain                              │
# └──────────────────────────────────────────────────────────────────┘

# ── Identity (required) ──────────────────────────────────────────
identifier: "<PREFIX>-<TYPE>-<NNN>"
  # Prefix: INTG | PRD | PRJ | UX | SEC
  # Type:   STD (standard) | GDL (guideline) | GOV (governance) | BP (best practice)
  # Number: zero-padded 3-digit (e.g., 001)
  # Examples: INTG-STD-001, UX-GDL-003, PRJ-GOV-001

name: "<Document Title>"
version: "1.0.0"  # semver: patch = typo, minor = new fields/status change, major = breaking
status: "DRAFT"   # DRAFT | MANDATORY | RECOMMENDED | DEPRECATED

# ── Classification (required) ────────────────────────────────────
domain: "<DOMAIN>"
  # Pick one: INTEGRATION | PRODUCT-MANAGEMENT | PROJECT-MANAGEMENT | UX | SECURITY

documentType: "<TYPE>"
  # Pick one: standard | guideline | governance | best-practice

category: "<CATEGORY>"
  # Pick one or more (comma-separated in a list):
  #   Universal:    governance, security, reliability, naming, versioning, observability
  #   Integration:  format, protocol, data-modeling, error-handling
  #   Product:      process, methodology, decision-framework
  #   PM:           process, ceremony, methodology
  #   UX:           accessibility, design-system, interaction, content

# ── Applicability (recommended) ──────────────────────────────────
appliesTo: []
  # Domain-scoped values - pick from YOUR domain's vocabulary:
  #   Integration:  api, events, a2a, files, mcp, webhooks, grpc, graphql, batch, streaming
  #   Product:      prd, roadmap, user-story, okr, epic, spike
  #   PM:           ceremony, estimation, risk, reporting, artifact, workflow
  #   UX:           web, ios, android, design-tokens, component-library, content

# ── Ownership ────────────────────────────────────────────────────
lastUpdated: "YYYY-MM-DD"
owner: "<Governing Body>"
  # Examples: Integration Architecture Board, Product Council, UX Design Authority

# ── Compliance References ────────────────────────────────────────
standardsCompliance:
  iso: []    # e.g., ["ISO-8601", "ISO-9241"]
  rfc: []    # e.g., ["RFC-3339", "RFC-9557"]
  w3c: []    # e.g., ["WCAG-2.2", "WAI-ARIA-1.2"]
  other: []  # e.g., ["PMBOK-7", "SAFe-6.0", "OWASP-Top-10"]

# ── Taxonomy ─────────────────────────────────────────────────────
taxonomy:
  capability: ""       # e.g., "data-format", "authentication", "estimation"
  subCapability: ""    # e.g., "date-time", "oauth2", "story-points"
  layer: ""
    # Domain-scoped values:
    #   Integration:  contract | transport | semantic | infrastructure
    #   Product:      strategy | process | artifact | metric
    #   PM:           governance | ceremony | artifact | metric
    #   UX:           visual | interaction | content | information-architecture

# ── Enforcement ──────────────────────────────────────────────────
enforcement:
  method: ""
    # Pick one: automated | review-based | stage-gate | hybrid
  # For automated enforcement (primarily Integration):
  validationRules: {}
  rejectionCriteria: []
  supportedFormats: []
  authoritativeModel: ""
  # For human-review enforcement (primarily PM/Product/UX):
  reviewChecklist: []

# ── Relationships ────────────────────────────────────────────────
dependsOn: []      # Identifiers this document depends on, e.g., ["INTG-STD-001"]
supersedes: ""     # Identifier this document replaces, e.g., "INTG-STD-001"

---

# <Document Title>

<!-- The identifier, version, status, domain, and documentType are rendered
     automatically from frontmatter as a metadata bar above the content.
     Do NOT duplicate the identifier in the body. -->

## Purpose

<!-- REQUIRED - All domains. Why does this standard/guideline exist? What problem does it solve? -->

## Rules

<!-- REQUIRED - All domains. Use RFC 2119 language (MUST, SHOULD, MAY) to state prescriptive instructions about what is allowed or prohibited. -->

## Examples

<!-- REQUIRED - All domains. Show concrete valid/invalid examples. Use code blocks, tables, or diagrams. -->

## Allowed Representations

<!-- OPTIONAL - Primarily Integration. Define acceptable serialization formats, encodings, or structural variants. -->

## Validation Rules

<!-- OPTIONAL - Primarily Integration, Security. Machine-checkable rules: regex patterns, schema constraints, linting rules. -->

## Enforcement Rules

<!-- OPTIONAL - Primarily Integration, Security. What must be rejected? At what boundary? -->

## Roles & Responsibilities

<!-- OPTIONAL - Primarily PM, Product. Define who does what (RACI or similar). -->

## Accessibility

<!-- OPTIONAL - Primarily UX. WCAG criteria, ARIA requirements, assistive technology behavior. -->

## References

<!-- REQUIRED - All domains. Links to external specifications, tools, and related resources. -->

## Rationale

<!-- REQUIRED - All domains. Why were these specific choices made? What alternatives were considered? -->

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | YYYY-MM-DD | Initial definition |
