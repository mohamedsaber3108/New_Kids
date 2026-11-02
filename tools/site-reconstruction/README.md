# Universal Website Intelligence & Reconstruction Toolkit v3.3.1

**For any website you are authorized to analyze**, not a specific product or brand. Produces linked evidence for layouts, routes, feature controls, candidate user journeys, passive API endpoint references, data-model hints and agent implementation instructions. It **does not** recover private backend source code or guarantee a complete functional clone.

## Fast path — PowerShell

```powershell
cd "<path-to-extracted-project>\site-reconstruction-toolkit-v3"
npm install
npx playwright install chromium
npm test
npm run check
npm run server
```

To add universal intelligence to an existing scan, **no new crawl needed**:

```powershell
npm run analyze -- --reference ".\output\prodigy-v3-broad"
# or customize the destination independently from the analyzed source:
npm run analyze -- --reference ".\output\your-scan" --target-url "https://your-own-site.example" --brand "Your Original Brand"
```

New files: `SITE_INTELLIGENCE.json`, `EXPERIENCE_MAP.md`, `UX_PATTERN_MAP.json`, `FEATURE_INVENTORY.json`, `USER_JOURNEYS.json`, `API_SURFACE.json`, `DOMAIN_MODEL_HINTS.json`, `RELATIONSHIP_GRAPH.json`, `FUNCTIONAL_BLUEPRINT.md`, `TRACEABILITY_MATRIX.md`, `UNCERTAINTY_REGISTER.md`, `IMPLEMENTATION_BACKLOG.md`, `UNIVERSAL_RECONSTRUCTION_PROMPT.md`.

**Read `docs/UNIVERSAL_RECONSTRUCTION_V3_3.md` for evidence semantics and limitations.** Older USAM Kids prompts retained in `docs/` as examples; newly generated Kiro prompt is generic.

---

# Site Reconstruction Toolkit v3.1.0 — Evidence-Driven Website Reconstruction

An extensible, local-first browser inspection toolkit. It gathers **observable frontend evidence** and packages it for AI coding agents, with explicit uncertainty reporting. It builds on v2.1 and **preserves** its original Markdown/JSON/screenshot output format.

> **Not a one-click exact website clone.** A public browser does not expose server-side source, private endpoints, full animation pipelines, hidden routes or copyrighted usage rights. AI models must not be told to hallucinate unknown details. Use this for websites you own or are authorized to inspect, and do not copy another business's brand, characters or protected content into your product without permission.

## Requirements
- Windows PowerShell or CMD, Node.js 20+, npm.
- Playwright Chromium installed by the matching Playwright dependency.
- Python 3.10+ **optional**, only for offline Scrapling / ScrapeGraphAI adapters.
- Local Ollama **optional**, only for ScrapeGraphAI adapter (no paid model required).

## Install (PowerShell)
```powershell
cd "<path-to-extracted-project>\site-reconstruction-toolkit-v3"
npm install
npx playwright install chromium
npm audit
npm test
npm run check
```

## Use v3 on a SMALL site you are authorized to inspect
```powershell
npm run scan -- --url "https://your-owned-site.example" --out "./output/my-site" --max-pages 5 --max-depth 1
```

### Deep browser evidence including public JS/CSS inventory (automatic)

Every new scan collects page-linked script/stylesheet URLs, browser-accessible CSS rules and keyframes, Web Animations API samples, per-section geometry and structured component blueprints. These are saved to `SOURCE_INVENTORY.json`, `ANIMATION_CATALOG.json`, `FRONTEND_BLUEPRINT.json`, `DEPENDENCY_GRAPH.json`, and `CODE_EVIDENCE.md` without copying script bodies.

On a website and source files you own or are authorized to archive:
```powershell
npm run scan -- --url "https://your-owned-site.example" --out "./output/my-site-source" --max-pages 5 --max-depth 1 --save-html --interactions --motion --archive-public-source
```

Browser-delivered CSS/JS source archives are opt-in, bounded, same-origin by default and subject to `robots.txt`. JavaScript bundles may be minified/obfuscated; they do **not** reveal private game engines or backend APIs. CDN-hosted code is inventoried but not downloaded unless you explicitly and legitimately authorize the CDN origin with `--source-origins`.

### Detailed interactive scan (opt-in; more expensive)
```powershell
npm run scan -- --url "https://your-owned-site.example" --out "./output/my-site-deep" --max-pages 5 --max-depth 1 --interactions --motion --save-html
```

