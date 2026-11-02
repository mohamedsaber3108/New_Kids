# USAM Kids — Complete Product Build Specification
## Master Markdown for ChatGPT Work / Kiro / Coding Agent

**Status:** Active implementation specification  
**Product:** USAM for Kids  
**Primary production domain:** `https://kids.usamif.com/`  
**Primary objective:** Build a complete Arabic-first, AI-native, adaptive learning universe for children, not a generic LMS or dashboard.

---

# 1. PRODUCT NORTH STAR

USAM Kids must feel like a **living learning universe**.

The product is not:

- a course marketplace
- a generic LMS
- a static dashboard
- a chatbot with pages around it
- a collection of disconnected feature screens
- a set of API wrappers
- a white page with cards

The product must be:

- child-first
- Arabic-first
- adaptive
- game-like without becoming a game-only product
- rich in worlds, missions, characters, stories, activities, projects, rewards, mastery and evidence
- AI-native
- voice-capable
- parent-aware
- safe by design
- complete across learner, guardian, moderator and admin roles

Learning is the engine. Worlds, characters, stories, quests, rewards, voice and motion are the experience layer.

---

# 2. CORE LEARNING MODEL

Canonical learning architecture:

`Learning Domain → Skill → Competency → Concept → Learning Objective → Activity → Practice → Project → Assessment → Mastery → Review → Recommendation`

Canonical learner journey:

`World → Mission → Learning Objective → Activity → Practice → AI Interaction → Project → Assessment → Mastery → Reward → Unlock → Next Mission`

Evidence spine:

`Quiz / Project / Conversation / Coding / Presentation / English Speaking / Experiment / Challenge / Reflection → Evidence → Skill → Competency → Mastery → Portfolio → Credential`

**The LLM must never decide mastery by itself.** Mastery must be driven by explicit evidence, learning-engine logic and deterministic/validated rules.

---

# 3. TARGET AGE EXPERIENCE

## Ages 7–9

- voice-forward
- large touch targets
- short text
- fewer choices
- stronger character guidance
- simple visual navigation
- obvious next action
- short missions
- high scaffolding
- visual worlds and paths
- strong success/retry feedback

## Ages 10–12

- guided autonomy
- moderate information density
- broader exploration
- projects
- richer progress
- more independent practice
- more detailed mission structure

## Ages 13–15

- denser navigation
- search
- deeper projects
- self-directed learning
- more analytical progress
- longer missions
- advanced coding / AI / project work
- richer portfolio and reflection

Preserve any legacy age-band compatibility safely. Do not perform destructive migrations without explicit migration planning.

---

# 4. DESIGN DIRECTION

The final frontend must reach the product richness of strong modern kids-learning platforms while remaining **original USAM**.

## Brand foundation

- white
- deep USAM green
- black / dark ink
- contextual accents by world or experience
- premium, modern and warm

Avoid:

- random rainbow SaaS color use
- generic school portal visuals
- flat white pages with bordered cards everywhere
- excessive glassmorphism
- casino-style reward visuals
- childish/babyish design

## Visual personality

- magical but intelligent
- playful but not noisy
- premium
- alive
- safe
- modern
- educational
- immersive
- age-aware

## Rich visual environments

Use:

- layered backgrounds
- world scenes
- map/path navigation
- environmental surfaces
- original illustrations
- character scenes
- visual progress trails
- reward moments
- motion
- contextual world accents
- foreground/background depth

Examples:

- Home → learning universe / horizon
- English → language exploration world
- Coding → creative technology lab
- AI Literacy → AI experiment lab
- Creativity → studio / maker space
- Projects → workshop / build room
- Progress → constellation / learning journey
- Worlds → map/path environment

---

# 5. DESIGN SYSTEM

Create one coherent reusable design system for the entire platform.

## 5.1 Foundations

Centralize tokens for:

- brand colors
- semantic colors
- world accents
- surface colors
- text colors
- borders
- shadows
- elevation
- spacing
- radii
- z-index
- typography
- motion
- animation durations
- easing
- breakpoints
- icon sizing
- component density

## 5.2 Typography

Support:

- Display Hero
- World Title
- Page Title
- Section Title
- Card Title
- Body Large
- Body
- Body Small
- Caption
- Button
- Label
- Reward / XP Number
- Mission Number
- Code font

