const AR_INDIC = '٠١٢٣٤٥٦٧٨٩';
const FA_INDIC = '۰۱۲۳۴۵۶۷۸۹';
export function normalizeText(input) {
return String(input ?? '')
.normalize('NFD')
.replace(/[\u0300-\u036F\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
.replace(/[٠-٩]/g, (d) => String(AR_INDIC.indexOf(d)))
.replace(/[۰-۹]/g, (d) => String(FA_INDIC.indexOf(d)))
.replace(/[أإآٱ]/g, 'ا')
.replace(/[ىیئ]/g, 'ي')
.replace(/ؤ/g, 'و')
.replace(/ة/g, 'ه')
.replace(/ک/g, 'ك')
.toLowerCase()
.replace(/([a-z])\1+/g, '$1')
.replace(/[^\p{L}\p{N}]+/gu, ' ')
.trim();
}
function stripAl(word) {
if (word.startsWith('وال') && word.length - 3 >= 3) return word.slice(3);
if (word.startsWith('ال')  && word.length - 2 >= 3) return word.slice(2);
return word;
}
function editDistance(a, b, max) {
if (a === b) return 0;
const la = a.length, lb = b.length;
if (Math.abs(la - lb) > max) return max + 1;
let prev2 = null;
let prev = Array.from({ length: lb + 1 }, (_, j) => j);
for (let i = 1; i <= la; i++) {
const cur = [i];
let rowMin = i;
for (let j = 1; j <= lb; j++) {
const cost = a[i - 1] === b[j - 1] ? 0 : 1;
let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
v = Math.min(v, prev2[j - 2] + 1);
}
cur[j] = v;
if (v < rowMin) rowMin = v;
}
if (rowMin > max) return max + 1;
prev2 = prev;
prev = cur;
}
return prev[lb];
}
const SYNONYM_GROUPS = [
['دكتور', 'طبيب', 'طبيبة', 'استشاري', 'اطباء'],
['صيدلية', 'صيدلي', 'دواء', 'ادوية'],
['اسعاف', 'طوارئ', 'مستشفى', 'عاجل'],
['كهربائي', 'كهرباء', 'كهربجي'],
['سباك', 'سباكة', 'مواسير'],
['نجار', 'نجارة'],
['حداد', 'حدادة'],
['سواق', 'سائق', 'تاكسي', 'مواصلات'],
['مسجد', 'جامع', 'امام'],
['مدرسة', 'معلم', 'مدرس', 'تعليم'],
['بقالة', 'دكان', 'متجر'],
];
const _synMap = new Map();
SYNONYM_GROUPS.forEach((group) => {
const norm = group.map((w) => stripAl(normalizeText(w)));
norm.forEach((w) => _synMap.set(w, norm.filter((x) => x !== w)));
});
export function prepareQuery(text) {
const norm = normalizeText(text);
const tokens = norm.split(' ').filter(Boolean).map((t) => {
const stripped = stripAl(t);
return {
raw: t,
stripped,
isNumber: /^\d+$/.test(t),
alts: (_synMap.get(stripped) || []).map((a) => ({ raw: a, stripped: a, isNumber: false })),
};
});
return {
isEmpty: tokens.length === 0,
norm,
tokens,
compact: tokens.map((t) => t.raw).join(''),
};
}
export function buildKey(...parts) {
return normalizeText(parts.filter((p) => p != null && p !== '').join(' '));
}
const _wordsCache = new Map();
function wordsOf(key) {
let entry = _wordsCache.get(key);
if (!entry) {
const words = key.split(' ').filter(Boolean).map((w) => ({ w, s: stripAl(w) }));
entry = { words, compact: words.map((x) => x.w).join('') };
if (_wordsCache.size > 3000) _wordsCache.clear();
_wordsCache.set(key, entry);
}
return entry;
}
function scoreWord(tok, w, s) {
const t = tok.raw;
const ts = tok.stripped;
if (t === w || t === s || ts === w || ts === s) return 4;
if (w.startsWith(ts) || s.startsWith(ts) || w.startsWith(t)) return 3;
if (t.length < 2) return 0;
if (w.includes(ts) || w.includes(t)) return 2;
if (tok.isNumber) return 0;
const minFuzzy = /[a-z]/.test(t) ? 5 : 4;
if (t.length >= minFuzzy) {
const max = t.length >= 9 ? 2 : 1;
if (editDistance(ts, s, max) <= max || editDistance(t, w, max) <= max) return 1;
if (w.length > t.length && editDistance(t, w.slice(0, t.length), 1) <= 1) return 1;
}
return 0;
}
export function scoreKey(key, pq) {
if (!pq || pq.isEmpty || !key) return 0;
const { words, compact } = wordsOf(key);
let total = 0;
let allMatched = true;
for (const tok of pq.tokens) {
let best = 0;
for (const { w, s } of words) {
let sc = scoreWord(tok, w, s);
for (const alt of tok.alts) {
const a = Math.min(scoreWord(alt, w, s), 2);
if (a > sc) sc = a;
}
if (sc > best) best = sc;
if (best === 4) break;
}
if (!best) { allMatched = false; break; }
total += best;
}
if (allMatched) return total;
if (pq.compact.length >= 3 && compact.includes(pq.compact)) return 2;
return 0;
}
export function scoreText(text, pq) {
return scoreKey(normalizeText(text), pq);
}
export function matchesKey(key, pq)   { return scoreKey(key, pq) > 0; }
export function matchesText(text, pq) { return scoreText(text, pq) > 0; }
