# Contributing to Precepts Standards

Thank you for your interest in contributing. Standards shape how teams build software, so we take contributions seriously and review them carefully.

## What You Can Contribute

| Contribution | Process | Who can do it |
|---|---|---|
| **Fix a typo or broken example** | Open a PR directly | Anyone |
| **Clarify an existing rule** | Open a PR with rationale | Anyone |
| **Propose a new standard** | Open a proposal issue first | Anyone |
| **Propose a new discipline** | Open a proposal issue first | Domain experts |
| **Change the schema** | Requires core team approval | Core team |

## Quick Fixes (Direct PRs)

For typos, formatting errors, broken links, or minor clarifications:

1. Fork the repo
2. Make your change
3. Run `npm run validate` to verify nothing breaks
4. Open a PR with a one-line description of what you fixed

## Proposing a New Standard

New standards go through a proposal process before drafting begins. This prevents wasted effort and ensures alignment with the platform's direction.

### Step 1: Open a Proposal Issue

Use the **New Standard Proposal** issue template. Include:

- **Identifier:** Follow the pattern `[INTG|PRD|PRJ|UX|SEC]-[STD|GDL|GOV|BP]-NNN`
- **Name:** Short, descriptive title
- **Problem statement:** What gap does this standard fill? What goes wrong without it?
- **Scope:** What is and isn't covered
- **Prior art:** Existing specs, RFCs, or industry standards this builds on
- **Domain:** Which discipline this belongs to

### Step 2: Discussion

The community and maintainers discuss the proposal in the issue. We evaluate:

- Is this the right scope? Too broad? Too narrow?
- Does it overlap with existing standards?
- Is there sufficient prior art to base rules on?
- Does the target audience need this?

### Step 3: Draft

Once a proposal is accepted, the author (or a maintainer) creates a draft PR using the template in `schema/document-standard-template.md`. The draft must:

- Follow the schema in `schema/standards.schema.json`
- Include all required sections: Purpose, Rules, Examples, References, Rationale, Version History
- Use RFC 2119 keywords (**MUST**, **SHOULD**, **MAY**) correctly
- Stay within 200-300 lines
- Use concept-level examples (pseudocode), not technology-specific implementations

### Step 4: Review and Merge

Draft PRs are reviewed for technical accuracy, clarity, and consistency with existing standards. The PR must pass `npm run validate:strict` before merging.

## Proposing a New Discipline

Adding a new discipline (beyond Integration, Product, UX, Project Management) requires:

1. A proposal issue explaining the domain, target audience, and initial scope
2. At least 3 planned standards to demonstrate viability
3. A maintainer willing to own the discipline long-term
4. Core team approval

## Content Conventions

All standards must follow these conventions:

- **Section heading:** `## Rules` for prescriptive instructions
- **Keywords:** RFC 2119 terms (**MUST**, **SHOULD**, **MAY**) bolded
- **Rule numbering:** `### R-N: Title` as H3 headings for deep linking
- **Examples:** Concept-level pseudocode, not technology-specific
- **Length:** 200-300 lines per standard
- **No em dashes:** Use regular hyphens instead

## Validation

Always run validation before submitting a PR:

```bash
npm install
npm run validate          # check for errors
npm run validate:strict   # warnings become errors (CI uses this)
```

## Code of Conduct

Be respectful, constructive, and specific. Standards discussions can get opinionated - focus on evidence and prior art rather than personal preference. If a rule exists in an ISO, IEEE, or RFC spec, cite it.

## License

By contributing, you agree that your contributions will be licensed under CC BY-SA 4.0. This means your work will be freely available to everyone, with attribution.
