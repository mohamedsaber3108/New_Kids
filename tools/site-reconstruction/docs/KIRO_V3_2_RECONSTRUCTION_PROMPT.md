# Kiro engineering task — Evidence-driven USAM Kids frontend overhaul

**Destination project:** kids.usamif.com. You have access to the local project source in Kiro. Treat that project as the only source of truth for the backend, engines, API contracts, authentication, authorization, data types and student information.

**Reference evidence directory:** M:\Linkedin jobs\Cources\site-reconstruction-toolkit-v3\output\prodigy-v3-broad (or the v3.2 results folder I specify). Use the evidence as design/UX research, subject to permission, not as a mandate to copy any third-party branding or protected artwork.

## Required steps — do the implementation, not just a proposal

1. Inventory the existing USAM Kids routes, component library, i18n/RTL, state machines, backend endpoints, game engines, auth gates, tests and user roles. Create a rollback-safe frontend migration strategy. Never delete live functionality until its replacement is verified.
2. Read `AGENTS.md`, `RECONSTRUCTION_MANIFEST.json`, `DESIGN.md`, `DESIGN_TOKENS.json`, `DESIGN_FAMILIES.json`, `COMPONENT_REGISTRY.json`, `ROUTE_GRAPH.json`, `FRONTEND_BLUEPRINT.json`, `CONTENT_INDEX.json`, `ANIMATION_CATALOG.json`, `SOURCE_INVENTORY.json`, `STRUCTURAL_COVERAGE.json`, `OSS_INTEGRATIONS.json`, `CSS_AST_EVIDENCE.json`, `RECONSTRUCTION_EVIDENCE_V3_2.md`, `GAPS.md`, `QUALITY_GATES.md` and the relevant `layout/*.json.gz` and `pages/*.md`, then examine screenshots. Note absent files as gaps.
3. Build an explicit route crosswalk: destination route, reference pattern, evidence links, component grouping, responsive states, interactions, data needs, original brand assets and confidence level. Exclude privacy, commercial checkout and unrelated routes.
4. Define unique **USAM Kids** design tokens, layouts, typography, original characters, illustrations, learning/game iconography, interaction patterns and motion language. Do not reproduce Prodigy logos, branded mascots, verbatim content, protected assets or confusingly similar trade dress.
5. Generate `.kiro/specs/usam-kids-overhaul/requirements.md`, `design.md`, `tasks.md` and acceptance checklists with precise reusable components, route specifications, tests and design review criteria.
6. Implement in the existing repository: shared navigation, responsive layouts, landing page, marketing routes, student dashboard and role-specific content as supported by the local backend. Introduce new engines/features only when backed by real implementations and tests. Do not fabricate network endpoints.
7. Implement interactive states explicitly: hover, keyboard focus, menus, modals, tabs, accordions, mobile navigation, loading, empty, error, reduced-motion and RTL states. Trace each to evidence or explain it as a new USAM design decision.
8. Run build, test, accessibility and viewport checks. Use `npm run compare -- --reference <reference-dir> --url <running-destination-url> --allow-local` when appropriate for *reference-derived* layout tests, acknowledging deliberate brand differences. Capture before/after screenshots and log changed visuals.
9. Update route completion, asset-rights register, `GAPS.md`, remaining implementation tasks and release notes. Ship only after backend behavior is preserved and rollback works.

**Finish criteria:** Working front end on the existing USAM stack, test evidence for every agreed destination route and major interaction, an original differentiated brand, no invented backend logic, and explicit unresolved unknowns. A missing reference asset or proprietary animation is not an excuse to assert pixel-perfect equivalence.
