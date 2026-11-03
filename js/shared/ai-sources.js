import {
getNews, getProjects, getEvents,
getHistoryArticles, getAssociationJourneyArticles,
getNubianWords, getNubianPhrases, getNubianPhraseCategories, getNubianWordCategories, getContacts,
} from '../data/db.js';
import { stripMarkup } from './article-markup.js';
import { DID_YOU_KNOW_GROUPS } from '../data/did-you-know-data.js';
import { PROJECT_STATUSES } from '../data/projects-data.js';
import { NUBIAN_LANGUAGE_CATEGORIES } from '../data/nubian-language-data.js';
const NEWS_LIMIT = 60;
const POOL_TTL_MS = 15 * 60 * 1000;
export const AI_ACTIVE_SOURCES = new Set(['history', 'association', 'dyk', 'assoc-about', 'assoc-constitution', 'assoc-bylaws']);
const EXCLUDED_DYK_GROUPS = new Set(['التنجلاب والأسر', 'نسب ونظام الأسر']);
const GENEALOGY = /أسرة|الأسر|أسر |عائلة|عائلات|عشيرة|عشائر|أنساب|ذرية|أحفاد|يُنسب|نسبة إلى/;
export function isExcluded(a) {
return a?.aiExclude === true || a?.section === 'clans' || a?.category === 'قبائل وعائلات';
}
function toParas(raw) {
const list = Array.isArray(raw) ? raw : String(raw || '').split(/\n+/);
return list.map((p) => stripMarkup(String(p)).replace(/\s+/g, ' ').trim()).filter(Boolean);
}
function isoDate(v) {
const d = v ? new Date(v) : null;
return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
}
const _txt = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();
const _lines = (root) => [...root.querySelectorAll('p, li')].map(_txt).filter(Boolean);
const _chapterTitle = (ch) => {
const h = ch.querySelector('.regs-chapter__title')?.cloneNode(true);
h?.querySelector('.regs-chapter__num')?.remove();
return _txt(h);
};
async function loadAssociationAboutDocs() {
const { renderAssociationAbout } = await import('../pages/association-about.js');
const dom = new DOMParser().parseFromString(renderAssociationAbout(), 'text/html');
return [...dom.querySelectorAll('.info-box')].map((box, i) => ({
id: `about-${i}`,
title: `نبذة عن الرابطة — ${_txt(box.querySelector('.info-title'))}`,
paras: _lines(box),
keepAll: true, maxParas: 12,
}));
}
async function loadRegulationsDocs(docId, prefix) {
const { renderAssociationRegulations } = await import('../pages/association-regulations.js');
const dom = new DOMParser().parseFromString(renderAssociationRegulations(), 'text/html');
const root = dom.getElementById(docId);
if (!root) return [];
const docs = [];
const sub = _txt(root.querySelector('.regs-doc__subtitle'));
if (sub) docs.push({ id: `${docId}-intro`, title: `${prefix} — تعريف`, paras: [sub], keepAll: true });
root.querySelectorAll('.regs-chapter').forEach((ch, ci) => {
const chTitle = _chapterTitle(ch);
const cards = [...ch.querySelectorAll('.regs-card')];
const named = cards.filter((c) => c.querySelector('.regs-card__title'));
if (named.length) {
named.forEach((c, k) => docs.push({
id: `${docId}-${ci}-${k}`,
title: `${prefix} — ${chTitle} — ${_txt(c.querySelector('.regs-card__title'))}`,
paras: _lines(c), keepAll: true, maxParas: 14,
}));
} else {
docs.push({ id: `${docId}-${ci}`, title: `${prefix} — ${chTitle}`, paras: _lines(ch), keepAll: true, maxParas: 14 });
}
});
return docs;
}
export const AI_SOURCES = [
{
key: 'history', label: 'تاريخ',
load: async () => (await getHistoryArticles(undefined, { full: true }) || []).map((a) => ({
...a, paras: toParas(a.body || a.content || a.summary),
})),
},
{
key: 'association', label: 'رابطة',
load: async () => (await getAssociationJourneyArticles(undefined, { full: true }) || []).map((a) => ({
...a, paras: toParas(a.body || a.content || a.summary),
})),
},
{
key: 'assoc-about', label: 'نبذة الرابطة',
load: () => loadAssociationAboutDocs(),
},
{
key: 'assoc-constitution', label: 'الدستور',
load: () => loadRegulationsDocs('regs-constitution', 'دستور الرابطة'),
},
{
key: 'assoc-bylaws', label: 'لوائح الرابطة',
load: () => loadRegulationsDocs('regs-bylaws', 'اللوائح الداخلية للرابطة'),
},
{
key: 'news', label: 'خبر',
load: async () => (await getNews({ limit: NEWS_LIMIT, full: true }) || []).map((n) => ({
id: n.id, title: n.title, source: n.source, aiExclude: n.aiExclude,
date: isoDate(n.publishedAt),
paras: toParas(n.body || n.content || n.summary),
})),
},
{
key: 'projects', label: 'مشروع',
load: async () => (await getProjects() || []).map((p) => {
const status = PROJECT_STATUSES.find((s) => s.key === p.status)?.label;
const paras = toParas(p.description);
if (status) paras.push(`حالة المشروع: ${status}.`);
if (Number.isFinite(Number(p.progress))) paras.push(`نسبة الإنجاز: ${Number(p.progress)}٪.`);
const f = p.finance || {};
const cur = f.currency ? ` ${f.currency}` : '';
const goal = Number(f.goalAmount);
const raised = Number(f.raisedAmount);
if (Number.isFinite(goal) && goal > 0) paras.push(`المبلغ المطلوب للمشروع: ${goal}${cur}.`);
if (Number.isFinite(raised) && raised >= 0 && f.raisedAmount != null) {
const upd = isoDate(f.lastUpdated);
paras.push(`المبلغ المجموع حتى الآن: ${raised}${cur}${upd ? ` (آخر تحديث ${upd})` : ''}.`);
}
return { id: p.id, title: p.title, aiExclude: p.aiExclude, paras, maxParas: 6, keepAll: true };
}),
},
{
key: 'events', label: 'فيديو مناسبة',
load: async () => (await getEvents() || []).map((e) => ({
id: e.id, title: e.title, aiExclude: e.aiExclude, date: isoDate(e.date) || '',
paras: toParas(e.excerpt),
})),
},
{
key: 'nubian-words', label: 'قاموس نوبي',
load: async () => {
const titles = new Map(((await getNubianWordCategories().catch(() => NUBIAN_LANGUAGE_CATEGORIES)) || []).map((c) => [c.key, c.title]));
const groups = new Map();
(await getNubianWords() || []).forEach((w) => {
if (!w || !w.ar || !(w.nub || w.translit) || w.aiExclude === true) return;
const line = `${w.ar}: ${w.nub || w.translit}${w.nub && w.translit ? ` (${w.translit})` : ''}`;
if (!groups.has(w.category)) groups.set(w.category, []);
groups.get(w.category).push(line);
});
return [...groups.entries()].map(([key, paras]) => ({
id: `nw-${key}`, title: `كلمات آنداندي: ${titles.get(key) || key}`, paras, maxParas: 6,
}));
},
},
{
key: 'nubian-phrases', label: 'عبارات نوبية',
load: async () => {
const cats = new Map((await getNubianPhraseCategories() || []).map((c) => [c.key, c.title]));
const groups = new Map();
(await getNubianPhrases() || []).forEach((p) => {
if (!p || !p.ar || !(p.nub || p.translit) || p.aiExclude === true) return;
const line = `${p.ar}: ${p.nub || p.translit}${p.nub && p.translit ? ` (${p.translit})` : ''}${p.note ? ` — ${p.note}` : ''}`;
if (!groups.has(p.category)) groups.set(p.category, []);
groups.get(p.category).push(line);
});
return [...groups.entries()].map(([key, paras]) => ({
id: `np-${key}`, title: `عبارات آنداندي: ${cats.get(key) || key}`, paras, maxParas: 6,
}));
},
},
{
key: 'public-contacts', label: 'جهة عامة',
load: async () => (await getContacts() || [])
.filter((c) => c && c.aiPublic === true && c.aiExclude !== true && c.name && c.phone)
.map((c) => ({
id: c.id, title: c.name,
paras: [[c.role, c.category, `الهاتف: ${c.phone}`].filter(Boolean).join(' — ')],
})),
},
{
key: 'dyk', label: 'معلومة',
load: async () => (DID_YOU_KNOW_GROUPS || [])
.filter((g) => g && !EXCLUDED_DYK_GROUPS.has(g.category))
.map((g, i) => ({
id: `dyk-${i}`, title: g.category, aiExclude: g.aiExclude,
paras: (g.items || [])
.filter((it) => it && it.aiExclude !== true && !GENEALOGY.test(it.text || ''))
.map((it) => String(it.text).replace(/\s+/g, ' ').trim())
.filter(Boolean),
})),
},
];
let _pool = null;
let _poolAt = 0;
let _inflight = null;
async function _buildPool() {
const active = AI_SOURCES.filter((src) => AI_ACTIVE_SOURCES.has(src.key));
const results = await Promise.all(active.map(async (src) => {
try {
const docs = await src.load();
return docs
.filter((d) => d && d.title && d.paras?.length && !isExcluded(d))
.map((d) => ({ ...d, type: src.key, label: src.label }));
} catch {
return [];
}
}));
_pool = results.flat();
_poolAt = Date.now();
return _pool;
}
function _refresh() {
if (!_inflight) _inflight = _buildPool().finally(() => { _inflight = null; });
return _inflight;
}
export async function loadAiPool({ force = false } = {}) {
if (!force && _pool) {
if (Date.now() - _poolAt >= POOL_TTL_MS) _refresh().catch(() => {});
return _pool;
}
return _refresh();
}
export function prewarmAiPool() {
if (_pool || _inflight) return;
const conn = navigator.connection;
if (conn && conn.saveData) return;
_refresh().catch(() => {});
}
