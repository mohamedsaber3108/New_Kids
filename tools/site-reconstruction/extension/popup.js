'use strict';
const $ = selector => document.querySelector(selector);
const API = 'http://127.0.0.1:4319';
let jobId = null;
let tokenEdited = false;

function status(message, kind = '') {
  const node = $('#status');
  node.textContent = message;
  node.className = kind;
}
function errorMessage(error) {
  if (error?.code === 'AUTH_INVALID' || /invalid token/i.test(error?.message || '')) {
    return 'Invalid or expired session token. Copy the NEW token from the PowerShell window running npm run server, paste it into this extension, then click Test Connection. Restarting the server changes the token.';
  }
  if (error?.code === 'ORIGIN_BLOCKED') return 'Connection blocked: reload the v3 extension from chrome://extensions (use the v3/extension folder).';
  if (/failed to fetch|networkerror|fetch failed/i.test(error?.message || '')) {
    return 'Cannot reach the local server at 127.0.0.1:4319. Start npm run server and leave its PowerShell window open. Also make sure Chrome has loaded the v3 extension.';
  }
  return error?.message || 'Unexpected extension error';
}
function token() { return $('#token').value.trim(); }
function requireToken() {
  if (!token()) throw new Error('Session token is empty. Paste the token printed by npm run server, then click Test Connection.');
}
function validateScan() {
  requireToken();
  const input = $('#url').value.trim();
  if (!input) throw new Error('Website URL is empty. Paste https://www.prodigygame.com/ or use the current website tab.');
  let url;
  try { url = new URL(input); } catch { throw new Error('Invalid website URL. Enter a complete HTTPS URL, e.g. https://www.prodigygame.com/'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Website URL must be a complete HTTP(S) URL without credentials.');
  const pages = Number($('#pages').value), depth = Number($('#depth').value);
  if (!Number.isInteger(pages) || pages < 1 || pages > 200) throw new Error('Maximum pages must be between 1 and 200.');
  if (!Number.isInteger(depth) || depth < 0 || depth > 8) throw new Error('Maximum depth must be between 0 and 8.');
  return {url: url.href, maxPages: pages, maxDepth: depth,
    interactions: $('#interactions').checked, saveHTML: $('#savehtml').checked,
    downloadAssets: $('#assets').checked, motion: $('#motion').checked,
    archivePublicSource: $('#archiveSource').checked,structuralMap: $('#structuralMap').checked,ossIntelligence: $('#ossIntelligence').checked};
}
async function api(endpoint, options = {}) {
  requireToken();
  let response;
  try {
    response = await fetch(`${API}${endpoint}`, {
      ...options,
      headers: {'content-type': 'application/json', 'x-srt-token': token(), ...(options.headers || {})}
    });
  } catch (error) {
    throw new Error(`Cannot connect to local server: ${error.message}`);
  }
  let result;
  try { result = await response.json(); }
  catch { throw new Error(`Local server returned an unexpected response (HTTP ${response.status}). Verify the server belongs to v3.`); }
  if (!response.ok) {
    const error = new Error(result.error || `HTTP ${response.status}`);
    error.code = result.code;
    throw error;
  }
  return result;
}
function display(result) {
  $('#details').textContent = JSON.stringify(result, null, 2);
  status(`Job: ${result.status || 'completed'}${result.id ? ` • ${result.id.slice(0, 8)}` : ''}`, 'ok');
}
async function checkConnection() {
  const health = await api('/health');
  if (!health?.ok || !/^3\.3\./.test(String(health.version))) {
    throw new Error(`Wrong server version (${health?.version || 'unknown'}). Stop old SRT servers and run npm run server from the v3.3.1 project.`);
  }
  await chrome.storage.session.set({token: token()});
  status(`Connected to SRT v${health.version}. Token accepted. Ready to scan.`, 'ok');
  return health;
}
async function run(action) {
  try { await action(); }
  catch (error) { status(errorMessage(error), 'error'); }
}

// The callback can arrive after a user types; never overwrite a freshly pasted token.
chrome.storage.session.get(['jobId', 'token'], data => {
  jobId = data?.jobId || null;
  if (!tokenEdited && data?.token) {
    $('#token').value = data.token;
    status('Saved token loaded. If the server was restarted, replace it with the NEW token and test again.');
  }
});
chrome.tabs.query({active: true, currentWindow: true}, tabs => {
  try {
    const url = new URL(tabs?.[0]?.url);
    if (['http:', 'https:'].includes(url.protocol) && !$('#url').value.trim()) $('#url').value = url.href;
  } catch { /* No suitable active website. */ }
});
$('#token').addEventListener('input', () => {
  tokenEdited = true;
  chrome.storage.session.set({token: token()});
  status('Token updated. Click Test Connection to confirm it matches the running server.');
});
$('#toggleToken').addEventListener('click', () => {
  const show = $('#token').type === 'password';
  $('#token').type = show ? 'text' : 'password';
  $('#toggleToken').textContent = show ? 'Hide' : 'Show';
});
$('#currentTab').addEventListener('click', () => run(async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.url || !/^https?:\/\//i.test(tab.url)) throw new Error('Open a normal website tab (not chrome://extensions) and try again.');
  $('#url').value = tab.url;
  status('Website URL filled from the active tab.');
}));
$('#testConnection').addEventListener('click', () => run(checkConnection));
$('#scan').addEventListener('click', () => run(async () => {
  const payload = validateScan();
  await checkConnection();
  status('Connection verified. Submitting scan…');
  const job = await api('/scan', {method: 'POST', body: JSON.stringify(payload)});
  jobId = job.id;
  await chrome.storage.session.set({jobId, token: token()});
  display(job);
}));
$('#refresh').addEventListener('click', () => run(async () => {
  if (!jobId) throw new Error('No scan job selected yet. Start a website scan first.');
  display(await api(`/jobs/${jobId}`));
}));
$('#cancel').addEventListener('click', () => run(async () => {
  if (!jobId) throw new Error('No scan job selected yet.');
  display(await api(`/jobs/${jobId}/cancel`, {method: 'POST'}));
}));
$('#capture').addEventListener('click', () => run(async () => {
  await checkConnection();
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.id || !/^https?:\/\//i.test(tab.url || '')) throw new Error('Open a normal website tab before using Capture Current Tab.');
  const results = await chrome.scripting.executeScript({target: {tabId: tab.id}, func: () => {
    const sample = [...document.querySelectorAll('header,nav,main,section,article,aside,footer,button,a,input,img,[role]')].slice(0, 450).map(el => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return {tag: el.tagName.toLowerCase(), role: el.getAttribute('role'), text: (el.innerText || '').trim().slice(0, 150), href: el.tagName === 'A' ? el.href : null, src: el.tagName === 'IMG' ? (el.currentSrc || el.src) : null, ariaExpanded: el.getAttribute('aria-expanded'), rect: {x: r.x, y: r.y, w: r.width, h: r.height}, style: {color: s.color, background: s.backgroundColor, font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, display: s.display, padding: s.padding, margin: s.margin, borderRadius: s.borderRadius}};
    });
    return {title: document.title, lang: document.documentElement.lang, dimensions: {w: innerWidth, h: innerHeight}, capturedAt: new Date().toISOString(), headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].slice(0, 120).map(h => ({tag: h.tagName.toLowerCase(), text: (h.innerText || '').slice(0, 200)})), sections: [...document.querySelectorAll('main,section,article,[role=region]')].slice(0, 80).map(s => ({tag: s.tagName.toLowerCase(), label: s.getAttribute('aria-label') || s.querySelector('h1,h2,h3')?.innerText || '', text: (s.innerText || '').slice(0, 500)})), sample};
  }});
  const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {format: 'png'});
  display(await api('/capture', {method: 'POST', body: JSON.stringify({url: tab.url, snapshot: results[0].result, screenshot})}));
}));
