# Precepts Standards

Built for humans. Ready for agents.

The canonical source of multi-discipline standards for the [Precepts](https://precepts.dev) platform. Standards are published as machine-readable Markdown with YAML frontmatter, consumable by both humans and AI agents.

## Install

```bash
npm install @precepts/standards
```

## Usage

Standards are plain Markdown files with structured YAML frontmatter. Consume them however you need:

```javascript
import { readFileSync } from 'fs';
import matter from 'gray-matter';

// Read a standard
const raw = readFileSync(
  'node_modules/@precepts/standards/standards/integration/standards/api/resource-design.md',
  'utf-8'
);
const { data, content } = matter(raw);

console.log(data.identifier); // "INTG-STD-008"
console.log(data.status);     // "MANDATORY"
console.log(data.domain);     // "INTEGRATION"
```

## Disciplines

| Discipline | Prefix | Directory |
|---|---|---|
| Integration | `INTG` | `standards/integration/` |
| Product Management | `PRD` | `standards/product/` |
| UX | `UX` | `standards/ux/` |
| Project Management | `PRJ` | `standards/project-management/` |

## Integration Standards (Batch 1)

| Identifier | Name | Status |
|---|---|---|
| INTG-STD-004 | Naming Conventions | MANDATORY |
| INTG-STD-005 | Character Encoding | MANDATORY |
| INTG-STD-006 | Backward and Forward Compatibility | MANDATORY |
| INTG-STD-008 | API Resource Design | MANDATORY |
| INTG-STD-009 | API Error Handling | MANDATORY |
| INTG-STD-015 | Event Envelope (CloudEvents) | MANDATORY |
| INTG-STD-029 | Observability | MANDATORY |
| INTG-STD-033 | Resilience Patterns | MANDATORY |
| INTG-STD-034 | Retry Policy | MANDATORY |
| INTG-STD-035 | Timeout | MANDATORY |

## Standards Schema

Each standard has YAML frontmatter validated against `schema/standards.schema.json`:

```yaml
---
identifier: INTG-STD-008
name: API Resource Design
version: 1.0.0
status: MANDATORY
domain: INTEGRATION
documentType: standard
category: protocol
---
```

**Required fields:** `identifier`, `name`, `version`, `status`, `domain`, `documentType`

**Identifier pattern:** `[INTG|PRD|PRJ|UX|SEC]-[STD|GDL|GOV|BP]-NNN`

**Status values:** `DRAFT`, `MANDATORY`, `RECOMMENDED`, `DEPRECATED`

## Content Conventions

- `## Rules` for prescriptive instructions (not "Requirements")
- RFC 2119 keywords (**MUST**, **SHOULD**, **MAY**) bolded throughout
- Rule numbering: `### R-N: Title` as H3 headings
- Concept-level examples (pseudocode), not technology-specific
- 200-300 lines per standard

## Validation

```bash
npm run validate          # check frontmatter + required sections
npm run validate:strict   # warnings become errors
```

## Ecosystem

This package is consumed by:

- **[precepts-dev/platform](https://github.com/precepts-dev/platform)** - Docusaurus site, MCP server, validator
- **precepts-dev/engine** - Commercial compliance scanning engine (private)
- **Your tools** - build anything on top of these standards

## Contributing

Standards proposals and revisions are welcome. Each standard follows the template in `schema/document-standard-template.md`.

1. Fork this repo
2. Create a new standard or modify an existing one
3. Run `npm run validate` to check your changes
4. Open a PR

## License

CC BY-SA 4.0 - see [LICENSE](LICENSE) for details.

All standards are freely usable by individuals, companies, and AI tools, with attribution and share-alike.
