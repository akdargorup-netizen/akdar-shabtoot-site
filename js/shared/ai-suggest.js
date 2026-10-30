import { cachedQuestions } from './ai-answer-cache.js';
const norm = (s) => String(s || '')
.replace(/[\u064B-\u0652\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
.replace(/[^\u0621-\u064A\s]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['في', 'من', 'على', 'الي', 'عن', 'شنو', 'منو', 'كان', 'كانت', 'ده', 'دي', 'هذا', 'ما', 'لو', 'بعد', 'قبل', 'شبتوت', 'بحري', 'كم', 'وين', 'كيف']);
const words = (s) => norm(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w));
export async function pickSuggestions({ exclude = [], seed = '', n = 2 } = {}) {
const asked = new Set(exclude.map(norm));
const seen = new Set();
const cands = cachedQuestions().filter((q) => {
const k = norm(q);
if (!k || asked.has(k) || seen.has(k)) return false;
seen.add(k);
return true;
});
if (!cands.length) return [];
const sw = new Set(words(seed));
const scored = cands.map((q, i) => ({
q,
s: (sw.size ? words(q).filter((w) => sw.has(w)).length : 0) - i * 0.01,
}));
scored.sort((a, b) => b.s - a.s);
return scored.slice(0, n).map((x) => x.q);
}
