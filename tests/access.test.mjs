import {test} from 'node:test';
import assert from 'node:assert/strict';
import {areaOf,canAccess,accessDecision,homeFor,safeNext,afterSignIn} from '../src/access.js';

const anon={authenticated:false};
const as=role=>({authenticated:true,role});
const publicPages=['/','/worlds','/how-it-works','/characters','/parents','/safety','/faq','/privacy','/terms','/cookies','/login','/signup','/forgot-password','/verify','/english','/coding','/application'];

test('public pages never need a session, for any visitor',()=>{
  for(const p of publicPages){
    assert.equal(areaOf(p),'public',p);
    for(const who of [anon,null,as('LEARNER'),as('GUARDIAN'),as('ADMIN'),as('MODERATOR')])assert.equal(accessDecision(who,p),'allow',p);
  }
});

test('private areas: visitors are asked to sign in; signed-in users are never asked again',()=>{
  for(const p of ['/app','/app/worlds','/guardian','/guardian/goals','/admin','/admin/missions','/moderator/queue'])assert.equal(accessDecision(anon,p),'sign-in',p);
  assert.equal(accessDecision(as('LEARNER'),'/app/worlds'),'allow');
  assert.equal(accessDecision(as('GUARDIAN'),'/guardian/children/x/progress'),'allow');
  assert.equal(accessDecision(as('ADMIN'),'/admin/feature-flags'),'allow');
  assert.equal(accessDecision(as('ADMIN'),'/moderator/reports'),'allow','admins may use the moderation desk');
  assert.equal(accessDecision(as('MODERATOR'),'/moderator'),'allow');
  // Signed in but the wrong role: a notice, not a login form.
  assert.equal(accessDecision(as('GUARDIAN'),'/app/worlds'),'wrong-role');
  assert.equal(accessDecision(as('LEARNER'),'/guardian'),'wrong-role');
  assert.equal(accessDecision(as('MODERATOR'),'/admin'),'wrong-role');
  assert.equal(accessDecision(as('GUARDIAN'),'/admin'),'wrong-role');
});

test('area matching is exact on segment boundaries',()=>{
  assert.equal(areaOf('/application'),'public');
  assert.equal(areaOf('/administrator-info'),'public');
  assert.equal(areaOf('/guardians-guide'),'public');
  assert.equal(areaOf('/app'),'learner');
});

test('homes and post-sign-in destinations',()=>{
  assert.equal(homeFor('ADMIN'),'/admin');assert.equal(homeFor('MODERATOR'),'/moderator');
  assert.equal(homeFor('GUARDIAN'),'/guardian');assert.equal(homeFor('LEARNER'),'/app');assert.equal(homeFor(undefined),'/');
  assert.equal(afterSignIn('GUARDIAN','/guardian/goals'),'/guardian/goals');
  assert.equal(afterSignIn('GUARDIAN','/app/worlds'),'/guardian','a guardian is sent to choose a child, not into the child app');
  assert.equal(afterSignIn('ADMIN','/moderator/queue'),'/moderator/queue');
  assert.equal(afterSignIn('ADMIN',''),'/admin');
});

test('post-login destination cannot redirect off-site',()=>{
  for(const bad of ['//evil.example','/\\evil.example','https://evil.example','javascript:alert(1)','evil','/login','/signup?x=1','/a b',undefined,null,42])assert.equal(safeNext(bad),'',String(bad));
  assert.equal(safeNext('/guardian/goals?tab=1'),'/guardian/goals?tab=1');
});