Validate Arabic, English, mixed Arabic/English, numbers, code, line height and responsive type scaling.

## 5.3 Component library

Create or consolidate:

- Buttons
- Icon buttons
- Links
- Inputs
- Selects
- Search
- Checkboxes
- Radios
- Sliders
- Switches
- Tabs
- Accordions
- Menus
- Dropdowns
- Drawers
- Modals
- Dialogs
- Tooltips
- Popovers
- Toasts
- Alerts
- Badges
- Chips
- Cards
- World cards
- Mission cards
- Skill cards
- Project cards
- Reward cards
- Character panels
- XP/progress bars
- Progress rings
- Level indicators
- Streak indicators
- Skeletons
- Empty states
- Error states
- Success states
- Locked states
- Unauthorized states
- Pagination
- Tables
- Lists
- Timelines
- Steppers
- Carousels
- Page headers
- Section headers
- Navigation
- Mobile navigation
- Footer
- Voice states
- Activity shells
- Mission nodes
- Map nodes
- Project milestone rows
- Evidence cards
- Mastery status cards

No feature-specific mini design systems.

---

# 6. MOTION SYSTEM

Motion must explain state and progress.

Use shared motion for:

- page transitions
- mission start
- mission completion
- world movement
- map/node unlock
- XP increase
- reward unlock
- achievement unlock
- progress increase
- character reaction
- correct answer
- retry
- project milestone
- loading
- success
- drawers/dialogs

Support `prefers-reduced-motion`. No random animation noise.

---

# 7. ORIGINAL CHARACTER SYSTEM

USAM character roster:

- Azouz
- Zein
- Luma
- Codey
- NOVA
- Mira
- Rami
- Faris
- Tala
- Adam
- Byte
- Nour
- Rex
- Zara
- Atlas

Each character should have role, personality, visual consistency, voice personality and contextual learning behavior.

## Character states

- IDLE
- HELLO
- LISTENING
- THINKING
- EXPLAINING
- HINT
- ENCOURAGE
- TRY_AGAIN
- SUCCESS
- CELEBRATE
- WARNING
- GOODBYE
- ERROR
- LOADING

Integrate contextually into Onboarding, Home, Learn, Worlds, Mission Brief, Mission Player, Practice, English, Coding, Projects, Stories, Simulations, completion, help, error recovery and resume flows.

---

# 8. PLATFORM ROLES

Canonical roles only:

- `LEARNER`
- `GUARDIAN`
- `MODERATOR`
- `ADMIN`

`PUBLIC` is unauthenticated audience, not a backend role.

Server-side authorization is mandatory. Frontend hiding is not authorization.

---

# 9. PUBLIC WEBSITE

## Landing Page

Recommended structure:

1. Hero — “Your Learning Universe”
2. Interactive preview of World → Mission → Character → Learning
3. How USAM Works
4. Learning Worlds / Domains
5. AI Companions
6. Interactive Learning
7. Projects
8. AI + Voice
9. Progress + Mastery
10. Parent Experience
11. Safety + Trust
12. Pricing / Start
13. Final CTA

## Other public pages

- How It Works
- Learn / Worlds overview
- English
- Coding
- AI Literacy
- Creativity
- Projects
- AI Companions
- Voice
- Parent / Family overview
- Safety
- Pricing / Membership if supported
- Help / FAQ
- Legal
- Privacy
- Cookies / preferences if applicable

---

# 10. AUTHENTICATION EXPERIENCE

Required:

- Login
- Signup
- Logout
- Session recovery
- Email verification
- Forgot password
- Reset password
- Protected routes
- Role-aware redirects
- Unauthorized state
- Expired session state
- Returning user flow

Auth should feel like entering the USAM universe, not a generic SaaS form.

---

# 11. ONBOARDING

Flow:

`Welcome → Age/Context → Language → Interests → Goals → Light Diagnostic → Companion → First World → First Mission`

Track explicit learner signals, observed learner signals and derived learner signals separately.

---

# 12. LEARNER HOME

Must answer:

- Where am I?
- What should I do now?
- What am I learning?
- What needs review?
- What am I building?
- Who is helping me?
- What did I achieve?
- What unlocks next?

Core modules:

