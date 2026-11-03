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
export const BUSY_HINT = 'الخدمة مشغولة هسّع — نصّك محفوظ هنا، جرّب بعد لحظات';
