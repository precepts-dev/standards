#!/usr/bin/env node

/**
 * Precepts Standards Validator
 *
 * Validates all standard documents in docs/ against:
 * 1. Frontmatter schema (required fields, valid values)
 * 2. Required body sections (Purpose, Rules, etc.)
 *
 * Exit code 0 = all valid, 1 = errors found.
 *
 * Usage:
 *   npx tsx tools/validator/validate.ts [--docs-root ./docs] [--strict]
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// ── Configuration ─────────────────────────────────────────────────

const REQUIRED_FRONTMATTER_FIELDS = [
  "identifier",
  "name",
  "version",
  "status",
];

const VALID_STATUSES = ["DRAFT", "MANDATORY", "RECOMMENDED", "DEPRECATED"];

const VALID_DOMAINS = [
  "INTEGRATION",
  "PRODUCT-MANAGEMENT",
  "PROJECT-MANAGEMENT",
  "UX",
  "SECURITY",
];

const VALID_DOCUMENT_TYPES = ["standard", "guideline", "governance", "best-practice"];

const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+$/;

const IDENTIFIER_PATTERN = /^(INTG|PRD|PRJ|UX|SEC)-(STD|GDL|GOV|BP)-\d{3}$/;

// Required H2 sections in standard body (at minimum)
const REQUIRED_SECTIONS = ["Purpose"];

// Recommended sections (warn if missing, don't fail)
const RECOMMENDED_SECTIONS = [
  "Rules",
  "Examples",
  "References",
  "Rationale",
];

// ── Types ─────────────────────────────────────────────────────────

interface ValidationError {
  file: string;
  level: "error" | "warning";
  message: string;
}

// ── File Discovery ────────────────────────────────────────────────

function findStandardFiles(docsRoot: string): string[] {
  const results: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Only look in standards/ subdirectories
        if (entry.name === "standards" || dir.includes("standards")) {
          walk(fullPath);
        } else {
          walk(fullPath);
        }
      } else if (
        entry.name.endsWith(".md") &&
        !entry.name.startsWith("_") &&
        !entry.name.startsWith(".")
      ) {
        results.push(fullPath);
      }
    }
  }

  walk(docsRoot);
  return results;
}

// ── Validation Logic ──────────────────────────────────────────────

function validateFile(filePath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const relPath = path.relative(process.cwd(), filePath);

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    errors.push({ file: relPath, level: "error", message: "Cannot read file" });
    return errors;
  }

  let data: Record<string, unknown>;
  let content: string;
  try {
    const parsed = matter(raw);
    data = parsed.data;
    content = parsed.content;
  } catch {
    errors.push({
      file: relPath,
      level: "error",
      message: "Failed to parse YAML frontmatter",
    });
    return errors;
  }

  // Skip files without frontmatter (not standards)
  if (Object.keys(data).length === 0) return [];

  // Skip files without an identifier (guidelines, non-standard docs)
  if (!data.identifier) return [];

  // ── Frontmatter checks ──────────────────────────────────────

  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    if (!data[field]) {
      errors.push({
        file: relPath,
        level: "error",
        message: `Missing required frontmatter field: "${field}"`,
      });
    }
  }

  // Version format
  if (data.version && typeof data.version === "string") {
    if (!VERSION_PATTERN.test(data.version)) {
      errors.push({
        file: relPath,
        level: "error",
        message: `Invalid version format "${data.version}" - must be semver (e.g., 1.0.0)`,
      });
    }
  }

  // Status value
  if (data.status && typeof data.status === "string") {
    if (!VALID_STATUSES.includes(data.status)) {
      errors.push({
        file: relPath,
        level: "error",
        message: `Invalid status "${data.status}" - must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }
  }

  // Identifier format
  if (data.identifier && typeof data.identifier === "string") {
    if (!IDENTIFIER_PATTERN.test(data.identifier)) {
      errors.push({
        file: relPath,
        level: "warning",
        message: `Identifier "${data.identifier}" doesn't match pattern [INTG|PRD|PRJ|UX|SEC]-[STD|GDL|GOV|BP]-NNN`,
      });
    }
  }

  // Domain value
  if (data.domain && typeof data.domain === "string") {
    if (!VALID_DOMAINS.includes(data.domain)) {
      errors.push({
        file: relPath,
        level: "warning",
        message: `Unknown domain "${data.domain}" - expected one of: ${VALID_DOMAINS.join(", ")}`,
      });
    }
  }

  // Document type value
  if (data.documentType && typeof data.documentType === "string") {
    if (!VALID_DOCUMENT_TYPES.includes(data.documentType)) {
      errors.push({
        file: relPath,
        level: "warning",
        message: `Unknown documentType "${data.documentType}" - expected one of: ${VALID_DOCUMENT_TYPES.join(", ")}`,
      });
    }
  }

  // ── Body section checks ─────────────────────────────────────

  const headings = content.match(/^##\s+(.+)$/gm)?.map((h) =>
    h.replace(/^##\s+/, "").trim()
  ) ?? [];

  for (const section of REQUIRED_SECTIONS) {
    if (!headings.some((h) => h.toLowerCase().includes(section.toLowerCase()))) {
      errors.push({
        file: relPath,
        level: "error",
        message: `Missing required section: "## ${section}"`,
      });
    }
  }

  for (const section of RECOMMENDED_SECTIONS) {
    if (!headings.some((h) => h.toLowerCase().includes(section.toLowerCase()))) {
      errors.push({
        file: relPath,
        level: "warning",
        message: `Missing recommended section: "## ${section}"`,
      });
    }
  }

  return errors;
}

// ── Main ──────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const strictMode = args.includes("--strict");

  let docsRoot = path.resolve(process.cwd(), "docs");
  const docsRootIdx = args.indexOf("--docs-root");
  if (docsRootIdx !== -1 && args[docsRootIdx + 1]) {
    docsRoot = path.resolve(args[docsRootIdx + 1]);
  }

  console.log(`Validating standards in: ${docsRoot}`);
  console.log(`Strict mode: ${strictMode ? "ON (warnings are errors)" : "OFF"}\n`);

  const files = findStandardFiles(docsRoot);

  if (files.length === 0) {
    console.log("No standard documents found.");
    process.exit(0);
  }

  let errorCount = 0;
  let warningCount = 0;
  let filesChecked = 0;

  for (const file of files) {
    const results = validateFile(file);
    if (results.length === 0) continue;

    filesChecked++;

    for (const result of results) {
      const icon = result.level === "error" ? "x" : "!";
      const label = result.level === "error" ? "ERROR" : "WARN ";
      console.log(`  [${icon}] ${label} ${result.file}: ${result.message}`);

      if (result.level === "error") {
        errorCount++;
      } else {
        warningCount++;
      }
    }
  }

  console.log(
    `\nChecked ${files.length} file(s): ${errorCount} error(s), ${warningCount} warning(s)`
  );

  if (errorCount > 0 || (strictMode && warningCount > 0)) {
    process.exit(1);
  }

  console.log("Validation passed.");
  process.exit(0);
}

main();
