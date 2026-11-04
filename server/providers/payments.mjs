// Provider-neutral payments/entitlements core.
//
// Status: the product runs in FREE_ACCESS mode (all worlds, no billing). This module adds the
// server-side pieces any provider integration needs, without choosing a provider (Stripe does
// not onboard Egyptian merchants; Paymob/Fawry/etc. is a business decision pending approval):
//  - verifyPaymentWebhook(): HMAC-SHA256 over the RAW body, header `t=<unix>,v1=<hex>`,
//    5-minute replay window, constant-time compare. Unsigned/forged/stale events are rejected.
//  - subscriptions + payment_events (idempotent by provider event id) via migration v3.
//  - entitlementFor(): the single server-side source of truth for access. Never trusts the
//    browser; a frontend "payment succeeded" means nothing until a verified webhook arrives.
import {createHmac,timingSafeEqual} from 'node:crypto';

export const PLAN_IDS = ['FREE','FAMILY_MONTHLY','FAMILY_YEARLY'];
export const SUBSCRIPTION_STATUSES = ['ACTIVE','PAST_DUE','CANCELED','EXPIRED'];

export function signPaymentPayload(secret, rawBody, timestamp = Math.floor(Date.now() / 1000)) {
  return `t=${timestamp},v1=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;
}

export function verifyPaymentWebhook({secret, rawBody, signatureHeader, now = Date.now(), toleranceSeconds = 300}) {
  if (!secret) return {ok:false, reason:'payments_not_configured'};
  const parts = Object.fromEntries(String(signatureHeader || '').split(',').map(p => p.trim().split('=')).filter(p => p.length === 2));
  const timestamp = Number(parts.t);
  if (!Number.isInteger(timestamp) || !/^[a-f0-9]{64}$/.test(parts.v1 || '')) return {ok:false, reason:'invalid_signature'};
  if (Math.abs(now / 1000 - timestamp) > toleranceSeconds) return {ok:false, reason:'stale_signature'};
  const expected = Buffer.from(createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex'), 'hex');
  const given = Buffer.from(parts.v1, 'hex');
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return {ok:false, reason:'invalid_signature'};
  return {ok:true};
}

/** Validate a verified webhook event's business payload. Returns null when valid. */
export function invalidPaymentEvent(event) {
  if (!event || typeof event.id !== 'string' || event.id.length < 3 || event.id.length > 200) return 'invalid_event_id';
  if (!['subscription.updated','subscription.canceled'].includes(event.type)) return 'unsupported_event_type';
  const d = event.data || {};
  if (typeof d.guardianId !== 'string' || typeof d.subscriptionRef !== 'string' || d.subscriptionRef.length > 200) return 'invalid_event_data';
  if (!PLAN_IDS.includes(d.plan) || d.plan === 'FREE') return 'invalid_plan';
  if (event.type === 'subscription.updated' && (!SUBSCRIPTION_STATUSES.includes(d.status) || Number.isNaN(Date.parse(d.currentPeriodEnd || '')))) return 'invalid_event_data';
  return null;
}

/** Server-side access decision for a guardian (and therefore their children). */
export function entitlementFor(db, guardianId, {billingEnabled = false, now = new Date()} = {}) {
  const sub = guardianId ? db.prepare("SELECT plan,status,current_period_end AS currentPeriodEnd FROM subscriptions WHERE guardian_id=? ORDER BY updated_at DESC LIMIT 1").get(guardianId) : null;
  const paidActive = !!sub && sub.status === 'ACTIVE' && new Date(sub.currentPeriodEnd) > now;
  if (!billingEnabled) return {mode:'FREE_ACCESS', billingEnabled:false, plan: paidActive ? sub.plan : 'FREE', access:'ALL_WORLDS', subscription: sub || null};
  return {mode:'PAID_PLANS', billingEnabled:true, plan: paidActive ? sub.plan : 'FREE', access: paidActive ? 'ALL_WORLDS' : 'FREE_TIER', subscription: sub || null};
}
