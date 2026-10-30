export const QUESTIONS_PER_ROUND = 6;
export const MIN_ITEMS_TO_PLAY = 4;
export const MIX_KEY = 'mix';
export const REVIEW_KEY = 'review';
const DAY = 86400000;
export const INTERVAL_DAYS = [0, 1, 3, 7];
const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim();
export function shuffle(list) {
const a = list.slice();
for (let i = a.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[a[i], a[j]] = [a[j], a[i]];
}
return a;
}
export const isDue = (rec, now) => !rec || now - rec.t >= INTERVAL_DAYS[rec.b] * DAY;
export const isKnown = (rec) => !!rec && rec.b >= 2;
export function applyResult(rec, ok, now) {
const r = rec ? { ...rec } : { b: 0, t: 0, m: 0, s: 0 };
const due = isDue(rec, now);
r.s++;
if (!ok) { r.b = 0; r.m++; r.t = now; }
else if (due) { r.b = Math.min(3, r.b + 1); r.t = now; }
return r;
}
export function priority(rec, now) {
if (!rec) return 2;
if (isDue(rec, now)) return 3 + (3 - rec.b) * 0.5;
return 0.2;
}
export function masteryStats(pool, mastery) {
const total = pool.items.length;
const known = pool.items.filter(it => isKnown(mastery[it.id])).length;
return { known, total };
}
function usable(list, poolKey) {
const seen = new Set();
const out = [];
for (const it of list || []) {
const ar = clean(it?.ar), nub = clean(it?.nub);
if (!ar || !nub || seen.has(ar)) continue;
seen.add(ar);
out.push({ id: `${poolKey}|${ar}`, ar, nub, translit: clean(it.translit) });
}
return out;
}
export function buildPools({ wordCategories = [], words = [], phraseCategories = [], phrases = [] }) {
const byCat = (list) => {
const m = new Map();
for (const it of list || []) {
if (!m.has(it.category)) m.set(it.category, []);
m.get(it.category).push(it);
}
return m;
};
const w = byCat(words), p = byCat(phrases);
const pools = [];
for (const c of wordCategories) {
pools.push({ key: c.key, title: c.title, icon: c.icon, kind: 'words', items: usable(w.get(c.key), c.key) });
}
for (const c of phraseCategories) {
pools.push({ key: c.key, title: c.title, icon: c.icon, kind: 'phrases', items: usable(p.get(c.key), c.key) });
}
return pools;
}
export function mixPool(pools) {
const items = [];
for (const p of pools) if (p.items.length >= MIN_ITEMS_TO_PLAY) items.push(...p.items);
return { key: MIX_KEY, title: 'من كل الأقسام', icon: 'shuffle', kind: 'mix', items };
}
export function reviewPool(pools, mastery, now = Date.now()) {
const items = [];
const seen = new Set();
for (const p of pools) {
for (const it of p.items) {
const rec = mastery[it.id];
if (rec && !seen.has(it.id) && isDue(rec, now)) { seen.add(it.id); items.push(it); }
}
}
return { key: REVIEW_KEY, title: 'مراجعة كلماتي', icon: 'rotate-ccw', kind: 'review', items };
}
function distractors(item, field, pool, allItems, count = 3) {
const taken = new Set([item[field]]);
const out = [];
const take = (list) => {
for (const it of shuffle(list)) {
if (out.length >= count) return;
const v = it[field];
if (it === item || !v || taken.has(v)) continue;
taken.add(v); out.push(it);
}
};
take(pool.items);
if (out.length < count) take(allItems);
return out;
}
function mcq(type, item, pool, allItems) {
const toNub = type === 'ar2nub';
const ans = toNub ? 'nub' : 'ar';
const other = toNub ? 'ar' : 'nub';
const opts = distractors(item, ans, pool, allItems)
.map(it => ({ text: it[ans], meaning: it[other], correct: false }));
opts.push({ text: item[ans], meaning: item[other], correct: true });
return {
type,
itemIds: [item.id],
prompt: toNub ? 'كيف تقولها بآنداندي؟' : 'ماذا تعني بالعربي؟',
shown: toNub ? item.ar : item.nub,
hint:  toNub ? '' : item.translit,
answerTranslit: item.translit,
options: shuffle(opts),
};
}
const SHORT_AR = 24, SHORT_NUB = 22;
const fitsMatch = it => it.ar.length <= SHORT_AR && it.nub.length <= SHORT_NUB;
function matchQuestion(items) {
const pairs = items.map((it, i) => ({ id: i, itemId: it.id, ar: it.ar, nub: it.nub, translit: it.translit }));
return {
type: 'match',
itemIds: items.map(it => it.id),
prompt: 'وصّل كل كلمة بمعناها',
pairs,
arOrder: shuffle(pairs.map(p => p.id)),
nubOrder: shuffle(pairs.map(p => p.id)),
};
}
export function buildRound(pool, pools, mastery = {}, total = QUESTIONS_PER_ROUND, now = Date.now()) {
if (!pool || pool.items.length < MIN_ITEMS_TO_PLAY) return [];
const allItems = pools.flatMap(p => p.items);
const ranked = pool.items
.map(it => ({ it, p: priority(mastery[it.id], now) + Math.random() * 0.6 }))
.sort((a, b) => b.p - a.p)
.map(x => x.it);
const shortOnes = ranked.filter(fitsMatch);
const withMatch = shortOnes.length >= 4 && total > 1;
const mcqCount = withMatch ? total - 1 : total;
const mcqItems = ranked.slice(0, mcqCount);
const questions = mcqItems.map((item, i) => mcq(i % 2 === 0 ? 'ar2nub' : 'nub2ar', item, pool, allItems));
if (withMatch) {
const used = new Set(mcqItems.map(it => it.id));
const fresh = shortOnes.filter(it => !used.has(it.id));
const matchItems = fresh.length >= 4 ? fresh.slice(0, 4) : shortOnes.slice(0, 4);
questions.push(matchQuestion(matchItems));
}
return questions;
}
export function starsFor(correct, total = QUESTIONS_PER_ROUND) {
if (correct >= total) return 3;
if (correct >= total - 1) return 2;
if (correct >= total - 2) return 1;
return 0;
}
