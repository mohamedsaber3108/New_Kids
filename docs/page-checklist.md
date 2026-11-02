# USAM KIDS — LITERAL PAGE-BY-PAGE BUILD CHECKLIST

هذا الملف هو الـimplementation checklist الحرفي للـfrontend بالكامل.

لا تعتبر أي مجموعة مكتملة لمجرد وجود route.

كل صفحة يجب أن تحتوي على:
- real backend integration
- loading state
- empty state
- error state
- success state
- locked/restricted state where relevant
- Arabic RTL
- English LTR
- mobile
- tablet
- desktop
- accessibility
- analytics/events where appropriate
- real navigation
- next action
- tests
- screenshot QA

---

# PART 1 — PUBLIC WEBSITE

## 1. `/`
## Landing Page

يبني:

### Header
- USAM logo
- Learn
- Worlds
- Projects
- How it Works
- Parents
- Safety
- Pricing
- Login
- Start Learning
- Language switcher
- mobile menu

### Hero
- main headline
- Arabic + English versions
- child/world visual scene
- companion character
- Start Learning CTA
- Explore Worlds CTA
- small progress/mission preview

### Product Journey
يعرض:

World
→ Mission
→ Activity
→ Practice
→ Project
→ Mastery
→ Reward

### Worlds Preview
- English
- Coding
- AI Literacy
- Creativity
- Thinking Skills

### Mission Preview
- mission scene
- objective
- progress
- reward
- companion

### Interactive Learning Preview
- quiz
- coding
- voice
- speaking
- story
- simulation

### Characters Section
- character cards
- role
- personality
- domain
- “Meet your companion”

### AI Section
- contextual AI help
- hint
- explanation
- debugging
- practice

### Voice Section
- speaking
- pronunciation
- listening
- reading
- conversation

### Projects Section
- discover
- build
- improve
- showcase

### Mastery Section
- skills
- evidence
- mastery
- portfolio

### Parent Section
- progress
- safety
- projects
- recommendations

### Safety Section
- child safety
- moderation
- parent visibility
- privacy

### Pricing
لو backend/entitlements يدعمها.

### Final CTA

### Footer
- product links
- parent links
- help
- legal
- privacy
- language
- copyright

---

# 2. `/how-it-works`

يبني شرح بصري:

- Create learner
- Complete onboarding
- Enter first world
- Start mission
- Practice
- Get feedback
- Build project
- Gain mastery
- Earn reward
- Continue journey

---

# 3. `/learn`

Public learning overview.

يعرض:
- domains
- worlds
- skills
- missions
- projects
- adaptive learning
- AI help

---

# 4. `/worlds`

Public Worlds showcase.

لكل World:
- artwork
- description
- domain
- sample missions
- character
- age range
- learning outcomes

---

# 5. `/english`

English marketing/product page.

يعرض:
- Vocabulary
- Grammar
- Reading
- Listening
- Speaking
- Pronunciation
- Writing
- Conversation
- Stories

---

# 6. `/coding`

يعرض:
- Coding missions
- Editor
- Run
- Debug
- Challenges
- AI coding coach
- Projects

---

# 7. `/ai-literacy`

يعرض:
- prompting
- bias
- hallucinations
- privacy
- ethics
- evaluation

---

# 8. `/creativity`

يعرض:
- idea generation
- making
- feedback
- improvement
- portfolio

---

# 9. `/projects`

Public Projects overview.

---

# 10. `/characters`

Public characters showcase.

---

# 11. `/voice`

Voice-learning overview.

---

# 12. `/parents`

Guardian product page.

---

# 13. `/safety`

Child safety page.

---

# 14. `/pricing`

لو entitlements/payment موجود.

---

# 15. `/help`

Help center.

---

# 16. `/faq`

FAQ.

---

# 17. `/privacy`

Privacy policy.

---

# 18. `/terms`

Terms.

---

# 19. `/cookies`

Cookie/privacy preferences لو مطلوبة.

---

# PART 2 — AUTH

# 20. `/login`

يحتوي:
- email/username
- password
- show/hide password
- validation
- login
- forgot password
- signup
- OAuth لو موجود
- error messages
- session redirect

---

# 21. `/signup`

- guardian/learner flow حسب النظام
- account data
- validation
- consent
- account creation
- verification redirect

---

