// Guardian-facing learning insights for USAM_New (Phase A, backend only).
//
// Original implementation for USAM_New. Concepts reviewed in the USAM Learning World reference
// (evidence diversity, spacing, forgetting) were re-designed here from scratch; no code copied.
//
// Rules:
//  - Pure functions over data USAM_New already stores (attempts, activities, projects, usage).
//  - The existing deterministic masteryStatus() stays the single authority for "mastered".
//    These insights explain progress to GUARDIANS; children never receive raw confidence numbers.
//  - Every number is derived from recorded evidence; no evidence -> null, never a guess.

const DAY = 86400000;

/** Evidence taxonomy: what kind of learning an item demonstrates. */
export const EVIDENCE_KINDS = ['knowledge','application','problem_solving','production','reflection','creation'];

export function evidenceKind(item) {
  if (item.source === 'project') return 'creation';
  if (item.source === 'reflection') return 'reflection';
  switch (item.kind) {
    case 'quiz': return 'knowledge';
    case 'ENGLISH_SKILL': return ['writing','dictation'].includes(item.detail?.track) ? 'production' : 'knowledge';
    case 'CODE_CHALLENGE': case 'CODE_LAB': return 'problem_solving';
    case 'STORY_PATH': case 'STORY': return 'reflection';
    case 'AI_TOPIC': case 'THINKING_CASE': case 'AI_TRUTH': case 'SIMULATION': case 'SIMULATION_CASE': case 'AGE_CHALLENGE': return 'application';
    default: return 'knowledge';
  }
}

const utcDay = at => new Date(at).toISOString().slice(0, 10);

/** Stable next-step codes (the guardian UI translates them); English text kept for API clients. */
export const NEXT_STEP_TEXT = {
  FIRST_MISSION: 'Try a first mission in this world.',
  REVIEW: 'Revisit an earlier mission: it has been a while.',
  PRACTISE_LOW_SCORES: 'Practise the missions with lower scores before moving on.',
  MAKE_PROJECT: 'Turn what was learned into a small project.',
  ADD_REFLECTION: 'Add a reflection about what was learned.',
  SPREAD_PRACTICE: 'Spread practice over a few more days.',
  NEXT_LEVEL: 'Keep going with the next level.',
};

/**
 * Per-world evidence profile and confidence (0..1, 2 decimals) for guardians.
 *   confidence = (0.6 * successRate + 0.2 * kindDiversity + 0.2 * spacing) * recency
 *   successRate   = mean(score/total) over the 20 most recent scored items in the world
 *   kindDiversity = distinct evidence kinds / 4 (capped at 1): mastery needs varied evidence
 *   spacing       = distinct learning days / 5 (capped at 1): rewards practice over cramming
 *   recency       = max(0.5, e^(-daysSinceLast/14)): knowledge fades without review
 * status (guardian language, not shown to children as numbers):
 *   no evidence -> NOT_STARTED; recency < 0.7 with prior strength -> REVIEW_NEEDED;
 *   <0.35 LEARNING; <0.55 PRACTICING; <0.75 GETTING_STRONGER; else ALMOST_MASTERED;
 *   MASTERED only when the authoritative masteryStatus() already says so.
 */
export function worldInsights({evidence, projects = [], worlds, worldOfMission, authoritativeMastery = {}, now = Date.now()}) {
  const items = [
    ...evidence.map(e => ({...e, source: 'evidence', world: e.world || worldOfMission(e.missionId)})),
    ...projects.map(p => ({source: 'project', world: p.world, at: p.updatedAt || p.at})),
    ...projects.flatMap(p => (p.notes || []).filter(n => n.stage === 'REFLECTION').map(n => ({source: 'reflection', world: p.world, at: n.updatedAt}))),
  ].filter(i => i.world && i.at);

  return Object.fromEntries(worlds.map(w => {
    const own = items.filter(i => i.world === w.id);
    if (!own.length) return [w.id, {status: 'NOT_STARTED', confidence: null, evidenceCount: 0, kinds: [], learningDays: 0, lastActivityAt: null, nextStepCode: 'FIRST_MISSION', nextStep: NEXT_STEP_TEXT.FIRST_MISSION}];
    const scored = own.filter(i => i.source === 'evidence' && Number(i.total) > 0).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 20);
    const successRate = scored.length ? scored.reduce((s, i) => s + Math.min(1, Math.max(0, i.score / i.total)), 0) / scored.length : 0;
    const kinds = [...new Set(own.map(evidenceKind))];
    const days = new Set(own.map(i => utcDay(i.at))).size;
    const last = Math.max(...own.map(i => new Date(i.at).getTime()));
    const daysSince = Math.max(0, (now - last) / DAY);
    const recency = Math.max(0.5, Math.exp(-daysSince / 14));
    const base = 0.6 * successRate + 0.2 * Math.min(1, kinds.length / 4) + 0.2 * Math.min(1, days / 5);
    const confidence = Number((base * recency).toFixed(2));
    let status;
    if (authoritativeMastery[w.id] === 'MASTERED') status = 'MASTERED';
    else if (recency < 0.7 && base >= 0.55) status = 'REVIEW_NEEDED';
    else status = confidence < 0.35 ? 'LEARNING' : confidence < 0.55 ? 'PRACTICING' : confidence < 0.75 ? 'GETTING_STRONGER' : 'ALMOST_MASTERED';
    const missing = ['knowledge','application','creation','reflection'].filter(k => !kinds.includes(k));
    const nextStepCode = status === 'REVIEW_NEEDED' ? 'REVIEW'
      : successRate < 0.6 && scored.length ? 'PRACTISE_LOW_SCORES'
      : missing.includes('creation') ? 'MAKE_PROJECT'
      : missing.includes('reflection') ? 'ADD_REFLECTION'
      : days < 3 ? 'SPREAD_PRACTICE'
      : 'NEXT_LEVEL';
    return [w.id, {status, confidence, successRate: scored.length ? Number(successRate.toFixed(2)) : null, evidenceCount: own.length, kinds, learningDays: days, lastActivityAt: new Date(last).toISOString(), nextStepCode, nextStep: NEXT_STEP_TEXT[nextStepCode]}];
  }));
}

/** Last 7 UTC days of measured learning minutes (from server heartbeat) + 28-day world balance. */
export function weeklyActivity({usageByDay, evidence, worlds, worldOfMission, now = Date.now()}) {
  const minutes = new Map(usageByDay.map(r => [r.day, r.minutes]));
  const days = Array.from({length: 7}, (_, i) => utcDay(now - (6 - i) * DAY));
  const since = now - 28 * DAY;
  const recent = evidence.filter(e => new Date(e.at).getTime() >= since);
  const counts = Object.fromEntries(worlds.map(w => [w.id, 0]));
  for (const e of recent) { const world = e.world || worldOfMission(e.missionId); if (world in counts) counts[world]++; }
  const total = recent.length;
  return {
    days: days.map(day => ({day, minutes: minutes.get(day) || 0})),
    totalMinutes: days.reduce((s, d) => s + (minutes.get(d) || 0), 0),
    activeDays: days.filter(d => (minutes.get(d) || 0) > 0).length,
    worldBalance: worlds.map(w => ({worldId: w.id, activities: counts[w.id], share: total ? Number((counts[w.id] / total).toFixed(2)) : 0})),
    windowDays: 28,
    source: 'server-measured minutes (heartbeat) and recorded evidence',
  };
}
