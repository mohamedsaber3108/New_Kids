# v3 Architecture — deterministic evidence pipeline

```text
URL / route list (user authorization)
  -> Security gates / DNS validation / robots.txt + sitemap -> Bounded Playwright crawl
  -> Responsive page rendering -> DOM + computed CSS + section tree + content outline
  -> Passive network diagnostics -> optional hover/focus/disclosure + motion sampling
  -> Screenshots + optional sanitized rendered HTML + asset manifest/download
  -> Preserved v2.1 evidence.json and Markdown
  -> Offline knowledge graph / per-route specifications / token families
  -> Gap analyzer / follow-up route list / incomplete status
  -> Optional offline Scrapling or ScrapeGraphAI enrichment, or imported DesignLang evidence
  -> AI coding agent / Kiro implementation plan -> Visual comparison / test gates
```

## Provenance levels
1. `observed`: real browser DOM, network metadata, CSS, screenshot or file; *observation is not full coverage*.
2. `derived`: deterministic graph, grouping, heuristic component candidates computed from observations.
3. `inferred`: AI model's semantic interpretation; must be manually validated before use.
4. `unknown`: private code, backend, untriggered states, inaccessible routes, licensing.

## Key boundaries
- The extension coordinates jobs, accepts an explicit current-tab capture and stores session token in Chrome session storage.
- The Node CLI is authoritative for route discovery, browser capture, network controls and deterministic exports.
- Python integrations are opt-in and operate on sanitized, saved HTML without network requests to source sites.
- No general 'automatically click everything' feature; only explicitly opted-in disclosure/tab controls and non-activating hover/focus.
- Existing v2.1 files remain available. `analyze --reference` can process historical outputs without rescanning.

## Honesty of measurement
- `pendingQueue > 0` means link coverage incomplete even if 100/100 max pages scanned successfully.
- Headings/fingerprints can identify repeated page patterns but **not** source React component boundaries.
- A visual diff only covers configured route, viewport, state and timestamp.
- User-specific screens require explicit authorized captures. No cookies, credentials or API bodies intentionally persisted by passive telemetry.
- `--save-html` sanitization is best-effort, not a security/privacy guarantee.

## Next production hardening tasks
- Chromium socket-level DNS pinning or OS-level egress policy / container networking isolation.
- Website-specific crawl policies and stronger sitemap content-type negotiations.
- Reliable manual state recorder with keyboard/audio/drag and consent-tested workflows.
- Accessibility audit integration, offline source-repo adapter and semantic visual diff.
- Retry/resume, disk quotas, stable job persistence and longer reliability tests.
- Use an original character/mascot design and licensed assets for USAM Kids.
