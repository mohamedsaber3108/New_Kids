// Comprehensive feature-by-feature verification against the real backend.
// Goes beyond the happy-path journey: invalid input, wrong role, cross-account access,
// boundary conditions, idempotency, and persistence-after-restart (same DB file reopened).
// Run: node tests/comprehensive.e2e.mjs
import {createApp} from '../server/app.mjs';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

let pass = 0, fail = 0;
const failures = [];
function step(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; failures.push(name); console.log('  FAIL ', name, detail !== undefined ? '-> ' + JSON.stringify(detail) : ''); }
}

async function withApp(opts, fn) {
  const app = createApp({ database: ':memory:', secureCookies: false, ...opts });
  await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + app.server.address().port;
  const call = async (path, { method = 'GET', body, cookie } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { Origin: base } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null; try { data = await res.json(); } catch {}
    return { status: res.status, data, cookie: res.headers.get('set-cookie')?.split(';')[0] };
  };
  try { await fn(call, app); } finally { await new Promise(r => app.server.close(r)); app.db.close(); }
}

async function registerApprovedGuardianWithChild(call, adminCookie, email = 'parent@example.test') {
  const reg = await call('/api/auth/register', { method: 'POST', body: { email, password: 'Guardian-Password-123', displayName: 'Parent' } });
  const pending = await call('/api/admin/guardians/pending', { cookie: adminCookie });
  const guardianId = pending.data.guardians.find(g => g.email === email).id;
  await call('/api/admin/guardians/' + guardianId + '/approve', { method: 'POST', cookie: adminCookie, body: { attestation: true } });
  const policy = await call('/api/guardian/consent', { cookie: reg.cookie });
  await call('/api/guardian/consent', { method: 'POST', cookie: reg.cookie, body: { policyVersion: policy.data.policyVersion, attestation: true } });
  const child = await call('/api/guardians/learners', { method: 'POST', cookie: reg.cookie, body: { nickname: 'Explorer', ageYear: 10 } });
  // Entering the child space intentionally REVOKES the guardian session (child-safety: no live
  // guardian session left in the child's browser). The guardian must sign in again afterwards.
  const enter = await call('/api/guardians/learners/' + child.data.id + '/enter', { method: 'POST', cookie: reg.cookie, body: {} });
  const relogin = await call('/api/auth/login', { method: 'POST', body: { email, password: 'Guardian-Password-123' } });
  return { guardianCookie: relogin.cookie, revokedGuardianCookie: reg.cookie, guardianId, childId: child.data.id, learnerCookie: enter.cookie };
}

// ---------- 1. AUTH: invalid input, duplicate email, wrong password, rate limiting shape ----------
await withApp({}, async call => {
  const badEmail = await call('/api/auth/register', { method: 'POST', body: { email: 'not-an-email', password: 'Password-Long-123', displayName: 'Parent' } });
  step('register rejects invalid email', badEmail.status === 400, badEmail.data);

  const shortPw = await call('/api/auth/register', { method: 'POST', body: { email: 'a@example.test', password: 'short', displayName: 'Parent' } });
  step('register rejects short password (<12)', shortPw.status === 400, shortPw.data);

  const shortName = await call('/api/auth/register', { method: 'POST', body: { email: 'b@example.test', password: 'Password-Long-123', displayName: 'X' } });
  step('register rejects 1-char displayName (min 2)', shortName.status === 400, shortName.data);

  const ok = await call('/api/auth/register', { method: 'POST', body: { email: 'dup@example.test', password: 'Password-Long-123', displayName: 'Parent' } });
  step('register succeeds once', ok.status === 201, ok.data);
  const dup = await call('/api/auth/register', { method: 'POST', body: { email: 'dup@example.test', password: 'Password-Long-123', displayName: 'Parent' } });
  step('duplicate email rejected 409', dup.status === 409, dup.data);

  const wrongLogin = await call('/api/auth/login', { method: 'POST', body: { email: 'dup@example.test', password: 'Wrong-Password-123' } });
  step('wrong password rejected 401', wrongLogin.status === 401, wrongLogin.data);

  const noAuth = await call('/api/auth/me');
  step('unauthenticated /auth/me returns authenticated:false (not error)', noAuth.status === 200 && noAuth.data.authenticated === false, noAuth.data);

  const badCookie = await call('/api/guardians/learners', { cookie: 'kids_session=totally-invalid' });
  step('garbage session cookie treated as unauthenticated (401), not crash', badCookie.status === 401, badCookie.data);
});

