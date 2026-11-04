// Email provider layer for USAM_New (verification + password recovery).
// No third-party SDKs: each adapter calls the provider's documented HTTPS API with fetch.
//
// Contract: createEmailSender(config, {db, log, fetchImpl}) returns either null (delivery
// disabled -> the API honestly answers "unavailable") or an async sender({to,verificationUrl}
// | {to,resetUrl}). The sender resolves ONLY when the provider confirmed acceptance (2xx);
// otherwise it throws. Every attempt is recorded in email_deliveries with a SHA-256 of the
// recipient (never the address, never the link).
import {createHash,randomUUID} from 'node:crypto';

export const EMAIL_PROVIDERS = ['webhook','postmark','sendgrid'];

const subject = {
  'email-verification': 'USAM Kids — أكّد بريدك الإلكتروني | Confirm your email',
  'password-reset': 'USAM Kids — إعادة تعيين كلمة المرور | Reset your password',
};

/** Bilingual (Arabic first) plain-text + HTML bodies. Links are escaped for HTML. */
export function renderEmail(template, url) {
  const escaped = String(url).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lines = template === 'password-reset'
    ? ['طلبنا إعادة تعيين كلمة المرور لحسابك في USAM Kids. الرابط صالح لمدة ١٥ دقيقة ولمرة واحدة.',
       'A password reset was requested for your USAM Kids account. The link works once and expires in 15 minutes.',
       'إذا لم تطلب ذلك، تجاهل هذه الرسالة. | If you did not request this, ignore this email.']
    : ['شكرًا لتسجيلك في USAM Kids. أكّد بريدك لتتمكن من إنشاء ملفات أطفالك. الرابط صالح ليوم واحد.',
       'Thanks for joining USAM Kids. Confirm your email to create your children\u2019s profiles. The link works once and expires in 24 hours.',
       'إذا لم تُنشئ هذا الحساب، تجاهل هذه الرسالة. | If you did not create this account, ignore this email.'];
  return {
    subject: subject[template],
    text: [lines[0], lines[1], '', url, '', lines[2]].join('\n'),
    html: `<div dir="rtl" lang="ar"><p>${lines[0]}</p></div><div dir="ltr" lang="en"><p>${lines[1]}</p></div><p><a href="${escaped}">${escaped}</a></p><p style="color:#666">${lines[2]}</p>`,
  };
}

/** Build the provider-specific HTTP request. Pure, so request shapes are unit-testable. */
export function buildRequest(provider, settings, {to, template, url}) {
  const mail = renderEmail(template, url);
  if (provider === 'webhook') {
    // Backwards-compatible contract documented in README: {to, template, verificationUrl|resetUrl}.
    const body = template === 'password-reset' ? {to, template, resetUrl: url} : {to, template, verificationUrl: url};
    return {url: settings.url, headers: {'Content-Type':'application/json', ...(settings.token ? {Authorization:'Bearer '+settings.token} : {})}, body: {...body, subject: mail.subject, text: mail.text, html: mail.html}};
  }
  if (provider === 'postmark') {
    return {url: 'https://api.postmarkapp.com/email', headers: {'Content-Type':'application/json', Accept:'application/json', 'X-Postmark-Server-Token': settings.token},
      body: {From: settings.from, To: to, Subject: mail.subject, TextBody: mail.text, HtmlBody: mail.html, MessageStream: 'outbound', Tag: template}};
  }
  if (provider === 'sendgrid') {
    return {url: 'https://api.sendgrid.com/v3/mail/send', headers: {'Content-Type':'application/json', Authorization: 'Bearer ' + settings.token},
      body: {personalizations: [{to: [{email: to}]}], from: {email: settings.from}, subject: mail.subject,
        content: [{type:'text/plain', value: mail.text}, {type:'text/html', value: mail.html}], categories: [template]}};
  }
  throw new Error('unknown_email_provider');
}

/** Validate email settings; returns a list of human-readable errors (empty = valid). */
export function validateEmailSettings(settings) {
  if (!settings) return [];
  const errors = [];
  if (!EMAIL_PROVIDERS.includes(settings.provider)) errors.push('EMAIL_PROVIDER must be one of ' + EMAIL_PROVIDERS.join(', '));
  if (settings.provider === 'webhook') {
    try { if (new URL(settings.url).protocol !== 'https:') errors.push('EMAIL_WEBHOOK_URL must use HTTPS'); } catch { errors.push('EMAIL_WEBHOOK_URL must be a valid URL'); }
  } else if (EMAIL_PROVIDERS.includes(settings.provider)) {
    if (!settings.token) errors.push('EMAIL_API_TOKEN is required for ' + settings.provider);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.from || '')) errors.push('EMAIL_FROM must be a valid sender address for ' + settings.provider);
  }
  return errors;
}

export function createEmailSender(settings, {db = null, log = () => {}, fetchImpl = fetch, retries = 2, timeoutMs = 8000, backoffMs = 400} = {}) {
  if (!settings) return null;
  const record = (row) => {
    if (!db) return;
    try {
      db.prepare('INSERT INTO email_deliveries(id,template,recipient_hash,provider,status,attempts,error,provider_message_id,created_at) VALUES(?,?,?,?,?,?,?,?,?)')
        .run(randomUUID(), row.template, createHash('sha256').update(String(row.to).toLowerCase()).digest('hex'), settings.provider, row.status, row.attempts, row.error || null, row.messageId || null, new Date().toISOString());
    } catch (e) { log({level:'error', msg:'email_delivery_log_failed', detail: e.message}); }
  };
  return async function send({to, verificationUrl, resetUrl}) {
    const template = resetUrl ? 'password-reset' : 'email-verification';
    const request = buildRequest(settings.provider, settings, {to, template, url: resetUrl || verificationUrl});
    let lastError = 'unknown', made = 0;
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      made = attempt;
      try {
        const response = await fetchImpl(request.url, {method:'POST', headers: request.headers, body: JSON.stringify(request.body), signal: AbortSignal.timeout(timeoutMs)});
        if (response.ok) {
          let messageId = null;
          try { const data = await response.json(); messageId = data?.MessageID || data?.id || null; } catch {}
          messageId = messageId || response.headers?.get?.('x-message-id') || null;
          record({to, template, status:'SENT', attempts: attempt, messageId});
          log({level:'info', msg:'email_sent', provider: settings.provider, template, attempts: attempt});
          return {provider: settings.provider, attempts: attempt, messageId};
        }
        lastError = 'http_' + response.status;
        // 4xx (except 429) is a configuration/content problem: retrying will not help.
        if (response.status < 500 && response.status !== 429) break;
      } catch (e) { lastError = e?.name === 'TimeoutError' ? 'timeout' : 'network_error'; }
      if (attempt <= retries) await new Promise(r => setTimeout(r, backoffMs * attempt));
    }
    record({to, template, status:'FAILED', attempts: made, error: lastError});
    log({level:'error', msg:'email_failed', provider: settings.provider, template, error: lastError});
    throw new Error('email_delivery_failed');
  };
}
