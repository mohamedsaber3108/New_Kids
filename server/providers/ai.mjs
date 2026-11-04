// Live-AI provider layer for companion guidance (/api/assist).
//
// Safety contract (child users):
//  - OFF unless the operator configured a provider + key AND the guardian opted in
//    (learner_controls.live_ai_allowed). Otherwise the rule-based engine answers, and the
//    response says mode:'GUIDED_RULES' — rules are never presented as AI.
//  - Input with private information is never sent to a third party.
//  - Output is length-capped and screened for private information before the child sees it.
//  - Timeout + per-learner daily cap + fallback to rules on any provider failure.
//  - ai_usage records provider/status/tokens/latency, never the child's message text.
// Adapters use documented HTTPS APIs via fetch (no SDK): OpenAI-compatible chat completions
// and Anthropic Messages.
import {randomUUID} from 'node:crypto';

export const AI_PROVIDERS = ['openai','anthropic'];

export function systemPrompt({companion, ageBand, missionTitle}) {
  return [
    `You are ${companion}, a friendly learning companion in USAM Kids, an Arabic-first learning app for children aged ${ageBand}.`,
    'Rules you must always follow:',
    '- Reply in the same language as the child (Arabic or English), in at most 3 short sentences suitable for their age.',
    '- Guide with questions and hints; never give full answers to graded mission questions.',
    '- Never ask for or repeat personal information (names, phone numbers, emails, addresses, school, photos, passwords).',
    '- Never suggest secrecy from parents, meeting anyone, leaving the app, or contacting strangers.',
    '- If the child seems upset, unsafe, or mentions harm, kindly tell them to talk to a trusted adult now.',
    '- Stay on learning topics; politely decline anything else.',
    missionTitle ? `The child is working on the mission: "${missionTitle}".` : '',
  ].filter(Boolean).join('\n');
}

export function buildAIRequest(settings, {system, message}) {
  if (settings.provider === 'openai') {
    return {url: (settings.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '') + '/chat/completions',
      headers: {'Content-Type':'application/json', Authorization: 'Bearer ' + settings.key},
      body: {model: settings.model, max_tokens: settings.maxTokens, temperature: 0.4, messages: [{role:'system', content: system}, {role:'user', content: message}]}};
  }
  if (settings.provider === 'anthropic') {
    return {url: (settings.baseUrl || 'https://api.anthropic.com').replace(/\/$/, '') + '/v1/messages',
      headers: {'Content-Type':'application/json', 'x-api-key': settings.key, 'anthropic-version': '2023-06-01'},
      body: {model: settings.model, max_tokens: settings.maxTokens, system, messages: [{role:'user', content: message}]}};
  }
  throw new Error('unknown_ai_provider');
}

export function parseAIResponse(provider, data) {
  if (provider === 'openai') return {text: data?.choices?.[0]?.message?.content ?? '', inputTokens: data?.usage?.prompt_tokens || 0, outputTokens: data?.usage?.completion_tokens || 0};
  if (provider === 'anthropic') return {text: (data?.content || []).filter(p => p.type === 'text').map(p => p.text).join(''), inputTokens: data?.usage?.input_tokens || 0, outputTokens: data?.usage?.output_tokens || 0};
  return {text: '', inputTokens: 0, outputTokens: 0};
}

export function validateAISettings(settings) {
  if (!settings) return [];
  const errors = [];
  if (!AI_PROVIDERS.includes(settings.provider)) errors.push('AI_PROVIDER must be one of ' + AI_PROVIDERS.join(', '));
  if (!settings.key) errors.push('AI_API_KEY is required when AI_PROVIDER is set');
  if (!settings.model) errors.push('AI_MODEL is required when AI_PROVIDER is set');
  if (settings.baseUrl) { try { if (new URL(settings.baseUrl).protocol !== 'https:') errors.push('AI_BASE_URL must use HTTPS'); } catch { errors.push('AI_BASE_URL must be a valid URL'); } }
  if (!(settings.dailyLimit >= 1 && settings.dailyLimit <= 500)) errors.push('AI_DAILY_LIMIT_PER_LEARNER must be between 1 and 500');
  return errors;
}

