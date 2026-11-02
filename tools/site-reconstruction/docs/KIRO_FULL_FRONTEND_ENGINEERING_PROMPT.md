# USAM Kids — Kiro frontend implementation prompt

## Role and mandate

You are the lead frontend architect working directly in the EXISTING USAM Kids repository for `kids.usamif.com`. Deliver running, tested code, not just a report or mock landing page. The local Reconstruction Toolkit results are **reference evidence**, not a ready-made source repository or proof of recovered backend code.

## Reference package

Windows paths (project-specific, do not invent paths):
- Broad reference: `M:\Linkedin jobs\Cources\site-reconstruction-toolkit-v3\output\prodigy-v3-broad`
- Deep reference: `M:\Linkedin jobs\Cources\site-reconstruction-toolkit-v3\output\prodigy-v3-deep`
- Any newer v3.1 output provided by the user takes precedence for overlapping pages, but must be validated before use.

Read `AGENTS.md`, `QUALITY_GATES.md`, `GAPS.md`, `SCAN_REPORT.md`, `DESIGN.md`, `DESIGN_TOKENS.json`, `DESIGN_FAMILIES.json`, `ROUTE_GRAPH.json`, `COMPONENT_REGISTRY.json`, `CONTENT_INDEX.json`, `ASSET_MAP.json`, `SOURCE_INVENTORY.json`, `DEPENDENCY_GRAPH.json`, `ANIMATION_CATALOG.json`, `FRONTEND_BLUEPRINT.json`, `CODE_EVIDENCE.md`, `evidence.json`, per-page `pages/*.md` and desktop/tablet/mobile screenshots where those files exist. Treat fields with `status=missing` or absent files as unknown. Archived JS/CSS are browser-delivered artifacts, not necessarily authored source and not necessarily licensed for reuse.

## Engineering execution order

1. Inventory the existing Kids repository: routes, UI framework, auth/roles, APIs, game engines, payments, progress tracking, content database, build scripts and tests. Record which flows must keep working. Establish a rollback strategy and baseline tests.
2. Build a two-column route crosswalk **reference evidence -> USAM Kids route**, excluding irrelevant Prodigy-only pages (third-party legal pages, jobs, marketing pages etc.). Specify template family for each destination route and explicit acceptance tests.
3. Define an ORIGINAL, coherent USAM brand: typography, color/spacing/shadow/radius tokens, mascots, illustrations, sound and motion language; differentiate from Prodigy marks/character identities/trade dress and do not paste protected code/media without permission.
4. Create data-driven reusable components, global navigation, page shells, cards, footers, forms, dialogs, responsive page templates and accessibility primitives. Explain each component mapping with source-evidence references and confidence levels.
5. Capture motion state machines and transitions for navigation, learning flows and game UI using *observed* animations as behavior references. Do not claim to have reconstructed proprietary game runtime or hidden player states. Create original animations where source evidence is missing.
6. Implement representative pages from every template, then all approved target routes. Preserve and connect the existing backend and game engines via documented API contracts. Never fabricate a production backend endpoint; mark placeholders as placeholders.
7. Execute build/unit/e2e/accessibility tests and screenshot comparisons at desktop 1440x1000, tablet 820x1180 and mobile 390x844. Compare with source screenshots only where relevant; track intentional USAM branding differences separately from unintended layout defects.
8. Produce `.kiro/specs/usam-kids-rebuild/requirements.md`, `design.md`, `tasks.md`, a `ROUTE_STATUS.md` checklist and `IMPLEMENTATION_GAPS.md`; commit incremental changes if repository permits. Report tested working features and unresolved blockers accurately.

## Non-negotiable acceptance

- Build passes and application boots; no irreversible migration without approval.
- Existing student/teacher/parent experiences, permissions, safety and data flows remain functional.
- All approved destination routes have usable responsive pages; no blank or broken buttons.
- Keyboard, focus, contrast, reduced motion, form validation and error states tested.
- Every third-party asset or code use is appropriately licensed or replaced with an original USAM equivalent.
- Claims of '100% exact' are prohibited unless separately verified on every relevant viewport/state, and backend logic cannot be inferred from public DOM evidence.
- Work is implementation, not a summary: after planning, execute the tasks in the repo and show commits/diffs, checks and screenshot evidence.