# 22. `/verify`

- verification state
- resend
- success
- failure
- expired token

---

# 23. `/forgot-password`

- email
- submit
- success state

---

# 24. `/reset-password`

- new password
- confirm
- token validation
- success

---

# 25. `/session-expired`

---

# 26. `/unauthorized`

---

# PART 3 — LEARNER ONBOARDING

# 27. `/app/onboarding`

Stepper.

## Step 1
Welcome.

## Step 2
Age/context.

## Step 3
Language.

## Step 4
Interests.

## Step 5
Learning goals.

## Step 6
What do you want to build?

## Step 7
Light diagnostic.

## Step 8
Meet companion.

## Step 9
Recommended first world.

## Step 10
First mission.

يحفظ:
- explicit learner signals
- preferences
- onboarding completion
- recommendation inputs

---

# PART 4 — LEARNER HOME

# 28. `/app`

## Learner Home

يبني حرفيًا:

### Welcome Hero
- learner name
- avatar
- companion
- level
- XP
- streak

### Continue Journey
- current world
- mission
- percent progress
- Resume CTA

### Next Best Action
من recommendation/adaptive engine.

### Daily Goal
- minutes
- activities
- progress
- completed/not completed

### Review Due
- count
- Practice CTA

### Smart Practice
- recommended adaptive session

### Worlds
- recent
- unlocked
- recommended

### Active Project
- current milestone
- progress
- continue

### Companion Suggestion

### Recent Mastery
- recently mastered skills

### Recent Evidence

### Reward Progress
- next reward
- XP needed

### Achievement
- most recent

### Story/Simulation recommendation

### Challenge recommendation

---

# PART 5 — LEARN

# 29. `/app/learn`

يبني mode switch:

## Guided
- recommended path
- next lesson
- next mission
- next skill
- review

## Explore
- domains
- worlds
- tracks
- skills
- objectives

Filters:
- domain
- difficulty
- progress
- status

---

# 30. `/app/domains/:domainId`

Domain detail.

يعرض:
- title
- character
- description
- total progress
- skills
- worlds
- tracks
- recommended path
- projects
- challenges

---

# 31. `/app/skills/:skillId`

Skill detail.

يعرض:
- name
- description
- mastery
- objectives
- related missions
- practice
- projects
- prerequisites
- review status

---

# 32. `/app/objectives/:objectiveId`

Learning objective detail.

يعرض:
- objective
- related competency
- evidence
- mastery
- activities
- missions

---

# PART 6 — WORLDS

# 33. `/app/worlds`

World Browser.

يعرض:
- world cards/portals
- progress
- locked/unlocked
- recommended
- continue
- domain
- age adaptation

---

# 34. `/app/worlds/:worldId`

World Detail.

يبني:

### World Hero
- scene
- title
- character
- description
- overall progress

### Map / Learning Path

Node types:
- Mission
- Practice
- Project
- Story
- Simulation
- Challenge
- Reward
- Review

لكل node:
- status
- progress
- locked reason
- prerequisites
- reward

### Current Position

### Up Next

### Completed

### Locked Area

### Project Node

### Reward Node

---

# PART 7 — MISSIONS

# 35. `/app/missions/:missionId`

Mission Detail / Mission Brief.

يعرض:

- mission artwork
- title
- narrative/context
- purpose
- objectives
- competencies
- skills
- estimated duration
- activity count
- difficulty
- prerequisites
- reward
- XP
- companion briefing
- Start Mission
- Resume Mission

لو locked:
- reason
- required mission/skill
- progress toward unlock

---

# 36. `/app/missions/:missionId/run/:runId`

Mission Player.

يبني:

### Header
- mission title
- activity number
- total activities
- progress
- exit/pause

### Activity Area

### Companion

### AI Help

buttons:
- Explain
- Hint
- Example
- Check my thinking

### Voice

لو applicable.

### Feedback

Correct:
- positive feedback
- explanation
- progress

Wrong:
- retry
- hint
- explanation
- encouragement

### Mission Completion

يعرض:
- Mission Complete
- XP
- reward
- evidence created
- skills improved
- mastery change
- achievement
- unlock
- reflection
- next mission
- practice
- project

---

# PART 8 — PRACTICE

# 37. `/app/practice`

Tabs:

## Smart Practice
من adaptive engine.

## Review Due

