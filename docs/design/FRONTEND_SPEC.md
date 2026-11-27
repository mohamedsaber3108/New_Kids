# USAM Kids: frontend spec (T-25)

Status: spec only, no code. Branch `kids/docs-frontend-spec`, cut from `origin/main`.
Method: code read with `git grep` and file read. No page was opened in a browser, so nothing below about looks, contrast or screen readers is measured. Tags: [V] read in code, [A] assumption or default, [N] not checked.
All numbers in sections 3 and 4 are **defaults taken; the owner may change them** (OD-22b: the strictest rule applies to every child until the owner sets age bands, Q-02).

## 1. Current state, from code

### 1.1 Routes and shells per role
- `src/access.js:6` `AREA_ROLES`: learner=LEARNER, guardian=GUARDIAN, admin=ADMIN, moderator=MODERATOR+ADMIN [V].
- `src/access.js:8-14` `areaOf(path)`: `/app`, `/guardian`, `/admin`, `/moderator`, everything else is public [V].
- `src/access.js:20,29` `homeFor(role)` and `accessDecision()`: public = allow, no session = sign-in, wrong role = "wrong area" notice [V]. The API enforces the same rules (comment at `src/access.js:3`).
- `src/main.jsx:100` `shellArea` picks the shell. In server mode it is the user's area, otherwise `learner` [V].
- `src/main.jsx:103-108` `areaNav`: one sidebar list per role [V].
  - learner (`main.jsx:96`): Home, Worlds, Practice, Age challenges, Projects, Progress, Companions, Rewards, Search (9 items).
  - guardian: Dashboard, Children, Goals, Recommendations, Account (5).
  - admin: Overview, Missions, Curriculum map, Content QA, Analytics, AI, Safety policies, Feature flags, Moderation (9).
  - moderator: Desk, Queue, Reports, Audit (4).
- Public routes in `main.jsx:76`: `/characters`, `/worlds`, `/how-it-works`, `/parents`, `/safety`, `/privacy`, `/terms`, `/faq`. Auth routes in `main.jsx:123`: `/login`, `/signup`, `/forgot-password`, `/verify`, `/session-expired`.
- Child routes `/app/*` in `main.jsx:95`: onboarding, placement, learn, worlds, practice, coding lab and challenges, AI lab, search, notifications, rewards, leaderboard, stories, simulations, projects, portfolio, characters, conversations, companion.
- Finding: the child sidebar has 9 items plus a leaderboard route. Too many choices for ages 7-9. A leaderboard is a pressure device [A].
- Finding: the admin list mixes Moderation into admin nav (`main.jsx:107`). Fine, but ADMIN.md lists 15 modules; the nav will outgrow one list.

### 1.2 Text under 16 px
All in `src/styles.css`. Examples [V]: `.world-card p` 13px (l.6) and 12px (l.13), `.world-card small` 11px (l.6), `.world-card-footer` 10px (l.13), `.journey-step p` 13px (l.6), `.stat-strip small` 11px (l.8), `.card-label` 11px (l.8), `.story-card span` 10px (l.8), `.review-card p` 13px (l.8), `.mission-meta span` 13px (l.9), `.runner-header>div` 13px (l.9), `.list-card small/em` 11px (l.10), `.chat-message` 13px, `.chat-header small` 10px, `.chat-disclosure` 10px (l.11, the "this is a program" notice), `.toast` 13px (l.11), `.feedback` 14px (l.9), `.option` 16px but 14px at l.13 (small screens), `.btn` 14px (l.4), `.form-error` 13px (l.20), `.language-toggle` 11px, `.ticker` 11px (l.13). About 80 rules below 16 px in total (grep, l.4-44).
- Worst for a child: the answer feedback (14px), the toast (13px) and the AI disclosure (10px) are the three messages a child must read.

### 1.3 Targets under 44 px
- `.icon-button` 37x37 px (`styles.css:4`) [V]. Used by `IconButton` (`main.jsx:43`, icon 19px).
- `.btn` has `min-height:48px` (`styles.css:4`) [V]. Good. Its text is 14px.
- `.option` `min-height:65px` (`styles.css:9`) [V]. Good.
- Text-only controls (`.desktop-nav button`, `.footer button`, `.language-toggle`) set no height, so their size is [N]. Needs a browser measure.

### 1.4 Negative letter-spacing on Arabic
`styles.css` has 8 negative rules [V]: l.4 `-1.9px` and `-.6px`; l.5 `-3px` (hero); l.6 `-1.6px`; l.7 `-1.7px`; l.12 `-2px`; l.13 `-1.4px`; l.40 `-.04em`. None is scoped to `:lang(en)`. Arabic letters join, so any letter-spacing, even positive, breaks the joins [A until a page is run].
Also `letter-spacing:.15em` at l.44 (`.hub-lesson-art span`) [V]: check the same way.

