import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const code = await fs.readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '../extension/popup.js'), 'utf8');
function popupHarness({token = '', activeUrl = 'chrome://extensions', handler} = {}) {
  const nodes = {};
  const values = {url: '', pages: '5', depth: '1', token};
  for (const id of ['url','pages','depth','token','interactions','savehtml','assets','motion','archiveSource','structuralMap','ossIntelligence','toggleToken','currentTab','testConnection','scan','capture','refresh','cancel','status','details']) {
    const listeners = {};
    nodes[`#${id}`] = {value: values[id] || '', checked: false, type: id === 'token' ? 'password' : 'text', textContent: '', className: '', listeners,
      addEventListener(type, callback) {listeners[type] = callback;}};
  }
  let calls = 0;
  const tab = {url: activeUrl, id: 5, windowId: 1};
  const chrome = {
    storage: {session: {get: (_keys, callback) => callback({token, jobId: null}), set: async () => {}}},
    tabs: {query: (_opts, callback) => callback ? callback([tab]) : Promise.resolve([tab])}
  };
  const fetch = async (url, options) => { calls++; return handler(url, options); };
  const document = {querySelector: selector => {assert.ok(nodes[selector], `Unknown element ${selector}`);return nodes[selector];}};
  vm.runInNewContext(code, {document, chrome, fetch, URL, console});
  return {
    nodes, get calls() {return calls;},
    async click(id) {await nodes[`#${id}`].listeners.click();},
    input(id, value) {nodes[`#${id}`].value = value;nodes[`#${id}`].listeners.input?.();},
    status() {return nodes['#status'].textContent;}
  };
}
const reply = (status, obj) => ({ok: status < 400, status, json: async () => obj});

test('extension refuses missing token and missing URL before contacting server', async () => {
  const x = popupHarness({handler: () => {throw new Error('network should not be called');}});
  await x.click('scan');
  assert.match(x.status(), /token is empty/i);
  x.input('token', 'pasted-token');
  await x.click('scan');
  assert.match(x.status(), /Website URL is empty/i);
  x.nodes['#url'].value = 'not-a-url';
  await x.click('scan');
  assert.match(x.status(), /Invalid website URL/i);
  assert.equal(x.calls, 0);
});

test('extension reports bad or expired tokens with a clear recovery instruction', async () => {
  const x = popupHarness({token: 'stale', handler: () => reply(403, {error: 'Invalid or expired session token', code: 'AUTH_INVALID'})});
  await x.click('testConnection');
  assert.match(x.status(), /Copy the NEW token/i);
  assert.match(x.status(), /npm run server/i);
  assert.equal(x.calls, 1);
});

test('extension verifies server version then queues a valid scan', async () => {
  const x = popupHarness({token: 'correct-token', handler: (url, options) => {
    assert.equal(options.headers['x-srt-token'], 'correct-token');
    if (url.endsWith('/health')) return reply(200, {ok: true, version: '3.3.1'});
    if (url.endsWith('/scan')) {
      const payload = JSON.parse(options.body);
      assert.equal(payload.url, 'https://www.prodigygame.com/');
      assert.equal(payload.maxPages, 5);
      assert.equal(payload.maxDepth, 1);
      assert.equal(payload.structuralMap, true);
      assert.equal(payload.ossIntelligence, true);
      return reply(202, {id: '42f39a31-77c9-4eb6-9862-922fad6a0b3f', status: 'queued'});
    }
    throw Error('Unexpected endpoint');
  }});
  x.nodes['#url'].value = 'https://www.prodigygame.com/';
  x.nodes['#structuralMap'].checked = true;
  x.nodes['#ossIntelligence'].checked = true;
  await x.click('testConnection');
  assert.match(x.status(), /Token accepted/i);
  await x.click('scan');
  assert.match(x.status(), /queued/i);
  assert.equal(x.calls, 3);
});

test('extension detects old local server instead of starting scan', async () => {
  const x = popupHarness({token: 'correct-token', handler: () => reply(200, {ok: true, version: '2.1.0'})});
  x.nodes['#url'].value = 'https://www.prodigygame.com/';
  await x.click('scan');
  assert.match(x.status(), /Wrong server version/i);
  assert.equal(x.calls, 1);
});