## Flashcards

## Skill Practice

## Quick Practice

## Challenge

يعرض:
- duration
- recommended reason
- skill
- mastery target
- session progress

---

# 38. `/app/practice/session/:sessionId`

Practice Player.

- question/activity
- progress
- hints
- adaptive difficulty
- feedback
- completion summary

---

# PART 9 — ADAPTIVE ENGINE UI

مش كل endpoint يبقى page.

يستخدم في:

### Home
recommendation.

### Practice
interleaved practice.

### Learn
next action.

### Skill page
difficulty/review.

### Mission
next recommended activity.

Backend concepts:
- engagement
- cognitive load
- interleaving
- transfer
- ZPD
- recommendations
- next activity
- learning path
- difficulty
- growth velocity
- level-up

يترجمها للطفل إلى:

- Recommended
- Try this next
- Review now
- Right level
- Challenge me
- Ready to level up

---

# PART 10 — PROGRESS

# 39. `/app/progress`

Main learner progress.

Sections:

### Overall
- level
- XP
- streak
- learning time

### Domains
progress by domain.

### Skills
- Learning
- Practicing
- Strong
- Mastered
- Review Needed

### Competencies

### Mastery Goals

### Recent Growth

### Evidence

### Projects

### Achievements

---

# 40. `/app/progress/mastery`

Detailed mastery.

- competency list
- skill mastery
- goals
- evidence count
- review state

---

# 41. `/app/progress/evidence`

Evidence list.

Filters:
- skill
- competency
- source
- date
- type

---

# 42. `/app/progress/evidence/:id`

Evidence detail.

يعرض:
- source
- artifact
- skill
- competency
- result
- created date
- reflection
- linked project/mission

---

# PART 11 — REWARDS

# 43. `/app/rewards`

يبني:

### Level
### XP
### Streak
### Next Level
### Achievements
### Badges
### Coins
### Cosmetics
### Streak Freeze
### Collections
لو backend موجود.
### Next Reward
### Unlock Progress

---

# 44. `/app/achievements`

- unlocked
- locked
- progress
- milestones

---

# 45. `/app/leaderboard`

لو learner opted in.

- top learners
- learner rank
- XP
- level
- privacy opt-out handling

---

# 46. `/app/rewards/shop`

لو backend يدعم:
- cosmetics
- unlock
- equip
- streak freeze purchase

---

# PART 12 — ENGLISH

# 47. `/app/english`

English Home.

يعرض:
- current level
- continue
- vocabulary
- reading
- listening
- speaking
- pronunciation
- grammar
- writing
- conversation
- stories
- review

---

# 48. `/app/english/vocabulary`

---

# 49. `/app/english/grammar`

---

# 50. `/app/english/reading`

---

# 51. `/app/english/listening`

---

# 52. `/app/english/speaking`

---

# 53. `/app/english/pronunciation`

---

# 54. `/app/english/writing`

---

# 55. `/app/english/conversation`

---

# 56. `/app/english/dictation`

---

# 57. `/app/english/shadowing`

---

# 58. `/app/english/stories`

---

# 59. `/app/english/session/:sessionId`

Shared English Player.

يدعم:
- prompt
- audio
- speaking
- recording
- feedback
- transcript
- retry
- AI Coach
- completion

---

# PART 13 — CODING

# 60. `/app/coding`

Coding Home.

يعرض:
- current path
- lessons
- missions
- challenges
- projects
- recent code
- Codey companion

---

# 61. `/app/coding/learn`

---

# 62. `/app/coding/challenges`

---

# 63. `/app/coding/challenges/:id`

---

# 64. `/app/coding/lab`

Coding Lab.

يبني:
- editor
- run button
- reset
- output
- console
- tests
- hints
- AI debugger

---

# 65. `/app/coding/project/:id`

Coding Project Workspace.

---

# PART 14 — AI LITERACY

# 66. `/app/ai`

AI Literacy Home.

---

# 67. `/app/ai/prompt-lab`

---

# 68. `/app/ai/hallucination-challenge`

---

# 69. `/app/ai/bias-detective`

---

# 70. `/app/ai/privacy-mission`

---

# 71. `/app/ai/ethics`

---

# 72. `/app/ai/evaluation`

---

# 73. `/app/ai/human-oversight`

