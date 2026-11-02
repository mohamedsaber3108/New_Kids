# Kiro toolkit integration — evidence and gaps

The attached v3.3.1 bundle is vendored under `tools/site-reconstruction/`; the existing React app and API were not replaced. The independent USAM route-to-code candidate matrix is `docs/route-code-matrix.csv`. The existing 164-route acceptance audit remains `docs/implementation-audit.md`.

## Verified here

- `npm run check --prefix tools/site-reconstruction`: all source and extension scripts parsed; extension manifest passed.
- `npm test --prefix tools/site-reconstruction`: 31 passed, one browser E2E skipped, and one local named-host DNS fixture timed out. The failed fixture uses `fixture.test` resolved to loopback and appears restricted in this environment. Do not treat the entire suite as green.
- The original USAM app build and 26 tests are independently runnable with `npm run build` and `npm test` in the repo root.
- The bundle README itself states the previous `Prodigy-Full` scan and its `UNIVERSAL_RECONSTRUCTION_PROMPT.md` are *not included*. The Windows `M:` and `C:` paths do not exist in this workspace. There is no `CONTENT_INDEX.json` or screenshot corpus to generate evidence-backed briefs for the recorded reference pages.

## Not verified or performed

- Two independent live scans of either site, pending route batches, saved assets, Chrome extension in a real browser, the PowerShell orchestrator, and desktop/tablet/mobile screenshot comparisons. The browser automation dependencies were not installed: `npm install --offline` failed because `pixelmatch` is absent from npm cache. Network egress to package registry and target sites is unavailable to the local CLI.
- No Prodigy source, private API, protected content, or asset is claimed. Public web search found a Prodigy Math landing page, which is not a substitute for a scan.
- The attached ZIP's scanner is an engineering tool, not part of the children's runtime. Its scripts must be run in a permitted environment with dependencies installed and actual scan data, then the briefs and matrix can be generated from observed evidence.

## Integration next actions

1. Supply or mount the `Prodigy-Full` directory if reference-page briefs are needed. Do not relabel guessed pages as scanned.
2. Run the toolkit's two-pass commands in an environment with Playwright, target-site access, and explicit permission; inspect robots and keep scan rates bounded. Record both passes and the followup list.
3. Replace matrix candidate ownership with per-route screenshot, interaction, backend and accessibility evidence after each implementation passes. Do not mark a route complete solely because it renders.
4. The 89 partial USAM routes and production blockers in `implementation-audit.md` remain open; this toolkit addition does not close them.