- `--interactions`: capture safe disclosure/tab states and hover/focus observations of selected elements. It does not click general action buttons or submit forms.
- `--motion`: sample desktop viewport screenshots at three timestamps; does **not** recover original animation code.
- `--save-html`: save a sanitized bounded rendered DOM snapshot to `html/` for optional offline analysis. Review before sharing; sanitization is not perfect de-identification.
- `--download-assets`: opt-in same-origin downloads with size caps and SHA-256; does **not** grant licenses or fetch every CDN asset.
- `--archive-public-source`: **explicit opt-in** to archive browser-delivered, publicly accessible CSS and JavaScript files. Same-origin only by default; enforces DNS validation, robots, content types, per-file/total-size caps and hashes. Browser bundles are not original application source or private server code. Review rights and secrets before redistributing.
- `--source-origins "https://your-authorized-cdn.example"`: CLI-only explicitly allow additional CDN origins for the source archiver. Each origin has independent robots checks; unrelated origins remain blocked. Do not use on third-party CDNs without permission.
- `--max-source-files 60`: caps archived source files (1–150); default 60. Files behind query strings are deliberately not replayed.

- `--routes-file`: manually supply an authorized URL list (one per line). Still enforces site scope/robots.
- `--max-pages`, `--max-depth`, `--timeout`, `--delay`: crawling limits, 500 ms default polite delay.
- `--allow-local`: local targets for **CLI-authorized fixture tests only** (never enabled from extension API).

## Upgrade EXISTING v2.1 output WITHOUT rescanning
Your already saved `output/prodigy-full` can be enriched offline (its original evidence cannot retrospectively gain deep section snapshots). From this new project's folder run:

```powershell
npm run analyze -- --reference "M:\Linkedin jobs\Cources\site-reconstruction-toolkit-v2.1\output\prodigy-full"
```

This adds new output files to the existing output folder without replacing the original `DESIGN.md`, `evidence.json`, screenshots, and other v2.1 reports. A fresh v3 scan with extra flags is still required to obtain new details.

## Chrome Extension

**v3.1.0:** In the popup enter the current server token and click **Test Connection / Token** before scanning. If the local server restarts, its previous token becomes invalid. A blank URL is not a website; enter a complete URL or click **Use Current Website Tab**. See `docs/HOTFIX-v3.0.1.md`.

```powershell
npm run server
```
In Chrome open `chrome://extensions` -> Developer mode -> Load unpacked -> choose `extension/` from this **v3** package. Enter the token printed by the local server. It launches bounded scans, monitors and cancels jobs, and can capture the currently visible tab and screenshot with explicit consent. The scan popup exposes opt-ins for detailed states, HTML, assets, motion and permitted public CSS/JS archiving.

Stop any old v2.1 server before launching the v3 server on port 4319. Never paste session tokens into chat or send them to third parties.

## Offline enrichment integrations
First, run a scan using `--save-html` on a permitted site. These integrations operate only on **captured local HTML**, not a second network crawler.

**Scrapling** (BSD-3-Clause; Python, optional):
```powershell
python -m pip install scrapling
npm run enrich -- --reference "./output/my-site-deep" --provider scrapling --limit 3
```
Produces `enrichment/scrapling/*.json` with headings and page text, extracted by the Scrapling selector/parser. No remote fetching, stealth or proxy rotation is used by our adapter.

**ScrapeGraphAI** (MIT; Python, optional; uses a LOCAL Ollama model):
```powershell
python -m pip install scrapegraphai
$env:SRT_OLLAMA_MODEL = "ollama/llama3.2"
npm run enrich -- --reference "./output/my-site-deep" --provider scrapegraph --limit 1
```
Requires Ollama already running at `127.0.0.1:11434`, with the selected model already pulled. This AI output is **inferred** and must be reviewed; no external LLM endpoint is configured by this adapter. Python package API compatibility depends on selected versions.

**DesignLang / design-extract** (MIT; optional *import* adapter): separately run its documented CLI on sites you are authorized to analyze. Import a JSON export:
```powershell
npm run enrich -- --reference "./output/my-site-deep" --provider designlang --input "C:\path\to\designlang-export.json"
```
This records provenance and SHA-256 under `enrichment/designlang/`. It does not run DesignLang automatically or merge conflicting values into original browser evidence.

## File inventory (preserved + new)
Original v2.1 files **retained**:
`DESIGN.md`, `SITE_MAP.md`, `COMPONENTS.md`, `INTERACTIONS.md`, `RESPONSIVE.md`, `ASSETS.md`, `AGENTS.md`, `SCAN_REPORT.md`, `README.md`, `evidence.json`, screenshots, optional assets and manual captures.