// ---------- 2. GUARDIAN GATES: email verification / approval / consent ordering ----------
await withApp({ adminEmail: 'admin@example.test', adminPassword: 'Admin-Password-Long-123', guardianConsentRequired: true }, async call => {
  const admin = await call('/api/auth/login', { method: 'POST', body: { email: 'admin@example.test', password: 'Admin-Password-Long-123' } });
  const reg = await call('/api/auth/register', { method: 'POST', body: { email: 'g1@example.test', password: 'Guardian-Password-123', displayName: 'Guardian' } });

  const beforeApproval = await call('/api/guardians/learners', { method: 'POST', cookie: reg.cookie, body: { nickname: 'Kid', ageYear: 9 } });
  step('child blocked before guardian approval', beforeApproval.status === 403 && beforeApproval.data.error === 'guardian_approval_required', beforeApproval.data);

  const pending = await call('/api/admin/guardians/pending', { cookie: admin.cookie });
  const gid = pending.data.guardians[0].id;
  await call('/api/admin/guardians/' + gid + '/approve', { method: 'POST', cookie: admin.cookie, body: { attestation: true } });

  const beforeConsent = await call('/api/guardians/learners', { method: 'POST', cookie: reg.cookie, body: { nickname: 'Kid', ageYear: 9 } });
  step('child blocked before consent (even though approved)', beforeConsent.status === 403 && beforeConsent.data.error === 'guardian_consent_required', beforeConsent.data);

  const approveAgain = await call('/api/admin/guardians/' + gid + '/approve', { method: 'POST', cookie: admin.cookie, body: { attestation: true } });
  step('double-approve is not silently a second success (404 - no pending row to update)', approveAgain.status === 404, approveAgain.data);

  // age/band mismatch validation
  const policy = await call('/api/guardian/consent', { cookie: reg.cookie });
  await call('/api/guardian/consent', { method: 'POST', cookie: reg.cookie, body: { policyVersion: policy.data.policyVersion, attestation: true } });
  const badAge = await call('/api/guardians/learners', { method: 'POST', cookie: reg.cookie, body: { nickname: 'Kid', ageYear: 99 } });
  step('out-of-range age rejected', badAge.status === 400, badAge.data);
  const mismatchBand = await call('/api/guardians/learners', { method: 'POST', cookie: reg.cookie, body: { nickname: 'Kid', ageYear: 8, ageBand: '13-15' } });
  step('mismatched ageYear/ageBand rejected', mismatchBand.status === 400, mismatchBand.data);
});

