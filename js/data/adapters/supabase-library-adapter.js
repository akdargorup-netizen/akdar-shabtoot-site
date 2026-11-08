import { cacheGet, cachePut, cacheDelPrefix } from '../read-cache.js';
import { fetchStaticJson } from '../hosts.js';
import { _WRITE_TIMEOUT_MS, _sbRead, _sbWrite, _run, _fail, _rows, _patch, _reconcile, mirrorRows, mirrorSeed, mirrorIsCurrent } from './sb-helpers.js';
import { HISTORY_SECTIONS }      from '../history-data.js';
import { ASSOCIATION_JOURNEY_SECTIONS } from '../association-journey-data.js';
import { GALLERY_CATEGORIES }    from '../gallery-data.js';
import { CONTACT_CATEGORY_DEFS } from '../contacts-seed-data.js';
const _PAGE_ROWS = 1000;
const _MAX_ROWS = 20000;
async function _fetchAllPages(sb, table, cols, order) {
let all = [];
for (let from = 0; from < _MAX_ROWS; from += _PAGE_ROWS) {
const res = await _run(sb.from(table).select(cols)
.order('created_at', order).order('id', order).range(from, from + _PAGE_ROWS - 1));
if (res.error) return res;
const data = res.data || [];
all = all.length ? all.concat(data) : data;
if (data.length < _PAGE_ROWS) break;
}
return { data: all, error: null };
}
function makeStore(cfg) {
const { table, name, asc = false, cols, decorate, idField = 'id', liteCols, versionCheck = false } = cfg;
const key = `${name}:rows`;
const fullKey = `${name}:rowsFull`;
const itemKey = (id) => `${name}:item:${id}`;
const _keys = liteCols ? [key, fullKey] : [key];
const reverse = Object.fromEntries(Object.entries(cols).map(([k, v]) => [v, k]));
const known = new Set(Object.keys(cols));
const ignored = new Set(['id', 'key', 'lite']);
const fromRow = (r) => {
const out = { ...(r.extra || {}), [idField]: String(r.id) };
for (const [col, field] of Object.entries(reverse)) {
const v = r[col];
if (v === null || v === undefined) { if (v === null && col === 'finance') out[field] = null; continue; }
out[field] = v;
}
if (r._lite) out.lite = true;
return decorate ? decorate(r, out) : out;
};
const toRow = (obj) => {
const row = {};
const extra = {};
for (const [k, v] of Object.entries(obj || {})) {
if (v === undefined || ignored.has(k)) continue;
if (known.has(k)) row[cols[k]] = v;
else extra[k] = v;
}
if (Object.keys(extra).length) row.extra = extra;
return row;
};
const _unchanged = async (sb, k) => {
try {
const cached = (await cacheGet(k))?.value;
if (!Array.isArray(cached) || !cached.length) return null;
const { data, count, error } = await _run(
sb.from(table).select('updated_at', { count: 'exact' }).order('updated_at', { ascending: false }).limit(1));
if (error || !data?.length || count !== cached.length) return null;
let newest = '';
for (const r of cached) if (typeof r.updated_at === 'string' && r.updated_at > newest) newest = r.updated_at;
return newest && data[0].updated_at === newest ? cached : null;
} catch { return null; }
};
const saveItem  = (row) => cachePut(itemKey(row.id), row).catch(() => {});
const savedItem = async (id) => { try { return (await cacheGet(itemKey(id)))?.value || null; } catch { return null; } };
let _prefetching = false;
const prefetchBodies = async (list) => {
if (_prefetching || !liteCols || !Array.isArray(list)) return;
_prefetching = true;
try {
if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
const need = [];
for (const r of list) {
if (!r._lite) continue;
const saved = await savedItem(String(r.id));
if (!saved || saved.updated_at !== r.updated_at) need.push(String(r.id));
}
if (!need.length) return;
const sb = await _sbRead();
for (let i = 0; i < need.length && i < 60; i += 20) {
const { data, error } = await _run(sb.from(table).select('*').in('id', need.slice(i, i + 20)));
if (error) break;
for (const row of data || []) await saveItem(row);
}
} catch {   } finally { _prefetching = false; }
};
const rows = ({ fresh = false, full = false } = {}) => {
const lite = Boolean(liteCols) && !full;
const k = liteCols && full ? fullKey : key;
return _rows(k, async () => {
const sb = await _sbRead();
if (versionCheck) {
const same = await _unchanged(sb, k);
if (same) { if (lite) setTimeout(() => prefetchBodies(same), 2500); return same; }
}
const order = { ascending: asc };
let res = await _fetchAllPages(sb, table, lite ? liteCols : '*', order);
let usedLite = lite;
if (lite && res.error && String(res.error.code) === '42703') {
res = await _fetchAllPages(sb, table, '*', order);
usedLite = false;
}
if (res.error) throw res.error;
const data = res.data || [];
if (!usedLite) return data;
const out = data.map(r => ({ ...r, _lite: true }));
setTimeout(() => prefetchBodies(out), 2500);
return out;
}, { collection: name, ttlMs: 600000, fresh, seed: () => mirrorSeed(table, { asc }), seedCurrent: () => mirrorIsCurrent(table), fallback: () => mirrorRows(table, { asc }) });
};
const patchAll = (fn) => Promise.all(_keys.map(k => _patch(k, fn)));
const upsertCache = (row) => patchAll((list) => {
const rest = (list || []).filter(r => String(r.id) !== String(row.id));
return asc ? [...rest, row] : [row, ...rest];
});
return {
fromRow, toRow, rows,
async list({ full = false } = {}) { return (await rows({ full })).map(fromRow); },
async get(id) {
const sid = String(id);
let hit = null;
try { hit = (await cacheGet(key))?.value?.find(r => String(r.id) === sid) || null; } catch {   }
if (hit && !hit._lite) return fromRow(hit);
if (hit && liteCols) {
const saved = await savedItem(sid);
if (saved && saved.updated_at === hit.updated_at) return fromRow(saved);
}
try {
const sb = await _sbRead();
const { data, error } = await _run(sb.from(table).select('*').eq('id', sid).maybeSingle());
if (error) throw error;
if (data && liteCols) saveItem(data);
return data ? fromRow(data) : null;
} catch (err) {
if (liteCols) { const saved = await savedItem(sid); if (saved) return fromRow(saved); }
try {
const mr = (await mirrorRows(table, { asc }))?.find(r => String(r.id) === sid);
if (mr) return fromRow(mr);
} catch {   }
throw err;
}
},
async insert(obj) {
const sb = await _sbWrite();
const { data, error } = await _run(sb.from(table).insert(toRow(obj)).select().single(), _WRITE_TIMEOUT_MS);
if (error) _fail(error);
await upsertCache(data);
if (liteCols) saveItem(data);
_reconcile(`${name}:`);
return fromRow(data);
},
async update(id, obj) {
const sb = await _sbWrite();
const { data, error } = await _run(
sb.from(table).update(toRow(obj)).eq('id', String(id)).select().maybeSingle(), _WRITE_TIMEOUT_MS);
if (error) _fail(error);
if (!data) throw new Error('العنصر دا ما عاد موجود أو ما عندك صلاحية للتعديل');
await patchAll((list) => (list || []).map(r => (String(r.id) === String(id) ? data : r)));
if (liteCols) saveItem(data);
_reconcile(`${name}:`);
return fromRow(data);
},
async remove(id) {
const sb = await _sbWrite();
const { data, error } = await _run(sb.from(table).delete().eq('id', String(id)).select('id'), _WRITE_TIMEOUT_MS);
if (error) _fail(error);
if (!data?.length) throw new Error(cfg.deniedMsg || 'ما قدرنا نحذف العنصر (الحذف النهائي للمالك فقط)');
await patchAll((list) => (list || []).filter(r => String(r.id) !== String(id)));
if (liteCols) cacheDelPrefix(itemKey(id)).catch(() => {});
_reconcile(`${name}:`);
},
};
}
const _label = (list, key) => list.find(x => x.key === key)?.label || key;
const studyVideos = makeStore({
table: 'study_videos', name: 'study_videos', versionCheck: true,
cols: { youtubeId: 'youtube_id', stage: 'stage', subject: 'subject', title: 'title', teacher: 'teacher', excerpt: 'excerpt' },
});
const studyTips = makeStore({
table: 'study_tips', name: 'study_tips', versionCheck: true,
cols: { stage: 'stage', title: 'title', body: 'body' },
});
const lectures = makeStore({
table: 'worship_lectures', name: 'worship_lectures', versionCheck: true,
cols: { youtubeId: 'youtube_id', title: 'title', speaker: 'speaker', excerpt: 'excerpt' },
});
const _articleCols = { type: 'type', section: 'section', category: 'category', title: 'title', source: 'source', date: 'date_text', image: 'image', body: 'body', important: 'important' };
const _ARTICLE_LITE = 'id,type,section,category,title,source,date_text,image,important,extra,created_at,updated_at';
const history = makeStore({ table: 'history_articles', name: 'history_articles', cols: _articleCols, liteCols: _ARTICLE_LITE, versionCheck: true });
const journey = makeStore({ table: 'association_journey_articles', name: 'association_journey_articles', cols: _articleCols, liteCols: _ARTICLE_LITE, versionCheck: true });
const projects = makeStore({
table: 'projects', name: 'projects', asc: true, versionCheck: true,
cols: {
title: 'title', status: 'status', progress: 'progress', image: 'image', description: 'description',
executors: 'executors', contributors: 'contributors', contributionMethods: 'contribution_methods', finance: 'finance',
},
decorate: (r, out) => ({ ...out, progress: Number(r.progress) || 0, finance: r.finance ?? null }),
});
const gallery = makeStore({
table: 'gallery', name: 'gallery', versionCheck: true,
cols: { title: 'title', source: 'source', excerpt: 'excerpt', category: 'category', label: 'label', image: 'image' },
});
const contacts = makeStore({
table: 'contacts', name: 'contacts', asc: true, versionCheck: true,
cols: { name: 'name', role: 'role', phone: 'phone', categoryKey: 'category_key', category: 'category', aiPublic: 'ai_public' },
deniedMsg: 'ما قدرنا نحذف الجهة (دليل الاتصال للمالك فقط)',
decorate: (r, out) => ({ ...out, role: r.role ?? null, phone: r.phone ?? null, aiPublic: r.ai_public === true }),
});
const words = makeStore({
table: 'nubian_words', name: 'nubian_words', asc: true, versionCheck: true,
cols: { category: 'category', ar: 'ar', nub: 'nub', translit: 'translit', group: 'grp', note: 'note' },
decorate: (r, out) => {
if (!r.grp) delete out.group;
if (!r.note) delete out.note;
return out;
},
});
const phraseCats = makeStore({
table: 'nubian_phrase_categories', name: 'nubian_phrase_categories', asc: true, idField: 'key', versionCheck: true,
cols: { title: 'title', icon: 'icon' },
deniedMsg: 'ما قدرنا نحذف التصنيف (الحذف النهائي للمالك فقط)',
});
const phrases = makeStore({
table: 'nubian_phrases', name: 'nubian_phrases', asc: true, versionCheck: true,
cols: { category: 'category', ar: 'ar', nub: 'nub', translit: 'translit', note: 'note' },
decorate: (r, out) => { if (!r.note) delete out.note; return out; },
});
let _snapshotPromise = null;
function _staticSnapshot() {
if (!_snapshotPromise) {
_snapshotPromise = fetchStaticJson('content/static-snapshot.json', { validate: (d) => d?.version === 1 })
.then((data) => data?.collections ?? null);
}
return _snapshotPromise;
}
async function _withSnapshot(load, snapshotKey, map = (d) => d) {
try {
return await load();
} catch (err) {
const docs = (await _staticSnapshot())?.[snapshotKey]?.docs;
if (Array.isArray(docs) && docs.length) return docs.map(map);
throw err;
}
}
export const getStudyVideos = () => studyVideos.list();
export const addStudyVideo = (item) => studyVideos.insert(item);
export const updateStudyVideo = (id, updates) => studyVideos.update(id, updates);
export const deleteStudyVideo = (id) => studyVideos.remove(id);
export const getStudyTips = () => studyTips.list();
export const addStudyTip = (item) => studyTips.insert(item);
export const updateStudyTip = (id, updates) => studyTips.update(id, updates);
export const deleteStudyTip = (id) => studyTips.remove(id);
export const getWorshipLectures = () => lectures.list();
export const addWorshipLecture = (item) => lectures.insert(item);
export const updateWorshipLecture = (id, updates) => lectures.update(id, updates);
export const deleteWorshipLecture = (id) => lectures.remove(id);
const _bySection = (items, section) => (section ? items.filter(a => a.section === section) : items);
export async function getHistoryArticles(section, { full = false } = {}) { return _bySection(await history.list({ full }), section); }
export const getHistoryArticle = (id) => history.get(id);
export const addHistoryArticle = (item) =>
history.insert({ type: 'history', ...item, category: _label(HISTORY_SECTIONS, item.section) });
export const updateHistoryArticle = (id, updates) => {
const payload = { ...updates };
if (updates.section) payload.category = _label(HISTORY_SECTIONS, updates.section);
return history.update(id, payload);
};
export const deleteHistoryArticle = (id) => history.remove(id);
export async function getAssociationJourneyArticles(section, { full = false } = {}) { return _bySection(await journey.list({ full }), section); }
export const getAssociationJourneyArticle = (id) => journey.get(id);
export const addAssociationJourneyArticle = (item) =>
journey.insert({ type: 'association', ...item, category: _label(ASSOCIATION_JOURNEY_SECTIONS, item.section) });
export const updateAssociationJourneyArticle = (id, updates) => {
const payload = { ...updates };
if (updates.section) payload.category = _label(ASSOCIATION_JOURNEY_SECTIONS, updates.section);
return journey.update(id, payload);
};
export const deleteAssociationJourneyArticle = (id) => journey.remove(id);
export const getProjects = () => projects.list();
export const getProject = (id) => projects.get(id);
export const addProject = (item) => projects.insert(item);
export const updateProject = (id, updates) => projects.update(id, updates);
export const deleteProject = (id) => projects.remove(id);
export async function getGalleryItems(category) {
const items = await gallery.list();
return category ? items.filter(g => g.category === category) : items;
}
export const getGalleryItem = (id) => gallery.get(id);
export const addGalleryItem = (item) => gallery.insert({ ...item, label: _label(GALLERY_CATEGORIES, item.category) });
export const updateGalleryItem = (id, updates) => {
const payload = { ...updates };
if (updates.category) payload.label = _label(GALLERY_CATEGORIES, updates.category);
return gallery.update(id, payload);
};
export const deleteGalleryItem = (id) => gallery.remove(id);
export async function getContacts(categoryKey) {
const items = await contacts.list();
return categoryKey ? items.filter(c => c.categoryKey === categoryKey) : items;
}
export const getContact = (id) => contacts.get(id);
export const addContact = (item) => contacts.insert({ ...item, category: _label(CONTACT_CATEGORY_DEFS, item.categoryKey) });
export const updateContact = (id, updates) => {
const payload = { ...updates };
if (updates.categoryKey) payload.category = _label(CONTACT_CATEGORY_DEFS, updates.categoryKey);
return contacts.update(id, payload);
};
export const deleteContact = (id) => contacts.remove(id);
export async function getNubianWords(category) {
const items = await _withSnapshot(() => words.list(), 'nubianWords');
return category ? items.filter(w => w.category === category) : items;
}
export const addNubianWord = (item) => words.insert(item);
export const updateNubianWord = (id, updates) => words.update(id, updates);
export const deleteNubianWord = (id) => words.remove(id);
export function getNubianPhraseCategories() {
return _withSnapshot(() => phraseCats.list(), 'nubianPhraseCategories', ({ id, ...rest }) => ({ key: id, ...rest }));
}
export const addNubianPhraseCategory = ({ title, icon }) => phraseCats.insert({ title, icon: icon || 'message-square' });
export const updateNubianPhraseCategory = (key, updates) => phraseCats.update(key, updates);
export async function deleteNubianPhraseCategory(key) {
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('nubian_phrases').delete().eq('category', String(key)).select('id'), _WRITE_TIMEOUT_MS);
if (error) _fail(error);
const removed = new Set((data || []).map(r => String(r.id)));
if (removed.size) await _patch('nubian_phrases:rows', (list) => (list || []).filter(r => !removed.has(String(r.id))));
await phraseCats.remove(key);
return { removedPhrasesCount: removed.size };
}
export async function getNubianPhrases(category) {
const items = await _withSnapshot(() => phrases.list(), 'nubianPhrases');
return category ? items.filter(p => p.category === category) : items;
}
export const addNubianPhrase = (item) => phrases.insert(item);
export const updateNubianPhrase = (id, updates) => phrases.update(id, updates);
export const deleteNubianPhrase = (id) => phrases.remove(id);
const _rpcMissing = (e) => {
const c = String(e?.code || '');
return c === '42883' || c === 'PGRST202' || c === 'PGRST204'
|| /could not find the function|function .* does not exist|schema cache/i.test(String(e?.message || ''));
};
async function _rpc(name, args) {
const sb = await _sbRead();
const res = await _run(sb.rpc(name, args, { get: true }));
if (res.error) {
if (_rpcMissing(res.error)) throw Object.assign(new Error('rpc_missing'), { code: 'rpc_missing' });
throw res.error;
}
return res.data;
}
const _statsRow = (r) => ({ category: r.category, total: r.total || 0, noAudio: r.no_audio || 0, noTranslation: r.no_translation || 0 });
export async function getNubianWordStats() {
return ((await _rpc('nubian_word_stats', {})) || []).map(_statsRow);
}
export async function getNubianPhraseStats() {
return ((await _rpc('nubian_phrase_stats', {})) || []).map(_statsRow);
}
const _pageArgs = ({ category = '', filter = 'all', query = '', offset = 0, limit = 30 } = {}) => ({
p_category: category || '', p_filter: filter || 'all', p_query: query || '', p_offset: offset, p_limit: limit,
});
export async function queryNubianWords(params) {
const out = await _rpc('nubian_words_page', _pageArgs(params));
return { items: (out?.rows || []).map(words.fromRow), total: out?.total || 0 };
}
export async function queryNubianPhrases(params) {
const out = await _rpc('nubian_phrases_page', _pageArgs(params));
return { items: (out?.rows || []).map(phrases.fromRow), total: out?.total || 0 };
}
