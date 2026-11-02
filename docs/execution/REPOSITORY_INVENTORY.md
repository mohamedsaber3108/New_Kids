# REPOSITORY_INVENTORY.md

Discovery performed against the supplied ZIP and the full extracted tree. Result: a
single application project. No additional Git repositories, remotes, or submodules exist.

## Repositories / projects found

| # | Name / location | Purpose | Stack | Remote | Branch | Tests | Deployment target | In product scope |
|---|---|---|---|---|---|---|---|---|
| 1 | `m:\Kids _New\app` (USAM Kids) | The learning platform (frontend + API + DB) | React 18 / Vite 5 SPA; Node 24 built-in `http`; SQLite via `node:sqlite` | none (git init'd locally) | `master` | 34 passing (`npm test`) | Docker Compose on EC2 behind Nginx TLS | YES |
| 2 | `m:\Kids _New\app\tools\site-reconstruction` | Dev-only website reconstruction/analysis toolkit (Playwright-based) | Node CLI + Chrome extension + Python helper | none | n/a | own suite (not product) | none — never shipped to users | NO (preserved, excluded) |

## Nested package manifests
- `package.json` (root) — the product.
- `tools/site-reconstruction/package.json` — dev tooling only (playwright, pixelmatch, pngjs, optional axe-core/jsdom/postcss).

## Archives preserved as checkpoints (never modified)
- `m:\Kids _New\Kids-20261102T164213Z-1-001.zip` (original delivery)
- `m:\Kids _New\extracted\Kids\USAM-Kids-EC2-Ready-v20.zip` (nested original)
- `m:\Kids _New\extracted\` (first clean extraction)

## Inaccessible repositories
- None. Everything in the delivery is accessible and accounted for.

## Separate, unrelated project (NOT part of USAM Kids)
- `M:\English Website\` contains a different initiative (an "Adaptive AI Language
  Learning OS" research brief + a Django MVP backend prompt + a `Lanaguage-*.zip`).
  The user confirmed these belong to **another project**. Excluded from this effort.
