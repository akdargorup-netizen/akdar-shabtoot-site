const KEY = 'akdar-ai-answers-v1';
const MAX_ENTRIES = 24;
const TTL_MS = 3 * 24 * 60 * 60 * 1000;
const norm = (s) => String(s || '')
.replace(/[\u064B-\u0652\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
.replace(/[^\u0621-\u064A0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
function fingerprint(items) {
const s = (items || []).map((i) => `${i.type}\u0001${i.title}\u0001${i.text}`).join('\u0003');
let h = 5381;
for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
return String(h >>> 0);
}
function readAll() {
try {
const a = JSON.parse(localStorage.getItem(KEY) || '[]');
return Array.isArray(a) ? a : [];
} catch { return []; }
}
function writeAll(list) {
try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {   }
}
const fresh = (e) => e && typeof e.q === 'string' && Date.now() - (e.t || 0) < TTL_MS;
export function getCachedAnswer(question, items) {
const n = norm(question);
if (!n) return null;
const f = fingerprint(items);
const hit = readAll().find((e) => fresh(e) && e.n === n && e.f === f);
return hit ? { answer: hit.a, sources: Array.isArray(hit.s) ? hit.s : [] } : null;
}
export function putCachedAnswer(question, items, answer, sources) {
const n = norm(question);
if (!n || !answer || !Array.isArray(sources) || !sources.length) return;
const f = fingerprint(items);
const list = readAll().filter((e) => fresh(e) && !(e.n === n && e.f === f));
list.unshift({ q: String(question).trim(), n, f, a: answer, s: sources, t: Date.now() });
writeAll(list.slice(0, MAX_ENTRIES));
}
export function cachedQuestions() {
return readAll().filter(fresh).map((e) => e.q);
}
