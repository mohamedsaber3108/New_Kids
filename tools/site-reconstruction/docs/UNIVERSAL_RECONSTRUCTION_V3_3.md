# v3.3 Universal Website Intelligence — engineering specification

## Product mission
Input any permitted public website. Produce a **site-agnostic, evidence-linked reconstruction specification** that an engineer or coding agent can use to implement the visible interface and *approved*, independently verified features. A URL alone cannot reveal the original backend, source repository, private authenticated states, native engines, unreleased media or exact commercial requirements.

## Stages
1. **Discover**: robots/sitemap/link crawl with SSRF protection, bounded route queue and page caps. Missing links and crawl limits remain explicit.
2. **Capture**: screenshots, DOM/styles/layout for three viewports, observed text/assets, CSS keyframes and public browser runtime references. Optional safe UI states, motion frames and HTML.
3. **Observe**: passive requests with method and resource type, no headers, queries, tokens or bodies. Browser-only evidence, not a backend contract.
4. **Organize**: route graph, layout and CSS tokens, feature/control inventory, form metadata, page/link user journey candidates, network endpoint templates, possible domain concepts, cross-layer relationship graph.
5. **Evaluate**: evidence truthfulness (observed vs heuristic vs unknown), coverage and quality gates, traceability matrix.
6. **Implement**: universal coding agent handoff with chosen target project and brand, actual destination backend/credentials available only through authorized project inspection, tests, visual comparisons and release checklist.

## Key output formats
`SITE_INTELLIGENCE.json`, `EXPERIENCE_MAP.md`, `UX_PATTERN_MAP.json`, `FEATURE_INVENTORY.json`, `USER_JOURNEYS.json`, `API_SURFACE.json`, `DOMAIN_MODEL_HINTS.json`, `RELATIONSHIP_GRAPH.json`, `FUNCTIONAL_BLUEPRINT.md`, `TRACEABILITY_MATRIX.md`, `UNCERTAINTY_REGISTER.md`, `IMPLEMENTATION_BACKLOG.md`, `UNIVERSAL_RECONSTRUCTION_PROMPT.md`. All historical v3.2 files are preserved.

## API evidence safety
Only passive `fetch`/`xhr` metadata already in evidence.json is examined. Query strings discarded; obvious dynamic path segments generalized; obvious auth-secret paths excluded. This is **best effort**, not a privacy guarantee: manually review exports before sharing. No user values, request bodies, response bodies, cookies, credentials, form submissions or authenticated crawling are collected.

An observed GET /api/items is *not* an API contract. It does not indicate response schema, rate limit, authentication, permissions, errors, subscriptions or database schema. Relationships called `co-observed-on-page` are explicitly **correlation, not causation**. Link-based journeys are candidate navigation paths, not successfully executed flows.

## Adaptation examples
- Marketing site: hero, navigation, typography, CTA, newsletter form (actual delivery system remains unknown).
- Commerce site: product/category UI, cart-entry buttons, navigation links; payment, inventory, fulfillment remain unverified.
- Dashboard: public UI patterns; private data/role behavior must be sourced from authorized project code/docs, not scraped.
- Education/game site: public scene/UI assets and visible controls; private engines, game progression and characters' internal rigs remain unknown.

## Usage
```
# Reprocess previous v3.0+ captures without revisiting any site
npm run analyze -- --reference "./output/previous-scan"

# Configure a handoff for a DIFFERENT destination with the same source evidence
npm run analyze -- --reference "./output/previous-scan" --target-url "https://your-project.example" --brand "Your Original Brand"

# Collect new permitted reference evidence
npm run scan -- --url "https://authorized-example.com" --out "./output/reference" --max-pages 5 --max-depth 1 --structural-map --interactions --motion --save-html
```

## Important limitations
`analyze` can add interpretation and cross-links to old evidence; it cannot materialize missing DOM states, private logic, network responses or CSS rules never recorded. Screenshots/asset reuse subject to rights. Full functional equivalence requires owner-provided backend, verified requirements, implementation and testing. Browser E2E remains optional and should be tested on the user's machine before large scans.
