// Startup configuration loading + validation for the USAM_New API.
// Fails fast in production on unsafe or missing settings instead of silently degrading
// security (e.g. a missing PUBLIC_ORIGIN would make the origin check fall back to the
// Host header). Pure function over an env object so it can be unit-tested.

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

  const webhook = env.EMAIL_WEBHOOK_URL || env.RESET_WEBHOOK_URL || '';
  if (webhook) {
    try { if (new URL(webhook).protocol !== 'https:') errors.push('EMAIL_WEBHOOK_URL must use HTTPS'); }
    catch { errors.push('EMAIL_WEBHOOK_URL must be a valid URL'); }
  }

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
    email: webhook ? { url: webhook, token: env.EMAIL_WEBHOOK_TOKEN || env.RESET_WEBHOOK_TOKEN || '' } : null,
    logRequests: env.LOG_REQUESTS !== 'false',
  };
}
