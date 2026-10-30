import { cacheGet, cachePut, cacheKeys, cacheDelPrefix } from '../read-cache.js';
import { fetchStaticJson } from '../hosts.js';
import { _WRITE_TIMEOUT_MS, _offline, _isSlowNet, _sbRead, _sbWrite, _run, _fail, _rows, _patch, _reconcile } from './sb-helpers.js';
import { NEWS_CATEGORIES }   from '../local-data.js';
import { EVENT_CATEGORIES }  from '../videos-events-data.js';
import { FEED_LIMIT, RETENTION_DAYS, isArchived } from '../retention.js';
import { formatRelativeTime } from '../../shared/relative-time.js';
const RECENT_WINDOW     = 10;
const _SNAPSHOT_TIMEOUT_MS = 3000;
let _feedSnapshotPromise = null;
function _feedSnapshot() {
if (!_feedSnapshotPromise) {
_feedSnapshotPromise = fetchStaticJson('content/feed-snapshot.json', {
timeoutMs: _SNAPSHOT_TIMEOUT_MS, staggerMs: 1200, validate: (d) => d?.version === 1,
}).then((data) => data?.collections ?? null);
}
return _feedSnapshotPromise;
}
const _categoryLabel = (key) => NEWS_CATEGORIES.find(c => c.key === key)?.label || key;
function _news(r) {
const out = {
...(r.extra || {}),
id: String(r.id),
title: r.title, source: r.source, image: r.image,
body: Array.isArray(r.body) ? r.body : [],
category: r.category,
breaking: r.breaking === true,
type: r.type || 'news',
eventId: r.event_id || '',
publishedAt: r.published_at,
};
if (r.archive_state) out.archiveState = r.archive_state;
if (r._lite) out.bodyPartial = true;
if (r._snap) out.fromSnapshot = true;
return out;
}
function _isEffectivelyArchived(item, dateValue, type) {
if (item.archiveState === 'archived') return true;
if (item.archiveState === 'restored') return false;
return isArchived(dateValue, type);
}
function _newsToPublic(item) {
return {
...item,
categoryKey: item.category,
category:    _categoryLabel(item.category),
date:        formatRelativeTime(item.publishedAt),
archived:    _isEffectivelyArchived(item, item.publishedAt, 'news'),
};
}
const _NEWS_COLS = {
title: 'title', source: 'source', image: 'image', body: 'body', category: 'category',
breaking: 'breaking', type: 'type', eventId: 'event_id', publishedAt: 'published_at',
archiveState: 'archive_state',
};
const _NEWS_IGNORED = new Set(['id', 'date', 'archived', 'categoryKey', 'bodyPartial', 'fromSnapshot']);
function _newsRow(obj) {
const row = {};
const extra = {};
for (const [k, v] of Object.entries(obj || {})) {
if (v === undefined || _NEWS_IGNORED.has(k)) continue;
if (_NEWS_COLS[k]) row[_NEWS_COLS[k]] = v;
else extra[k] = v;
}
if (Object.keys(extra).length) row.extra = extra;
return row;
}
const _NEWS_LIST_COLS = 'id,title,source,image,category,breaking,type,event_id,published_at,archive_state,extra,updated_at,excerpt';
const _NEWS_FULL_LIMIT = 80;
const _NEWS_WINDOW_LIMIT = 120;
const _ITEM_KEY = (id) => `news:item:${id}`;
const _ITEM_CAP = 80;
function _liteRow(r) {
if (r.body !== undefined) return r;
const { excerpt, ...rest } = r;
return { ...rest, body: excerpt ? [excerpt] : [], _lite: true };
}
function _windowFilter(q, limit = _NEWS_WINDOW_LIMIT) {
const cutoff = new Date(Date.now() - RETENTION_DAYS.news * 86400000).toISOString();
return q.or(`published_at.gte.${cutoff},archive_state.eq.restored,breaking.eq.true`)
.order('published_at', { ascending: false }).limit(limit);
}
const _NEWS_FULL_REFRESH_MS = 6 * 3600 * 1000;
const _NEWS_META_KEY = 'news:rows:meta';
async function _newsUnchanged(sb) {
try {
const prev = (await cacheGet('news:rows'))?.value;
if (!Array.isArray(prev) || !prev.length) return null;
if (prev.some((r) => r._snap || typeof r.updated_at !== 'string')) return null;
const fullAt = (await cacheGet(_NEWS_META_KEY))?.value?.fullAt;
if (!fullAt || Date.now() - fullAt > _NEWS_FULL_REFRESH_MS) return null;
const res = await _run(_windowFilter(sb.from('news').select('id,updated_at,published_at,archive_state,breaking')));
if (res.error || !Array.isArray(res.data) || res.data.length !== prev.length) return null;
const sig = (r) => [r.id, r.updated_at, r.published_at, r.archive_state ?? null, r.breaking === true].join('\u0001');
for (let i = 0; i < prev.length; i++) if (sig(res.data[i]) !== sig(prev[i])) return null;
return prev;
} catch { return null; }
}
async function _fetchNewsLite() {
const sb = await _sbRead();
const same = await _newsUnchanged(sb);
if (same) return same;
let res = await _run(_windowFilter(sb.from('news').select(_NEWS_LIST_COLS)));
if (res.error && (String(res.error.code) === '42703' || /excerpt/i.test(String(res.error.message || '')))) {
res = await _run(_windowFilter(sb.from('news').select('*')));
}
if (res.error) throw res.error;
const rows = (res.data || []).map(_liteRow);
cachePut(_NEWS_META_KEY, { fullAt: Date.now() }).catch(() => {});
setTimeout(() => { _prefetchBodies(rows); }, 2500);
return rows;
}
async function _seedNews() {
const docs = (await _feedSnapshot())?.news?.docs;
if (!Array.isArray(docs)) return null;
const live = docs
.filter(r => !_isEffectivelyArchived({ archiveState: r.archive_state }, r.published_at, 'news'))
.map(r => ({ ..._liteRow(r), _snap: true }));
return live.length ? live : null;
}
async function _newsRows({ fresh = false, full = false, all = false } = {}) {
if (all) {
return _rows('news:rows:all', async () => {
const sb = await _sbRead();
const { data, error } = await _run(sb.from('news').select('*').order('published_at', { ascending: false }).limit(1000));
if (error) throw error;
return data || [];
}, { collection: 'news', ttlMs: 300000, fresh });
}
if (full) {
return _rows('news:rows:full', async () => {
const sb = await _sbRead();
const { data, error } = await _run(_windowFilter(sb.from('news').select('*'), _NEWS_FULL_LIMIT));
if (error) throw error;
return data || [];
}, { collection: 'news', ttlMs: 1800000, fresh });
}
return _rows('news:rows', _fetchNewsLite, { collection: 'news', ttlMs: 300000, fresh, seed: _seedNews });
}
async function _patchNews(mutator) {
await Promise.all(['news:rows', 'news:rows:full', 'news:rows:all'].map(k => _patch(k, mutator)));
}
async function _savedItem(id) {
try { return (await cacheGet(_ITEM_KEY(id)))?.value || null; } catch { return null; }
}
async function _saveItem(row) {
try {
await cachePut(_ITEM_KEY(row.id), row);
if ((await cacheKeys('news:item:')).length > _ITEM_CAP) {
await cacheDelPrefix('news:item:');
await cachePut(_ITEM_KEY(row.id), row);
}
} catch {   }
}
async function _prefetchBodies(rows) {
try {
if (_offline() || _isSlowNet()) return;
const want = [];
for (const r of rows.slice(0, 3)) {
if (!r._lite) continue;
const saved = await _savedItem(r.id);
if (!saved || (r.updated_at && saved.updated_at !== r.updated_at)) want.push(String(r.id));
}
if (!want.length) return;
const sb = await _sbRead();
const { data, error } = await _run(sb.from('news').select('*').in('id', want));
if (error) return;
for (const row of data || []) await _saveItem(row);
} catch {   }
}
export async function getNews({ category, limit: lim, includeArchived = false, full = false } = {}) {
let items = (await _newsRows({ all: includeArchived, full: full && !includeArchived })).map(_news)
.filter(n => includeArchived || !_isEffectivelyArchived(n, n.publishedAt, 'news'))
.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
if (category && category !== 'all') items = items.filter(n => n.category === category);
return items.slice(0, lim || FEED_LIMIT.news).map(_newsToPublic);
}
export async function getLatestNewsId() {
try {
const rows = await _newsRows();
return rows.length ? String(rows[0].id) : null;
} catch {
return null;
}
}
export async function getNewsItem(id) {
const sid = String(id);
let listRow = null;
try { listRow = (await cacheGet('news:rows'))?.value?.find(r => String(r.id) === sid) || null; } catch {   }
if (listRow && !listRow._lite) return _newsToPublic(_news(listRow));
const saved = await _savedItem(sid);
if (saved && (!listRow?.updated_at || saved.updated_at === listRow.updated_at)) return _newsToPublic(_news(saved));
try {
const sb = await _sbRead();
const { data, error } = await _run(sb.from('news').select('*').eq('id', sid).maybeSingle());
if (error) throw error;
if (data) _saveItem(data);
return data ? _newsToPublic(_news(data)) : null;
} catch (err) {
if (listRow) return _newsToPublic(_news(listRow));
throw err;
}
}
export async function getBreakingNews() {
const all = (await _newsRows()).map(_news).filter(n => n.breaking);
if (!all.length) return null;
all.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
return _newsToPublic(all[0]);
}
export async function addNews(item) {
const row = { published_at: new Date().toISOString(), ..._newsRow(item) };
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('news').insert(row).select().single(), _WRITE_TIMEOUT_MS);
if (error) _fail(error);
await _patchNews(rows => [data, ...(rows || []).filter(r => String(r.id) !== String(data.id))]);
_reconcile('news:', 'recent:news');
return _newsToPublic(_news(data));
}
export async function updateNews(id, updates) {
const sb = await _sbWrite();
const { data, error } = await _run(
sb.from('news').update(_newsRow(updates)).eq('id', String(id)).select().maybeSingle(), _WRITE_TIMEOUT_MS);
if (error) _fail(error);
if (!data) throw new Error('الخبر دا ما عاد موجود أو ما عندك صلاحية');
await _patchNews(rows => (rows || []).map(r => (String(r.id) === String(id) ? data : r)));
_reconcile('news:', 'recent:news');
return _newsToPublic(_news(data));
}
export async function deleteNews(id) {
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('news').delete().eq('id', String(id)).select('id'), _WRITE_TIMEOUT_MS);
if (error) _fail(error);
if (!data?.length) throw new Error('ما قدرنا نحذف الخبر (الحذف النهائي للمالك فقط)');
await _patchNews(rows => (rows || []).filter(r => String(r.id) !== String(id)));
_reconcile('news:', 'recent:news');
}
export async function setNewsArchiveState(id, state) {
return updateNews(id, { archiveState: state });
}
const _eventLabel = (key) => EVENT_CATEGORIES.find(c => c.key === key)?.label || key;
function _event(r) {
const out = {
...(r.extra || {}),
id: String(r.id),
youtubeId: r.youtube_id, category: r.category, label: r.label,
title: r.title, date: r.date_text, excerpt: r.excerpt,
};
if (r._snap) out.fromSnapshot = true;
return out;
}
const _EVENT_COLS = { youtubeId: 'youtube_id', category: 'category', label: 'label', title: 'title', date: 'date_text', excerpt: 'excerpt' };
const _EVENT_IGNORED = new Set(['id', 'fromSnapshot']);
function _eventRow(obj) {
const row = {};
const extra = {};
for (const [k, v] of Object.entries(obj || {})) {
if (v === undefined || _EVENT_IGNORED.has(k)) continue;
if (_EVENT_COLS[k]) row[_EVENT_COLS[k]] = v;
else extra[k] = v;
}
if (Object.keys(extra).length) row.extra = extra;
return row;
}
async function _eventsUnchanged(sb, cacheKey, limit) {
try {
const cached = (await cacheGet(cacheKey))?.value;
if (!Array.isArray(cached) || !cached.length) return null;
const { data, count, error } = await _run(
sb.from('events').select('updated_at', { count: 'exact' }).order('updated_at', { ascending: false }).limit(1));
if (error || !data?.length || Math.min(count ?? -1, limit) !== cached.length) return null;
let newest = '';
for (const r of cached) if (typeof r.updated_at === 'string' && r.updated_at > newest) newest = r.updated_at;
return newest && data[0].updated_at === newest ? cached : null;
} catch { return null; }
}
async function _eventRows({ fresh = false } = {}) {
return _rows('events:rows', async () => {
const sb = await _sbRead();
const same = await _eventsUnchanged(sb, 'events:rows', 500);
if (same) return same;
const { data, error } = await _run(sb.from('events').select('*').order('created_at', { ascending: false }).limit(500));
if (error) throw error;
return data || [];
}, { collection: 'events', ttlMs: 1800000, fresh, seed: _seedEvents });
}
async function _seedEvents() {
const docs = (await _feedSnapshot())?.events?.docs;
return Array.isArray(docs) && docs.length ? docs.map(r => ({ ...r, _snap: true })) : null;
}
export async function getEvents() {
return (await _eventRows()).map(_event);
}
export async function addEvent(item) {
const row = _eventRow({ ...item, label: _eventLabel(item.category) });
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('events').insert(row).select().single(), _WRITE_TIMEOUT_MS);
if (error) _fail(error);
await _patch('events:rows', rows => [data, ...(rows || []).filter(r => String(r.id) !== String(data.id))]);
_reconcile('events:', 'recent:events');
return _event(data);
}
export async function updateEvent(id, updates) {
const payload = { ...updates };
if (updates.category) payload.label = _eventLabel(updates.category);
const sb = await _sbWrite();
const { data, error } = await _run(
sb.from('events').update(_eventRow(payload)).eq('id', String(id)).select().maybeSingle(), _WRITE_TIMEOUT_MS);
if (error) _fail(error);
if (!data) throw new Error('الفعالية دي ما عادت موجودة أو ما عندك صلاحية');
await _patch('events:rows', rows => (rows || []).map(r => (String(r.id) === String(id) ? data : r)));
_reconcile('events:', 'recent:events');
return _event(data);
}
export async function deleteEvent(id) {
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('events').delete().eq('id', String(id)).select('id'), _WRITE_TIMEOUT_MS);
if (error) _fail(error);
if (!data?.length) throw new Error('ما قدرنا نحذف الفعالية (الحذف النهائي للمالك فقط)');
await _patch('events:rows', rows => (rows || []).filter(r => String(r.id) !== String(id)));
_reconcile('events:', 'recent:events');
}
export async function getRecentContentIds(section) {
if (section !== 'news' && section !== 'events') return [];
try {
return await _rows(`recent:${section}`, async () => {
const sb = await _sbRead();
if (section === 'news') {
const { data, error } = await _run(
sb.from('news').select('id, published_at, archive_state').order('published_at', { ascending: false }).limit(RECENT_WINDOW));
if (error) throw error;
return (data || [])
.filter(r => !_isEffectivelyArchived({ archiveState: r.archive_state }, r.published_at, 'news'))
.map(r => String(r.id));
}
const { data, error } = await _run(
sb.from('events').select('id').order('created_at', { ascending: false }).limit(RECENT_WINDOW));
if (error) throw error;
return (data || []).map(r => String(r.id));
}, { collection: 'recent', ttlMs: 60000 });
} catch {
return [];
}
}
const READ_NOTIFS_KEY = 'akdar_read_notifications';
function _readNotifIds() {
try {
const raw = JSON.parse(localStorage.getItem(READ_NOTIFS_KEY) || '[]');
return new Set(Array.isArray(raw) ? raw.map(String) : []);
} catch {
return new Set();
}
}
export async function markNotificationRead(id) {
const readIds = _readNotifIds();
readIds.add(String(id));
try {
localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify([...readIds].slice(-300)));
} catch {   }
}
export async function saveNotification() {}
