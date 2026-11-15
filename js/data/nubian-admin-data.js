import {
getNubianWords, getNubianPhrases,
getNubianWordStats, getNubianPhraseStats, queryNubianWords, queryNubianPhrases,
} from './db.js';
import { buildKey } from '../shared/arabic-search.js';
const KINDS = {
words:   { all: getNubianWords,   stats: getNubianWordStats,   page: queryNubianWords },
phrases: { all: getNubianPhrases, stats: getNubianPhraseStats, page: queryNubianPhrases },
};
let _serverPaging = null;
const _hasTr = (x) => Boolean(x.nub || x.translit);
const _hasAu = (x) => Boolean(x.audio);
export const isServerPaging = () => _serverPaging;
async function _try(serverCall, fallback) {
if (_serverPaging === false) return fallback();
try {
const out = await serverCall();
_serverPaging = true;
return out;
} catch (err) {
if (err?.code !== 'rpc_missing') throw err;
_serverPaging = false;
console.warn('[NubianAdmin] دوال الصفحات غير موجودة — شغّل 20261107_nubian_scale.sql؛ نستعمل الجلب الكامل مؤقتًا.');
return fallback();
}
}
export function loadStats(kind) {
const k = KINDS[kind];
return _try(
() => k.stats(),
async () => {
const by = new Map();
for (const x of await k.all()) {
const g = by.get(x.category) || { category: x.category, total: 0, noAudio: 0, noTranslation: 0 };
g.total++;
if (!_hasTr(x)) g.noTranslation++;
else if (!_hasAu(x)) g.noAudio++;
by.set(x.category, g);
}
return [...by.values()];
},
);
}
export function loadPage(kind, p = {}) {
const k = KINDS[kind];
const { category = '', filter = 'all', query = '', offset = 0, limit = 30 } = p;
return _try(
() => k.page({ category, filter, query, offset, limit }),
async () => {
const tokens = buildKey(query).split(' ').filter(Boolean);
const list = (await k.all()).filter((x) => {
if (category && x.category !== category) return false;
if (filter === 'no-audio' && !(_hasTr(x) && !_hasAu(x))) return false;
if (filter === 'no-translation' && _hasTr(x)) return false;
if (!tokens.length) return true;
const key = buildKey(x.ar, x.nub, x.translit, x.note);
return tokens.every((t) => key.includes(t));
});
return { items: list.slice(offset, offset + limit), total: list.length };
},
);
}
export function matchesView(item, { category = '', filter = 'all', query = '' } = {}) {
if (category && item.category !== category) return false;
if (filter === 'no-audio' && !(_hasTr(item) && !_hasAu(item))) return false;
if (filter === 'no-translation' && _hasTr(item)) return false;
const tokens = buildKey(query).split(' ').filter(Boolean);
if (!tokens.length) return true;
const key = buildKey(item.ar, item.nub, item.translit, item.note);
return tokens.every((t) => key.includes(t));
}
export function statDelta(oldItem, newItem) {
const part = (x) => !x ? null : { category: x.category, total: 1, noAudio: _hasTr(x) && !_hasAu(x) ? 1 : 0, noTranslation: _hasTr(x) ? 0 : 1 };
const out = new Map();
const bump = (p, sign) => {
if (!p) return;
const g = out.get(p.category) || { category: p.category, total: 0, noAudio: 0, noTranslation: 0 };
g.total += sign * p.total; g.noAudio += sign * p.noAudio; g.noTranslation += sign * p.noTranslation;
out.set(p.category, g);
};
bump(part(oldItem), -1);
bump(part(newItem), +1);
return [...out.values()];
}
export async function findSameAr(kind, { category, ar }) {
const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim();
if (!norm(ar)) return [];
const { items } = await loadPage(kind, { category, query: ar, limit: 50 });
return items.filter((x) => x.category === category && norm(x.ar) === norm(ar));
}