- Continue Journey
- Current World
- Current Mission
- Next Best Action
- Daily Goal
- Review Due
- Smart Practice
- Active Project
- Companion
- Recent Mastery
- Recent Evidence
- Reward Progress
- Recommended Challenge
- Story / Simulation discovery
- Recent Achievement
- Resume where you left off

One obvious primary action must dominate.

---

# 13. LEARN / CURRICULUM DISCOVERY

Two mental models:

## Guided
“What should I do next?”

## Explore
“What can I learn?”

Use real backend structure:

`Domain → Track / World → Skill Group → Skill → Learning Objective → Mission / Practice / Project`

Older learners may see denser curriculum structures. Younger learners should see visual portals and guided paths.

---

# 14. WORLDS

Worlds are meaningful learning spaces, not decorative cards.

World should include:

- world identity
- world scene
- current position
- progress
- path
- available mission nodes
- completed nodes
- locked nodes
- practice nodes
- project nodes
- review nodes
- story nodes
- simulation nodes
- challenge nodes
- reward nodes
- next recommended step

Possible journey:

`World → Path → Mission → Activity → Practice → Project → Mastery → Reward → Next Mission`

---

# 15. MISSIONS

## Mission Detail / Brief

Show:

- mission scene
- title
- story/context
- purpose
- learning objective
- skills
- duration
- activity count
- requirements
- companion briefing
- reward
- lock reason
- unlock path
- Start CTA

## Mission Player

Structure:

- mission context
- mission progress
- current activity
- explanation
- example
- interaction
- AI help
- companion
- voice seam
- feedback
- retry
- success
- evidence
- mastery impact
- XP/reward
- reflection
- next action

No mission should end in a dead end.

---

# 16. ACTIVITY ENGINE

Potential reusable activity primitives:

- Single choice
- Multiple choice
- Matching
- Ordering
- Drag/drop
- Categorization
- Typing
- Fill in the blank
- Visual selection
- Listening
- Speaking
- Coding
- Scenario decision
- Conversation
- Reflection
- Simulation
- Challenge
- Creation task

Every activity needs instruction, progress, hint, feedback, retry, success and next step.

---

# 17. PRACTICE ENGINE

Practice surfaces:

- Review Due
- Smart Practice
- Flashcards
- Skill Practice
- Quick Practice
- Challenge

Use real backend engines where applicable.

---

# 18. ADAPTIVE ENGINE

Relevant adaptive capabilities may include:

- recommendations
- next activity
- engagement
- cognitive load
- interleaved practice
- transfer opportunities
- ZPD
- learning path
- difficulty recommendation
- growth velocity
- level-up decision

Translate into learner language:

- Recommended Next
- Smart Practice
- Review Now
- Right Difficulty
- Challenge Me
- Ready to Level Up
- Continue Here

Classify each adaptive capability as:

- LEARNER_SURFACE
- CONTEXTUAL_ACTION
- BACKGROUND_ENGINE
- ADMIN_ANALYTICS
- INTERNAL_ONLY

---

# 19. MASTERY ENGINE

Learner-facing language:

- Learning
- Practicing
- Getting Stronger
- Almost Mastered
- Mastered
- Review Needed

Use paths, rings, timelines, mastery maps, competency views and evidence indicators.

Never show children raw mastery probabilities/confidence values.

---

# 20. EVIDENCE ENGINE

Evidence sources may include:

- Quiz
- Project
- Conversation
- Coding
- Presentation
- English speaking
- Experiment
- Challenge
- Reflection

Connect evidence to:

`Skill → Competency → Mastery → Portfolio → Credential`

Provide evidence cards, detail, source, date, skill/competency relationship and parent visibility where appropriate.

---

# 21. REVIEW ENGINE

Support:

- due review
- spaced review
- skill refresh
- flashcards
- mastery review
- adaptive review recommendations

Home and Practice must surface review clearly.

---

# 22. RECOMMENDATION ENGINE

Recommendations should influence:

- Home
- Learn
- Practice
- World progression
- next mission
- review
- project discovery

UX should answer “Why this now?” without exposing engine internals.

---

# 23. ENGLISH LEARNING EXPERIENCE

Support real backend-backed modes such as:

- Vocabulary
- Grammar
- Reading
- Listening
- Writing
- Speaking
- Pronunciation
- Conversation
- Dictation
- Shadowing
- Stories
- Review

Use Arabic scaffolding intelligently.

Potential experience zones:

