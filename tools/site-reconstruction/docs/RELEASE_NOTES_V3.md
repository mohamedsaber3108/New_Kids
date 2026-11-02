# SRT v3.0 Release Notes — 2026-10-16

## Preserved from 2.1
Bounded URL crawling, robots and sitemap checks, private-IP checks, typed HTTP fetches, asset manifest/downloader, Chrome extension controls, local server token and job queue, screenshot diff CLI, v2.1 Markdown/JSON reports, CSS statistics and responsive screenshots. Files have **not** been removed.

## Implemented in 3.0
- Deeper browser DOM evidence: section hierarchy candidates, content outlines, visual positioning and layout hints, forms/control metadata without entered field values, CSS background assets, inline bounded SVG markup, and font-face hints.
- Three-viewport passive network diagnostics: request type, stripped URLs, HTTP errors, console errors. No headers, cookies, credentials, request or response bodies are intentionally collected.
- Opt-in hover/focus style probes, existing safe ARIA disclosure states and optional timed motion frames.
- Opt-in sanitized rendered HTML for offline analysis. This is not security-grade anonymization.
- Per-route Markdown reports and JSON indices for route graph, asset usage map, token coverage, dominant-font families, repeated heading fingerprints and content previews.
- Uncertainty-aware quality gates, gap-directed rescan checklist and follow-up route list.
- `analyze` command that reads older v2.1 output and adds structured exports **without replacing** original reports.
- Optional offline Scrapling parser (Python) and optional local-Ollama ScrapeGraphAI inference adapter (Python), plus provenance-preserving import of an existing DesignLang JSON export.
- Kiro/AI implementation handoff instructions with USAM Kids migration constraints.
- Tests for knowledge graph, gaps, preserved v2 files and DesignLang adapter.

## Verified in development environment
- `node --test`: 15 pass, 0 fail, 1 skipped (optional Chromium E2E).
- `node scripts/check.js`: JavaScript files parse and extension manifest is Manifest V3.
- `python -m py_compile integrations/offline_enrich.py`: passes.
- Existing 5-page Prodigy evidence processed offline: 5 pages, 180 observed asset URLs, 11 gap categories, preserved original reports.

## Unverified / intentionally out of scope
- npm registry access failed with `EAI_AGAIN`, so **no actual Playwright browser scan** of this release was performed in this environment.
- Optional Scrapling/ScrapeGraphAI providers are implemented but not tested with installed Python dependencies. Their exact-version API compatibility needs verification.
- Browser-level DNS rebinding is not completely prevented by the Playwright routing guard; use OS-level network isolation when scanning untrusted sites.
- Network traffic metadata is not backend contract discovery; private APIs/server code remain inaccessible from public rendering.
- No automatic generation of a complete functional replica or of original game-engine/character/source assets. Only observed evidence can be extracted.
- No guarantee all pages/states/assets are detected. Reviews/rights clearance remain necessary.

## Required Windows acceptance test
From the extracted project root, after `npm install` and `npx playwright install chromium`:
```
$env:SRT_E2E = '1'
npm test
Remove-Item Env:SRT_E2E
```
Then run a 1-5-page authorized test with `--interactions --motion --save-html` and check `QUALITY_GATES.md`, screenshots and `evidence.json`. Do not claim production reliability until this completes.
