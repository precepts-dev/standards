# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

`precepts-dev/standards` is the canonical source of multi-discipline standards for the Precepts platform. It contains machine-readable standards (Markdown + YAML frontmatter) consumable by both humans and AI agents.

**GitHub org:** `precepts-dev`

**License:** CC BY-SA 4.0. All content is open.

**Published as:** `@precepts/standards` on npm.

## Repository Structure

```
standards/
  integration/          Integration standards (API, events, resilience, observability)
    standards/          Mandatory, enforceable
    governance/         Governance documents
    guidelines/         Recommended, advisory
  product/              Product management standards
  ux/                   UX standards
  project-management/   Project management standards
schema/
  standards.schema.json   Required frontmatter fields
  document-standard-template.md   Template for new standards
.claude/              ← gitignored (local Claude Code config, not in repo)
  skills/
    commit/
      SKILL.md        Custom /commit skill — available locally for Claude Code users
```

## Standards Schema

Each standard has YAML frontmatter with required fields: `identifier`, `name`, `version`, `status`, `domain`, `documentType`.

- Identifier pattern: `[INTG | PRD | PRJ | UX | SEC]-[STD | GDL | GOV | BP]-NNN`
- Document types: `standard`, `guideline`, `governance`, `best-practice`
- Status values: `DRAFT`, `MANDATORY`, `RECOMMENDED`, `DEPRECATED`
- Domains: `INTEGRATION`, `PRODUCT-MANAGEMENT`, `PROJECT-MANAGEMENT`, `UX`, `SECURITY`
- Version: semver (patch = typo/clarification, minor = new rules/status change, major = breaking)

## Content Format Conventions

- Body section "## Rules" for prescriptive instructions
- RFC 2119 keywords (**MUST**, **SHOULD**, **MAY**) bolded throughout
- Rule numbering: `### R-N: Title` as H3 headings
- Sub-rule numbering: `### R-N-M: Title` for nested rules (e.g., INTG-STD-006)
- Multiple normative statements within a single rule **MUST** each be in their own bullet point
- Examples: concept-level (pseudocode/generic), not technology-specific
- Concise: 200-300 lines per standard

## Consumers

This package is consumed by:
- `precepts-dev/platform` repo (Docusaurus site, MCP server, validator)
- `precepts-dev/engine` (commercial compliance scanner - separate private repo)
- Any third party building tooling around Precepts standards

---

## Development Workflow

### Golden Rule

**Never commit directly to `main`. Never push from Claude Code.** All changes go through feature branches. The user merges PRs manually.

### Branch Strategy

```
main  ←── only receives semantic-release commits [skip ci] and squash-merged PRs
  └── feat/add-intg-std-016-api-security
  └── fix/intg-std-004-table-header
  └── chore/ci-semantic-release-setup
```

Branch naming: `<type>/<kebab-case-description>`
- Types: `feat`, `fix`, `chore`, `ci`, `refactor`, `docs`, `build`
- Examples: `feat/add-intg-std-016`, `fix/intg-std-004-rules-format`, `chore/deps-update`

### Always Use the `/commit` Skill

When making any code change, use the `/commit` custom command. It handles:
- Checking/creating the correct feature branch
- Inferring commit type and scope from changed files
- Running `npm run validate:strict` for any standards content changes
- Staging only the appropriate files
- Generating a compliant conventional commit message
- Committing locally

```
/commit
```

### Commit Convention

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). The PR title becomes the commit message on `main` (squash merge strategy). semantic-release reads this to determine the version bump automatically.

| Commit type | Standards repo meaning | Semver bump |
|-------------|----------------------|-------------|
| `feat(intg):` | New standard added; significant new rules | MINOR |
| `fix(intg):` | Correction, clarification, rationale improvement | PATCH |
| `refactor(intg):` | Format restructure, no semantic change | PATCH |
| `chore(ci):` | Workflow / tooling changes | None |
| `chore(deps):` | Dependency updates | None |
| `ci:` | GitHub Actions changes | None |
| `feat!:` + `BREAKING CHANGE:` | Remove standard, rename identifier, breaking schema change | MAJOR |

Scopes: `intg`, `prd`, `prj`, `ux`, `sec`, `ci`, `schema`, `deps`, `release`, or a specific identifier like `INTG-STD-004`.

### Validation

Always run before committing any `standards/**` change:
```bash
npm run validate:strict
```

The `/commit` skill runs this automatically. CI also runs it — failing validation blocks merge.

### Release Process (fully automated)

1. PR approved and merged to `main` (squash merge — PR title becomes commit message)
2. `publish.yml` triggers semantic-release
3. semantic-release analyzes commits → determines bump type → updates `package.json`, `package-lock.json`, `CHANGELOG.md` → publishes to npm → creates git tag → creates GitHub Release → notifies `precepts-dev/platform` via repository dispatch
4. No human intervention required after merge

### Deferred / Setup Items

See `DEFERRED.md` (gitignored, root of repo) for pending one-time setup tasks including:
- Branch protection rules configuration (DEF-004) — requires one PR to run first to register check names
- Platform repo automation (DEF-003)
- PLATFORM_DISPATCH_PAT consolidation into GitHub App (DEF-008)