- Vocabulary Village
- Story Library
- Listening Station
- Speaking Studio
- Conversation Corner
- Pronunciation Lab
- Writing Workshop

Use names only if they fit the final brand architecture.

---

# 24. CODING EXPERIENCE

Flow:

`Concept → Example → Mission Brief → Editor → Run → Output → Tests → Error → Debug → AI Hint → Review → Challenge → Submit → Evidence → Mastery → Next`

Requirements:

- safe execution
- sandboxing
- clear errors
- child-friendly debugging
- contextual AI help
- tests
- challenge mode
- project connection
- evidence generation

Never execute raw learner code unsafely in production backend processes.

---

# 25. AI LITERACY EXPERIENCE

Teach:

- what AI is
- prompting
- limitations
- hallucination
- bias
- privacy
- safety
- ethics
- human oversight
- evaluation

Prefer:

- Prompt Lab
- Hallucination Challenge
- Bias Detective
- Privacy Mission
- Ethics Scenario
- Model Evaluation
- Human Oversight Challenge

Avoid lecture-only screens.

---

# 26. CREATIVITY EXPERIENCE

Journey:

`Prompt → Idea → Create → Feedback → Improve → Showcase → Reflection → Portfolio`

Connect useful outputs to Projects and Portfolio.

---

# 27. THINKING SKILLS

Domains may include:

- Critical Thinking
- Problem Solving
- Computational Thinking
- Cross-curricular reasoning

Turn them into puzzles, scenarios, challenges, decisions, simulations and real-world tasks.

---

# 28. STORIES

Support:

- scene illustration
- dialogue
- characters
- progress
- audio / voice seam
- comprehension
- choices
- reflection
- mission connection

Use stories in English, reading, AI literacy, critical thinking and world storytelling.

---

# 29. SIMULATIONS

Simulation experience:

`Context → Choice → Consequence → Feedback → Reflection → Learning Outcome`

Support branching choices, consequences, learning feedback, completion and evidence where appropriate.

---

# 30. PROJECTS ENGINE

Journey:

`Discover → Brief → Plan → Research → Build → Milestones → Feedback → Improve → Complete → Showcase → Reflect → Portfolio`

Support real capabilities such as:

- Create project
- My projects
- Browse/discover projects
- Real-world challenges
- Cross-domain projects
- Project detail
- Update
- Delete where allowed
- Milestones
- Complete project
- Showcase
- Rubric
- Curriculum context
- Collaborators
- Research notes
- Reflection
- Feedback

Every action must respect authorization.

---

# 31. PORTFOLIO

Portfolio should prove:

- what I built
- what I learned
- what evidence exists
- what skills were demonstrated
- what competencies improved
- what changed over time
- what achievements were earned

Resolve child-readable names. Never expose raw backend IDs.

---

# 32. GAMIFICATION ENGINE

Support real backend functionality such as:

- XP
- Level
- Streak
- Achievements
- Badges
- Coins
- Cosmetics
- Streak Freeze
- Leaderboard
- Learner rank
- Unlock progress
- Daily goals

Potential new capabilities only if implemented end-to-end:

- Daily Quests
- Weekly Quests
- World Challenges
- Skill Challenges
- Collections
- Reward anticipation

No fake quest UI. No gambling mechanics.

---

# 33. CHARACTER / CONVERSATION ENGINE

Support where real:

- unlocked character list
- character detail
- active companion
- conversation creation
- conversation history
- send message
- pause/resume/end
- character state
- relationship state
- summary/context refresh

AI companions are contextual mentors, not generic chatbots.

---

# 34. AI MENTOR

Contextual actions may include:

- Explain this
- Give me a hint
- Ask me a question
- Review my answer
- Help me debug
- Help me improve
- Practice with me
- Role-play
- Reflect with me
- Suggest next step

AI context should include learner, age, language, world, mission, objective, activity, recent progress, character and safety state.

---

# 35. VOICE EXPERIENCE

Voice is platform-wide.

Potential contexts:

- onboarding
- young learner navigation
- reading
- pronunciation
- speaking practice
- English conversation
- AI mentor
- characters
- mission instructions
- reflection
- story interaction
- project explanation
- accessibility

Voice states:

- IDLE
- LISTENING
- THINKING
- SPEAKING
- PAUSED
- MUTED
- ERROR

