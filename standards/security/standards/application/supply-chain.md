---
identifier: "SEC-STD-006"
name: "Software Supply Chain Security"
version: "1.0.0"
status: "MANDATORY"

domain: "SECURITY"
documentType: "standard"
category: "application"
appliesTo: ["all"]

lastUpdated: "2026-05-05"
owner: "Security Architecture Board"

standardsCompliance:
  iso: ["ISO/IEC-27001:2022"]
  rfc: []
  w3c: []
  other: ["SLSA-v1.0", "NIST-SP-800-161r1", "CISA-SSDF-v1.1", "OWASP-CycloneDX-1.5", "SPDX-2.3", "OpenSSF-Scorecard"]

taxonomy:
  capability: "software-supply-chain"
  subCapability: "dependency-security"
  layer: "security"

enforcement:
  method: "hybrid"
  validationRules:
    sbomFormat: "CycloneDX 1.5+ or SPDX 2.3+ required for all production services"
    criticalCveSla: "Critical CVE (CVSS 9.0+) blocks new deployments; 72h remediation deadline after CISO exception"
  rejectionCriteria:
    - "Dependencies not pinned to specific versions in lock files"
    - "No SBOM produced for production deployments"
    - "Critical CVE (CVSS 9.0+) present in production without approved exception"
    - "Build pipeline pulls dependencies at build time from public registries without integrity verification"
    - "No dependency confusion prevention config in registry configuration files"
  reviewChecklist:
    - "All dependencies pinned in lock files committed to version control"
    - "SBOM generated and stored per each production release"
    - "Continuous vulnerability scanning active on all production services"
    - "Dependency confusion prevention config present (.npmrc, pip.conf, or equivalent)"
    - "SLSA provenance level documented"
    - "Emergency exception process defined for Critical CVE zero-days"

dependsOn: ["SEC-GOV-000", "SEC-STD-007"]
supersedes: ""
---

# Software Supply Chain Security

## Purpose

This standard defines **MANDATORY** requirements for securing the software supply chain: dependency integrity, Software Bill of Materials (SBOM), vulnerability scanning, build pipeline security, and protection against dependency confusion attacks. It applies to all services that build, deploy, or distribute software.

> *Normative language (**MUST**, **MUST NOT**, **SHOULD**, **MAY**) follows RFC 2119 semantics.*

## Rules

### R-1: Dependency Pinning and Integrity

All third-party dependencies **MUST** be pinned to specific, immutable versions:

- Package manager lock files (`package-lock.json`, `yarn.lock`, `Pipfile.lock`, `go.sum`, `Cargo.lock`, `pom.xml` with locked versions, etc.) **MUST** be committed to version control and **MUST NOT** be in `.gitignore`
- Lock files **MUST** be regenerated from scratch (not manually edited) when dependencies change; automated regeneration **SHOULD** be enforced by CI
- Dependency integrity hashes **MUST** be verified at install time; lock files that include integrity hashes (npm, Yarn, Pipenv, Cargo) **MUST** have hash verification enabled and passing
- Pinned versions **MUST NOT** use version ranges that permit silent upgrades (e.g., `^1.2.0`, `>=1.0`, `*`) in production dependency manifests; ranges are acceptable in development tooling only
- Dependency update automation (Dependabot, Renovate, or equivalent) **SHOULD** be configured to open pull requests for dependency updates; this enables review before merging rather than silent drift

### R-2: Dependency Confusion Prevention

Services that consume packages from both private and public registries **MUST** configure explicit registry precedence to prevent dependency confusion attacks:

- **npm:** configure `.npmrc` with explicit `registry` entries per scope; use `@scope:registry=https://private.registry/` to bind private scopes to private registries; set `always-auth=true` for private registry scopes
- **pip/PyPI:** configure `pip.conf` or `pyproject.toml` with `index-url` set to the private registry; set `extra-index-url` only for packages that are exclusively public; do not list the public PyPI as the primary index if private packages exist
- **Maven:** configure `settings.xml` with `<mirror>` entries that route private artifact IDs to the private registry; do not rely on default Maven Central fallback for any artifact also published privately
- **Go modules:** use `GONOSUMCHECK` and `GOFLAGS=-mod=vendor` for private modules; configure `GOPRIVATE` to prevent checksum database lookups for internal packages
- All private package namespaces **MUST** be registered (even as empty placeholder packages) on the public registry to prevent namespace squatting; this is a defence against pre-registration attacks

### R-3: Software Bill of Materials (SBOM)

Every production release **MUST** produce and store an SBOM:

- SBOM format **MUST** be CycloneDX 1.5+ or SPDX 2.3+; both are acceptable
- The SBOM **MUST** include: package name, version, ecosystem (npm, PyPI, Maven, etc.), package URL (pURL), declared license, and known vulnerabilities at time of build
- SBOM generation **MUST** be integrated into the CI/CD pipeline and run on every production release; manual SBOM creation is not acceptable
- SBOMs **MUST** be stored and retained for the lifetime of the corresponding release plus 3 years; this enables retrospective vulnerability analysis when new CVEs are published against older releases
- For services distributed to external customers (SaaS, on-premises software), the SBOM **SHOULD** be made available to customers on request; this is **MUST** for any customer with a contractual right to audit

### R-4: Continuous Vulnerability Scanning

All production services **MUST** be enrolled in continuous vulnerability scanning against their SBOM or dependency manifest:

