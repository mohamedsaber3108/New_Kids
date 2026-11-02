# REPOSITORY_INVENTORY.md

Discovery performed against the supplied ZIP, the full extracted tree, AND the wider
`M:\` workspace (per the latest directive, which named additional paths and warned that
a ZIP without `.git` does not prove no other repositories exist).

**Result: there are MULTIPLE real USAM repositories. The ZIP project is NOT the only one,
and it is almost certainly NOT the most advanced / canonical one.** A target decision is
required before parallel implementation (see end of file).

## A. USAM-related repositories found

| # | Path | Remote (verified) | Branch | Last commit | Stack | In scope? |
|---|---|---|---|---|---|---|
| 1 | `M:\Kids _New\app` | none (local git I initialized) | master | 2026-11-03 (my commits) | React 18 **JS** + Node built-in `http` + **SQLite** (monolith) | CANDIDATE target (the ZIP) |
| 2 | `M:\USAM-main` | `github.com/mohamedsaber3108/USAM-Learning-Worlds` | `fix/p0-p1-remediation` | 2026-10-25 | React 19 **TS** + **NestJS** + **Prisma/PostgreSQL** + Redis/BullMQ + AWS Bedrock | CANDIDATE target (advanced, versioned) |
| 3 | `M:\USAM Learning Worlds` | same remote as #2 (`USAM-Learning-Worlds`) | `main` | 2026-09-19 | same as #2; **contains a `Kids/` subfolder** | second checkout of #2's remote |
| 4 | `M:\USAM-Master-Ecosystem` | `github.com/mohamedsaber3108/New-Landing-Page-` | main | 2026-10-20 | Next.js landing/ecosystem | likely OUT (different product) |
| 5 | `M:\USAMKO` | `github.com/mohamedsaber3108/USAMKO` | main | 2026-08-17 | LinkedIn tooling + chrome extension (apps/, turbo) | OUT (different product) |
| 6 | `M:\E-USAM` | `github.com/Mahmoud-Elwazeer/E-USAM` | — | — | different owner | OUT unless stated |
| 7 | `M:\Old USAM`, `M:\USAM`, `M:\USammm` | no .git | — | — | loose folders | OUT unless stated |

## B. Key relationship finding
- Repos #2 and #3 are the SAME remote (`USAM-Learning-Worlds`), checked out twice on
  different branches. This remote has ~60 agent-driven branches (backend RAG, hallucination
  control, red-team safety, content engines, voice sidecar; frontend shadcn redesign, i18n,
  RTL, perf splitting). It is a large, active, production-track project.
- Repo #3 (`USAM Learning Worlds`) contains a `Kids/` subfolder and a commit referencing
  "audit/kids docs" — strongly implying the ZIP project (#1) is an offshoot/export of the
  `Kids` area of the bigger USAM-Learning-Worlds product, NOT an independent product.

## C. Architecture conflict (why a decision is required)
| Dimension | #1 `Kids _New\app` (ZIP) | #2/#3 `USAM-Learning-Worlds` (git) |
|---|---|---|
| Language | JavaScript/JSX | TypeScript |
| Backend | Node built-in `http`, one file | NestJS modules (70+ endpoints) |
| Database | SQLite (30 tables) | Prisma + PostgreSQL (81 tables) |
| Frontend | custom CSS, hand-rolled router | shadcn/ui, TanStack Router/Start, Tailwind 4 |
| AI | rule-based `safeGuidance()` | AWS Bedrock (Claude 3.5) + RAG |
| Coding exec | scored simulation | Pyodide (real Python) + Sandpack |
| Version control | none (ZIP) | GitHub remote, ~60 branches |
| Stated status | audit: foundation + 86 partial routes | PROJECT_STATUS: 85% complete |

These architectures are **incompatible** — they cannot be merged; work done on one does
not transfer to the other. "Parallel backend + frontend development" targets a different
codebase depending on the choice.

## D. English Website (separate project — excluded)
`M:\English Website\` = a different initiative (Adaptive AI Language Learning OS + Django
MVP prompt + Lanaguage-*.zip). User confirmed separate. Not merged, not modified.

## E. Blocking decision (cannot be safely defaulted)
Which codebase is the TARGET for completion?
- **Option 1:** `M:\Kids _New\app` (the SQLite/JS monolith) — what I began hardening.
- **Option 2:** `M:\USAM-Learning-Worlds` (`USAM-main`, NestJS/Prisma/TS) — the advanced,
  version-controlled product that the directive named via its remote.
- **Option 3:** Both, with a defined relationship (e.g. Kids app is a child surface of the
  larger platform) — requires an integration contract, not a merge.

Picking wrong wastes large effort and risks damaging real versioned work, so this is
escalated rather than guessed.