كل تجربة:
- scenario
- activity
- decision
- feedback
- reflection
- evidence

---

# PART 15 — CREATIVITY

# 74. `/app/creativity`

Creativity Home.

---

# 75. `/app/creativity/create`

Flow:

Idea
→ Draft
→ Feedback
→ Improve
→ Final

---

# 76. `/app/creativity/gallery`

لو community safety يسمح.

---

# 77. `/app/creativity/:id`

Artifact detail.

---

# PART 16 — THINKING SKILLS

# 78. `/app/thinking`

---

# 79. `/app/thinking/critical`

---

# 80. `/app/thinking/problem-solving`

---

# 81. `/app/thinking/computational`

---

# 82. `/app/thinking/challenge/:id`

---

# PART 17 — STORIES

# 83. `/app/stories`

Story Library.

Filters:
- language
- world
- skill
- difficulty
- completed

---

# 84. `/app/stories/:id`

Story Player.

يعرض:
- scene
- text
- dialogue
- character
- audio
- choices
- comprehension
- progress

---

# PART 18 — SIMULATIONS

# 85. `/app/simulations`

---

# 86. `/app/simulations/:id`

Flow:

Context
→ Choice
→ Consequence
→ Feedback
→ Reflection

---

# PART 19 — PROJECTS

# 87. `/app/projects`

Tabs:

## My Projects

## Discover

## Real World Challenges

## Cross-Domain

Filters:
- domain
- status
- skill
- difficulty

---

# 88. `/app/projects/new`

Create Project.

- title
- description
- domain
- objective
- skills
- visibility
- challenge source where relevant

---

# 89. `/app/projects/:id`

Project Detail.

يعرض:

### Overview
- title
- description
- status
- visibility

### Curriculum Context
- domains
- competency
- objective

### Milestones

### Research Notes

### Rubric

### Collaborators

### Feedback

### Reflection

### Showcase

Actions:
- edit
- delete
- complete milestone
- add note
- add/remove collaborator
- submit/showcase

---

# 90. `/app/projects/:id/edit`

---

# 91. `/app/projects/:id/research`

---

# 92. `/app/projects/:id/reflection`

---

# PART 20 — PORTFOLIO

# 93. `/app/portfolio`

يعرض:
- learner
- project count
- showcased count
- project gallery
- evidence
- competencies
- reflections
- achievements

لا يعرض raw backend IDs.

---

# 94. `/app/portfolio/projects/:id`

Portfolio project view.

---

# PART 21 — CHARACTERS

# 95. `/app/characters`

يعرض:
- unlocked
- locked
- active companion
- domain
- role

---

# 96. `/app/characters/:characterId`

Character Detail.

- artwork
- personality
- role
- specialty
- conversation
- interaction history
- start conversation

---

# PART 22 — AI COMPANION

# 97. `/app/companion`

لو محتاج dedicated surface.

لكن AI الأساسي لازم يكون contextual داخل الصفحات.

يحتوي:
- recent conversations
- selected character
- context
- history

---

# 98. `/app/conversations/:conversationId`

- messages
- voice
- send
- pause
- resume
- end
- summary

---

# PART 23 — VOICE

مش لازم voice يبقى page فقط.

يبني Shared Voice Layer.

States:

- Idle
- Listening
- Thinking
- Speaking
- Paused
- Muted
- Error

Controls:
- microphone
- cancel
- retry
- mute
- transcript
- keyboard alternative

Integrate into:
- Onboarding
- English
- Mission
- Characters
- Stories
- Reflection
- Projects

---

# PART 24 — SEARCH

# 99. `/app/search`

Search:
- Worlds
- Skills
- Missions
- Projects
- Stories
- Simulations

Features:
- autocomplete
- categories
- filters
- recent
- empty state

---

# PART 25 — NOTIFICATIONS

# 100. `/app/notifications`

Types:
- mission ready
- review due
- achievement
- reward
- project milestone
- recommendation

Actions:
- mark read
- clear where supported
- open destination

---

# PART 26 — SETTINGS

# 101. `/app/settings`

Sections:

## Profile

## Language

## Daily Goal

## Voice

## Accessibility

## Learning Preferences

## Notifications

## Privacy

## Logout

---

# PART 27 — GUARDIAN

# 102. `/guardian`

Guardian Dashboard.

يبني:

### Child Selector

### Weekly Overview