Support cancel, retry, mute, transcript, keyboard alternative, privacy explanation and barge-in where technically possible.

If provider is unavailable, implement provider-independent architecture and gate runtime honestly.

---

# 36. REWARDS EXPERIENCE

Show:

- current level
- XP
- streak
- achievements
- badges
- coins
- cosmetics
- next reward
- unlock progress
- collection where supported

Reward moments should be meaningful, not manipulative.

---

# 37. SEARCH

Search should discover:

- Worlds
- Domains
- Skills
- Missions
- Projects
- Stories
- Simulations
- Concepts

Use categorized results.

---

# 38. NOTIFICATIONS

Meaningful notifications may include:

- Mission ready
- Review due
- Project milestone
- Achievement unlocked
- Reward unlocked
- New recommendation
- Guardian-related safe notice where appropriate

Avoid notification spam.

---

# 39. SETTINGS

Learner settings may include:

- Profile
- Language
- Accessibility
- Voice
- Learning preferences
- Daily goal
- Notifications
- Privacy preferences where appropriate

---

# 40. GUARDIAN EXPERIENCE

Guardian Home should answer:

- What is my child learning?
- What improved?
- What needs practice?
- What did they build?
- What evidence exists?
- What should happen next?
- Are they safe?

Required surfaces may include:

- Child selector
- Weekly progress
- Mastery
- Skills improving
- Review needs
- Projects
- Evidence
- Goals
- Recommendations
- Activity
- Safety
- Controls
- Reflections where appropriate

Use same brand, with more mature density.

---

# 41. MODERATOR EXPERIENCE

Flow:

`Queue → Case → Context → Decision → Resolution → Audit`

Potential capabilities:

- moderation queue
- quarantine
- review
- reports
- case detail
- safety context
- resolution
- audit trail

No unrestricted child-to-stranger messaging.

---

# 42. ADMIN / CMS

Admin must operate the product.

Potential operational areas:

- Curriculum
- Domains
- Skills
- Competencies
- Learning Objectives
- Missions
- Activities
- Questions
- Question templates
- Projects
- Rubrics
- Content
- Content QA
- Provenance
- Sources/licenses
- Curriculum mapping
- Misconceptions
- Interventions
- Difficulty calibration
- Analytics
- Retention
- Stickiness
- AI evaluation
- AI templates
- Safety policies
- Experiments
- Feature flags
- Entitlements
- Moderation
- Audit
- Legal/privacy
- Translation/QA if applicable

Admin UI should be coherent and operational, not gamified.

---

# 43. SAFETY SYSTEM

Canonical states:

- SAFE
- RESTRICTED
- BLOCKED
- ESCALATION_REQUIRED
- PARENT_APPROVAL_REQUIRED

Rules:

- no secrecy encouragement
- no exclusivity/dependency
- no guilt
- do not discourage parents
- no unrestricted stranger DMs
- child-safe moderation
- prompt-injection resistance
- tool safety
- role-based access
- parent relationships respected

---

# 44. COMMUNITY

Potential safe features:

- curated feed
- showcased projects
- report
- moderation
- quarantine
- search
- trending
- stats
- creativity gallery
- safe publish visibility

No unrestricted public chat or DMs.

---

# 45. LEGAL / PRIVACY

Build a real privacy center.

Potential areas:

- Privacy Policy
- Terms
- Cookie preferences
- Consent / acceptance records
- Guardian consent where needed
- Data request
- Export
- Deletion
- Withdrawal
- Processor/transfers disclosure where verified
- Retention
- Security
- Breach process
- AI data disclosure
- Published legal version lifecycle

Do not invent legal entity/address/DPO/hosting/processors/contracts. Anything uncertain must be marked as legal-review/configuration.

---

# 46. CONTENT SYSTEM

Runtime rule:

`REAL API + REAL DATA`

or:

`HONEST EMPTY STATE`

Never fabricate missions, progress, projects, achievements, analytics, users, mastery, rewards or recommendations.

Fixtures are tests only.

---

# 47. RESPONSIVE REQUIREMENTS

Validate:

- 360
- 390
- 430
- 768
- 1024
- 1280
- 1440+

Do not shrink desktop layouts. Create genuine mobile experiences.

---

# 48. ARABIC-FIRST / RTL

Every major route must work in:

- Arabic RTL
- English LTR