// ---------- 3. LEARNING: placement idempotency, mission scoring, session lifecycle, forged choice ----------
await withApp({ adminEmail: 'admin@example.test', adminPassword: 'Admin-Password-Long-123', guardianConsentRequired: true }, async call => {
  const admin = await call('/api/auth/login', { method: 'POST', body: { email: 'admin@example.test', password: 'Admin-Password-Long-123' } });
  const { learnerCookie, childId } = await registerApprovedGuardianWithChild(call, admin.cookie);

  const p1 = await call('/api/placement', { method: 'POST', cookie: learnerCookie, body: { answers: [1,2,0,1,2,0,1,2,0,1] } });
  step('first placement 201', p1.status === 201, p1.data);
  const p2 = await call('/api/placement', { method: 'POST', cookie: learnerCookie, body: { answers: [1,2,0,1,2,0,1,2,0,1] } });
  step('second placement rejected 409 (idempotent-once)', p2.status === 409 && p2.data.error === 'placement_already_completed', p2.data);

  // learning-session full lifecycle incl. forged choice + double-complete
  const launch = await call('/api/learning-sessions', { method: 'POST', cookie: learnerCookie, body: { missionId: 'coding-square', mode: 'MISSION' } });
  step('session launched', launch.status === 200 && launch.data.session.id.startsWith('session-'), launch.data);
  const sid = launch.data.session.id;

  const forgedChoice = await call('/api/learning-sessions/' + sid, { method: 'PATCH', cookie: learnerCookie, body: { choice: 999 } });
  step('forged out-of-range choice rejected 400', forgedChoice.status === 400, forgedChoice.data);

  // answer all questions for coding-square (assume 3 questions per existing test fixtures)
  let last;
  for (let i = 0; i < 3; i++) {
    last = await call('/api/learning-sessions/' + sid, { method: 'PATCH', cookie: learnerCookie, body: { choice: 0 } });
  }
  step('session accepts sequential answers', last.status === 200 || last.status === 409, last.data);

  const complete1 = await call('/api/learning-sessions/' + sid + '/complete', { method: 'POST', cookie: learnerCookie, body: {} });
  step('session completes 201', complete1.status === 201, complete1.data);
  const complete2 = await call('/api/learning-sessions/' + sid + '/complete', { method: 'POST', cookie: learnerCookie, body: {} });
  step('double-complete is safe/idempotent (200 alreadyComplete)', complete2.status === 200 && complete2.data.alreadyComplete === true, complete2.data);

  // cross-learner session access: a second child must not read/complete the first child's session
  const { learnerCookie: otherLearnerCookie } = await registerApprovedGuardianWithChild(call, admin.cookie, 'parent2@example.test');
  const stolen = await call('/api/learning-sessions/' + sid, { cookie: otherLearnerCookie });
  step('cross-learner session read blocked', stolen.status === 404, stolen.data);
});

// ---------- 4. PROJECTS: validation boundaries, ownership, notes, milestones, delete ----------
await withApp({ adminEmail: 'admin@example.test', adminPassword: 'Admin-Password-Long-123', guardianConsentRequired: true }, async call => {
  const admin = await call('/api/auth/login', { method: 'POST', body: { email: 'admin@example.test', password: 'Admin-Password-Long-123' } });
  const { learnerCookie } = await registerApprovedGuardianWithChild(call, admin.cookie);

  const tooShortTitle = await call('/api/projects', { method: 'POST', cookie: learnerCookie, body: { title: 'ab', body: 'This body is definitely long enough to pass validation rules.', world: 'coding' } });
  step('project title too short rejected', tooShortTitle.status === 400, tooShortTitle.data);

  const tooShortBody = await call('/api/projects', { method: 'POST', cookie: learnerCookie, body: { title: 'A good title', body: 'short', world: 'coding' } });
  step('project body too short rejected', tooShortBody.status === 400, tooShortBody.data);

  const badWorld = await call('/api/projects', { method: 'POST', cookie: learnerCookie, body: { title: 'A good title', body: 'This body is definitely long enough to pass validation rules.', world: 'not-a-world' } });
  step('unknown world rejected', badWorld.status === 400, badWorld.data);

  const leaksEmail = await call('/api/projects', { method: 'POST', cookie: learnerCookie, body: { title: 'Contact me', body: 'Please email me at kid@example.com for more info about this.', world: 'coding' } });
  step('project with embedded email rejected (privacy filter)', leaksEmail.status === 400, leaksEmail.data);

  const created = await call('/api/projects', { method: 'POST', cookie: learnerCookie, body: { title: 'My Robot Garden', body: 'A project about teaching a robot to water plants weekly.', world: 'coding' } });
  const pid = created.data.project.id;

  const note = await call('/api/projects/' + pid + '/research', { method: 'PATCH', cookie: learnerCookie, body: { body: 'Researching soil moisture sensors for the project now.' } });
  step('research note saved', note.status === 200, note.data);

  const milestone = await call('/api/projects/' + pid + '/milestones', { method: 'POST', cookie: learnerCookie, body: { title: 'Build the sensor circuit' } });
  step('milestone created', milestone.status === 201 && milestone.data.id, milestone.data);
  const toggled = await call('/api/projects/' + pid + '/milestones/' + milestone.data.id, { method: 'PUT', cookie: learnerCookie, body: { complete: true } });
  step('milestone toggled complete', toggled.status === 200 && toggled.data.complete === true, toggled.data);

  // cross-account project access
  const { learnerCookie: otherLearnerCookie } = await registerApprovedGuardianWithChild(call, admin.cookie, 'parent3@example.test');
  const stolenProject = await call('/api/projects/' + pid, { cookie: otherLearnerCookie });
  step('cross-account project read blocked 404', stolenProject.status === 404, stolenProject.data);
  const stolenEdit = await call('/api/projects/' + pid, { method: 'PATCH', cookie: otherLearnerCookie, body: { title: 'Hacked title here', body: 'This body is definitely long enough to pass validation.', world: 'coding' } });
  step('cross-account project edit blocked 404', stolenEdit.status === 404, stolenEdit.data);

  const deleted = await call('/api/projects/' + pid, { method: 'DELETE', cookie: learnerCookie });
  step('owner can delete own project', deleted.status === 200 && deleted.data.deleted === true, deleted.data);
  const goneCheck = await call('/api/projects/' + pid, { cookie: learnerCookie });
  step('deleted project no longer readable', goneCheck.status === 404, goneCheck.data);
});

