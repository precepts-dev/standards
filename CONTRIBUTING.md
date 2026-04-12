# Contributing to Precepts Standards

Thank you for your interest in contributing. Standards shape how teams build software, so we review them carefully and hold them to a high bar for precision, prior art, and internal consistency.

## What You Can Contribute

| Contribution | Process | Who |
|---|---|---|
| Fix a typo or broken example | Open a PR directly | Anyone |
| Clarify an existing rule | Open a PR with rationale | Anyone |
| Propose a new standard | Open a proposal issue first | Anyone |
| Propose a new discipline | Open a proposal issue first | Domain experts |
| Change the schema | Requires core team approval | Core team |

---

## Branch and Commit Conventions

This repository uses [Conventional Commits](https://www.conventionalcommits.org/) to drive fully automated semantic versioning. The PR title becomes the commit message (squash merge), so **PR titles must follow the conventional commit format**.

### Commit / PR title format

```
<type>[(<scope>)][!]: <short description>
```

| Part | Rules |
|---|---|
| `type` | Required. One of the types listed below. |
| `scope` | Optional but recommended. Domain or identifier: `intg`, `prd`, `prj`, `ux`, `sec`, `INTG-STD-004`, `ci`, `schema`, `deps` |
| `!` | Optional. Appended to type to signal a breaking change (triggers MAJOR version bump). |
| `short description` | Required. Lowercase, imperative, max 72 chars, no trailing period. |

### Commit types and semver impact

| Type | Use for | Semver bump |
|---|---|---|
| `feat` | New standard added; significant new rules or capabilities | **MINOR** (e.g., 0.1.x → 0.2.0) |
| `fix` | Correction, clarification, or rationale improvement to existing standard | **PATCH** (e.g., 0.1.3 → 0.1.4) |
| `refactor` | Format restructure (bullet points, table reformatting) — no semantic change | **PATCH** |
| `perf` | Performance improvement to tooling or validation | **PATCH** |
| `revert` | Revert a previous commit | **PATCH** |
| `chore` | Dependency updates, release config, non-standards tooling | **No release** |
| `ci` | GitHub Actions / workflow changes | **No release** |
| `build` | Build tooling changes | **No release** |
| `docs` | README, non-standards documentation | **No release** |
| `test` | Test additions or corrections | **No release** |

### Examples of valid PR titles

```
feat(intg): add INTG-STD-016 API security standard
fix(INTG-STD-004): correct approved-abbreviations table header
refactor(intg): convert multi-statement rules to bullet-point format
fix(intg): fill INTG-STD-003 money and currency standard
chore(ci): replace manual version check with semantic-release
chore(deps): update gray-matter to v5
```

### Breaking changes (MAJOR version bumps)

Only use this when removing a published standard, renaming an identifier, or making a schema change that breaks existing consumers. It requires an explicit `BREAKING CHANGE:` footer:

```
feat(intg)!: remove INTG-STD-007 and consolidate into INTG-STD-008

Rules from INTG-STD-007 have been merged into INTG-STD-008 R-12.

BREAKING CHANGE: INTG-STD-007 identifier removed from the package.
Consumers referencing INTG-STD-007 must update to INTG-STD-008.
```

The `BREAKING CHANGE:` footer must explain what breaks and how consumers should migrate.

### What NOT to use as a type

- **`patch:`** — this describes a version impact, not the nature of the change. Use `fix:` instead.
- **`update:`**, **`change:`**, **`modify:`** — not valid conventional commit types.

---

## Branch Naming

Use `<type>/<kebab-case-description>`:

```
feat/add-intg-std-016-api-security
fix/intg-std-004-table-header
chore/ci-semantic-release-setup
refactor/intg-bullet-point-format
```

---

## Quick Fixes (Direct PRs)

For typos, formatting errors, broken links, or minor clarifications:

1. Fork the repo (external contributors) or create a branch (core team)
2. Make your change
3. Run `npm run validate:strict` to verify nothing breaks
4. Open a PR — title it `fix(<scope>): <description>`

---

## Proposing a New Standard

### Step 1: Open a Proposal Issue

Use the **New Standard Proposal** issue template. Include:

- **Identifier:** Follow the pattern `[INTG|PRD|PRJ|UX|SEC]-[STD|GDL|GOV|BP]-NNN`
- **Name:** Short, descriptive title
- **Problem statement:** What gap does this standard fill? What goes wrong without it?
- **Scope:** What is and isn't covered
- **Prior art:** Existing specs, RFCs, or industry standards this builds on
- **Domain:** Which discipline this belongs to

### Step 2: Discussion

The community and maintainers discuss the proposal. We evaluate:

- Is this the right scope? Too broad? Too narrow?
- Does it overlap with existing standards?
- Is there sufficient prior art to base rules on?
- Does the target audience need this?

### Step 3: Draft

Once accepted, the author (or a maintainer) creates a draft PR using the template in `schema/document-standard-template.md`. The draft must:

- Follow the schema in `schema/standards.schema.json`
- Include all required sections: Purpose, Rules, Examples, References, Rationale, Version History
- Use RFC 2119 keywords (**MUST**, **SHOULD**, **MAY**) correctly and bolded
- Place each normative statement (sentence with MUST/SHOULD/MAY) in its own bullet point when a rule contains multiple requirements
- Stay within 200–300 lines
- Use concept-level examples (pseudocode), not technology-specific implementations
- PR title: `feat(<domain>): add <IDENTIFIER> <standard name>`

### Step 4: Review and Merge

Draft PRs are reviewed for technical accuracy, clarity, and consistency with existing standards. The PR must pass `npm run validate:strict` before merging.

---

## Proposing a New Discipline

Adding a new discipline (beyond Integration, Product, UX, Project Management) requires:

1. A proposal issue explaining the domain, target audience, and initial scope
2. At least 3 planned standards to demonstrate viability
3. A maintainer willing to own the discipline long-term
4. Core team approval

---

## Content Conventions

All standards must follow these conventions:

- **Section heading:** `## Rules` for prescriptive instructions
- **Keywords:** RFC 2119 terms (**MUST**, **SHOULD**, **MAY**) bolded
- **Rule numbering:** `### R-N: Title` as H3 headings for deep linking
- **Sub-rule numbering:** `### R-N-M: Title` for sub-rules within a rule
- **Bullet format:** Each normative statement on its own bullet point
- **Examples:** Concept-level pseudocode, not technology-specific
- **Length:** 200–300 lines per standard

---

## Validation

Always run validation before opening a PR:

```bash
npm install
npm run validate          # warnings only
npm run validate:strict   # warnings are errors (same as CI)
```

---

## How Versioning Works

You don't need to manually bump `package.json`. The version is determined automatically from your PR title when it merges:

- `feat:` → **minor** version bump and npm publish
- `fix:` / `refactor:` → **patch** version bump and npm publish
- `chore:` / `ci:` / `build:` → no version bump, no publish
- `feat!:` + `BREAKING CHANGE:` → **major** version bump and npm publish

After every merge that triggers a version bump, [semantic-release](https://github.com/semantic-release/semantic-release) automatically:
1. Bumps `package.json` and `package-lock.json`
2. Updates `CHANGELOG.md`
3. Publishes to npm
4. Creates a GitHub Release and git tag
5. Notifies the `precepts-dev/platform` repo

---

## Code of Conduct

Be respectful, constructive, and specific. Standards discussions can get opinionated — focus on evidence and prior art rather than personal preference. If a rule exists in an ISO, IEEE, or RFC spec, cite it.

---

## License

By contributing, you agree that your contributions will be licensed under CC BY-SA 4.0. This means your work will be freely available to everyone, with attribution.