Validate:

- navigation
- arrows
- progress direction
- paths
- maps
- drawers
- icons
- forms
- numbers
- mixed Arabic/English
- code blocks
- tables
- character placement
- animation direction

Do not blindly mirror everything.

---

# 49. ACCESSIBILITY

Required:

- semantic HTML
- keyboard navigation
- focus visibility
- screen reader labels
- contrast
- touch targets
- reduced motion
- transcript support
- non-voice alternatives
- predictable navigation
- accessible forms
- accessible dialogs

---

# 50. PERFORMANCE

Use:

- route-level lazy loading
- code splitting
- optimized images
- responsive images
- deferred coding runtime
- deferred voice runtime
- deferred heavy simulations
- skeletons
- prefetch where useful
- animation optimization

Home must remain lightweight.

---

# 51. PAGE ACCEPTANCE STANDARD

Every page must have:

- purpose
- hierarchy
- real content/data
- primary action
- loading
- empty
- error
- success
- locked/restricted state where relevant
- responsive behavior
- Arabic RTL
- English LTR
- accessibility
- visual polish
- next action

A route rendering is not completion.

---

# 52. FEATURE ACCEPTANCE STANDARD

Every feature must answer:

- How does the user discover it?
- How is it introduced?
- What can they do?
- What happens?
- What feedback appears?
- What persists?
- How does progress change?
- What should they do next?

If it cannot answer these, it is incomplete.

---

# 53. NAVIGATION MODEL

Potential learner top-level areas:

- Home
- Learn
- Worlds
- Projects
- Progress

Utilities:

- Search
- Notifications
- Profile

Younger learners receive simpler navigation. Older learners may receive denser navigation.

---

# 54. USER JOURNEYS

## Visitor
`Landing → Explore → Signup/Login`

## New Learner
`Signup/Login → Onboarding → Companion → World → First Mission → Activity → Feedback → Reward → Progress → Next Step`

## Returning Learner
`Login → Resume Journey`

## Practice
`Home/Progress → Review Due/Smart Practice → Activity → Feedback → Updated Mastery`

## Project
`Discover → Create → Plan → Milestones → Complete → Showcase → Portfolio`

## Guardian
`Login → Child → Progress → Evidence → Projects → Recommendations → Safety`

## Moderator
`Queue → Case → Resolution`

## Admin
`Operational Area → Action → Persisted Result → Audit`

---

# 55. BACKEND CAPABILITY CLASSIFICATION

For every backend capability classify:

- REQUIRED_PRODUCT_SURFACE
- REQUIRED_EXISTING_SURFACE_EXTENSION
- ADMIN_OPERATIONAL_REQUIREMENT
- BACKGROUND_ENGINE
- INTERNAL_ONLY
- OPS_ONLY
- DUPLICATE_API
- BACK_COMPAT_API
- BLOCKED_EXTERNAL
- OBSOLETE

Do not create pages just to hit controller coverage.

Ask:

- Who uses this?
- Why?
- Where does it belong in the journey?
- What action/result does it enable?

---

# 56. AUTHORIZATION AUDIT

Perform focused server-side authorization review.

Requirements:

- learner writes restricted to learner-owned resources
- guardian access scoped to linked children
- moderator access limited to moderation responsibilities
- admin operations role-protected
- no mutation protected only by frontend visibility
- no IDOR
- no unsafe generic JWT-only mutations

Add regression tests for real authorization bugs.

---

# 57. TESTING

Required categories:

- unit tests
- API contract regression tests
- component tests
- integration tests
- authorization tests
- E2E
- visual regression
- accessibility
- performance
- responsive tests

High-priority areas:

- Mission completion
- Mission locked states
- World progression
- Adaptive recommendations
- Smart Practice
- Mastery goals
- Rewards
- Achievements
- Leaderboard rank
- Projects
- Portfolio
- Guardian
- Admin write operations
- Role guards
- Real API response shapes

---

# 58. PLAYWRIGHT QA

Build a Playwright suite that can:

- crawl routes
- capture screenshots
- collect console errors
- collect failed requests
- test desktop
- test tablet
- test mobile
- test Arabic
- test English
- test RTL
- test authenticated journeys where safe credentials exist

HTTP 200 is not feature verification.

---

# 59. VISUAL QA

For major routes inspect:

