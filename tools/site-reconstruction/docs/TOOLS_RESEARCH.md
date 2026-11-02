# Open-source tool review and integration decisions (October 2026)

| Technology | License, per upstream project | Strength | v3 integration | Why |
|---|---|---|---|---|
| Microsoft Playwright | Apache-2.0 | Real browser screenshots, CSS/DOM, interaction APIs, routing | Core | Original capture source of truth; deterministic local runs |
| Scrapling (D4Vinci / lionsrc) | BSD-3-Clause | Robust CSS selection, content parsing, Markdown conversion, adaptive scraping | Optional Python **offline** adapter operating on saved HTML | Adds structured content extraction without enabling parallel stealth network fetching |
| ScrapeGraphAI / Scrapegraph-ai | MIT OSS | Prompt-driven page-content extraction with local Ollama possible | Optional Python adapter on saved HTML and local Ollama | Useful to infer relationships, but outputs may hallucinate; separate from observations |
| DesignLang / design-extract | MIT | Multi-page design-token extraction, motion, Figma, Tailwind, design diffs | Opt-in import of existing exported JSON | Avoids brittle hard-coded CLI version and preserves provenance/conflicts |
| PNGJS + Pixelmatch | MIT / ISC, check installed versions | Pixel-level image comparison | Existing v2.1 integration retained | Measurable visual differences; not functional completeness |

Upstream documentation:
- https://github.com/D4Vinci/Scrapling
- https://scrapling.readthedocs.io/en/latest/parsing/selection.html
- https://github.com/ScrapeGraphAI/Scrapegraph-ai
- https://github.com/Manavarya09/design-extract
- https://playwright.dev/docs/network

Before public redistribution, verify dependency lockfiles, security advisories, exact versions and licenses. This toolkit does not vendor upstream projects. Python providers are **not installed** during `npm install`.

## Rejected design
Running multiple independent stealth crawlers against every website to 'get all content'. This can ignore robots, replay untrusted pages multiple times, duplicate traffic, and obscure provenance. The default pipeline is a single bounded, authorized Playwright crawler; optional parsers operate only on local captured HTML. Automated reconstruction is always subject to license, permission and evidence limitations.

## Integration contract
- Every output identifies its provider and input source.
- Exact observations from the browser remain immutable in `evidence.json`.
- Optional inferred relationships go under `enrichment/` and do not silently overwrite original tokens.
- No extra API keys are needed for deterministic extraction.
- ScrapeGraphAI's local model still requires local CPU/GPU memory and installed model weights.
