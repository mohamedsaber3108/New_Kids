// End-to-end integration journey against the real backend (createApp), exercising the
// exact API contract the USAM_New frontend uses. Run directly: `node tests/journey.e2e.mjs`.
// Uses an in-memory DB and a clean config (no env leakage). Prints PASS/FAIL per step.
import {createApp} from '../server/app.mjs';
import assert from 'node:assert/strict';

const app = createApp({
  database: ':memory:',
  secureCookies: false,
  adminEmail: 'admin@example.test',
  adminPassword: 'An-Example-Admin-Password-123',
  guardianConsentRequired: true,
});
await new Promise(r => app.server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + app.server.address().port;

async function call(path, { method = 'GET', body, cookie } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(method !== 'GET' ? { Origin: base } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data, cookie: res.headers.get('set-cookie')?.split(';')[0] };
}

let pass = 0, fail = 0;
function step(name, cond, detail) {
  if (cond) { pass++; console.log('  PASS ', name); }
  else { fail++; console.log('  FAIL ', name, detail ? '->' + JSON.stringify(detail) : ''); }
}

try {
  // 1. Health (frontend uses this to decide backend vs demo mode)
  const health = await call('/api/health');
  step('health reports usam-kids-api', health.data?.ok && health.data?.service === 'usam-kids-api', health.data);

  // 2. Admin login (seeded admin)
  const admin = await call('/api/auth/login', { method: 'POST', body: { email: 'admin@example.test', password: 'An-Example-Admin-Password-123' } });
  step('admin login 200', admin.status === 200 && admin.cookie, admin.data);

  // 3. Guardian registration
  const reg = await call('/api/auth/register', { method: 'POST', body: { email: 'parent@example.test', password: 'Parent-Password-Long-123', displayName: 'Parent One' } });
  step('guardian register 201', reg.status === 201, reg.data);
  const gCookie = reg.cookie;

  // 4. Guardian is pending -> admin approves
  const pending = await call('/api/admin/guardians/pending', { cookie: admin.cookie });
  step('admin sees 1 pending guardian', pending.data?.guardians?.length === 1, pending.data);
  const gid = pending.data.guardians[0].id;
  const approve = await call('/api/admin/guardians/' + gid + '/approve', { method: 'POST', cookie: admin.cookie, body: { attestation: true } });
  step('admin approve 200', approve.status === 200, approve.data);

  // 5. Consent required before child creation
  const noConsent = await call('/api/guardians/learners', { method: 'POST', cookie: gCookie, body: { nickname: 'Explorer', ageYear: 10 } });
  step('child creation blocked w/o consent', noConsent.data?.error === 'guardian_consent_required', noConsent.data);
  const policy = await call('/api/guardian/consent', { cookie: gCookie });
  const consent = await call('/api/guardian/consent', { method: 'POST', cookie: gCookie, body: { policyVersion: policy.data.policyVersion, attestation: true } });
  step('consent recorded 200', consent.status === 200, consent.data);

  // 6. Create child
  const child = await call('/api/guardians/learners', { method: 'POST', cookie: gCookie, body: { nickname: 'Explorer', ageYear: 10 } });
  step('child created 201', child.status === 201 && child.data?.id, child.data);
  const childId = child.data.id;

  // 7. Enter child session (learner scope)
  const enter = await call('/api/guardians/learners/' + childId + '/enter', { method: 'POST', cookie: gCookie, body: {} });
  step('enter child -> LEARNER session', enter.data?.role === 'LEARNER' && enter.cookie, enter.data);
  const lCookie = enter.cookie;

  // 8. Onboarding preferences
  const prefs = await call('/api/learner/preferences', { method: 'POST', cookie: lCookie, body: { language: 'ar', interest: 'coding', goal: 'make', build: 'game', companion: 'codey' } });
  step('preferences saved', prefs.status === 200 && prefs.data?.snapshot?.preferences?.companion === 'codey', prefs.data);

  // 9. Placement (10 answers)
  const placement = await call('/api/placement', { method: 'POST', cookie: lCookie, body: { answers: [1,2,0,1,2,0,1,2,0,1] } });
  step('placement 201 + snapshot', placement.status === 201 && placement.data?.snapshot?.placement, placement.data);

  // 10. Mission attempt (server-scored)
  const attempt = await call('/api/attempts', { method: 'POST', cookie: lCookie, body: { missionId: 'coding-square', answers: [0,1,0] } });
  step('attempt scored + persisted', attempt.status === 201 && typeof attempt.data?.score === 'number' && attempt.data?.snapshot, attempt.data);

  // 11. Forged answers rejected
  const forged = await call('/api/attempts', { method: 'POST', cookie: lCookie, body: { missionId: 'coding-square', answers: [99,99,99] } });
  step('forged answers rejected 400', forged.status === 400, forged.data);

  // 12. Project create -> persisted -> readable
  const proj = await call('/api/projects', { method: 'POST', cookie: lCookie, body: { title: 'My Robot Garden', body: 'A project about teaching a robot to water plants on a schedule.', world: 'coding' } });
  step('project created 201', proj.status === 201 && proj.data?.snapshot, proj.data);
  const snap = await call('/api/learners/' + childId + '/snapshot', { cookie: lCookie });
  step('project persisted in snapshot', Array.isArray(snap.data?.projects) && snap.data.projects.some(p => p.title === 'My Robot Garden'), snap.data?.projects?.length);

  // 13. Gamification progression shape (RewardsPage)
  const gam = await call('/api/gamification/progression', { cookie: lCookie });
  step('gamification/progression shape', gam.status === 200 && typeof gam.data?.xp === 'number' && typeof gam.data?.level === 'number', gam.data);

  // 14. AUTHORIZATION: a second guardian cannot read the first child's snapshot (IDOR guard)
  const reg2 = await call('/api/auth/register', { method: 'POST', body: { email: 'intruder@example.test', password: 'Intruder-Password-123', displayName: 'Intruder' } });
  const idor = await call('/api/learners/' + childId + '/snapshot', { cookie: reg2.cookie });
  step('cross-account snapshot blocked', idor.status === 401 || idor.status === 403, { status: idor.status, data: idor.data });

  // 15. Learner cannot reach admin
  const learnerAdmin = await call('/api/admin/overview', { cookie: lCookie });
  step('learner blocked from admin 403', learnerAdmin.status === 403, learnerAdmin.data);
} finally {
  await new Promise(r => app.server.close(r));
  app.db.close();
}

console.log(`\nJOURNEY RESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
