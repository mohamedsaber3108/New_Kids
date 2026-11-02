# Site Reconstruction Toolkit v3.1.0 — Browser-Delivered Source Evidence

## Built on v3.0.1 (backwards-compatible)

- Keeps original `DESIGN.md`, `SITE_MAP.md`, `COMPONENTS.md`, `INTERACTIONS.md`, `RESPONSIVE.md`, `ASSETS.md`, `AGENTS.md`, `evidence.json`, screenshots, and all v3 knowledge files.
- Adds `src/source-intelligence.js` to record browser-visible CSS keyframes, `@font-face` declarations, limited selectors, CSS variables, WAAPI keyframes, and page-to-JS/CSS usage.
- Adds `SOURCE_INVENTORY.json`, `ANIMATION_CATALOG.json`, `FRONTEND_BLUEPRINT.json`, `DEPENDENCY_GRAPH.json`, `CODE_EVIDENCE.md`, and `CAPTURE_COVERAGE.md` to new scans.
- Adds optional `--archive-public-source` and `--max-source-files 60` to save only permitted public CSS/JS files with SHA-256 provenance and size limits, in `public-source/`.
- Adds optional CLI-only `--source-origins` for separately authorized CDN origins. No automatic cross-origin copying.
- Chrome Extension includes an **off by default** public CSS/JS archive opt-in and displays v3.1.0. Server health version matches.
- `npm run analyze -- --reference ...` adds the new structured files offline. Historical scans without browser source evidence will correctly show *zero source observations* rather than pretend to recover them.

## Upgrade on Windows

1. Stop any running `npm run server` (`Ctrl+C`).
2. Extract this ZIP with `Expand-Archive` to the same parent directory. Do not delete `output/`.
3. In project folder run `npm install`, `npx playwright install chromium`, `npm test`, `npm run check`.
4. Launch `npm run server`. Update/Reload the Chrome extension from the new `extension/` folder. A **new token** is issued every restart; do not share it.
5. Test with 5 pages before broader scans. Keep `--archive-public-source` off unless authorized.

## Limits (not solved by any crawler)

This tool cannot retrieve the private source repository, server-side services, closed business logic, source code hidden behind authorization, original copyrighted character rigs, passwords, secrets or all unknown game states from a public URL. Source maps or scripts exposed in a browser may be partial and are not proof of editable authored source. Captured CSSOM rules may be incomplete because of CORS or browser limitations. Dynamic interactions are sampled safely without submitting forms. AI-authored reconstructions must be tested, legally cleared and connected to the destination project backend.

## Testing performed

Node-based unit, extension, HTTP, schema and offline source-archive tests: see `npm test`. Browser E2E needs Playwright installed and `SRT_E2E=1`; it was not run in the packaging environment.
