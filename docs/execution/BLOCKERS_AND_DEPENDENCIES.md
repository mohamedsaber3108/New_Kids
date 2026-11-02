# BLOCKERS_AND_DEPENDENCIES.md

## BLOCKER-001 (CRITICAL, blocks Phase 0) — "KidsNew" project identity not resolvable from disk

The latest directive sets strict project boundaries by NAME, but those names do not map
cleanly to any directory on `M:\`. The directive explicitly says: if a directory cannot be
confidently identified as **KidsNew** or the permitted reference **Yozem Learning (the
project named "Kids")**, do NOT inspect/use it — ask for clarification.

### What the directive names vs. what exists on disk
| Directive name | Role | Found on disk? |
|---|---|---|
| **KidsNew** | THE product; the exact new frontend = source of truth | NO folder named KidsNew. Closest: `M:\Kids _New\` (our workspace) whose only app is `app/` = the **USAM Kids v20** ZIP extraction (React 18 JS + Node http + SQLite). |
| **Yozem Learning** ("the project named Kids") | ONLY permitted reference (later phase) | NO folder named "Yozem". A `Kids/` subfolder exists INSIDE `M:\USAM Learning Worlds\` (the USAM-Learning-Worlds repo). |
| **Yozem Kids** | EXCLUDED | No literal match. |
| **Yozem** | EXCLUDED | No literal match. |
| **Yozem Main** | EXCLUDED | No literal match. Possibly `M:\USAM-main`? (unconfirmed) |

No directory named `Yozem*` exists anywhere on `M:\`. No directory named `KidsNew` exists.

### The two plausible interpretations (I will NOT guess between them)
1. **KidsNew = `M:\Kids _New\app`** (the USAM Kids v20 ZIP I already baselined). Then I build
   the backend around THIS frontend. But its README brands it "USAM Kids" and it is a
   JS/SQLite monolith, which may or may not be the "new design direction" the directive means.
2. **KidsNew = a different, newer frontend not yet uploaded** to this workspace, and the ZIP
   in `app/` is actually the "Kids" reference project. In that case I must STOP and wait for
   the real KidsNew frontend, per directive §2/§16.

If "Yozem" is a rebrand/codename of "USAM", then USAM-Learning-Worlds could be the permitted
"Yozem Learning" reference — but it could equally be one of the EXCLUDED "Yozem *" projects.
Inspecting it for reuse while it is actually excluded would be a hard violation.

### Why this is escalated, not defaulted
- Guessing wrong → either build on the wrong frontend, or inspect/import from an EXPLICITLY
  EXCLUDED project. Both are costly and the second is a direct boundary violation.
- The directive itself mandates asking when identity is not confident.

### What I have NOT done (safety)
- Not inspected any USAM-Learning-Worlds / USAM-main / USAMKO / USAM-Master-Ecosystem CODE
  for reuse. Discovery recorded only repo identity (remote/branch/stack) from prior cycles.
- Not copied anything from any other project into `m:\Kids _New\app`.
- Not modified any frontend.

### Questions needed to unblock (minimal)
1. Is **KidsNew = `M:\Kids _New\app`** (the current ZIP frontend)? If NO, where is the exact
   KidsNew frontend (path or upload)?
2. Which exact directory/repo is **Yozem Learning (the "Kids" project)** — the permitted
   reference? (e.g. `M:\USAM Learning Worlds`, its `Kids/` subfolder, or something else.)
3. Confirm which directories are the EXCLUDED **Yozem Kids / Yozem / Yozem Main** so I never
   touch them (candidates on disk: `M:\USAM-main`, `M:\USAM`, `M:\Old USAM`, `M:\USammm`,
   `M:\USAM-Master-Ecosystem`, `M:\USAMKO`, `M:\E-USAM`).

Until answered, Phase 0 cannot safely proceed to implementation of "KidsNew".
