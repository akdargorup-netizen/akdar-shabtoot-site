import { QURAN_SURAHS } from '../data/quran-index.js';
const KEY = 'sbb:quran-last-read';
const WAQF_ONLY = /^[\u06D6-\u06DC\u06DE\u06E9]+$/;
export function getLastRead() {
try {
const raw = localStorage.getItem(KEY);
if (!raw) return null;
const v = JSON.parse(raw);
const surah = QURAN_SURAHS.find((x) => x.index === v.s);
if (!surah) return null;
const ayah = Math.min(Math.max(1, Number(v.a) | 0), surah.ayahCount);
return { surah: surah.index, ayah, done: !!v.done, t: Number(v.t) || 0 };
} catch (_) {
return null;
}
}
export function saveLastRead(surahIndex, ayah, done = false) {
try {
localStorage.setItem(KEY, JSON.stringify({ s: surahIndex, a: ayah, done: !!done, t: Date.now() }));
} catch (_) {   }
}
export function getResumeTarget() {
const last = getLastRead();
if (!last) return null;
const surah = QURAN_SURAHS.find((x) => x.index === last.surah);
if (!surah) return null;
if (!last.done) return { surah, ayah: last.ayah, afterFinished: null };
const next = QURAN_SURAHS.find((x) => x.index === surah.index + 1);
if (!next) return null;
return { surah: next, ayah: 1, afterFinished: surah.name };
}
export function ayahPreview(surah, ayah, maxWords = 6) {
const raw = surah.ayahs[ayah - 1];
if (!raw) return '';
let tokens = raw.split(' ');
if (ayah === 1 && surah.index !== 1 && surah.index !== 9) tokens = tokens.slice(4);
const out = [];
let words = 0;
for (const t of tokens) {
if (!t) continue;
const isMark = WAQF_ONLY.test(t);
if (!isMark && words === maxWords) return `${out.join(' ')} …`;
out.push(t);
if (!isMark) words += 1;
}
return out.join(' ');
}
