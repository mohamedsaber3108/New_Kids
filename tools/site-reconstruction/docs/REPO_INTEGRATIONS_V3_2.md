# Site Reconstruction Toolkit v3.2 — upstream integration review

## Actual integrations built and tested at API/unit level

| Upstream | License | Wiring | Guarantees / limits |
| --- | --- | --- | --- |
| [Playwright](https://github.com/microsoft/playwright) | Apache-2.0 | Core browser (existing) | Runs Chromium at chosen viewports; public DOM evidence, not private source code |
| [axe-core](https://github.com/dequelabs/axe-core) | MPL-2.0 | Optional per-page accessibility audit | Captures rule IDs, counts and selectors; may not identify every accessibility problem |
| [Mozilla Readability](https://github.com/mozilla/readability) + [jsdom](https://github.com/jsdom/jsdom) | Apache-2.0 and MIT | Optional article parser from locally sanitized HTML | Reads articles, not UI component source; no external resource loading or scripts enabled |
| [PostCSS](https://github.com/postcss/postcss) | MIT | Optional AST analysis of locally archived permitted CSS | CSS selectors, vars, media and keyframes; no original Sass/build graph inferred |
| Native browser DOM/CSS and Web Animations APIs | Browser APIs | Opt-in compressed structural tree per viewport, existing source/animation data | Cross-origin iframes, Canvas/WebGL games and untriggered states remain unknown |

## Deliberately NOT embedded in this release

- [Crawlee](https://github.com/apify/crawlee), Apache-2.0. Its persisted crawl queue/retries would be valuable for a multi-thousand-route crawler, but it requires a substantial crawl-engine refactor and security regression tests (DNS pinning, SSRF and robots constraints) before use. No integration is claimed.
- [Scrapling](https://github.com/D4Vinci/Scrapling), BSD-3-Clause, and [ScrapeGraphAI](https://github.com/ScrapeGraphAI/Scrapegraph-ai), MIT. v3's offline Python adapters remain; do not use unrestricted anti-bot bypass or scrape other domains. AI outputs must be treated as inference.
- [rrweb](https://github.com/rrweb-io/rrweb). DOM replay can be useful for *authorized manual sessions* but records interactive data; it needs privacy reviews and strict input masking before inclusion. Not integrated.
- [Browsertrix Crawler](https://github.com/webrecorder/browsertrix-crawler), AGPL-3.0-or-later. Best deployed as a separate WARC/WACZ archival process after reviewing licensing and infrastructure, not vendored into the lightweight extension. Not integrated.
- [Lighthouse](https://github.com/GoogleChrome/lighthouse), Apache-2.0. Useful for auditing, but optional and requires Node 22+ in current releases. Not integrated.

## Engineering contract

1. Respect robots.txt, scope, query/URL, rate, and same-origin restrictions. Do not bypass access controls.
2. Keep previous MD, screenshots and JSON intact. New evidence uses separate files and references.
3. Never claim a website's original source component structure, game-engine internals or backend source are available from public pages.
4. Review the copyright/license terms for media, characters, trademarks, and design assets before use.
5. Verify accessibility, interactions, responsive layout and **pixel differences** against a destination you built. Data collection alone does not prove reconstruction fidelity.
6. The more complete USAM Kids workflow starts with the **existing** USAM backend and designs original USAM identities and mascots.
