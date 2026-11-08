import { SubmissionGuardError } from './submission-guard.js';
export function isTransientFailure(err) {
if (!err) return false;
if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
const code = String(err.code || '');
const msg = String(err.message || '');
const st = Number(err.status || 0);
if (['timeout', 'offline', 'rate-limited', '429', '402'].includes(code)) return true;
if (/^5\d\d$/.test(code) || (st >= 500 && st <= 599) || st === 429 || st === 402) return true;
return /timeout|failed to fetch|network ?error|load failed|too many requests|rate.?limit|quota/i.test(msg);
}
export function isDefinitiveFailure(err) {
if (!err) return false;
if (err instanceof SubmissionGuardError) return true;
const code = String(err.code || '');
return code === '23503' || code === '23505';
}
export function shouldQueue(err) {
return isTransientFailure(err) || !isDefinitiveFailure(err);
}
const LAST_ERR_KEY = 'akdar_last_send_error_v1';
export function recordSendError(err, kind = '') {
try {
if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
if (String(err?.code || '') === 'offline') return;
const raw = err?.code || (err?.status ? String(err.status) : `${err?.name || ''}-${err?.message || ''}`);
const code = String(raw).replace(/[^\w/-]/g, '').slice(0, 40) || 'unknown';
localStorage.setItem(LAST_ERR_KEY, JSON.stringify({ code, kind, at: Date.now() }));
} catch {   }
}
export const BUSY_HINT = 'الخدمة مشغولة هسّع — نصّك محفوظ هنا، جرّب بعد لحظات';