/**
 * createAIGuide(settings, deps) -> null when not configured, else
 * async guide({learnerId, message, companion, ageBand, missionTitle}) ->
 *   {ok:true, reply, model} | {ok:false, reason:'limit'|'blocked_input'|'blocked_output'|'error'}
 * The caller (app.mjs) falls back to rule-based guidance for every ok:false result.
 */
export function createAIGuide(settings, {db, privateInfo, log = () => {}, fetchImpl = fetch} = {}) {
  if (!settings) return null;
  const usage = (learnerId, status, extra = {}) => {
    try { db.prepare('INSERT INTO ai_usage(id,learner_id,provider,model,status,input_tokens,output_tokens,latency_ms,created_at) VALUES(?,?,?,?,?,?,?,?,?)')
      .run(randomUUID(), learnerId, settings.provider, settings.model, status, extra.inputTokens || 0, extra.outputTokens || 0, extra.latencyMs || 0, new Date().toISOString()); }
    catch (e) { log({level:'error', msg:'ai_usage_log_failed', detail: e.message}); }
  };
  return async function guide({learnerId, message, companion, ageBand, missionTitle, signal}) {
    if (signal?.aborted) return {ok:false, reason:'aborted'};
    const since = new Date(Date.now() - 86400000).toISOString();
    const used = db.prepare("SELECT count(*) AS n FROM ai_usage WHERE learner_id=? AND created_at>=? AND status IN ('OK','BLOCKED_OUTPUT','ERROR')").get(learnerId, since).n;
    if (used >= settings.dailyLimit) { usage(learnerId, 'LIMITED'); return {ok:false, reason:'limit'}; }
    if (privateInfo.test(message)) { usage(learnerId, 'BLOCKED_INPUT'); return {ok:false, reason:'blocked_input'}; }
    const request = buildAIRequest(settings, {system: systemPrompt({companion, ageBand, missionTitle}), message});
    const started = Date.now();
    try {
      // Timeout OR guardian revocation (signal) cancels the provider request mid-flight.
      const cancel = signal ? AbortSignal.any([AbortSignal.timeout(settings.timeoutMs), signal]) : AbortSignal.timeout(settings.timeoutMs);
      const response = await fetchImpl(request.url, {method:'POST', headers: request.headers, body: JSON.stringify(request.body), signal: cancel});
      if (signal?.aborted) { usage(learnerId, 'ERROR', {latencyMs: Date.now() - started}); return {ok:false, reason:'aborted'}; }
      if (!response.ok) { usage(learnerId, 'ERROR', {latencyMs: Date.now() - started}); log({level:'warn', msg:'ai_provider_error', provider: settings.provider, status: response.status}); return {ok:false, reason:'error'}; }
      const parsed = parseAIResponse(settings.provider, await response.json());
      const reply = String(parsed.text || '').trim().slice(0, settings.maxReplyChars);
      const meta = {inputTokens: parsed.inputTokens, outputTokens: parsed.outputTokens, latencyMs: Date.now() - started};
      if (!reply || privateInfo.test(reply) || /https?:\/\//i.test(reply)) { usage(learnerId, 'BLOCKED_OUTPUT', meta); return {ok:false, reason:'blocked_output'}; }
      usage(learnerId, 'OK', meta);
      return {ok:true, reply, model: settings.model};
    } catch (e) {
      usage(learnerId, 'ERROR', {latencyMs: Date.now() - started});
      if (signal?.aborted) return {ok:false, reason:'aborted'};
      log({level:'warn', msg:'ai_provider_unreachable', provider: settings.provider, error: e?.name === 'TimeoutError' ? 'timeout' : 'network_error'});
      return {ok:false, reason:'error'};
    }
  };
}