### Learning Time

### Current Worlds

### Skills Improving

### Review Needed

### Mastery

### Current Projects

### Evidence

### Achievements

### Recommendations

### Safety

---

# 103. `/guardian/children`

---

# 104. `/guardian/children/:learnerId`

Child Detail.

Tabs:

- Overview
- Progress
- Skills
- Mastery
- Evidence
- Projects
- Activity
- Reflections
- Safety
- Controls

---

# 105. `/guardian/children/:learnerId/progress`

---

# 106. `/guardian/children/:learnerId/evidence`

---

# 107. `/guardian/children/:learnerId/projects`

---

# 108. `/guardian/children/:learnerId/activity`

---

# 109. `/guardian/children/:learnerId/safety`

---

# 110. `/guardian/children/:learnerId/settings`

---

# 111. `/guardian/goals`

---

# 112. `/guardian/recommendations`

---

# 113. `/guardian/settings`

---

# PART 28 — MODERATOR

# 114. `/moderator`

Moderator Dashboard.

---

# 115. `/moderator/queue`

---

# 116. `/moderator/cases/:id`

Case Detail.

يعرض:
- user/context
- flagged content
- rule
- history
- AI moderation result
- action
- resolution

---

# 117. `/moderator/reports`

---

# 118. `/moderator/audit`

---

# PART 29 — ADMIN

# 119. `/admin`

Admin Dashboard.

---

# 120. `/admin/curriculum`

---

# 121. `/admin/domains`

---

# 122. `/admin/domains/:id`

---

# 123. `/admin/skills`

---

# 124. `/admin/skills/:id`

---

# 125. `/admin/competencies`

---

# 126. `/admin/objectives`

---

# 127. `/admin/missions`

---

# 128. `/admin/missions/new`

---

# 129. `/admin/missions/:id`

---

# 130. `/admin/missions/:id/edit`

---

# 131. `/admin/activities`

---

# 132. `/admin/questions`

---

# 133. `/admin/question-templates`

---

# 134. `/admin/projects`

---

# 135. `/admin/projects/:id`

---

# 136. `/admin/rubrics`

---

# 137. `/admin/content`

---

# 138. `/admin/content/new`

---

# 139. `/admin/content/:id`

---

# 140. `/admin/content-qa`

---

# 141. `/admin/provenance`

---

# 142. `/admin/curriculum-mapping`

---

# 143. `/admin/misconceptions`

---

# 144. `/admin/interventions`

---

# 145. `/admin/interventions/:learnerId`

---

# 146. `/admin/difficulty`

---

# 147. `/admin/analytics`

---

# 148. `/admin/analytics/retention`

---

# 149. `/admin/analytics/stickiness`

---

# 150. `/admin/analytics/learning`

---

# 151. `/admin/ai`

---

# 152. `/admin/ai/evaluations`

---

# 153. `/admin/ai/evaluations/:id`

---

# 154. `/admin/prompt-templates`

---

# 155. `/admin/prompt-templates/:id`

---

# 156. `/admin/safety-policies`

---

# 157. `/admin/experiments`

---

# 158. `/admin/experiments/:id`

---

# 159. `/admin/feature-flags`

---

# 160. `/admin/entitlements`

---

# 161. `/admin/moderation`

---

# 162. `/admin/audit`

---

# 163. `/admin/legal`

---

# 164. `/admin/privacy`

---

# PART 30 — SHARED ENGINES

الـagent لازم يشتغل كذلك على engines وليس الصفحات فقط.

## Authentication Engine
- login
- logout
- token/session
- refresh
- guards
- role redirects

## Authorization Engine
- learner ownership
- guardian-child relation
- moderator permissions
- admin permissions

## Curriculum Engine

## Mission Engine

## Activity Engine

## Practice Engine

## Adaptive Engine

## Mastery Engine

## Evidence Engine

## Review Engine

## Recommendation Engine

## English Engine

## Coding Sandbox

## AI Mentor Engine

## Voice Engine

## Character Engine

## Conversation Engine

## Project Engine

## Portfolio Engine

## Gamification Engine

## Daily Goal Engine

## Search Engine

## Notification Engine

## Community Engine

## Moderation Engine

## Analytics Engine

## Experimentation Engine

## Feature Flag Engine

## Entitlement Engine

## Legal/Privacy Engine

