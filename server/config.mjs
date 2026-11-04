// Startup configuration loading + validation for the USAM_New API.
// Fails fast in production on unsafe or missing settings instead of silently degrading
// security (e.g. a missing PUBLIC_ORIGIN would make the origin check fall back to the
// Host header). Pure function over an env object so it can be unit-tested.

import {validateEmailSettings} from './providers/email.mjs';
import {validateAISettings} from './providers/ai.mjs';

const MIN_PASSWORD = 12;

export function loadConfig(env = process.env) {
  const errors = [];
  const production = env.NODE_ENV === 'production';
  const port = Number(env.PORT || 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('PORT must be an integer between 1 and 65535');

  const publicOrigin = (env.PUBLIC_ORIGIN || '').replace(/\/$/, '');
  if (publicOrigin) {
    let parsed;
    try { parsed = new URL(publicOrigin); } catch { errors.push('PUBLIC_ORIGIN must be a valid URL'); }
    if (parsed && parsed.origin !== publicOrigin) errors.push('PUBLIC_ORIGIN must be an origin only (scheme://host[:port]) with no path');
    if (parsed && production && parsed.protocol !== 'https:') errors.push('PUBLIC_ORIGIN must use https in production');
  } else if (production) {
    errors.push('PUBLIC_ORIGIN is required in production');
  }

  const seed = (prefix) => {
    const email = env[prefix + '_EMAIL'], password = env[prefix + '_PASSWORD'];
    if (!email && !password) return null;
    if (!email || !password) { errors.push(prefix + '_EMAIL and ' + prefix + '_PASSWORD must be set together'); return null; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push(prefix + '_EMAIL must be a valid email');
    if (password.length < MIN_PASSWORD) errors.push(prefix + '_PASSWORD must be at least ' + MIN_PASSWORD + ' characters');
    return { email, password };
  };
  const admin = seed('ADMIN');
  const moderator = seed('MODERATOR');

  // Email: explicit EMAIL_PROVIDER (webhook|postmark|sendgrid), or legacy webhook URL alone.
  const webhook = env.EMAIL_WEBHOOK_URL || env.RESET_WEBHOOK_URL || '';
  const emailProvider = env.EMAIL_PROVIDER || (webhook ? 'webhook' : '');
  const email = emailProvider ? {
    provider: emailProvider,
    url: webhook,
    token: emailProvider === 'webhook' ? (env.EMAIL_WEBHOOK_TOKEN || env.RESET_WEBHOOK_TOKEN || '') : (env.EMAIL_API_TOKEN || ''),
    from: env.EMAIL_FROM || '',
  } : null;
  errors.push(...validateEmailSettings(email));

  // Live AI (optional, guardian opt-in per child is still required at runtime).
  const ai = env.AI_PROVIDER ? {
    provider: env.AI_PROVIDER, key: env.AI_API_KEY || '', model: env.AI_MODEL || '', baseUrl: env.AI_BASE_URL || '',
    dailyLimit: Number(env.AI_DAILY_LIMIT_PER_LEARNER || 30), timeoutMs: Number(env.AI_TIMEOUT_MS || 8000),
    maxTokens: 200, maxReplyChars: 600,
  } : null;
  errors.push(...validateAISettings(ai));
  if (ai && !(ai.timeoutMs >= 1000 && ai.timeoutMs <= 30000)) errors.push('AI_TIMEOUT_MS must be between 1000 and 30000');

  // Payments (provider-neutral signed webhooks). Billing stays disabled until approved.
  const payments = env.PAYMENT_WEBHOOK_SECRET ? {provider: env.PAYMENT_PROVIDER || 'generic', webhookSecret: env.PAYMENT_WEBHOOK_SECRET} : null;
  if (payments && payments.webhookSecret.length < 32) errors.push('PAYMENT_WEBHOOK_SECRET must be at least 32 characters');

  return {
    errors,
    production,
    port,
    database: env.DB_FILE || '/data/kids.db',
    publicOrigin,
    secureCookies: production,
    guardianConsentRequired: env.REQUIRE_GUARDIAN_CONSENT === 'true',
    admin,
    moderator,
    email,
    ai,
    payments,
    logRequests: env.LOG_REQUESTS !== 'false',
  };
}
