# BLOCKERS_AND_DEPENDENCIES.md

## RESOLVED — Project identity (correction directive, names are USAM-based)

| Directive name | Role | Resolved location (verified) |
|---|---|---|
| **USAM_New** (= "KidsNew") | PRIMARY product; its uploaded frontend is the ONLY source of truth | `M:\Kids _New\app` — verified: React 18 JS SPA + Node `http` + SQLite; `npm ci` + `npm run build` succeed; 28 JSX modules in `src/`. This is the workspace I was given as the task root. |
| **USAM Learning World** (`USAM Learning Worlds`) | REFERENCE ONLY, later phase (Stage/Phase: after core USAM_New is built & integrated) | `M:\USAM Learning Worlds` and/or `M:\USAM-main` (both = GitHub `mohamedsaber3108/USAM-Learning-Worlds`). NOT inspected for code reuse yet — reference phase not started. |
| **USAM Kids** | EXCLUDED | Do not inspect/use. (Note: the USAM_New frontend brands itself "USAM Kids" internally, but per directive §4 the product name ≠ directory; `M:\Kids _New\app` is USAM_New, not the excluded project.) |
| **USAM** / **USAM Main** | EXCLUDED | `M:\USAM`, `M:\USAM-main` region names — do not inspect/use. Other loose folders (`Old USAM`, `USammm`, `USAM-Master-Ecosystem`, `USAMKO`, `E-USAM`) are out of scope. |

### Verification performed for USAM_New = `M:\Kids _New\app`
- It is the only app inside the given workspace `M:\Kids _New` (siblings: `extracted/` raw ZIP,
  `Kids-*.zip` original, `Backend Prompt.md` which belongs to the unrelated English Website).
- `npm ci` clean; `npm run build` → `dist/` (518 KB bundle) succeeds. Frontend intact.
- Git baseline clean at the latest commit; migration framework + 37-test suite in place.

### Reference-phase guardrail
USAM Learning World will be analyzed ONLY after USAM_New's core backend is implemented and
integrated (directive Stage order). Until then it stays strictly read-only and untouched.

## Active external blockers (do not stop other work)
- Email/AI/payments/voice providers: no credentials — will build disabled adapters + document.
- EC2/domain/TLS/secret store: cannot provision AWS — will prepare scripts/docs only.
