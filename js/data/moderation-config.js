export const EDIT_WINDOW_MS = 15 * 60 * 1000;
export const REPORT_HIDE_THRESHOLD = 3;
export const REPORT_REASONS = [
{ key: 'abusive',   label: 'مسيء أو جارح' },
{ key: 'spam',      label: 'مزعج أو دعاية' },
{ key: 'false',     label: 'معلومة خاطئة' },
{ key: 'other',     label: 'سبب آخر' },
];
export const REPORT_REASON_KEYS = REPORT_REASONS.map(r => r.key);
export function isWithinEditWindow(createdAt, now = Date.now()) {
const t = new Date(createdAt).getTime();
return Number.isFinite(t) && now - t < EDIT_WINDOW_MS;
}
export function editMinutesLeft(createdAt, now = Date.now()) {
const t = new Date(createdAt).getTime();
if (!Number.isFinite(t)) return 0;
return Math.max(0, Math.ceil((EDIT_WINDOW_MS - (now - t)) / 60000));
}