New v3 files:
- `RECONSTRUCTION_MANIFEST.json`, `QUALITY_GATES.md`, `GAPS.md`, `RESCAN_PLAN.md`, `followup-routes.txt` — evidence coverage and unverified information.
- `ROUTE_GRAPH.json` — observed links and uninspected targets.
- `COMPONENT_REGISTRY.json` — repeated *heuristic* page patterns, not original source components.
- `ASSET_MAP.json`, `download-manifest.json` — asset references, source routes and download status.
- `DESIGN_TOKENS.json`, `DESIGN_FAMILIES.json` — observed token prevalence and per-page dominant typography.
- `CONTENT_INDEX.json`, `pages/*.md`, `ARCHITECTURE.md` — page-by-page section and content outlines, heuristic site architecture.
- `MOTION_AND_STATES.md` — sampled frames and opt-in control state evidence.
- `AGENT_HANDOFF.md`, `KIRO_IMPLEMENTATION_PROMPT.md` — implementation agent handoff (generic in v3.3; older USAM examples remain for backward compatibility).
- `SOURCE_INVENTORY.json`, `SOURCE_ARCHIVE_MANIFEST.json` and optional `public-source/*` — page-linked browser-delivered CSS/JS, opt-in source archives with hashes and bounded static signals.
- `ANIMATION_CATALOG.json` — observed CSS keyframes and WAAPI samples, not full animation engines.
- `FRONTEND_BLUEPRINT.json`, `DEPENDENCY_GRAPH.json`, `CODE_EVIDENCE.md`, `CAPTURE_COVERAGE.md` — per-section implementation evidence and static references with explicit uncertainty.
- Optional `html/*.html`, `enrichment/{provider}/` — sanitized DOM and enrichment data.

## Reconstruction validation
After building an authorized destination frontend, visually compare it against matching reference screenshots:
```powershell
npm run compare -- --reference "./output/my-site-deep" --url "http://127.0.0.1:3000" --allow-local --out "./comparison"
```
Review `comparison/COMPARISON.md` and PNG diff images. Matching fonts, dynamic content, capture timing, and browser versions matters. A low pixel difference on a sampled state **does not prove full functional equivalence**.

## Testing
```powershell
npm test
npm run check
$env:SRT_E2E = '1'
npm test
Remove-Item Env:SRT_E2E
```
Browser E2E is opt-in because it needs Chromium installed and a loopback fixture. Unit/API/report tests do not establish browser E2E success.

## Known gaps and security
Read `docs/ARCHITECTURE_V3.md`, `docs/TOOLS_RESEARCH.md`, `docs/SECURITY.md` and `docs/QUALITY.md`. Crucially, Playwright request routing validates DNS but **does not pin Chromium's socket to the validated address**; a DNS-rebinding race may still exist. Scan untrusted sites only in an isolated OS/container with restricted network access. Service workers are blocked in the scanning context to aid network interception; that may alter a site which relies on them. Local API tokens are session-specific and must not be shared. Exact original HTML/JS/CSS and private server logic are not reconstructible from public rendering alone.

## v3.2 — Repository-backed reconstruction intelligence

The toolkit maintains every previous v3.1 report/CLI command and adds two **opt-in** passes:

- `--structural-map`: capture a bounded, structured and compressed DOM/layout/computed-style tree at desktop, tablet and mobile resolutions (one `layout/*.json.gz` per inspected viewport). Produces `STRUCTURAL_COVERAGE.json`. Unlike screenshot-only extraction, this records parent-child relationships, layout geometry, typography, grids, flex, pseudo-element styles and visible controls. It does not recover original React/Vue component code.
- `--oss-intelligence`: run the optional upstream [axe-core](https://github.com/dequelabs/axe-core) accessibility audit and [Mozilla Readability](https://github.com/mozilla/readability) extraction on publicly accessible editorial pages. When *also* using `--archive-public-source` with authorization, [PostCSS](https://github.com/postcss/postcss) parses archived CSS ASTs. Generates `OSS_INTEGRATIONS.json`, `CSS_AST_EVIDENCE.json` and `RECONSTRUCTION_EVIDENCE_V3_2.md`.

Upstream licenses: axe-core MPL-2.0; Mozilla Readability Apache-2.0; PostCSS MIT. These are optional npm packages installed through `npm install`; package availability is shown in the export. If unavailable, the tool reports that rather than making up evidence. Review the packages' licenses before distributing any combined product.

**Windows PowerShell example** (after installing and obtaining authorization for the target):

```powershell
cd "<path-to-extracted-project>\site-reconstruction-toolkit-v3"
npm install
npx playwright install chromium
npm test
npm run check
npm run scan -- --url "https://your-authorized-site.example/" --out "./output/deep-reference" --max-pages 5 --max-depth 1 --structural-map --oss-intelligence --interactions --motion --save-html
```

Optional archiving of public same-origin CSS/JS files requires separately enabling `--archive-public-source` on a website that you are authorized to archive; it follows robots policy, size and origin limits, and avoids query-string-based downloads. Automated CSS analysis alone is **not** evidence of exact design equivalence.

To use the Chrome extension, stop the old server, start `npm run server`, reload the extension at `chrome://extensions`, and look for `Site Reconstruction Toolkit v3.3.1`. The server token is regenerated every time it starts and must not be shared.

For the full list of evaluated repositories, tradeoffs, and implementation status, read `docs/REPO_INTEGRATIONS_V3_2.md`.