- Scanning **MUST** run at minimum on every build; in addition, vulnerability databases **MUST** be re-checked against deployed SBOMs on a scheduled basis (minimum weekly) to catch CVEs published after the last build
- Scanning tools **MUST** use at minimum the National Vulnerability Database (NVD) feed plus at least one ecosystem-specific advisory database (GitHub Advisory Database, OSV, npm audit advisories, PyPA Advisory Database)
- Scan results **MUST** be treated as part of the build artefact; failing builds due to new critical CVEs in pre-existing dependencies **MUST NOT** be silently bypassed; they require an explicit exception (see R-6)
- Scan results **MUST** be forwarded to the vulnerability management system per SEC-STD-007

### R-5: Build Pipeline Integrity

Build pipelines **MUST NOT** silently resolve dependencies at build time without integrity verification:

- Build pipelines **MUST** install from committed lock files (e.g., `npm ci` not `npm install`; `pip install --require-hashes`)
- Builds **MUST NOT** pull dependencies from public registries directly if a private mirror or cache is available and configured; internet egress from build environments **SHOULD** be restricted
- All build artefacts (container images, binaries, packages) **MUST** be signed with a verifiable identity; Sigstore/cosign **SHOULD** be used as the signing mechanism for container images
- SLSA (Supply chain Levels for Software Artefacts) provenance **SHOULD** be generated and attached to each build artefact; services processing Restricted-tier data or distributed to external customers **MUST** achieve minimum SLSA Build L2
- Build environment credentials (CI tokens, registry write access, signing keys) **MUST** be treated as secrets per SEC-STD-002; they **MUST NOT** appear in build logs, artefact metadata, or SBOM

### R-6: Emergency Exception for Critical CVE Zero-Days

When a Critical severity CVE (CVSS 9.0+) is published for a dependency in active use and no patch is available:

- An emergency exception request **MUST** be submitted within **4 hours** of the vulnerability being identified in the dependency inventory
- Exception approval requires CISO (or equivalent accountable security authority) sign-off within **24 hours**
- The approved exception **MUST** document: the CVE identifier, the affected dependency, the rationale for continued deployment (no patch available, patch introduces breaking changes), mitigating compensating controls, and the remediation deadline
- The remediation deadline **MUST NOT** exceed **72 hours** from patch availability; if a patch is not available within 30 days, the exception must be re-evaluated with a formal risk acceptance per SEC-GOV-004
- Compensating controls during the exception window **MUST** be implemented where technically feasible (e.g., WAF rule blocking the attack vector, network egress restrictions)

## Examples

### Dependency confusion prevention — npm

```ini
# .npmrc — bind all @myorg packages to private registry
@myorg:registry=https://registry.myorg.example.com/
//registry.myorg.example.com/:always-auth=true
//registry.myorg.example.com/:_authToken=${NPM_TOKEN}
# public registry fallback only for unscoped packages
registry=https://registry.npmjs.org/
```

### SBOM generation in CI — CycloneDX

```yaml
# GitHub Actions step
- name: Generate SBOM
  uses: CycloneDX/gh-node-module-generatebom@v1
  with:
    output: sbom.json

- name: Attach SBOM to release
  run: gh release upload ${{ github.ref_name }} sbom.json
```

### Lock-file-first install

```bash
# MUST — install from lockfile, verifies hashes
npm ci

# MUST NOT — resolves ranges, may upgrade silently
npm install
```

## References

- [SLSA v1.0 — Supply chain Levels for Software Artefacts](https://slsa.dev/spec/v1.0/)
- [NIST SP 800-161r1 — Cybersecurity Supply Chain Risk Management](https://doi.org/10.6028/NIST.SP.800-161r1)
- [CISA SSDF v1.1 — Secure Software Development Framework](https://csrc.nist.gov/Projects/ssdf)
- [CycloneDX 1.5 — SBOM specification](https://cyclonedx.org/specification/overview/)
- [SPDX 2.3 — Software Package Data Exchange](https://spdx.github.io/spdx-spec/v2.3/)
- [Sigstore / Cosign — keyless signing](https://docs.sigstore.dev/cosign/overview/)
- [OWASP Dependency Track — continuous SBOM analysis](https://dependencytrack.org/)
- [Alex Birsan — Dependency Confusion attack writeup (2021)](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610)
- SEC-STD-002 — Secrets Management (CI pipeline credentials)
- SEC-STD-007 — Vulnerability Management (SLA for CVEs found in scanning)
- SEC-GOV-004 — Security Risk Assessment Framework (extended exception risk acceptance)

## Rationale

**Why CycloneDX or SPDX — not proprietary formats?** Both are OWASP/Linux Foundation standards with broad tooling support (Syft, cdxgen, trivy, grype). Proprietary formats create lock-in and cannot be consumed by external auditors or customers without specialised tooling.

**Why register internal package names in public registries?** An attacker who discovers an internal package name (via SBOM, error messages, or public code) can publish a malicious package with the same name to the public registry. If the build pipeline falls back to the public registry for unresolved packages, the malicious version is installed. Registering a placeholder (even empty) with the correct organisation's account prevents this takeover.

**Why 72-hour remediation deadline for Critical CVE after patch availability?** The window between CVE publication and exploit availability is narrowing — active exploitation often begins within hours of a working PoC being published. A 72-hour window gives teams enough time to test and deploy a patch without leaving a known critical vulnerability exposed for days.

## Version History

| Version | Date       | Change             |
| ------- | ---------- | ------------------ |
| 1.0.0   | 2026-05-05 | Initial definition |