### 1.5 aria-live and alerts
- `role="status"` on: toast (`main.jsx:123`), hint and answer feedback (`main.jsx:125`), inline answer (`main.jsx:75`), report status (`main.jsx:93`), wrong-area (`main.jsx:117`) [V].
- `role="alert"` on form errors (`main.jsx:87,125,144`) and API unavailable (`main.jsx:95`) [V].
- 23 files carry at least one `aria-live` or `role=status/alert`; main.jsx has 8 [V]. Coverage by page is [N].
- The toast is `position:fixed` and has no close control or timeout rule in CSS [N: timeout is in JS, not read].
- Heartbeat: `setInterval` once in `main.jsx` (about l.56) checks learning-time limit; shows a toast only [V per judge, [N] re-read].

### 1.6 Reduced motion
- One global rule, `styles.css:14`: `prefers-reduced-motion:reduce` sets `scroll-behavior:auto`, `transition:none`, `animation:none` on `*` with `!important` [V].
- Only transitions are used for motion in CSS (`.btn` `.2s`, `styles.css:4`); `@keyframes` found: none by grep [V]. No animation library; `framer`/`requestAnimationFrame` not found [V].
- Gap: the rule is on/off from the OS only. There is no in-app "calm mode" switch for a child or guardian whose device does not set it [A].
- Gap: speech (`main.jsx:70`) is not covered by CSS. It starts only by user action [V].

### 1.7 Colour-only feedback
- `.option.right` (green border, green fill) and `.option.wrong` (brown border, pink fill) differ by colour and border colour (`styles.css:9`) [V]. Whether an icon or word accompanies them in the markup is [N].
- `.feedback` and `.feedback.retry` differ by background (`styles.css:9`). The `<strong>` text in `main.jsx:125` says right or retry in words [V], so that part is not colour-only.
- Progress bars, path nodes and stat strips: [N].

### 1.8 Other facts
- `index.html` has `lang="ar" dir="rtl"`; `main.jsx:52` switches both with the language toggle (judge verdict) [V].
- Fonts load from Google in `index.html` (T-06 removes this).
- No axe, no `eslint-plugin-jsx-a11y` yet (T-03 adds both).

## 2. Navigation and information architecture

Rule for all roles: one shell per role, one home, at most 5 main items on small screens, a visible "where am I" title, and a way back on every page.

### 2.1 Child (`/app`)
Goal: calm, few choices, never a dead end.
Default main nav, 5 items (ages 7-9 see these only; older bands may add "More"):
1. Home (`/app`): one big "continue" card, today's mission, one companion greeting.
2. Learn (`/app/worlds`): worlds as big cards. Practice and age challenges live inside the world.
3. My work (`/app/projects` + `/app/portfolio`).
4. My progress (`/app/progress` + `/app/rewards`): stars and journey. No ranking.
5. Help (new): "report a problem" and "talk to a trusted adult" (T-21 child side).
Moved under "More" for 10-15: Search, Companions list, Stories, Simulations.
Removed from child nav by default: `/app/leaderboard` (default: hide; a child ranking is pressure, owner may change) [A].
Never in child nav: settings, purchase, exit to outside sites, external links. These sit behind the parent gate (T-08).
Mission page: one task on screen, a clear "back to world" button, no countdown, a "need a break" button that pauses.

### 2.2 Guardian (`/guardian`)
Goal: see progress, control safety, pay. Keep the 5 items in `main.jsx:105`; reorder by what a parent does first:
1. Dashboard. 2. Children (add child, age band, controls). 3. Progress and reports (merges Goals and Recommendations into one page with two tabs). 4. Safety and privacy (controls, consent, data rights, T-23). 5. Account and plan (parent gate before any plan or payment screen, T-14).
The guardian page shows a child's pseudonym or first name only as the guardian set it; never child free text (T-15).

### 2.3 Moderator (`/moderator`)
Keep 4 items (`main.jsx:108`). Default landing is Queue, not Desk, with a count. Items are shown by pseudonym (T-05). Every action page has a visible "who sees this" line and a reason field. Audit is read-only.

### 2.4 Admin (`/admin`)
The list is 9 items now and ADMIN.md plans 15 modules. Use grouped sidebar sections (Content, Learners and guardians, Safety, Platform) with a collapsed group at 360 px. Danger actions (feature flags, live AI) show a plain-words confirm. Moderation stays a link to `/moderator`. Tables scroll inside a labelled region at 360 px (ADM-5).

### 2.5 Public and auth
Header: Worlds, How it works, Parents, Safety, FAQ, Login. The language toggle stays in the header and footer. Auth pages: one task per screen, errors with `role="alert"` and text, not colour.