---

# PART 31 — GLOBAL STATES

لازم يعمل system موحد لـ:

## Loading

## Skeleton

## Empty

## Error

## Success

## Locked

## Restricted

## Parent Approval Required

## Escalation Required

## Offline

## Unauthorized

## Not Found

---

# PART 32 — NAVIGATION

## Learner Desktop

- Home
- Learn
- Worlds
- Projects
- Progress

Utilities:
- Search
- Notifications
- Profile

## Younger Learner Mobile

- Home
- Learn
- Projects
- Rewards

## Older Learner

- Home
- Learn
- Explore
- Projects
- Progress

---

# PART 33 — GLOBAL UI SYSTEM

لازم يعمل:

- PageShell
- LearnerShell
- GuardianShell
- ModeratorShell
- AdminShell
- WorldShell
- ActivityShell
- ProjectWorkspace
- StoryPlayer
- SimulationPlayer
- VoiceLayer
- CharacterStage
- RewardMoment
- SkillTree
- JourneyPath
- WorldMap
- MissionNode
- ProgressVisual
- EvidenceCard
- MasteryCard

---

# PART 34 — RESPONSIVE

كل صفحة تتراجع على:

360
390
430
768
1024
1280
1440+

لازم يبني mobile UX حقيقي.

---

# PART 35 — ARABIC

لكل صفحة:

- Arabic
- RTL
- typography
- arrows
- maps
- paths
- progress
- tables
- code
- forms
- icons
- animation direction

---

# PART 36 — ACCESSIBILITY

لكل صفحة:

- keyboard
- focus
- semantic HTML
- ARIA where needed
- contrast
- touch target
- screen reader
- reduced motion

---

# PART 37 — PERFORMANCE

يعمل:

- route splitting
- lazy loading
- image optimization
- defer voice
- defer coding runtime
- defer simulations
- prefetch
- bundle checks

---

# PART 38 — TESTS

يبني tests لـ:

- auth
- route guards
- worlds
- missions
- mission completion
- locked state
- practice
- adaptive recommendations
- mastery
- evidence
- rewards
- achievements
- leaderboard
- English
- Coding
- Projects
- Portfolio
- Guardian
- Moderator
- Admin
- API response shapes
- authorization

---

# PART 39 — PLAYWRIGHT

يبني automated flows:

## Public
Landing → Signup/Login.

## Learner
Login → Home → World → Mission → Complete.

## Practice
Home → Practice → Completion.

## Project
Projects → Create → Milestone → Portfolio.

## Guardian
Login → Child → Progress.

## Admin
Login → operational action.

يعمل screenshots:

- Arabic
- English
- mobile
- tablet
- desktop

---

# PART 40 — FINAL IMPLEMENTATION RULE

ممنوع يقول:

“Done”

لمجرد:
- page renders
- TypeScript passes
- build passes
- commit exists
- route returns 200

كل vertical لازم يعدي:

AUDIT
→ DESIGN
→ IMPLEMENT
→ API CONNECT
→ TYPECHECK
→ LINT
→ UNIT TEST
→ INTEGRATION TEST
→ BUILD
→ PLAYWRIGHT
→ SCREENSHOT
→ VISUAL QA
→ FIX
→ COMMIT
→ PUSH
→ DEPLOY
→ LIVE VERIFY.

ثم يكمل للـvertical التالي.

---

# FINAL TARGET

الموقع النهائي لازم يحس الطفل إنه داخل:

WORLD
→ MISSION
→ ACTIVITY
→ AI
→ VOICE
→ PRACTICE
→ PROJECT
→ MASTERY
→ EVIDENCE
→ REWARD
→ PORTFOLIO
→ NEXT ADVENTURE

وليس:

Dashboard
→ Cards
→ APIs.

المنتج النهائي يجب أن يكون:

**USAM LEARNING UNIVERSE**

بـ:

- original USAM design
- original characters
- Arabic-first experience
- adaptive learning
- AI mentors
- Voice
- Worlds
- Missions
- Stories
- Simulations
- Coding
- English
- AI Literacy
- Creativity
- Projects
- Portfolio
- Mastery
- Evidence
- Rewards
- Guardian
- Safety
- Moderator
- Admin

ولا يتم حذف أي backend capability صالح أثناء إعادة بناء الـfrontend.