- hierarchy
- density
- empty space
- visual richness
- next action
- child-friendliness
- RTL
- responsive behavior
- character presence
- interaction states
- consistency

Ask: **“Does this look like a finished kids learning product?”**

Fix weak pages immediately.

---

# 60. DEPLOYMENT RULE

Implementation cycle:

`CODE → TEST → BUILD → COMMIT → PUSH → DEPLOY → LIVE VERIFY`

Do not claim completion from code existence, TypeScript, build, commit, deploy script exit code or HTTP 200.

---

# 61. PRODUCTION VERIFICATION

For each deployed batch verify:

- target SHA
- server SHA
- deploy metadata
- frontend asset hashes
- API health
- backend compatibility
- correct route/component
- live behavior
- screenshots where relevant

Authenticated flows must use safe test/proof credentials where available. If not available, mark authenticated E2E as blocked rather than falsely verified.

---

# 62. CANONICAL FRONTEND RULE

There must be one canonical production frontend.

Do not create `frontend-v2`, `frontend-final`, `new-frontend`, `frontend-next` or another parallel rebuild.

Rebuild the canonical frontend directly and remove superseded code safely after migration.

---

# 63. PRODUCT BUILD ORDER

Recommended execution order:

1. Full current capability audit
2. Design system
3. App shell/navigation
4. Landing
5. Auth
6. Onboarding
7. Learner Home
8. Learn
9. Worlds
10. World Detail
11. Mission Detail
12. Mission Player
13. Practice
14. Adaptive Smart Practice
15. Progress
16. Mastery
17. Evidence
18. Rewards
19. English
20. Coding
21. AI Literacy
22. Creativity
23. Thinking Skills
24. Stories
25. Simulations
26. Projects
27. Portfolio
28. Characters/Companions
29. Voice
30. Search
31. Notifications
32. Settings
33. Guardian
34. Moderator
35. Admin/CMS
36. Legal/Privacy
37. RTL
38. Mobile
39. Accessibility
40. Performance
41. Expanded tests
42. Playwright
43. Visual QA
44. Deployment
45. Live verification

---

# 64. BATCH EXECUTION RULE

For each coherent vertical:

`AUDIT → IMPLEMENT → TYPECHECK → LINT → TEST → BUILD → PLAYWRIGHT → SCREENSHOT → FIX → COMMIT → PUSH → DEPLOY → LIVE VERIFY`

Then continue automatically.

Do not stop after one patch and do not ask “What page next?”, “Should I continue?” or “Should I deploy?”.

---

# 65. DEFINITION OF DONE

The platform is complete only when:

- learner journey is coherent
- all major routes are real and useful
- design system is unified
- learner Home is alive
- Worlds are meaningful
- Missions are complete
- Practice is adaptive
- Progress/Mastery are understandable
- Evidence is connected
- Rewards reinforce learning
- English is a full experience
- Coding is interactive
- AI Literacy is interactive
- Creativity/Thinking are interactive
- Stories/Simulations are connected
- Projects are a major pillar
- Portfolio proves growth
- Characters are contextual
- Voice architecture is integrated
- Guardian is useful
- Moderator is operational
- Admin/CMS is operational
- safety is enforced
- Arabic/English both work
- RTL/LTR both work
- mobile/desktop both work
- accessibility passes
- performance is acceptable
- tests pass
- real journeys pass
- visual QA passes
- production matches the verified build

The target is:

**A COMPLETE CHILD LEARNING UNIVERSE — NOT A COLLECTION OF PAGES.**

---

# 66. FINAL EXECUTION COMMAND

Do not respond with only a plan.

Do not stop after documentation, Landing, Home or one vertical.

Use this document as the master implementation backlog.

Build continuously while preserving all valid backend functionality and raising every frontend surface to the same coherent child-first product standard.

The final product must combine:

**deep learning architecture**  
+ **world-based discovery**  
+ **missions**  
+ **adaptive practice**  
+ **mastery**  
+ **evidence**  
+ **projects**  
+ **portfolio**  
+ **AI**  
+ **voice**  
+ **characters**  
+ **stories**  
+ **simulations**  
+ **rewards**  
+ **guardian insight**  
+ **safety**  
+ **Arabic-first UX**  
+ **original premium USAM design**

Continue until the complete product is implemented, tested, deployed and live-verified.