## 3. Animation rules (defaults; owner may change)

| Rule | Default |
|---|---|
| What may move | Small feedback only: a button press (scale up to 3 percent), a card fade-in, a star appearing after a correct answer, a progress bar filling. |
| What must not move | Text being read. Anything that loops. Anything that follows the pointer. Flashing. Parallax. Auto-playing carousels. Characters that run across the page while a child reads. |
| Max duration | 200 ms for press and hover. 400 ms for enter and leave. 800 ms for a one-time reward. Nothing longer. |
| Repeat | Play once. Never loop. No more than 3 s of total motion per screen. |
| Flash | Nothing flashes more than 3 times per second (WCAG 2.3.1). Default: no flashing at all. |
| Sound | Off by default [A]; Q-NEW asks the owner. Voice and sound start only after a tap and always show the same text. |
| How to stop | A "Calm mode" switch in the child's settings menu and in the guardian's child controls. It sets one root attribute (for example `data-calm`) that applies the same rule as `prefers-reduced-motion`. A guardian can set it for the child. |
| Reduced motion | OS setting applies everywhere. Keep the global rule at `styles.css:14`. Add: JS motion (when any exists) must read `matchMedia('(prefers-reduced-motion: reduce)')` and the calm switch. |
| Pressure | No timers aimed at the child, no streak-loss warnings, no "hurry" animation, no shaking on a wrong answer. Wrong answer = gentle colour plus words plus icon. |
| Check | Each PR: tab walk with reduced motion on and calm mode on; no animation runs (check computed `animation-name` is `none`). |

## 4. Child readability rules per age band (defaults; owner may change)

Until the owner sets bands (Q-02), the strictest band (7-9) applies to every child account [OD-22b, A].

| Rule | 7-9 | 10-12 | 13-15 |
|---|---|---|---|
| Touch target, min | 48 px | 44 px | 44 px |
| Gap between targets | 12 px | 8 px | 8 px |
| Body text, min | 18 px | 16 px | 16 px |
| Labels and small text, min | 16 px | 16 px | 14 px (never the only guide) |
| Line height | 1.7 | 1.6 | 1.5 |
| Line length | 40 characters | 55 | 65 |
| Sentence length (Arabic or English) | up to 8 words | up to 12 | up to 16 |
| Instructions | 1 step per screen, icon plus word, optional voice | up to 2 steps | up to 3 steps |
| Choices per screen | up to 3 | up to 4 | up to 5 |
| Nav items visible | 5 | 5 + More | 5 + More |
| Feedback | words plus icon plus colour; gentle | same | same |
| Reading level check | native reader sign-off (D18) before publish (T-20) | same | same |

Rules for every band:
- No text below 14 px anywhere in a child page; 16 px and up for anything a child must read or press. Staff pages may use 14 px.
- No colour-only meaning. Right/wrong, locked/open and progress carry an icon or word.
- Arabic: `letter-spacing:0` for every Arabic text. Use a local Arabic-capable font (T-06). Line height at least 1.6.
- Contrast: at least 4.5:1 for text, 3:1 for icons and borders. The green and cream palette is [N] until measured (T-12).
- Voice is optional; text always shows; a plain message when no Arabic voice exists on the device.
- Toast: `role="status"`, 16 px, stays at least 6 s or until closed, gentle words, close button 48 px.
- Focus ring: keep `styles.css:2` 3px outline; do not remove.
- One language per text element; mixed text gets its own `lang` and `dir` (never one string split by `|` or `/`).

## 5. Reference examples (name, safety note first, then verdict)

I did not fetch any site and did not read the T-16 output. These are named from general knowledge, so each verdict is a hypothesis [A] to confirm in T-16 before any design is built. Nothing is copied.

| Example | Child-safety note first | Verdict | What we take (idea only) |
|---|---|---|---|
| Khan Academy Kids | No open chat; parent area behind a gate; no ads (as I recall [A]). | Adopt | One big "continue" path, a guide character, parent area separate. |
| Duolingo ABC | Leaderboards and streaks are pressure devices; the main Duolingo app has them. [A] | Adapt | Short lessons and clear progress; reject streak-loss and ranking. |
| Scratch Jr | Local projects, no social feed in the junior app [A]. | Adapt | Picture-first controls for pre-readers (T-17 block spike). |
| Lingokids | Contains a paid tier and upsell screens [A]. | Adapt | Age-banded content; reject any purchase prompt inside play. |
| Noon Academy / Egyptian school apps | Open student chat and social features exist in some [A]. | Reject (chat); Adapt (curriculum map) | Curriculum by grade; no open chat. |
| Linear-style dense dashboards (MAT-12) | Small targets and dense text. | Reject for child; Adapt for admin | Table density only on staff pages. |
| Githunts reference (T-16) | Not judged yet. Child-safety judgement is required before design value. | Pending | Decide in T-16. |

