# USAM Kids — Technical Blueprint Implementation Ledger

Updated: 2026-10-26

The supplied archive was verified against all 104 manifest entries (0 hash or size mismatches). Its 100 Markdown files, four CSV/JSON inventories, Mermaid architecture source, master specifications, implementation prompts, and traceability matrices were reviewed as one blueprint. This ledger records what is implemented in this repository and separates external approval/provider work from software work.

## Requirement coverage

| Blueprint area | Implemented in this repository | External or intentionally gated |
|---|---|---|
| Research and scope | Five learning worlds, ages 7–15, bilingual experience, guardian-first accounts, evidence-first learning | Entrepreneurship and age 5 remain proposed product decisions in the source blueprint |
| Learner journeys | Onboarding, 10-question placement, home, worlds, missions, resumable practice, progress, mastery, evidence, projects, portfolio, search, notifications, rewards, settings | Expert classroom pilots and curriculum accreditation |
| Age curriculum | Nine single-year paths (7–15), 100 distinct bilingual scored challenges per year, five domains | Independent pedagogical review before claiming formal grade alignment |
| Frontend and routes | All 164 inventory routes resolve to a dedicated view, shared functional surface, or explicit safe state; RTL/LTR and responsive styles are present | Device-lab and assistive-technology certification |
| Authentication | Guardian signup/login, optional verified email, password reset, session isolation, staff approval, exact child age, versioned consent | Production mail webhook and real-world guardian identity verification |
| Authorization and data | Server-side role and ownership checks, nickname-only child profiles, private projects/evidence/conversations, export and deletion | Counsel-approved retention schedule and privacy wording |
| Adaptive learning | Engagement, cognitive-load, interleaving, transfer, ZPD/difficulty, recommendation, learning-path, growth-velocity, level-up endpoints | Longitudinal model calibration with real reviewed learning data |
| Mastery and evidence | Server scoring, spaced review, multi-evidence mastery rules, placement, evidence detail, creative-completion protection | Formal psychometric validation |
| Daily goals and time | Persisted daily goal/progress; guardian daily/weekly minutes and Cairo bedtime; visible-session heartbeat and server enforcement | Family-policy defaults may be adjusted by the product owner |
| Gamification | XP, level, streak, achievements, private personal-best mode, coins, cosmetics, streak-freeze APIs | No gambling, real-money purchase, or public child ranking |
| Projects | Private create/read/update/delete, research, reflection, curriculum context, milestones, moderated-showcase request, portfolio | Cross-child collaboration is deliberately disabled; public showcase requires moderation policy |
| Companions | 15 documented companions, role-specific safe guidance, private conversation history, guide controls, 75 rule evaluations | Live generative AI is provider-gated and must pass child-safety evaluation before activation |
| Voice | Browser TTS playback with family/platform controls and no recording | STT, speech scoring, and provider voice require consent, vendor review, and configuration |
| Coding | Bounded command sandbox, lessons, lab, three server-scored routes, project links | Arbitrary code execution is deliberately not exposed to children |
| Search/notifications | Private-scope server search and meaningful deep-link notification generation | Push/email delivery provider is not configured |
| Guardian | Overview, progress, evidence answers, projects, activity, reflections, controls, time limits, goals, recommendations, account security | Production support process and verified legal consent copy |
| Moderation/admin | Report queue/cases/history/audit, curriculum drafts, content QA views, analytics, retention privacy threshold, agent evaluations, experiments, flags, entitlements, legal/privacy status | Human staffing, approved policies, and final publishing authority |
| Safety/security | Input limits, private-information filters, rate limits, HttpOnly SameSite sessions, CSRF origin checks, no child messaging, no public-by-default data | Penetration test, DPIA/child-privacy legal review, incident-response rehearsal |
| Infrastructure | Multi-stage containers, Node 24 API, SQLite WAL volume, read-only containers, health checks, reverse-proxy example, backup/restore scripts | EC2, DNS, TLS certificates, secrets, mail webhook, monitoring vendor and backup schedule |
| Quality | 33 automated tests cover content, scoring, authorization, consent, time limits, adaptive signals, gamification, sessions, recovery, backups, and age paths; production build passes | Browser E2E/visual regression, load test and accessibility audit in the actual production environment |

## Safety decisions carried through implementation

- A creative story choice records completion evidence but never fabricates a mastery score.
- Child leaderboards are private personal-best only.
- Project showcase requests stay private until moderation.
- Collaborator APIs return a child-safety restriction instead of silently enabling child-to-child contact.
- Live AI, speech recording, payments, and public child profiles remain off until their provider, policy, and consent gates are satisfied.

## Current verification

- `npm test`: 34/34 passing.
- `npm run build`: passing production build.
- Archive manifest: 104/104 entries verified, 0 mismatches.
- Curriculum invariant: 9 ages × 100 challenges = 900 bilingual challenge records.
- Companion invariant: 15 companions × 5 safety evaluations = 75 passing evaluations.

## Universal Blueprint delivery layer

The supplied Universal Project Blueprint Master Prompt and matching ZIP kit were applied on 2026-10-27 without replacing the product UI. The project-specific, evidence-based delivery layer is available in [`usam-kids-v20-blueprint/`](usam-kids-v20-blueprint/README.md), covering audit inputs, requirements traceability, architecture/data/roles, route/API contracts, privacy/release gates, EC2 operations, source verification, and the P0/P1/P2 backlog. The implementation added readiness checks, request IDs, and baseline browser security headers with automated coverage.

