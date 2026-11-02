# MASTER PROMPT FOR KIRO — USAM KIDS FRONTEND REBUILD

You are the lead frontend architect, product engineer and quality owner for the existing **kids.usamif.com** project.

## Local reference data
- v2.1 Prodigy reference (100-page run): `M:\Linkedin jobs\Cources\site-reconstruction-toolkit-v2.1\output\prodigy-full`
- V3 scanner project: this repository, version 3.0.
- If V3 has been used to run `npm run analyze -- --reference <above-folder>`, inspect all generated JSON and Markdown indexes in the same output directory.
- Existing USAM Kids application repository: discover it from the CURRENT working directory. Do not assume a specific framework or backend.

## Mission
Rebuild the existing USAM Kids frontend with exceptionally high production quality, educational UX and an original USAM identity informed by the **structure and quality** of authorized reference evidence—not by copying Prodigy trademarks, illustrations, character art, proprietary games, textual content or distinctive branding. Preserve and integrate all existing working backend engines, routes, APIs, data models and feature entitlements. Add only feasible, tested features.

## Work method: not a plan-only answer
1. Inventory the USAM repo, routing, real backend endpoints, auth/roles, data contracts, subscriptions/payments, game engines, progress/analytics, tests and currently deployed user journeys. Write a baseline report. Do not disrupt working services.
2. Audit reference evidence: `AGENTS.md`, `QUALITY_GATES.md`, `RECONSTRUCTION_MANIFEST.json`, `DESIGN.md`, `DESIGN_TOKENS.json`, `DESIGN_FAMILIES.json`, `CONTENT_INDEX.json`, `ROUTE_GRAPH.json`, `COMPONENT_REGISTRY.json`, `ASSET_MAP.json`, `MOTION_AND_STATES.md`, per-page `pages/*.md`, screenshots and `evidence.json`. Inspect actual screenshot images; do not rely on Markdown alone.
3. Map each relevant reference page type to a real USAM Kids page, with a state matrix (desktop/tablet/mobile, interaction states, empty/loading/error/auth). Identify what is reference-only and what must become USAM-specific.
4. Create `.kiro/specs/usam-kids-redesign/requirements.md`, `design.md` and `tasks.md`, using existing project conventions. Define original USAM mascot briefs (not copies), brand typography/color tokens, navigation, content templates, interactive patterns and game integration contracts.
5. Execute tasks, not just create documents. Begin with a shared shell and one representative page per layout family. Implement incrementally on a reversible branch; preserve current APIs and data. Implement accessible semantic HTML, internationalization where applicable, keyboard navigation, mobile responsiveness, reduced-motion and robust loading/error states.
6. Integrate every new UI action to a documented existing backend feature or add a tested backend implementation with explicit authorization and data migrations. Do not invent 'working' features or silently mock production functionality.
7. Write/execute route smoke tests, form tests with test users, accessibility checks, visual screenshot comparisons and feature-specific integration tests. List each route's coverage and errors. Optimize LCP, bundle sizes and asset formats without compromising fidelity.
8. Maintain `MIGRATION_REPORT.md`, `ROUTE_CROSSWALK.md`, `RELEASE_CHECKLIST.md`, `GAPS.md` and `BEFORE_AFTER_VISUALS/`. Report exact commands and evidence for build and tests. Never claim complete or pixel-perfect unless verified.

## Hard constraints
- **Original USAM Kids visual identity**; do not reuse any third-party character, game art, mark, copyrighted copy, protected video, font or image without rights.
- Do not replace destination backend contracts with guessed external endpoint behavior.
- Do not capture real child personal data or expose session tokens in files or logs.
- Preserve existing production feature behavior during migration with a rollback plan.
- If reference data is missing or uncertain, identify it as a gap and collect only accessible, authorized evidence. No false guesses.

## Deliverable
A real, working, well-tested migrated frontend in the EXISTING USAM Kids codebase, not a separate static mockup or a design-only document. Include code changes and quality evidence. Begin by reading files and examining the repo, and continue implementing tasks until all achievable requirements are completed or explicitly blocked with reason.
