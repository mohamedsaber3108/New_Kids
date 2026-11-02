# Quality gates

1. Run `npm test` and `npm run check`.
2. Run a permitted test-site scan with the browser executable installed and inspect `SCAN_REPORT.md`, `SITE_MAP.md`, `evidence.json` and screenshots.
3. Rebuild the frontend from `AGENTS.md`, then run `npm run compare` at matching viewports; prioritize largest differences.
4. Check any skipped routes, broken images, console errors, inaccessible interactive states, font loading, keyboard navigation and responsive overflow manually.
5. Do not claim pixel-perfect reproduction without a complete, explicit acceptance suite.

**Intentional gaps:** production-grade DNS pinning, exhaustive interaction state coverage, automated backend recreation, accessibility certification, continuous crawling, and licensed asset acquisition are not supplied.