// ---------- 5. GUARDIAN CONTROLS / TIME LIMITS enforced server-side ----------
await withApp({ adminEmail: 'admin@example.test', adminPassword: 'Admin-Password-Long-123', guardianConsentRequired: true }, async call => {
  const admin = await call('/api/auth/login', { method: 'POST', body: { email: 'admin@example.test', password: 'Admin-Password-Long-123' } });
  const { guardianCookie, revokedGuardianCookie, childId, learnerCookie } = await registerApprovedGuardianWithChild(call, admin.cookie);

  const revoked = await call('/api/guardians/learners', { cookie: revokedGuardianCookie });
  step('guardian session revoked after entering child space (child-safety)', revoked.status === 401, revoked.data);

  const disable = await call('/api/guardian/children/' + childId + '/controls', { method: 'PATCH', cookie: guardianCookie, body: { guidesEnabled: false, voiceEnabled: true } });
  step('guardian disables companion guides', disable.status === 200 && disable.data.controls.guidesEnabled === false, disable.data);

  const assistBlocked = await call('/api/assist', { method: 'POST', cookie: learnerCookie, body: { message: 'hi there', companionId: 'azouz' } });
  step('assist blocked server-side once guides disabled', assistBlocked.status === 403 && assistBlocked.data.error === 'guides_disabled_by_guardian', assistBlocked.data);

  const strictLimits = await call('/api/guardian/children/' + childId + '/time-limits', { method: 'PATCH', cookie: guardianCookie, body: { dailyMinutes: 10, weeklyMinutes: 30, bedtimeHour: 21 } });
  step('guardian sets strict time limits', strictLimits.status === 200, strictLimits.data);

  const invalidLimits = await call('/api/guardian/children/' + childId + '/time-limits', { method: 'PATCH', cookie: guardianCookie, body: { dailyMinutes: 300, weeklyMinutes: 30, bedtimeHour: 21 } });
  step('weekly < daily rejected', invalidLimits.status === 400, invalidLimits.data);

  // other-guardian cannot touch this child's controls
  const { guardianCookie: otherGuardianCookie } = await registerApprovedGuardianWithChild(call, admin.cookie, 'parent4@example.test');
  const stolenControls = await call('/api/guardian/children/' + childId + '/controls', { cookie: otherGuardianCookie });
  step('other guardian blocked from child controls (403 not linked)', stolenControls.status === 403, stolenControls.data);
});

// ---------- 6. SAFE-GUIDANCE / COMPANION: private-info detection, message length boundary ----------
await withApp({ adminEmail: 'admin@example.test', adminPassword: 'Admin-Password-Long-123', guardianConsentRequired: true }, async call => {
  const admin = await call('/api/auth/login', { method: 'POST', body: { email: 'admin@example.test', password: 'Admin-Password-Long-123' } });
  const { learnerCookie } = await registerApprovedGuardianWithChild(call, admin.cookie);

  const leaked = await call('/api/assist', { method: 'POST', cookie: learnerCookie, body: { message: 'my email is kid@example.com', companionId: 'azouz' } });
  step('assist restricts private-info message', leaked.status === 200 && leaked.data.state === 'RESTRICTED', leaked.data);

  const tooLong = await call('/api/assist', { method: 'POST', cookie: learnerCookie, body: { message: 'x'.repeat(241), companionId: 'azouz' } });
  step('assist rejects over-length message (>240)', tooLong.status === 400, tooLong.data);

  const unknownCompanion = await call('/api/assist', { method: 'POST', cookie: learnerCookie, body: { message: 'hello', companionId: 'not-real' } });
  step('assist rejects unknown companion', unknownCompanion.status === 400, unknownCompanion.data);
});