## 6. PR-sized task list (one PR each; each judged before it is built)

Each PR checks: axe (0 critical), keyboard tab walk, RTL (AR) and LTR (EN) screenshots at 360 and 1280 px, reduced motion on. Run on the named pages.
Order: 1-3 are safe and need no owner answer. 4-5 need Q-02. 6 onward follow T-12.

| # | PR | Page / files | Change | Check |
|---|---|---|---|---|
| F-01 | Arabic letter-spacing | `src/styles.css` l.4,5,6,7,12,13,40,44 | Scope the 8 negative rules to `:lang(en)` or set `letter-spacing:0` for `:lang(ar)`. | AR screenshots of home, hero, world hub at 360 and 1280; headings show joined letters; EN unchanged. |
| F-02 | Child text floor | `src/styles.css` (rules in 1.2) | Raise child-page text to the section 4 floor with CSS variables (`--text-body`, `--text-small`). Staff pages unchanged. | Screenshots of home, mission, world hub at 360 and 1280 in AR and EN; no horizontal scroll; axe. |
| F-03 | Target size | `.icon-button`, `.language-toggle`, `.desktop-nav button`, `.footer button` in `styles.css`; `IconButton` `main.jsx:43` | `.icon-button` 48 px for 7-9 and 44 px otherwise (use a `--target` variable); give text controls `min-height`. | Measure with a script that lists targets under 44 px on 8 pages; keyboard focus ring visible. |
| F-04 | Feedback not by colour alone | `.option.right/.wrong`, `.feedback`, `main.jsx:125`; progress and path nodes in `styles.css` l.8 | Add an icon and a word to right, retry, locked and done states. | Greyscale screenshot still readable; axe; screen reader reads the state. |
| F-05 | Toasts and live regions | `.toast` `styles.css:11`, `main.jsx:123` | 16 px, close button, 6 s minimum, gentle text; `role="status"` stays; errors keep `role="alert"`. | Keyboard can close; reduced motion; AR and EN at 360 px; text does not hide behind the nav. |
| F-06 | Calm mode | root attribute, CSS rule next to `styles.css:14`, guardian child controls (`src/guardian-details.jsx`) | Add the calm switch from section 3; guardian can set it for a child. | With switch on, computed `animation-name` is `none` on 5 pages; stays after reload. Waits: Q-02 for default. |
| F-07 | Child nav of 5 | `main.jsx:96`, `sidebarItems`; `/app/leaderboard` | Reduce to the 5 items in 2.1; hide leaderboard by default. Routes stay. | Keyboard walk reaches every page from the 5 items; e2e route test `scripts/verify-navigation.mjs` passes. Waits: Q-02. |
| F-08 | Child "Help" page | new `src/` page, child shell | Report a problem and "talk to a trusted adult" in age-fit words; no response-time promise (T-21, Q-19). | Keyboard and screen reader finish the report; AR and EN at 360 and 1280. |
| F-09 | AI disclosure size | `.chat-disclosure` `styles.css:11`, companion chat | 16 px, higher contrast, always visible in the chat: "I am a computer program, not a person" (T-09). | Contrast measure; screenshot at 360 px. |
| F-10 | Guardian IA | `main.jsx:105`, `src/guardian-*.jsx` | Merge Goals and Recommendations into Progress and reports; add Safety and privacy page. | Keyboard walk of guardian approval; RTL at 360 and 1280; axe. |
| F-11 | Moderator and admin nav | `main.jsx:107-108` | Moderator lands on Queue; admin grouped sections, collapsed at 360 px; tables in labelled scroll regions. | Keyboard; 360 px no page-level horizontal scroll; axe. |
| F-12 | Age-band tokens | `src/styles.css`, `src/data.js` or the child profile | Apply section 4 per band through a `data-band` root attribute. Default 7-9. | Three screenshots (one per band) of mission page at 360 and 1280. Waits: Q-02, D16. |
| F-13 | Reduced-motion for scripted motion | any JS animation found by T-12 | Read `matchMedia` and the calm switch. | Test with reduced motion on. May be empty if no JS motion exists. |

Not in this spec: new pages for coding blocks (T-17), pricing screens (T-14), admin modules (T-19 to T-24). Those keep their own tasks.

## 7. Not checked
- No page opened. Contrast, RTL layout, screen reader and real child use are [N].
- T-16 research output not read; section 5 comes from general knowledge.
- Exact size of text-only controls, markup icons on right/wrong, and toast timeout (JS) not read.
- Owner answers pending: Q-02 (age bands), D16, D18 (Arabic proofreader), and the extra questions on devices and sound default.
