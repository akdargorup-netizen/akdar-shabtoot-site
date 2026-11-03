import { loadAiPool } from './ai-sources.js';
import { prepareQuery, normalizeText } from './arabic-search.js';
import { getCachedAnswer, putCachedAnswer } from './ai-answer-cache.js';
const ENDPOINT = 'https://rtgrkugcokqxseedzunr.supabase.co/functions/v1/ask';
let _warmed = false;
export function warmAskFunction() {
if (_warmed) return;
const conn = navigator.connection;
if (conn && conn.saveData) return;
_warmed = true;
fetch(ENDPOINT, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ mode: 'warm' }),
keepalive: true,
}).catch(() => {});
}
const MAX_ARTICLES_FOR_AI = 4;
const MAX_INDEX = 180;
const MIN_PER_SOURCE = 12;
const MIN_ARTICLE_SCORE = 2.5;
const REL_FLOOR = 0.6;
const PARAS_PER_ARTICLE = 2;
const TEXT_PER_ARTICLE = 950;
const STOP = new Set([
'ما', 'ماذا', 'من', 'متي', 'اين', 'وين', 'كيف', 'ليش', 'لماذا', 'هل', 'ايش', 'شنو', 'مين', 'متى',
'في', 'علي', 'عن', 'الي', 'الى', 'مع', 'هو', 'هي', 'هذا', 'هذه', 'ده', 'دي', 'دا', 'ذلك', 'التي', 'الذي',
'كان', 'كانت', 'يكون', 'فيه', 'عندكم', 'عندنا', 'لو', 'ممكن', 'عايز', 'اريد', 'ابغي', 'اعرف', 'قول', 'قولي',
'لي', 'لنا', 'بتاع', 'بتاعت', 'تاع', 'كل', 'شي', 'شيء', 'بلد', 'البلد', 'قريه', 'القريه', 'شبتوت', 'بحري',
'اقول', 'نقول', 'يقال', 'تقال', 'نوبيه', 'النوبيه', 'بالنوبيه', 'انداندي', 'بالانداندي', 'ترجم', 'ترجمه',
].map(normalizeText));
function keywords(question) {
const pq = prepareQuery(question);
const seen = new Set();
return pq.tokens
.map((t) => t.stripped)
.filter((w) => w.length >= 2 && !STOP.has(w) && !seen.has(w) && seen.add(w))
.slice(0, 5);
}
const _normCache = new Map();
function normalized(a) {
const paras = a.paras || [];
const key = `${a.type}|${a.id}`;
const len = paras.reduce((n, p) => n + p.length, 0);
const hit = _normCache.get(key);
if (hit && hit.len === len) return hit;
const rec = { len, title: normalizeText(a.title || ''), paras, norm: paras.map(normalizeText) };
_normCache.set(key, rec);
return rec;
}
function wordWeights(pool, words) {
const N = Math.max(pool.length, 1);
const w = {};
words.forEach((word) => {
const df = pool.reduce((n, a) => {
const r = normalized(a);
return n + (r.title.includes(word) || r.norm.some((p) => p.includes(word)) ? 1 : 0);
}, 0);
w[word] = df ? Math.log(1 + N / df) : 0;
});
return w;
}
function scoreArticle(a, words, weight, boost = 0) {
const rec = normalized(a);
let titleScore = 0;
words.forEach((w) => { if (rec.title.includes(w)) titleScore += 3 * weight[w]; });
const scores = rec.norm.map((p) => words.reduce((n, w) => n + (p.includes(w) ? weight[w] : 0), 0));
const sorted = [...scores].sort((x, y) => y - x);
let total = titleScore + (sorted[0] || 0) + 0.5 * (sorted[1] || 0);
if (boost && total > 0 && String(a.type).startsWith('nubian')) total += boost;
return { total, scores, rec };
}
function buildArticleItem(a, scored) {
const { scores, rec } = scored;
const idx = a.keepAll
? rec.paras.map((_, i) => i).slice(0, a.maxParas || PARAS_PER_ARTICLE)
: scores
.map((s, i) => ({ s, i }))
.sort((x, y) => y.s - x.s || x.i - y.i)
.slice(0, a.maxParas || PARAS_PER_ARTICLE)
.filter((x, k) => k === 0 || x.s > 0)
.map((x) => x.i)
.sort((x, y) => x - y);
let text = idx.map((i) => rec.paras[i]).join(' ');
if (text.length > TEXT_PER_ARTICLE) text = text.slice(0, TEXT_PER_ARTICLE);
if (a.date) text = `(بتاريخ ${a.date}) ${text}`;
if (a.source) text = `(المصدر: ${a.source}) ${text}`;
return { type: a.label || 'تاريخ', title: a.title, text };
}
async function loadPool() {
return loadAiPool();
}
function buildIndex(pool, words, boost = 0) {
if (pool.length <= MAX_INDEX) return pool;
const weight = wordWeights(pool, words);
const scored = pool.map((a, i) => ({ a, i, t: scoreArticle(a, words, weight, boost).total }));
const keep = new Set();
const bySource = new Map();
scored.forEach((x) => {
if (!bySource.has(x.a.type)) bySource.set(x.a.type, []);
bySource.get(x.a.type).push(x);
});
bySource.forEach((list) => {
list.sort((x, y) => y.t - x.t || x.i - y.i).slice(0, MIN_PER_SOURCE).forEach((x) => keep.add(x.i));
});
[...scored].sort((x, y) => y.t - x.t || x.i - y.i).forEach((x) => {
if (keep.size < MAX_INDEX) keep.add(x.i);
});
return pool.filter((_, i) => keep.has(i));
}
function rankLocal(pool, words, boost = 0) {
const weight = wordWeights(pool, words);
const ranked = pool
.map((a) => ({ a, sc: scoreArticle(a, words, weight, boost) }))
.filter((x) => x.sc.total >= MIN_ARTICLE_SCORE)
.sort((x, y) => y.sc.total - x.sc.total);
return { ranked, weight };
}
const ROUTE_TIMEOUT_MS = 2000;
const ROUTE_SKIP_SCORE = 10;
const ROUTE_PAUSE_MS = 10 * 60 * 1000;
let _routeOffUntil = 0;
async function routeWithModel(question, index) {
if (Date.now() < _routeOffUntil) return null;
const ctrl = new AbortController();
const timer = setTimeout(() => ctrl.abort(), ROUTE_TIMEOUT_MS);
try {
const res = await fetch(ENDPOINT, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ mode: 'route', question, titles: index.map((a) => `${a.label}: ${a.title}`) }),
signal: ctrl.signal,
});
if (res.status === 429) {
const d = await res.json().catch(() => ({}));
if (d.error === 'daily-limit-site') _routeOffUntil = Date.now() + ROUTE_PAUSE_MS;
return null;
}
if (!res.ok) return null;
const data = await res.json();
if (data.disabled) { _routeOffUntil = Date.now() + 24 * 60 * 60 * 1000; return null; }
const idx = (Array.isArray(data.articles) ? data.articles : [])
.map((n) => Number(n) - 1)
.filter((i) => Number.isInteger(i) && i >= 0 && i < index.length);
const words = Array.isArray(data.words) ? data.words.map(String).slice(0, 6) : [];
return { idx, words };
} catch {
return null;
} finally {
clearTimeout(timer);
}
}
function nubianIntent(question) {
return /نوب|اندندي|انداندي|ترجم|(كيف|شلون) (اقول|نقول|يقال)/.test(normalizeText(question));
}
export async function gatherContext(question) {
const words = keywords(question);
if (!words.length) return [];
const boost = nubianIntent(question) ? 8 : 0;
const pool = await loadPool();
const index = buildIndex(pool, words, boost);
const local = rankLocal(pool, words, boost);
const strongLocal = (local.ranked[0]?.sc.total || 0) >= ROUTE_SKIP_SCORE;
const flag = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const routeOff = flag('ai-route') === 'off';
const t0 = performance.now();
let route = (index.length && !strongLocal && !routeOff) ? await routeWithModel(question, index) : null;
if (flag('ai-debug') === '1') {
const path = routeOff ? 'محلي (التوجيه موقوف تجريبيًا)' : strongLocal ? 'محلي (تطابق قوي)' : route ? 'نموذج' : 'محلي (فشل/فراغ التوجيه)';
console.info(`[ai] المسار: ${path} | أعلى درجة محلية: ${(local.ranked[0]?.sc.total || 0).toFixed(1)} | زمن التوجيه: ${Math.round(performance.now() - t0)}ms`);
}
if (route && !route.idx.length && !route.words.length) route = null;
let articles = [];
if (route) {
const extra = keywords(route.words.join(' '));
const allWords = [...new Set([...words, ...extra])];
const weight = wordWeights(pool, allWords);
const chosen = route.idx.map((i) => index[i]);
const items = chosen.map((a) => buildArticleItem(a, scoreArticle(a, allWords, weight, boost)));
const top = local.ranked[0];
if (top && top.sc.total >= 15 && !chosen.includes(top.a)) items.push(buildArticleItem(top.a, top.sc));
articles = items.slice(0, MAX_ARTICLES_FOR_AI);
} else if (local.ranked.length) {
const floor = local.ranked[0].sc.total * REL_FLOOR;
articles = local.ranked.filter((x) => x.sc.total >= floor)
.slice(0, MAX_ARTICLES_FOR_AI).map((x) => buildArticleItem(x.a, x.sc));
}
return articles;
}
function withItems(err, items, detail) {
err.items = items;
if (detail) err.detail = detail;
return err;
}
const SOURCE_KIND = {
'تاريخ': 'مقالة', 'رابطة': 'مقالة', 'خبر': 'خبر', 'مشروع': 'مشروع',
'فيديو مناسبة': 'فيديو', 'فيديو ذاكرة': 'فيديو',
'قاموس نوبي': 'قاموس الكلمات', 'عبارات نوبية': 'تعلّم الكلام',
'جهة عامة': 'دليل الاتصال', 'معلومة': 'هل تعلم؟',
'نبذة الرابطة': '', 'الدستور': '', 'لوائح الرابطة': '',
};
function labelSources(sources, items) {
const list = Array.isArray(sources) ? sources : [];
return list.filter(Boolean).map((t) => {
const hit = (items || []).find((i) => i && i.title === t);
const kind = hit ? SOURCE_KIND[hit.type] : '';
return kind ? `${kind} «${t}»` : String(t);
});
}
const FINAL_FAILURES = new Set(['no-key', 'key-rejected', 'model-missing', 'quota', 'bad-request']);
async function postOnce(q, items) {
let res;
try {
res = await fetch(ENDPOINT, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ question: q, items }),
});
} catch {
throw withItems(new Error('network'), items);
}
const data = await res.json().catch(() => ({}));
if (!res.ok) {
const detail = data.detail || (data.error ? '' : `http-${res.status}`);
throw withItems(new Error(data.error || 'unavailable'), items, detail);
}
return { answer: data.answer, sources: labelSources(data.sources, items), items };
}
export async function askAkdar(question) {
const q = String(question || '').trim();
if (!q) throw new Error('empty');
const items = await gatherContext(q);
try {
return await postOnce(q, items);
} catch (err) {
const retryable = err.message === 'unavailable' && !FINAL_FAILURES.has(err.detail);
if (!retryable) throw err;
await new Promise((r) => setTimeout(r, 700));
return postOnce(q, items);
}
}
async function streamOnce(q, items, onText) {
let res;
try {
res = await fetch(ENDPOINT, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ question: q, items, stream: true }),
});
} catch {
throw withItems(new Error('network'), items);
}
const isSse = (res.headers.get('content-type') || '').includes('text/event-stream');
if (!isSse || !res.body) {
const data = await res.json().catch(() => ({}));
if (!res.ok) {
const detail = data.detail || (data.error ? '' : `http-${res.status}`);
throw withItems(new Error(data.error || 'unavailable'), items, detail);
}
return { answer: data.answer, sources: labelSources(data.sources, items), items };
}
const reader = res.body.getReader();
const dec = new TextDecoder();
let buf = '';
let text = '';
let final = null;
let errEvt = null;
const handle = (line) => {
if (!line.startsWith('data:')) return;
let ev;
try { ev = JSON.parse(line.slice(5)); } catch { return; }
if (typeof ev.t === 'string' && ev.t) { text += ev.t; if (onText) onText(text); }
else if (ev.done) final = ev;
else if (ev.error) errEvt = ev;
};
try {
for (;;) {
const { done, value } = await reader.read();
if (done) break;
buf += dec.decode(value, { stream: true });
let nl;
while ((nl = buf.indexOf('\n')) >= 0) {
handle(buf.slice(0, nl).replace(/\r$/, ''));
buf = buf.slice(nl + 1);
}
}
if (buf.trim()) handle(buf.replace(/\r$/, ''));
} catch {
if (!text && !final) throw withItems(new Error('network'), items);
}
if (final && final.answer) return { answer: final.answer, sources: labelSources(final.sources, items), items };
if (text.trim()) return { answer: text.trim(), sources: [], items };
throw withItems(new Error((errEvt && errEvt.error) || 'unavailable'), items, (errEvt && errEvt.detail) || 'empty-reply');
}
export async function askAkdarStream(question, { onText } = {}) {
const q = String(question || '').trim();
if (!q) throw new Error('empty');
const items = await gatherContext(q);
const local = getCachedAnswer(q, items);
if (local) return { answer: local.answer, sources: local.sources, items, cached: true };
if (typeof navigator !== 'undefined' && navigator.onLine === false) throw withItems(new Error('network'), items);
let res;
try {
res = await streamOnce(q, items, onText);
} catch (err) {
if (err.message !== 'network') throw err;
await new Promise((r) => setTimeout(r, 700));
res = await streamOnce(q, items, onText);
}
putCachedAnswer(q, items, res.answer, res.sources);
return res;
}
export function aiErrorMessage(code, detail) {
switch (code) {
case 'too-many-requests': return 'انتظر شوية وجرّب تاني';
case 'daily-limit-user':  return 'وصلت للحد اليومي للأسئلة — جرّب بكرة';
case 'daily-limit-site':  return 'الذكاء الاصطناعي مشغول الآن — جرّب بعد شوية';
case 'network':           return 'لا يوجد اتصال بالإنترنت';
default:
if (detail === 'quota') return 'الذكاء الاصطناعي مشغول الآن — جرّب بعد شوية';
return 'الذكاء الاصطناعي مشغول الآن — جرّب بعد شوية';
}
}
export function aiDiagCode(code, detail) {
if (code === 'network') return '';
if (code === 'unavailable' || !code) return detail || 'unavailable';
return '';
}
export function sendAiFeedback(question, answer, vote) {
try {
fetch(ENDPOINT, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ mode: 'feedback', question, answer, vote: vote === 'up' ? 'up' : 'down' }),
keepalive: true,
}).catch(() => {   });
} catch {   }
}