// ---------- 7. MODERATION: report lifecycle + authorization ----------
await withApp({ adminEmail: 'admin@example.test', adminPassword: 'Admin-Password-Long-123' }, async call => {
  const admin = await call('/api/auth/login', { method: 'POST', body: { email: 'admin@example.test', password: 'Admin-Password-Long-123' } });
  const { learnerCookie } = await registerApprovedGuardianWithChild(call, admin.cookie);

  const tooShortReason = await call('/api/reports', { method: 'POST', cookie: learnerCookie, body: { reason: 'bad' } });
  step('report reason too short rejected', tooShortReason.status === 400, tooShortReason.data);

  const report = await call('/api/reports', { method: 'POST', cookie: learnerCookie, body: { reason: 'Someone said something that made me uncomfortable.' } });
  step('report created 201', report.status === 201, report.data);

  const learnerSeesQueue = await call('/api/moderation/queue', { cookie: learnerCookie });
  step('learner forbidden from moderation queue', learnerSeesQueue.status === 403, learnerSeesQueue.data);

  const queue = await call('/api/moderation/queue', { cookie: admin.cookie });
  step('admin can act as moderator-level overview', queue.status === 200 && queue.data.reports.some(r => r.id === report.data.id), queue.data);

  const resolve = await call('/api/moderation/reports/' + report.data.id, { method: 'PATCH', cookie: admin.cookie, body: { status: 'RESOLVED', resolution: 'Reviewed and addressed with the family.' } });
  step('report resolved', resolve.status === 200, resolve.data);

  const resolveAgain = await call('/api/moderation/reports/' + report.data.id, { method: 'PATCH', cookie: admin.cookie, body: { status: 'RESOLVED', resolution: 'Reviewed and addressed with the family.' } });
  step('cannot resolve an already-resolved report (404 - no OPEN row)', resolveAgain.status === 404, resolveAgain.data);
});

// ---------- 8. PERSISTENCE ACROSS RESTART (real file DB, reopen) ----------
{
  const dir = mkdtempSync(join(tmpdir(), 'usam-persist-'));
  const dbFile = join(dir, 'kids.db');
  try {
    let childId, title = 'Persisted Across Restart';
    await withApp({ database: dbFile, adminEmail: 'admin@example.test', adminPassword: 'Admin-Password-Long-123', guardianConsentRequired: true }, async call => {
      const admin = await call('/api/auth/login', { method: 'POST', body: { email: 'admin@example.test', password: 'Admin-Password-Long-123' } });
      const { learnerCookie, childId: cid } = await registerApprovedGuardianWithChild(call, admin.cookie);
      childId = cid;
      const created = await call('/api/projects', { method: 'POST', cookie: learnerCookie, body: { title, body: 'This project must survive a full server restart and DB reopen.', world: 'coding' } });
      step('project created before restart', created.status === 201, created.data);
    });
    // Reopen the SAME db file in a fresh app instance (simulating a process restart).
    await withApp({ database: dbFile, adminEmail: 'admin@example.test', adminPassword: 'Admin-Password-Long-123' }, async (call) => {
      // Admin already exists from first boot; seeding is INSERT ... IF NOT EXISTS-guarded.
      const admin = await call('/api/auth/login', { method: 'POST', body: { email: 'admin@example.test', password: 'Admin-Password-Long-123' } });
      step('admin account persisted across restart', admin.status === 200, admin.data);
      const overview = await call('/api/admin/overview', { cookie: admin.cookie });
      step('learner/project counts persisted across restart', overview.status === 200 && overview.data.learners >= 1 && overview.data.projects >= 1, overview.data);
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

console.log(`\nCOMPREHENSIVE RESULT: ${pass} passed, ${fail} failed`);
if (failures.length) console.log('Failed:', failures.join(', '));
process.exit(fail === 0 ? 0 : 1);
