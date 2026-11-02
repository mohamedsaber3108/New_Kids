# FRONTEND_INVENTORY.md — USAM_New (source of truth)

Project: `M:\Kids _New\app` — React 18 + Vite SPA. Router = hand-written pathname matcher
in `src/main.jsx` (`path===` / `path.startsWith`). API base `/api` via `src/api.js`.
Dual mode: `detectApi()` probes `GET /api/health`; backend mode uses cookie-session APIs,
demo mode persists to `localStorage('usamkids-demo')`. All API responses MUST be JSON,
errors as `{error:"code"}`; the UI shows the code verbatim.

Verified by full source audit (every route + every `api()` call). Build confirmed:
`npm run build` → dist OK. The existing `server/app.mjs` already serves most of this contract.

## Routes by area

### Public
`/`, `/how-it-works`, `/learn`, `/worlds`, `/characters`, `/english`, `/coding`,
`/ai-literacy`, `/creativity`, `/projects`, `/voice`, `/parents`, `/safety`
(→ PublicJourney); `/pricing`, `/privacy`, `/terms`, `/cookies`, `/help`, `/faq`
(→ PublicInfo); `/session-expired`, `/unauthorized` (→ AccessPage).

### Auth / recovery
`/login`, `/signup` (operations.jsx AuthPage); `/forgot-password`, `/reset-password?token`,
`/verify?token` (recovery.jsx).

### Learner `/app/*`
`/app` (home), `/app/onboarding`, `/app/placement`, `/app/placement/result`,
`/app/learn`, `/app/skills/:id`, `/app/objectives/:id`, `/app/worlds`, `/app/worlds/:worldId`,
`/app/domains/:worldId`, `/app/missions/:id`, `/app/missions/:id/run`,
`/app/missions/:id/run/:runId`, `/app/practice`, `/app/practice/start/:missionId`,
`/app/practice/session/:runId`, `/app/progress[/mastery|/evidence]`,
`/app/progress/evidence/:id`, `/app/projects`, `/app/projects/new`,
`/app/projects/:id[/:stage]`, `/app/portfolio`, `/app/portfolio/projects/:id`,
`/app/search`, `/app/notifications`, `/app/rewards`, `/app/achievements`,
`/app/rewards/shop`, `/app/leaderboard`, `/app/characters[/:companionId]`,
`/app/conversations[/:id]`, `/app/companion`, `/app/settings`,
`/app/english[/:track|/session/:id]`, `/app/coding[/lab|/learn|/challenges[/:id]|/project/:id]`,
`/app/ai[/:topic|/hallucination-challenge]`, `/app/thinking[/:track|/challenge/:id]`,
`/app/creativity[/create|/gallery|/:id]`, `/app/stories[/:id]`, `/app/simulations[/:id]`,
`/app/challenges[/:age[/:id]]`.

### Guardian `/guardian/*` (role GUARDIAN; backend mode)
`/guardian`, `/guardian/children`, `/guardian/children/:id[/:tab]`
(tab ∈ overview|progress|evidence|projects|activity|safety|settings),
`/guardian/goals`, `/guardian/recommendations`, `/guardian/settings`.

### Admin `/admin/*` (role ADMIN)
`/admin` (StaffConsole); `/admin/(experiments|feature-flags|entitlements)` (AdminOperations);
`/admin/(ai|prompt-templates|safety-policies)` (AgentOps);
`/admin/(projects|rubrics|misconceptions|interventions|difficulty|analytics|legal|privacy)` (AdminInsights);
`/admin/(domains|skills|competencies|objectives|missions|activities|questions|question-templates|content|content-qa|provenance|curriculum-mapping)` + `/new`,`/:id`,`/:id/edit` (AdminStudio).

### Moderator `/moderator/*` (role MODERATOR or ADMIN)
`/moderator`, `/moderator/queue`, `/moderator/reports`, `/moderator/audit`, `/moderator/cases/:id`.

## Role model
`GET /api/auth/me` → `role ∈ LEARNER|GUARDIAN|MODERATOR|ADMIN`. Guards in `AppPage()`:
`/app`→LEARNER (demo mode bypasses), `/guardian`→GUARDIAN, `/admin`→ADMIN, `/moderator`→MODERATOR|ADMIN.
Post-login nav by role. Guardian child-creation gated by emailVerified + guardianApproved + consent.

## Critical contract notes for backend
- `GET /api/health` must return `{ok:true,service:"usam-kids-api"}` or app silently goes demo.
- Learner mutations return `{snapshot}` (+ sometimes `{id}`) in the `fromSnapshot()` shape.
- Errors: non-2xx + `{error:"stable_code"}` (UI shows the code, e.g. `learning_time_paused`).
- Cookie/session auth (`credentials:'same-origin'`); password min length 12 (client).
