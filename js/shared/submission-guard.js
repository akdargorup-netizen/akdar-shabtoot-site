const COOLDOWN_PREFIX = 'submission_cooldown:';
export class SubmissionGuardError extends Error {}
export function enforceMaxLength(fields) {
for (const key in fields) {
const { value, max, label } = fields[key];
if (typeof value === 'string' && value.length > max) {
throw new SubmissionGuardError(`${label} طويل زيادة (الحد الأقصى ${max} حرف)`);
}
}
}
export function enforceCooldown(actionKey, cooldownMs = 4000) {
const storageKey = COOLDOWN_PREFIX + actionKey;
let last = 0;
try {
last = Number(localStorage.getItem(storageKey) || 0);
} catch {
return;
}
const now = Date.now();
if (now - last < cooldownMs) {
throw new SubmissionGuardError('على مهلك شوية — استنى ثواني وجرب تاني');
}
try {
localStorage.setItem(storageKey, String(now));
} catch {
}
}
export const SUBMISSION_LIMITS = { ideas: 2, occasions: 2 };
export const IDEA_COMMENTS_PER_USER = 3;
export function ideaCommentLimitMessage() {
const n = IDEA_COMMENTS_PER_USER;
const what = n === 1 ? 'تعليق واحد' : n === 2 ? 'تعليقين' : `${n} تعليقات`;
return `وصلت للحد على هذه الفكرة (${what} للشخص الواحد). تقدر تعلّق على أفكار تانية`;
}
const _LIMIT_LABELS = { ideas: 'أفكار', occasions: 'مناسبات' };
export function dailyLimitMessage(kind) {
const n = SUBMISSION_LIMITS[kind];
const what = kind === 'ideas'
? (n === 1 ? 'فكرة واحدة' : n === 2 ? 'فكرتين' : `${n} أفكار`)
: (n === 1 ? 'مناسبة واحدة' : n === 2 ? 'مناسبتين' : `${n} مناسبات`);
return `وصلت للحد اليومي (${what} في اليوم). تقدر تنشر ${_LIMIT_LABELS[kind]} تانية بكرة بإذن الله`;
}
const _KEYBOARD_ROWS = [
'ضصثقفغعهخحجد',
'شسيبلاتنمكط',
'ئءؤرلاىةوزظ',
'qwertyuiop',
'asdfghjkl',
'zxcvbnm',
];
const _KEY_RUN = 5;
function _hasKeyboardRun(letters) {
const s = [...letters.toLowerCase()];
for (const row of _KEYBOARD_ROWS) {
const idx = s.map(c => row.indexOf(c));
for (const dir of [1, -1]) {
let strict = 1, loose = 1;
for (let i = 1; i < s.length; i++) {
const valid = idx[i] >= 0 && idx[i - 1] >= 0;
const step = (idx[i] - idx[i - 1]) * dir;
strict = valid && step === 1 ? strict + 1 : 1;
loose  = valid && (step === 1 || step === 2) ? loose + 1 : 1;
if (strict >= _KEY_RUN || loose >= 8) return true;
}
}
}
return false;
}
export function readabilityProblem(value, { minLetters = 3 } = {}) {
const text = String(value || '')
.replace(/[\u0640\u064B-\u0652]/g, '')
.trim();
if (!text) return '';
const letters = text.match(/[\u0621-\u064A\u0671-\u06D3a-zA-Z]/g) || [];
const nonSpace = text.replace(/\s/g, '');
if (letters.length < minLetters) return 'قصير زيادة';
if (letters.length / nonSpace.length < 0.6) return 'في رموز أو أرقام أكتر من الكلام';
if (/(.)\1{3,}/u.test(text.replace(/\s/g, ''))) return 'في حروف متكررة';
if (letters.length >= 10 && new Set(letters.map(c => c.toLowerCase())).size <= 3) {
return 'الحروف متكررة بشكل غير طبيعي';
}
const tokens = text.split(/\s+/).filter(Boolean);
if (tokens.length >= 4) {
const counts = new Map();
tokens.forEach(t => counts.set(t, (counts.get(t) || 0) + 1));
if (Math.max(...counts.values()) / tokens.length > 0.6) return 'الكلمة نفسها متكررة';
}
for (const t of tokens) {
const tl = (t.match(/[\u0621-\u064A\u0671-\u06D3a-zA-Z]/g) || []).join('');
if (tl.length >= _KEY_RUN && _hasKeyboardRun(tl)) return 'شكله ضغط عشوائي على الكيبورد';
if (/^[a-zA-Z]{5,}$/.test(tl) && (!/[aeiouyAEIOUY]/.test(tl) || /[^aeiouyAEIOUY]{6,}/.test(tl))) {
return 'شكله كلام غير مفهوم';
}
}
return '';
}
export function enforceReadable(fields) {
for (const key in fields) {
const { value, label, minLetters } = fields[key];
const v = typeof value === 'string' ? value.trim() : '';
if (!v) continue;
const problem = readabilityProblem(v, { minLetters });
if (problem) {
throw new SubmissionGuardError(`${label}: ${problem}. اكتب بكلام مفهوم لو سمحت`);
}
}
}
