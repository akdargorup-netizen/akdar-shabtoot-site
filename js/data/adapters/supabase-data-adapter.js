import { getSupabase }            from '../supabase-client.js';
import { stampKeyFor, ttlFor, stampsReady, onStampsChanged } from '../cache-stamps.js';
import { ensureSession }          from '../auth.js';
import { applyHeart, toggleHeart } from '../../shared/comment-hearts.js';
import { IDEA_STATUS_LABELS, IDEA_VOTE_THRESHOLDS } from '../idea-box-data.js';
import { RETENTION_DAYS, FEED_LIMIT, isArchived }   from '../retention.js';
import { SubmissionGuardError, dailyLimitMessage, ideaCommentLimitMessage } from '../../shared/submission-guard.js';
import { formatRelativeTime }     from '../../shared/relative-time.js';
import { isWithinEditWindow, REPORT_REASON_KEYS }   from '../moderation-config.js';
import { getCurrentUser }         from '../auth.js';
import { cacheGet, cachePut, cacheMarkStale, cacheKeys } from '../read-cache.js';
import { isRead as _isReadReq, assertReadAllowed, noteOutcome } from './rate-guard.js';
import { getDeviceId }            from '../../shared/device-id.js';
import { buildInteractionMessage } from '../local-data.js';
import { INTERACTION_NOTIFY_KINDS } from '../interaction-config.js';
import { getRecentContentIds as contentRecentIds } from './supabase-content-adapter.js';
const _DAY_MS = 86400000;
const _READ_TIMEOUT_MS = 15000;
const _WRITE_TIMEOUT_MS = 25000;
const RECENT_WINDOW = 10;
const _LIST_WINDOW_LIMIT = 120;
async function _sbWrite() {
const sb = await getSupabase();
await Promise.race([ensureSession(), new Promise(r => setTimeout(r, 8000))]);
return sb;
}
function _sbRead() { return getSupabase(); }
async function _run(builder, ms = _READ_TIMEOUT_MS) {
if (typeof navigator !== 'undefined' && navigator.onLine === false) {
throw Object.assign(new Error('offline'), { code: 'offline' });
}
const isRead = _isReadReq(builder);
if (isRead) assertReadAllowed();
const ctrl = new AbortController();
const timer = setTimeout(() => ctrl.abort(), ms);
try {
const res = await builder.abortSignal(ctrl.signal);
if (isRead && res) noteOutcome({ status: res.status, error: res.error });
return res;
} catch (err) {
if (ctrl.signal.aborted) {
const te = Object.assign(new Error('timeout'), { code: 'timeout' });
if (isRead) noteOutcome({ error: te });
throw te;
}
if (isRead) noteOutcome({ error: err });
throw err;
} finally {
clearTimeout(timer);
}
}
function _fail(error, kind) {
const msg = String(error?.message || '');
const code = String(error?.code || '');
const tag = (/^[a-z_]+$/.test(msg) ? `${code || 'DB'}-${msg}` : code) || error?.name || 'err';
const raise = (m) => { throw Object.assign(new Error(m), { code: tag }); };
if (msg.includes('daily_limit_reached')) throw new SubmissionGuardError(dailyLimitMessage(kind));
if (msg.includes('member_banned')) throw new SubmissionGuardError('أنت محظور من المشاركة — تواصل مع الإدارة');
if (msg.includes('inbox_rate_limited')) throw new SubmissionGuardError('أرسلت طلبات كتيرة في وقت قصير — انتظر شوية وجرّب تاني، ولو الأمر عاجل اتصل مباشرة');
if (msg.includes('body_too_long')) throw new SubmissionGuardError('النص طويل زيادة — اختصره وجرّب تاني');
if (msg.includes('comment_limit_reached')) throw new SubmissionGuardError(ideaCommentLimitMessage());
if (code === '23505') raise(kind === 'occasion-comment' ? 'لقد علّقت على هذه المناسبة من قبل' : 'أنت بلّغت عن دا قبل كدا');
if (code === '23503') raise('المحتوى دا ما عاد موجود');
if (msg.includes('not_allowed') || msg.includes('invalid_staff_role') || msg.includes('author_mismatch') || code === '42501') {
raise('ما عندك صلاحية لهذا الإجراء — تأكد إنك مسجّل دخول بحسابك');
}
const e = error instanceof Error ? error : new Error(msg || 'حصل خطأ غير متوقع');
if (!e.code) e.code = tag;
if (error?.status && !e.status) e.status = error.status;
throw e;
}
function _failWithStatus(res, kind) {
if (res?.error && res.status && typeof res.error === 'object' && !res.error.status) res.error.status = res.status;
_fail(res.error, kind);
}
async function _assertCanParticipate(uid) {
if (!uid) return;
const sb = await _sbWrite();
let data = null;
try {
({ data } = await _run(sb.from('member_moderation').select('status').eq('uid', String(uid)).maybeSingle()));
} catch {
return;
}
if (!data) return;
if (data.status === 'banned-full') throw new SubmissionGuardError('أنت محظور من استخدام التطبيق — تواصل مع الإدارة');
if (data.status === 'banned-partial') throw new SubmissionGuardError('أنت محظور من التعليق والمشاركة — تواصل مع الإدارة');
}
function _compact(o) {
const out = {};
for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
return out;
}
const _inflight = new Map();
const _revalidating = new Set();
const _loaders = new Map();
let _writeEpoch = 0;
const _isSlowNet = () => {
try {
const c = navigator.connection;
if (!c) return false;
if (c.saveData === true) return true;
if (/(^|-)[23]g$/.test(c.effectiveType || '')) return true;
if (typeof c.downlink === 'number' && c.downlink > 0 && c.downlink < 1.5) return true;
if (typeof c.rtt === 'number' && c.rtt > 700) return true;
return false;
} catch { return false; }
};
const _ttl = (ms) => ms * (_isSlowNet() ? 5 : 1);
const _offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
function _scope() {
const u = getCurrentUser();
if (!u || u.isAnonymous) return 'anon';
const c = u.claims || {};
return (c.admin === true || c.owner === true) ? 'admin' : String(u.uid);
}
function _announce(collection, id) {
try { window.dispatchEvent(new CustomEvent('akdar:data-refreshed', { detail: { collection, id } })); }
catch {   }
}
function _dedupe(key, fetcher) {
if (_inflight.has(key)) return _inflight.get(key);
const p = Promise.resolve().then(fetcher).finally(() => _inflight.delete(key));
_inflight.set(key, p);
return p;
}
function _revalidate(key, fetcher, prev, collection, id) {
if (_revalidating.has(key) || _offline()) return;
_revalidating.add(key);
const epoch = _writeEpoch;
_dedupe(key, fetcher)
.then((next) => {
if (epoch !== _writeEpoch) return;
cachePut(key, next);
if (JSON.stringify(next) !== JSON.stringify(prev)) _announce(collection, id);
})
.catch(() => {   })
.finally(() => _revalidating.delete(key));
}
async function _rows(key, fetcher, { collection, id, ttlMs = 60000, seed, fresh = false } = {}) {
if (stampKeyFor(key)) { await stampsReady(); _loaders.set(key, { fetcher, collection, id }); }
if (!fresh) {
let hit = await cacheGet(key);
if (!hit && seed !== undefined) {
hit = { value: seed, savedAt: 0 };
cachePut(key, seed, 0);
}
if (hit) {
if (Date.now() - hit.savedAt >= ttlFor(key, _ttl(ttlMs))) _revalidate(key, fetcher, hit.value, collection, id);
return hit.value;
}
}
const epoch = _writeEpoch;
const value = await _dedupe(key, fetcher);
cachePut(key, value, epoch === _writeEpoch ? Date.now() : 0);
return value;
}
onStampsChanged(async (changed) => {
for (const [key, { fetcher, collection, id }] of _loaders) {
if (!changed.has(stampKeyFor(key))) continue;
const hit = await cacheGet(key);
_revalidate(key, fetcher, hit?.value, collection, id);
}
});
async function _patch(key, mutator) {
_writeEpoch++;
const e = await cacheGet(key);
if (!e) return;
try { await cachePut(key, mutator(Array.isArray(e.value) ? e.value.slice() : e.value), e.savedAt); } catch {   }
}
async function _patchPost(kind, id, mutate) {
const t = _table(kind);
for (const key of await cacheKeys(`${t}:`)) {
if (key.startsWith(`${t}:rows`)) {
await _patch(key, (rows) => (rows || []).map(r => (r.id === id ? mutate(r) : r)).filter(Boolean));
} else if (key.startsWith(`${t}:one:${id}:`)) {
await _patch(key, (row) => (row ? mutate(row) : row));
}
}
}
async function _prependPost(kind, row) {
const t = _table(kind);
const isPublic = !row.moderation || row.moderation === 'approved';
for (const key of await cacheKeys(`${t}:rows`)) {
const scope = key.split(':').pop();
if (!(isPublic || scope === 'admin' || scope === String(row.author_uid))) continue;
await _patch(key, (rows) => [row, ...(rows || []).filter(r => r.id !== row.id)]);
}
for (const key of await cacheKeys(`${t}:one:${row.id}:`)) await cachePut(key, row);
}
async function _patchComments(kind, parentId, mutate) {
for (const key of await cacheKeys(`${kind}_comments:${parentId}:`)) await _patch(key, (rows) => mutate(rows || []));
}
function _reconcile(...prefixes) {
_writeEpoch++;
prefixes.forEach((p) => cacheMarkStale(p).catch(() => {}));
}
async function _topIdFromCache() {
const e = await cacheGet(`ideas:rows:${_scope()}`);
const rows = (e?.value || []).filter(r => (!r.moderation || r.moderation === 'approved') && !r.deleted_by_author);
let best = null;
for (const r of rows) if (!best || (r.votes_up ?? 0) > (best.votes_up ?? 0)) best = r;
return best && (best.votes_up ?? 0) > 0 ? best.id : null;
}
function _idea(r) {
return _compact({
id: r.id,
title: r.title, description: r.description, benefit: r.benefit,
category: r.category, proposedEntity: r.proposed_entity,
authorUid: r.author_uid, authorName: r.author_name,
staffRole: r.staff_role || undefined,
moderation: r.moderation || undefined,
archiveState: r.archive_state || undefined,
deletedByAuthor: r.deleted_by_author === true,
votesUp: r.votes_up ?? 0, votesDown: r.votes_down ?? 0,
commentsCount: r.comments_count ?? 0, reportsCount: r.reports_count ?? 0,
editedAt: r.edited_at || undefined,
createdAt: r.created_at, updatedAt: r.updated_at,
});
}
function _occasion(r) {
return _compact({
id: r.id,
title: r.title, ownerName: r.owner_name, category: r.category,
eventDate: r.event_date, eventLocation: r.event_location, text: r.text,
authorUid: r.author_uid, authorName: r.author_name,
staffRole: r.staff_role || undefined,
moderation: r.moderation || undefined,
archiveState: r.archive_state || undefined,
deletedByAuthor: r.deleted_by_author === true,
likesCount: r.likes_count ?? 0, commentsCount: r.comments_count ?? 0,
reportsCount: r.reports_count ?? 0,
editedAt: r.edited_at || undefined,
createdAt: r.created_at, updatedAt: r.updated_at,
});
}
function _comment(kind, r) {
const base = {
id: kind === 'occasion' ? r.uid : r.id,
uid: r.uid, authorName: r.author_name, text: r.text,
staffRole: r.staff_role || undefined,
moderation: r.moderation || undefined,
reportsCount: r.reports_count ?? 0,
deletedByAuthor: r.deleted_by_author === true,
editedAt: r.edited_at || undefined,
createdAt: r.created_at,
likedBy: [], likesCount: 0,
};
if (kind === 'idea') {
base.parentId = r.parent_id || ''; base.replyToId = r.reply_to_id || ''; base.replyToName = r.reply_to_name || '';
}
return _compact(base);
}
function _visibleToViewer(item, { includePending = false, viewerUid = null } = {}) {
if (includePending) return true;
if (item.deletedByAuthor) return false;
if (item.moderation !== 'pending' && item.moderation !== 'reported') return true;
return !!viewerUid && item.authorUid === viewerUid;
}
function _isEffectivelyArchived(item, dateValue, type) {
if (item.archiveState === 'archived') return true;
if (item.archiveState === 'restored') return false;
return isArchived(dateValue, type);
}
function _ideaStatus(votesUp, votesDown) {
const total = votesUp + votesDown;
if (total < IDEA_VOTE_THRESHOLDS.minVotesForVerdict) return 'discussion';
const ratio = votesUp / total;
if (ratio >= IDEA_VOTE_THRESHOLDS.promisingRatio) return 'promising';
if (ratio < IDEA_VOTE_THRESHOLDS.weakRatio) return 'weak';
return 'discussion';
}
function _ideaToPublic(idea, topVotedId) {
const votesUp = idea.votesUp || 0, votesDown = idea.votesDown || 0;
const total = votesUp + votesDown;
const statusKey = _ideaStatus(votesUp, votesDown);
return {
...idea,
categoryLabel: idea.category,
percent: total > 0 ? Math.round((votesUp / total) * 100) : 0,
totalVotes: total,
hasEnoughVotes: total >= IDEA_VOTE_THRESHOLDS.minVotesForVerdict,
statusKey,
statusLabel: IDEA_STATUS_LABELS[statusKey],
date: formatRelativeTime(idea.createdAt),
isTopVoted: idea.id === topVotedId && votesUp > 0 && total >= IDEA_VOTE_THRESHOLDS.minVotesForVerdict,
archived: _isEffectivelyArchived(idea, idea.createdAt, 'ideas'),
};
}
function _occasionToPublic(occasion) {
return {
...occasion,
date: formatRelativeTime(occasion.createdAt),
archived: _isEffectivelyArchived(occasion, occasion.createdAt, 'occasions'),
likesCount: occasion.likesCount ?? 0,
};
}
function _toPublic(kind, row, topId = null) {
return kind === 'idea' ? _ideaToPublic(_idea(row), topId) : _occasionToPublic(_occasion(row));
}
const _TABLE = { idea: 'ideas', occasion: 'occasions' };
function _table(kind) {
if (!_TABLE[kind]) throw new Error('نوع المحتوى دا ما معروف');
return _TABLE[kind];
}
function _windowFilter(type) {
const start = new Date(Date.now() - ((RETENTION_DAYS[type] ?? 45) + 1) * _DAY_MS).toISOString();
return `created_at.gte.${start},archive_state.eq.restored`;
}
const _PUBLIC_FILTER = 'moderation.is.null,moderation.eq.approved';
function _topIdFromRows(rows) {
let best = null;
for (const r of rows || []) {
if ((r.moderation && r.moderation !== 'approved') || r.deleted_by_author) continue;
if (!best || (r.votes_up ?? 0) > (best.votes_up ?? 0)) best = r;
}
return best && (best.votes_up ?? 0) > 0 ? best.id : null;
}
const _FP_COLS = {
ideas: ['id', 'created_at', 'updated_at', 'edited_at', 'moderation', 'archive_state', 'deleted_by_author',
'votes_up', 'votes_down', 'comments_count', 'reports_count'],
occasions: ['id', 'created_at', 'updated_at', 'edited_at', 'moderation', 'archive_state', 'deleted_by_author',
'likes_count', 'comments_count', 'reports_count'],
};
const _FP_MAX_CHANGED = 30;
async function _windowRowsIncremental(table, prevRows) {
const sb = await _sbRead();
const cols = _FP_COLS[table];
const win = () => ({ ascending: false });
const fullQuery = () => sb.from(table).select('*')
.order('created_at', win()).or(_windowFilter(table)).limit(_LIST_WINDOW_LIMIT);
const full = async () => {
const { data, error } = await _run(fullQuery());
if (error) throw error;
return data || [];
};
if (!cols || !Array.isArray(prevRows) || !prevRows.length) return full();
const fpRes = await _run(sb.from(table).select(cols.join(','))
.order('created_at', win()).or(_windowFilter(table)).limit(_LIST_WINDOW_LIMIT));
if (fpRes.error || !Array.isArray(fpRes.data)) return full();
const fp = fpRes.data;
if (!fp.length) return [];
const sig = (r) => cols.map((c) => (r[c] === undefined ? null : r[c])).join('\u0001');
const prevById = new Map(prevRows.map((r) => [String(r.id), r]));
const need = [];
for (const f of fp) {
const p = prevById.get(String(f.id));
if (!p || sig(p) !== sig(f)) need.push(String(f.id));
}
if (need.length > _FP_MAX_CHANGED) return full();
const fetched = new Map();
if (need.length) {
const { data, error } = await _run(sb.from(table).select('*').in('id', need));
if (error) return full();
for (const r of data || []) fetched.set(String(r.id), r);
}
const needSet = new Set(need);
const out = [];
for (const f of fp) {
const id = String(f.id);
if (needSet.has(id)) { if (fetched.has(id)) out.push(fetched.get(id)); }
else out.push(prevById.get(id));
}
return out;
}
async function _ideaRows(all) {
const key = `ideas:${all ? 'rowsAll' : 'rows'}:${_scope()}`;
return _rows(key, async () => {
if (!all) return _windowRowsIncremental('ideas', (await cacheGet(key))?.value);
const sb = await _sbRead();
const { data, error } = await _run(sb.from('ideas').select('*').order('created_at', { ascending: false }).limit(1000));
if (error) throw error;
return data || [];
}, { collection: 'ideas', ttlMs: all ? 15000 : 300000 });
}
export async function getIdeas({ category, sort, includeArchived = false, includePending = false, viewerUid = null } = {}) {
const rows = await _ideaRows(includeArchived);
const topId = _topIdFromRows(rows);
let items = rows.map(_idea)
.filter(i => _visibleToViewer(i, { includePending, viewerUid }))
.filter(i => includeArchived || !_isEffectivelyArchived(i, i.createdAt, 'ideas'))
.map(i => _ideaToPublic(i, topId));
if (category && category !== 'all') items = items.filter(i => i.category === category);
if (sort === 'top') items.sort((a, b) => b.votesUp - a.votesUp);
else items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
return items.slice(0, FEED_LIMIT.ideas);
}
export async function getLatestIdeaId() {
try {
return await _rows('ideas:latest', async () => {
const sb = await _sbRead();
const { data, error } = await _run(
sb.from('ideas').select('id').or(_PUBLIC_FILTER).eq('deleted_by_author', false)
.order('created_at', { ascending: false }).limit(1),
);
if (error) throw error;
return data?.[0]?.id ?? null;
}, { collection: 'latest', ttlMs: 60000 });
} catch {
return null;
}
}
export async function getIdea(id) {
const sid = String(id);
const scope = _scope();
const listHit = await cacheGet(`ideas:rows:${scope}`);
const seed = listHit ? (listHit.value || []).find(r => r.id === sid) : undefined;
const row = await _rows(`ideas:one:${sid}:${scope}`, async () => {
const sb = await _sbRead();
const { data, error } = await _run(sb.from('ideas').select('*').eq('id', sid).maybeSingle());
if (error) throw error;
return data || null;
}, { collection: 'ideas', id: sid, ttlMs: 30000, seed });
return row ? _ideaToPublic(_idea(row), await _topIdFromCache()) : null;
}
export async function addIdea(ideaData) {
await _assertCanParticipate(ideaData.authorUid);
const sb = await _sbWrite();
const row = _compact({
title: ideaData.title, description: ideaData.description ?? '', benefit: ideaData.benefit ?? '',
category: ideaData.category, proposed_entity: ideaData.proposedEntity ?? '',
author_uid: ideaData.authorUid, author_name: ideaData.authorName,
staff_role: ideaData.staffRole || undefined,
});
const { data, error } = await _run(sb.from('ideas').insert(row).select().single(), _WRITE_TIMEOUT_MS);
if (error) _fail(error, 'ideas');
await _prependPost('idea', data);
_reconcile('ideas:', 'recent:ideas');
return _ideaToPublic(_idea(data), await _topIdFromCache());
}
export async function voteIdea(ideaId, uid, value) {
await _assertCanParticipate(uid);
const sb = await _sbWrite();
const id = String(ideaId);
const me = String(uid);
const prevRes = await _run(sb.from('idea_votes').select('value').eq('idea_id', id).eq('voter_uid', me).maybeSingle());
if (prevRes.error) _failWithStatus(prevRes, 'ideas');
const previous = prevRes.data?.value ?? null;
if (previous !== value) {
const update = () => _run(sb.from('idea_votes').update({ value }).eq('idea_id', id).eq('voter_uid', me), _WRITE_TIMEOUT_MS);
let res = previous
? await update()
: await _run(sb.from('idea_votes').insert({ idea_id: id, voter_uid: me, value }), _WRITE_TIMEOUT_MS);
if (res.error && !previous && res.error.code === '23505') res = await update();
if (res.error) _failWithStatus(res, 'ideas');
}
const { data: row, error } = await _run(sb.from('ideas').select('votes_up, votes_down').eq('id', id).maybeSingle());
if (error) throw error;
if (!row) throw new Error(`ما لقيت فكرة بالمعرف: ${ideaId}`);
const counts = { votesUp: row.votes_up ?? 0, votesDown: row.votes_down ?? 0 };
cachePut(`idea_vote:${id}:${uid}`, value);
await _patchPost('idea', id, r => ({ ...r, votes_up: counts.votesUp, votes_down: counts.votesDown }));
_reconcile('ideas:');
return counts;
}
export async function getUserVote(ideaId, uid) {
if (!uid) return null;
return _rows(`idea_vote:${ideaId}:${uid}`, async () => {
const sb = await _sbRead();
const { data, error } = await _run(sb.from('idea_votes').select('value').eq('idea_id', String(ideaId)).eq('voter_uid', String(uid)).maybeSingle());
if (error) throw error;
return data?.value ?? null;
}, { collection: 'idea_vote', id: String(ideaId), ttlMs: 120000 });
}
export async function getIdeaComments(ideaId) {
const rows = await _rows(`idea_comments:${ideaId}:${_scope()}`, async () => {
const sb = await _sbRead();
const { data, error } = await _run(
sb.from('idea_comments').select('*').eq('idea_id', String(ideaId))
.order('created_at', { ascending: false }).limit(FEED_LIMIT.comments),
);
if (error) throw error;
return data || [];
}, { collection: 'idea_comments', id: String(ideaId), ttlMs: 120000 });
const myUid = getCurrentUser()?.uid;
return rows
.map(r => applyHeart(_comment('idea', r), 'idea', ideaId, r.id, myUid))
.filter(c => !isArchived(c.createdAt, 'comments'))
.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
.slice(-FEED_LIMIT.comments);
}
export async function addIdeaComment(ideaId, comment) {
await _assertCanParticipate(comment.uid);
const sb = await _sbWrite();
const base = _compact({
idea_id: String(ideaId), uid: comment.uid, author_name: comment.authorName, text: comment.text,
parent_id: comment.parentId || undefined, reply_to_id: comment.replyToId || undefined,
reply_to_name: comment.replyToName || undefined, staff_role: comment.staffRole || undefined,
});
const clientId = comment.clientId ? String(comment.clientId).slice(0, 64) : '';
const attempt = async (r) => {
try { return await _run(sb.from('idea_comments').insert(r).select().single(), _WRITE_TIMEOUT_MS); }
catch (err) { return { data: null, error: err, thrown: true }; }
};
let res = await attempt(clientId ? { ...base, client_id: clientId } : base);
let existed = false;
if (res.error && clientId) {
if (res.error.code === 'PGRST204' || /client_id/i.test(String(res.error.message || ''))) {
res = await attempt(base);
} else {
try {
const found = await _run(sb.from('idea_comments').select('*').eq('client_id', clientId).maybeSingle());
if (found?.data) { res = { data: found.data, error: null }; existed = true; }
} catch {   }
}
}
if (res.error) { if (res.thrown) throw res.error; _fail(res.error, 'idea-comment'); }
const data = res.data;
if (!existed) _notifyComment('idea', ideaId, comment.uid);
await _patchComments('idea', String(ideaId), rows => [data, ...rows.filter(r => r.id !== data.id)]);
if (!existed) await _patchPost('idea', String(ideaId), r => ({ ...r, comments_count: (r.comments_count ?? 0) + 1 }));
_reconcile('ideas:', 'idea_comments:');
return _comment('idea', data);
}
export async function toggleIdeaCommentLike(ideaId, commentId, uid) {
const liked = toggleHeart('idea', ideaId, commentId);
return { liked, likesCount: 0 };
}
export async function updateIdea(id, patch) {
const updates = _compact({
title: patch.title, description: patch.description, benefit: patch.benefit,
category: patch.category, proposed_entity: patch.proposedEntity,
});
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('ideas').update(updates).eq('id', String(id)).select().maybeSingle());
if (error) _fail(error, 'ideas');
if (!data) throw new Error('المحتوى دا ما عاد موجود أو ما عندك صلاحية تعدّله');
await _patchPost('idea', String(id), () => data);
_reconcile('ideas:');
return _ideaToPublic(_idea(data), await _topIdFromCache());
}
export async function deleteIdea(id) {
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('ideas').delete().eq('id', String(id)).select('id'));
if (error) _fail(error, 'ideas');
if (!data?.length) throw new Error('ما قدرنا نحذف الفكرة (الحذف النهائي للمالك فقط)');
await _patchPost('idea', String(id), () => null);
_reconcile('ideas:', 'recent:ideas');
}
export async function setIdeaArchiveState(id, state) {
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('ideas').update({ archive_state: state }).eq('id', String(id)).select().maybeSingle());
if (error) _fail(error, 'ideas');
if (!data) throw new Error('المحتوى دا ما عاد موجود أو ما عندك صلاحية');
await _patchPost('idea', String(id), () => data);
_reconcile('ideas:', 'recent:ideas');
return _ideaToPublic(_idea(data), await _topIdFromCache());
}
export async function approveIdea(id) {
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('ideas').update({ moderation: 'approved' }).eq('id', String(id)).select().maybeSingle());
if (error) _fail(error, 'ideas');
if (!data) throw new Error('المحتوى دا ما عاد موجود أو ما عندك صلاحية');
await _patchPost('idea', String(id), () => data);
_reconcile('ideas:', 'recent:ideas');
return _ideaToPublic(_idea(data), await _topIdFromCache());
}
async function _occasionRows(all) {
const key = `occasions:${all ? 'rowsAll' : 'rows'}:${_scope()}`;
return _rows(key, async () => {
if (!all) return _windowRowsIncremental('occasions', (await cacheGet(key))?.value);
const sb = await _sbRead();
const { data, error } = await _run(sb.from('occasions').select('*').order('created_at', { ascending: false }).limit(1000));
if (error) throw error;
return data || [];
}, { collection: 'occasions', ttlMs: all ? 15000 : 180000 });
}
export async function getOccasions({ category, includeArchived = false, includePending = false, viewerUid = null } = {}) {
const rows = await _occasionRows(includeArchived);
let items = rows.map(_occasion)
.filter(o => _visibleToViewer(o, { includePending, viewerUid }))
.filter(o => includeArchived || !_isEffectivelyArchived(o, o.createdAt, 'occasions'))
.map(_occasionToPublic);
if (category && category !== 'all') items = items.filter(o => o.category === category);
items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
return items.slice(0, FEED_LIMIT.occasions);
}
export async function getLatestOccasionId() {
try {
return await _rows('occasions:latest', async () => {
const sb = await _sbRead();
const { data, error } = await _run(
sb.from('occasions').select('id').or(_PUBLIC_FILTER).eq('deleted_by_author', false)
.order('created_at', { ascending: false }).limit(1),
);
if (error) throw error;
return data?.[0]?.id ?? null;
}, { collection: 'latest', ttlMs: 60000 });
} catch {
return null;
}
}
export async function getOccasion(id) {
const sid = String(id);
const scope = _scope();
const listHit = await cacheGet(`occasions:rows:${scope}`);
const seed = listHit ? (listHit.value || []).find(r => r.id === sid) : undefined;
const row = await _rows(`occasions:one:${sid}:${scope}`, async () => {
const sb = await _sbRead();
const { data, error } = await _run(sb.from('occasions').select('*').eq('id', sid).maybeSingle());
if (error) throw error;
return data || null;
}, { collection: 'occasions', id: sid, ttlMs: 30000, seed });
return row ? _occasionToPublic(_occasion(row)) : null;
}
export async function addOccasion(occasionData) {
await _assertCanParticipate(occasionData.authorUid);
const sb = await _sbWrite();
const row = _compact({
title: occasionData.title, owner_name: occasionData.ownerName ?? '', category: occasionData.category,
event_date: occasionData.eventDate ?? '', event_location: occasionData.eventLocation ?? '',
text: occasionData.text ?? '',
author_uid: occasionData.authorUid, author_name: occasionData.authorName,
staff_role: occasionData.staffRole || undefined,
});
const { data, error } = await _run(sb.from('occasions').insert(row).select().single(), _WRITE_TIMEOUT_MS);
if (error) _fail(error, 'occasions');
await _prependPost('occasion', data);
_reconcile('occasions:', 'recent:occasions');
return _occasionToPublic(_occasion(data));
}
export async function setOccasionLike(occasionId, uid, liked) {
await _assertCanParticipate(uid);
const sb = await _sbWrite();
const id = String(occasionId);
const me = String(uid);
const want = !!liked;
const cur = await _run(sb.from('occasion_likes').select('uid').eq('occasion_id', id).eq('uid', me).maybeSingle());
if (cur.error) _failWithStatus(cur, 'occasions');
const has = !!cur.data;
if (has !== want) {
const res = want
? await _run(sb.from('occasion_likes').insert({ occasion_id: id, uid: me }), _WRITE_TIMEOUT_MS)
: await _run(sb.from('occasion_likes').delete().eq('occasion_id', id).eq('uid', me), _WRITE_TIMEOUT_MS);
if (res.error && !(want && res.error.code === '23505')) _failWithStatus(res, 'occasions');
}
const { data: row } = await _run(sb.from('occasions').select('likes_count').eq('id', id).maybeSingle());
const likesCount = row?.likes_count ?? 0;
cachePut(`occasion_like:${id}:${uid}`, want);
await _patchPost('occasion', id, r => ({ ...r, likes_count: likesCount }));
_reconcile('occasions:');
return { liked: want, likesCount };
}
export async function getUserOccasionLike(occasionId, uid) {
if (!uid) return false;
return _rows(`occasion_like:${occasionId}:${uid}`, async () => {
const sb = await _sbRead();
const { data, error } = await _run(sb.from('occasion_likes').select('uid').eq('occasion_id', String(occasionId)).eq('uid', String(uid)).maybeSingle());
if (error) throw error;
return !!data;
}, { collection: 'occasion_like', id: String(occasionId), ttlMs: 120000 });
}
export async function getOccasionComments(occasionId) {
const rows = await _rows(`occasion_comments:${occasionId}:${_scope()}`, async () => {
const sb = await _sbRead();
const { data, error } = await _run(
sb.from('occasion_comments').select('*').eq('occasion_id', String(occasionId))
.order('created_at', { ascending: false }).limit(FEED_LIMIT.comments),
);
if (error) throw error;
return data || [];
}, { collection: 'occasion_comments', id: String(occasionId), ttlMs: 120000 });
const myUid = getCurrentUser()?.uid;
return rows
.map(r => applyHeart(_comment('occasion', r), 'occasion', occasionId, r.uid, myUid))
.filter(c => !isArchived(c.createdAt, 'comments'))
.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
.slice(-FEED_LIMIT.comments);
}
export async function toggleOccasionCommentLike(occasionId, commentId, uid) {
const liked = toggleHeart('occasion', occasionId, commentId);
return { liked, likesCount: 0 };
}
export async function getUserOccasionComment(occasionId, uid) {
if (!uid) return null;
const row = await _rows(`occasion_comment_mine:${occasionId}:${uid}`, async () => {
const sb = await _sbRead();
const { data, error } = await _run(sb.from('occasion_comments').select('*').eq('occasion_id', String(occasionId)).eq('uid', String(uid)).maybeSingle());
if (error) throw error;
return data || null;
}, { collection: 'occasion_comment_mine', id: String(occasionId), ttlMs: 600000 });
return row ? _comment('occasion', row) : null;
}
export async function addOccasionComment(occasionId, comment) {
await _assertCanParticipate(comment.uid);
const sb = await _sbWrite();
const row = _compact({
occasion_id: String(occasionId), uid: comment.uid, author_name: comment.authorName,
text: comment.text, staff_role: comment.staffRole || undefined,
});
const { data, error } = await _run(sb.from('occasion_comments').insert(row).select().single(), _WRITE_TIMEOUT_MS);
if (error) _fail(error, 'occasion-comment');
_notifyComment('occasion', occasionId, comment.uid);
await _patchComments('occasion', String(occasionId), rows => [data, ...rows.filter(r => r.uid !== data.uid)]);
cachePut(`occasion_comment_mine:${occasionId}:${comment.uid}`, data);
await _patchPost('occasion', String(occasionId), r => ({ ...r, comments_count: (r.comments_count ?? 0) + 1 }));
_reconcile('occasions:', 'occasion_comments:');
return _comment('occasion', data);
}
export async function updateOccasion(id, patch) {
const updates = _compact({
title: patch.title, owner_name: patch.ownerName, category: patch.category,
text: patch.text, event_date: patch.eventDate, event_location: patch.eventLocation,
});
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('occasions').update(updates).eq('id', String(id)).select().maybeSingle());
if (error) _fail(error, 'occasions');
if (!data) throw new Error('المحتوى دا ما عاد موجود أو ما عندك صلاحية تعدّله');
await _patchPost('occasion', String(id), () => data);
_reconcile('occasions:');
return _occasionToPublic(_occasion(data));
}
export async function deleteOccasion(id) {
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('occasions').delete().eq('id', String(id)).select('id'));
if (error) _fail(error, 'occasions');
if (!data?.length) throw new Error('ما قدرنا نحذف المناسبة (الحذف النهائي للمالك فقط)');
await _patchPost('occasion', String(id), () => null);
_reconcile('occasions:', 'recent:occasions');
}
export async function setOccasionArchiveState(id, state) {
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('occasions').update({ archive_state: state }).eq('id', String(id)).select().maybeSingle());
if (error) _fail(error, 'occasions');
if (!data) throw new Error('المحتوى دا ما عاد موجود أو ما عندك صلاحية');
await _patchPost('occasion', String(id), () => data);
_reconcile('occasions:', 'recent:occasions');
return _occasionToPublic(_occasion(data));
}
export async function approveOccasion(id) {
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('occasions').update({ moderation: 'approved' }).eq('id', String(id)).select().maybeSingle());
if (error) _fail(error, 'occasions');
if (!data) throw new Error('المحتوى دا ما عاد موجود أو ما عندك صلاحية');
await _patchPost('occasion', String(id), () => data);
_reconcile('occasions:', 'recent:occasions');
return _occasionToPublic(_occasion(data));
}
const _POST_EDIT_FIELDS = {
idea:     { title: 'title', description: 'description', benefit: 'benefit', category: 'category', proposedEntity: 'proposed_entity' },
occasion: { title: 'title', ownerName: 'owner_name', category: 'category', text: 'text', eventDate: 'event_date', eventLocation: 'event_location' },
};
function _assertEditable(data, ownerUid, uid) {
if (!uid || ownerUid !== uid) throw new Error('ما تقدر تعدّل إلا محتواك');
if (data.moderation === 'reported') throw new Error('المحتوى دا تحت مراجعة المشرف');
if (!isWithinEditWindow(data.createdAt)) throw new Error('انتهت مهلة التعديل (١٥ دقيقة من النشر)');
}
async function _getPostRow(sb, kind, id) {
const { data, error } = await _run(sb.from(_table(kind)).select('*').eq('id', String(id)).maybeSingle());
if (error) throw error;
if (!data) throw new Error('المحتوى دا ما عاد موجود');
return data;
}
export async function editOwnPost(kind, id, uid, patch) {
await _assertCanParticipate(uid);
const sb = await _sbWrite();
const row = await _getPostRow(sb, kind, id);
_assertEditable(kind === 'idea' ? _idea(row) : _occasion(row), row.author_uid, uid);
const updates = {};
for (const [field, col] of Object.entries(_POST_EDIT_FIELDS[kind])) {
if (patch[field] !== undefined) updates[col] = patch[field];
}
const { data, error } = await _run(sb.from(_table(kind)).update(updates).eq('id', String(id)).select().single(), _WRITE_TIMEOUT_MS);
if (error) _fail(error, kind);
await _patchPost(kind, String(id), () => data);
_reconcile(`${_table(kind)}:`);
return _toPublic(kind, data, await _topIdFromCache());
}
export async function deleteOwnPost(kind, id, uid) {
const sb = await _sbWrite();
const row = await _getPostRow(sb, kind, id);
if (!uid || row.author_uid !== uid) throw new Error('ما تقدر تحذف إلا محتواك');
const { error } = await _run(sb.from(_table(kind)).update({ deleted_by_author: true }).eq('id', String(id)), _WRITE_TIMEOUT_MS);
if (error) _fail(error, kind);
await _patchPost(kind, String(id), r => ({ ...r, deleted_by_author: true }));
_reconcile(`${_table(kind)}:`, `recent:${_table(kind)}`);
}
async function _submitReport(sb, table, fkCol, fkValue, ownerUid, uid, reason, readBack) {
await _assertCanParticipate(uid);
if (!uid) throw new Error('سجّل دخولك أول عشان تبلّغ');
if (ownerUid === uid) throw new Error('ما تقدر تبلّغ عن محتواك');
if (!REPORT_REASON_KEYS.includes(reason)) throw new Error('سبب البلاغ دا ما صالح');
const { error } = await _run(sb.from(table).insert({ [fkCol]: fkValue, reporter_uid: String(uid), reason }));
if (error) _fail(error, 'report');
const row = await readBack();
return row
? { reportsCount: row.reports_count ?? 0, hidden: row.moderation === 'reported' }
: { reportsCount: 3, hidden: true };
}
export async function reportPost(kind, id, uid, reason) {
const sb = await _sbWrite();
const row = await _getPostRow(sb, kind, id);
const table = kind === 'idea' ? 'idea_reports' : 'occasion_reports';
const fkCol = kind === 'idea' ? 'idea_id' : 'occasion_id';
const res = await _submitReport(sb, table, fkCol, String(id), row.author_uid, uid, reason, async () => {
const { data } = await _run(sb.from(_table(kind)).select('reports_count, moderation').eq('id', String(id)).maybeSingle());
return data;
});
await _patchPost(kind, String(id), r => (res.hidden ? null : { ...r, reports_count: res.reportsCount }));
_reconcile(`${_table(kind)}:`);
return res;
}
function _commentTarget(kind, parentId, commentId) {
return kind === 'idea'
? { table: 'idea_comments', match: { id: String(commentId), idea_id: String(parentId) } }
: { table: 'occasion_comments', match: { occasion_id: String(parentId), uid: String(commentId) } };
}
async function _getCommentRow(sb, kind, parentId, commentId) {
const { table, match } = _commentTarget(kind, parentId, commentId);
const { data, error } = await _run(sb.from(table).select('*').match(match).maybeSingle());
if (error) throw error;
if (!data) throw new Error('التعليق دا ما عاد موجود');
return data;
}
export async function editOwnComment(kind, parentId, commentId, uid, text) {
await _assertCanParticipate(uid);
const sb = await _sbWrite();
const row = await _getCommentRow(sb, kind, parentId, commentId);
_assertEditable(_comment(kind, row), row.uid, uid);
const { table, match } = _commentTarget(kind, parentId, commentId);
const { data, error } = await _run(sb.from(table).update({ text }).match(match).select().single(), _WRITE_TIMEOUT_MS);
if (error) _fail(error, kind);
await _patchComments(kind, String(parentId), rows => rows.map(r => (r.id === data.id ? data : r)));
_reconcile(`${kind}_comments:`);
return _comment(kind, data);
}
export async function deleteOwnComment(kind, parentId, commentId, uid) {
const sb = await _sbWrite();
const row = await _getCommentRow(sb, kind, parentId, commentId);
if (!uid || row.uid !== uid) throw new Error('ما تقدر تحذف إلا تعليقك');
const { table, match } = _commentTarget(kind, parentId, commentId);
const res = kind === 'occasion'
? await _run(sb.from(table).delete().match(match))
: await _run(sb.from(table).update({ deleted_by_author: true }).match(match));
if (res.error) _fail(res.error, kind);
await _patchComments(kind, String(parentId), rows => (kind === 'occasion'
? rows.filter(r => r.uid !== row.uid)
: rows.map(r => (r.id === row.id ? { ...r, deleted_by_author: true } : r))));
if (kind === 'occasion') {
cachePut(`occasion_comment_mine:${parentId}:${row.uid}`, null);
await _patchPost('occasion', String(parentId), r => ({ ...r, comments_count: Math.max(0, (r.comments_count ?? 1) - 1) }));
}
_reconcile(`${kind}_comments:`, `${_table(kind)}:`);
}
export async function reportComment(kind, parentId, commentId, uid, reason) {
const sb = await _sbWrite();
const row = await _getCommentRow(sb, kind, parentId, commentId);
const table = kind === 'idea' ? 'idea_comment_reports' : 'occasion_comment_reports';
const { table: ctable } = _commentTarget(kind, parentId, commentId);
const res = await _submitReport(sb, table, 'comment_id', row.id, row.uid, uid, reason, async () => {
const { data } = await _run(sb.from(ctable).select('reports_count, moderation').eq('id', row.id).maybeSingle());
return data;
});
await _patchComments(kind, String(parentId), rows => (res.hidden
? rows.filter(r => r.id !== row.id)
: rows.map(r => (r.id === row.id ? { ...r, reports_count: res.reportsCount } : r))));
_reconcile(`${kind}_comments:`);
return res;
}
export async function restoreComment(kind, parentId, commentId) {
const sb = await _sbWrite();
const { table, match } = _commentTarget(kind, parentId, commentId);
const { data, error } = await _run(sb.from(table).update({ moderation: 'approved' }).match(match).select().maybeSingle());
if (error) _fail(error, kind);
if (!data) throw new Error('التعليق دا ما عاد موجود أو ما عندك صلاحية');
await _patchComments(kind, String(parentId), rows => rows.map(r => (r.id === data.id ? data : r)));
_reconcile(`${kind}_comments:`);
return _comment(kind, data);
}
export async function getReviewQueueCounts() {
const sb = await _sbWrite();
const count = async (table) => {
const { count: n, error } = await _run(
sb.from(table).select('id', { count: 'exact', head: true })
.in('moderation', ['pending', 'reported']).eq('deleted_by_author', false),
);
if (error) throw error;
return n ?? 0;
};
const [ideas, occasions] = await Promise.all([count('ideas'), count('occasions')]);
return { ideas, occasions };
}
export async function getRecentContentIds(section) {
if (section !== 'ideas' && section !== 'occasions') return contentRecentIds(section);
try {
return await _rows(`recent:${section}`, async () => {
const sb = await _sbRead();
const { data, error } = await _run(
sb.from(section).select('id, created_at, archive_state')
.or(_PUBLIC_FILTER).eq('deleted_by_author', false)
.order('created_at', { ascending: false }).limit(RECENT_WINDOW),
);
if (error) throw error;
return (data || [])
.filter(r => !_isEffectivelyArchived({ archiveState: r.archive_state }, r.created_at, section))
.map(r => String(r.id));
}, { collection: 'recent', ttlMs: 60000 });
} catch {
return [];
}
}
const READ_NOTIFS_KEY = 'akdar_read_notifications';
const _SHORT_TTL_MS = 15000;
let _inboxMemo = null;
let _membersMemo = null;
function _readNotifIds() {
try {
const raw = JSON.parse(localStorage.getItem(READ_NOTIFS_KEY) || '[]');
return new Set(Array.isArray(raw) ? raw.map(String) : []);
} catch {
return new Set();
}
}
function _notif(r) {
return _compact({
...(r.extra || {}),
id: r.id, type: r.type, title: r.title, body: r.body,
personal: r.personal === true,
recipientUid: r.recipient_uid || undefined, actorUid: r.actor_uid || undefined,
targetKind: r.target_kind || undefined, targetId: r.target_id || undefined,
read: r.read === true,
archiveState: r.archive_state || undefined,
createdAt: r.created_at,
});
}
const _NOTIF_COLS = {
type: 'type', title: 'title', body: 'body', personal: 'personal', recipientUid: 'recipient_uid',
actorUid: 'actor_uid', targetKind: 'target_kind', targetId: 'target_id', read: 'read', archiveState: 'archive_state',
};
const _NOTIF_IGNORED = new Set(['id', 'createdAt', 'date', 'archived']);
function _notifRow(n) {
const row = {};
const extra = {};
for (const [k, v] of Object.entries(n || {})) {
if (v === undefined || _NOTIF_IGNORED.has(k)) continue;
if (_NOTIF_COLS[k]) row[_NOTIF_COLS[k]] = v;
else if (typeof v !== 'object' || v === null || Array.isArray(v) || Object.getPrototypeOf(v) === Object.prototype) extra[k] = v;
}
if (Object.keys(extra).length) row.extra = extra;
return row;
}
function _notifToPublic(item) {
return {
...item,
date: formatRelativeTime(item.createdAt),
archived: _isEffectivelyArchived(item, item.createdAt, 'notifications'),
};
}
function _visibleToMe(n, myUid) {
return !n.personal || n.recipientUid === myUid;
}
async function _fetchNotifications({ all = false, fresh = false } = {}) {
const uid = String(getCurrentUser()?.uid || '');
const safeUid = /^[A-Za-z0-9_-]{1,128}$/.test(uid) ? uid : '';
const visibleFilter = safeUid
? `personal.eq.false,personal.is.null,recipient_uid.eq.${safeUid}`
: 'personal.eq.false,personal.is.null';
const rowsKey = `notifs:${_scope()}:${safeUid || 'none'}:${all ? 'all' : 'win'}`;
const rows = await _rows(rowsKey, async () => {
const sb = await _sbRead();
if (!all) {
const same = await _notifUnchanged(sb, rowsKey, visibleFilter);
if (same) return same;
}
let q = sb.from('notifications').select('*').or(visibleFilter).order('created_at', { ascending: false });
q = all ? q.limit(1000) : q.or(_windowFilter('notifications')).limit(_LIST_WINDOW_LIMIT);
const { data, error } = await _run(q);
if (error) throw error;
if (!all) cachePut(`${rowsKey}:meta`, { fullAt: Date.now() }).catch(() => {});
return data || [];
}, { collection: 'notifications', ttlMs: 30000, fresh });
return rows.map(_notif);
}
const _NOTIF_FULL_REFRESH_MS = 6 * 3600 * 1000;
const _NOTIF_VERCOL_KEY = 'akdar:notif-vercol';
function _notifVerCol() { try { return localStorage.getItem(_NOTIF_VERCOL_KEY) || 'updated_at'; } catch { return 'updated_at'; } }
function _setNotifVerCol(c) { try { localStorage.setItem(_NOTIF_VERCOL_KEY, c); } catch {   } }
async function _notifUnchanged(sb, rowsKey, visibleFilter) {
try {
const cached = (await cacheGet(rowsKey))?.value;
if (!Array.isArray(cached) || !cached.length) return null;
const fullAt = (await cacheGet(`${rowsKey}:meta`))?.value?.fullAt;
if (!fullAt || Date.now() - fullAt > _NOTIF_FULL_REFRESH_MS) return null;
for (let attempt = 0; attempt < 2; attempt++) {
const col = _notifVerCol();
const { data, count, error } = await _run(
sb.from('notifications').select(col, { count: 'exact' })
.or(visibleFilter).or(_windowFilter('notifications'))
.order(col, { ascending: false }).limit(1));
if (error) {
if (col === 'updated_at' && String(error.code) === '42703') { _setNotifVerCol('created_at'); continue; }
return null;
}
if (!data?.length || Math.min(count ?? -1, _LIST_WINDOW_LIMIT) !== cached.length) return null;
let newest = '';
for (const r of cached) { const v = r[col]; if (typeof v === 'string' && v > newest) newest = v; }
return newest && data[0][col] === newest ? cached : null;
}
} catch {   }
return null;
}
async function _visibleNotifications(_myUid, { fresh = false, all = false } = {}) {
return _fetchNotifications({ all, fresh });
}
const _dropNotifMemo = () => _reconcile('notifs:');
export async function getNotifications({ includeArchived = false } = {}) {
const myId = getDeviceId();
const myUid = getCurrentUser()?.uid;
const readIds = _readNotifIds();
const items = await _visibleNotifications(myUid, { fresh: includeArchived, all: includeArchived });
const sorted = items
.filter(n => includeArchived || !_isEffectivelyArchived(n, n.createdAt, 'notifications'))
.filter(n => !n.devOnly || n.devSessionId === myId)
.filter(n => _visibleToMe(n, myUid))
.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
return (includeArchived ? sorted : sorted.slice(0, FEED_LIMIT.notifications))
.map(n => _notifToPublic({ ...n, read: readIds.has(String(n.id)) }));
}
export async function getUnreadNotificationsCount({ fresh = false } = {}) {
const myId = getDeviceId();
const myUid = getCurrentUser()?.uid;
const readIds = _readNotifIds();
const items = await _visibleNotifications(myUid, { fresh });
return items.filter(n =>
!readIds.has(String(n.id)) && !_isEffectivelyArchived(n, n.createdAt, 'notifications')
&& (!n.devOnly || n.devSessionId === myId) && _visibleToMe(n, myUid),
).length;
}
export async function addNotification(notification) {
const sb = await _sbWrite();
const row = _notifRow({ read: false, personal: false, ...notification });
const { data, error } = await _run(sb.from('notifications').insert(row).select().single());
_dropNotifMemo();
if (error) _fail(error, 'notification');
return _notif(data);
}
export async function updateNotification(id, updates) {
const sb = await _sbWrite();
const row = _notifRow(updates);
if (row.extra) {
const { data: cur } = await _run(sb.from('notifications').select('extra').eq('id', String(id)).maybeSingle());
row.extra = { ...(cur?.extra || {}), ...row.extra };
}
const { data, error } = await _run(sb.from('notifications').update(row).eq('id', String(id)).select().maybeSingle());
_dropNotifMemo();
if (error) _fail(error, 'notification');
if (!data) throw new Error('الإشعار دا ما عاد موجود أو ما عندك صلاحية تعدّله');
return _notif(data);
}
export async function deleteNotification(id) {
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('notifications').delete().eq('id', String(id)).select('id'));
_dropNotifMemo();
if (error) _fail(error, 'notification');
if (!data?.length) throw new Error('ما قدرنا نحذف الإشعار (للمالك فقط)');
for (const key of await cacheKeys('notifs:')) await _patch(key, rows => rows.filter(r => String(r.id) !== String(id)));
}
export async function setNotificationArchiveState(id, state) {
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('notifications').update({ archive_state: state }).eq('id', String(id)).select().maybeSingle());
_dropNotifMemo();
if (error) _fail(error, 'notification');
if (!data) throw new Error('الإشعار دا ما عاد موجود أو ما عندك صلاحية');
return _notifToPublic(_notif(data));
}
async function _notifyInteraction(kind, { recipientUid, actorUid, targetKind, targetId, targetTitle }) {
if (!INTERACTION_NOTIFY_KINDS.has(kind)) return;
if (!recipientUid || recipientUid === actorUid) return;
const msg = buildInteractionMessage(kind, getCurrentUser()?.displayName, targetTitle);
if (!msg) return;
try {
const sb = await _sbWrite();
const { error } = await _run(sb.from('notifications').insert({
type: msg.type, title: msg.title, body: msg.body, personal: true,
actor_uid: actorUid, recipient_uid: recipientUid,
target_kind: targetKind, target_id: String(targetId), read: false,
}));
if (error) throw error;
_dropNotifMemo();
} catch (err) {
console.error('[Notify] فشل إرسال إشعار تفاعل:', err);
}
}
async function _notifyComment(kind, parentId, actorUid) {
try {
const sb = await _sbRead();
const { data } = await _run(sb.from(_table(kind)).select('author_uid, title').eq('id', String(parentId)).maybeSingle());
if (!data) return;
_notifyInteraction(kind === 'idea' ? 'comment_idea' : 'comment_occasion', {
recipientUid: data.author_uid, actorUid, targetKind: kind, targetId: parentId, targetTitle: data.title,
});
} catch {   }
}
const _inbox = (r) => ({
id: r.id, type: r.type, body: r.body, authorName: r.author_name, status: r.status, createdAt: r.created_at,
});
export async function addInboxMessage({ type, body, authorName }) {
const sb = await _sbWrite();
const { data, error } = await _run(
sb.from('inbox_messages').insert({ type, body, author_name: authorName || 'زائر', status: 'new' }),
);
_inboxMemo = null;
if (error) _fail(error, 'inbox');
return { id: data?.id, type, body, authorName: authorName || 'زائر', status: 'new', createdAt: new Date().toISOString() };
}
export async function getInboxMessages({ type, status } = {}) {
const sb = await _sbWrite();
let q = sb.from('inbox_messages').select('*').order('created_at', { ascending: false }).limit(FEED_LIMIT.inbox);
if (type) q = q.eq('type', type);
if (status) q = q.eq('status', status);
const { data, error } = await _run(q);
if (error) throw error;
return (data || []).map(_inbox).filter(m => !isArchived(m.createdAt, 'inbox'));
}
export async function getUnreadInboxCount() {
if (_inboxMemo && Date.now() - _inboxMemo.at < _SHORT_TTL_MS) return _inboxMemo.promise;
const start = new Date(Date.now() - (RETENTION_DAYS.inbox + 1) * _DAY_MS).toISOString();
const entry = {
at: Date.now(),
promise: (async () => {
const sb = await _sbWrite();
const { count, error } = await _run(
sb.from('inbox_messages').select('id', { count: 'exact', head: true }).eq('status', 'new').gte('created_at', start),
);
if (error) throw error;
return count ?? 0;
})(),
};
_inboxMemo = entry;
entry.promise.catch(() => { if (_inboxMemo === entry) _inboxMemo = null; });
return entry.promise;
}
export async function markInboxMessageReviewed(id) {
const sb = await _sbWrite();
const { error } = await _run(sb.from('inbox_messages').update({ status: 'reviewed' }).eq('id', String(id)));
_inboxMemo = null;
if (error) _fail(error, 'inbox');
}
export async function deleteInboxMessage(id) {
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('inbox_messages').delete().eq('id', String(id)).select('id'));
_inboxMemo = null;
if (error) _fail(error, 'inbox');
if (!data?.length) throw new Error('ما قدرنا نحذف الرسالة (الحذف للمالك فقط)');
}
const URGENT_KEY = 'urgentAnnouncement';
async function _readUrgent() {
return _rows('settings:urgent', async () => {
const sb = await _sbRead();
const { data, error } = await _run(sb.from('settings').select('data').eq('key', URGENT_KEY).maybeSingle());
if (error) throw error;
return data?.data ?? null;
}, { collection: 'urgent', ttlMs: 30000 });
}
export async function getActiveUrgentAnnouncement() {
const data = await _readUrgent();
if (!data || !data.active) return null;
if (new Date(data.expiresAt) <= new Date()) return null;
return data;
}
export async function getUrgentAnnouncementStatus() {
return _readUrgent();
}
export async function publishUrgentAnnouncement({ type, title, body, contactPhone = '', durationHours, sourceMessageId = null }) {
if (!title?.trim() || !body?.trim()) throw new Error('العنوان والنص مطلوبين');
const hours = Number(durationHours);
if (!hours || hours <= 0) throw new Error('مدة النداء ما صالحة');
const now = new Date();
const payload = {
type, title: title.trim(), body: body.trim(), contactPhone: contactPhone.trim(),
active: true, publishedAt: now.toISOString(),
expiresAt: new Date(now.getTime() + hours * 3600 * 1000).toISOString(),
sourceMessageId,
};
const sb = await _sbWrite();
const { error } = await _run(sb.from('settings').upsert({ key: URGENT_KEY, data: payload }, { onConflict: 'key' }));
if (error) _fail(error, 'urgent');
cachePut('settings:urgent', payload);
return payload;
}
export async function unpublishUrgentAnnouncement() {
const sb = await _sbWrite();
const current = (await _readUrgent()) || {};
const { error } = await _run(sb.from('settings').upsert({ key: URGENT_KEY, data: { ...current, active: false } }, { onConflict: 'key' }));
if (error) _fail(error, 'urgent');
cachePut('settings:urgent', { ...current, active: false });
}
async function _computeMembers() {
const sb = await _sbWrite();
const pick = (table, cols) => _run(sb.from(table).select(cols).limit(5000), 30000);
const [ideas, occasions, ideaComments, occasionComments, moderation] = await Promise.all([
pick('ideas', 'author_uid, author_name, created_at'),
pick('occasions', 'author_uid, author_name, created_at'),
pick('idea_comments', 'uid, author_name, created_at'),
pick('occasion_comments', 'uid, author_name, created_at'),
pick('member_moderation', 'uid, display_name, status, reason, updated_at'),
]);
for (const r of [ideas, occasions, ideaComments, occasionComments, moderation]) if (r.error) throw r.error;
const moderationByUid = new Map((moderation.data || []).map(m => [m.uid, m]));
const byUid = new Map();
const touch = (uid, authorName, createdAt) => {
if (!uid) return;
const existing = byUid.get(uid);
if (!existing) {
byUid.set(uid, { uid, displayName: authorName || 'عضو', lastActiveAt: createdAt, contributionsCount: 1 });
return;
}
existing.contributionsCount += 1;
if (new Date(createdAt) > new Date(existing.lastActiveAt)) {
existing.displayName = authorName || existing.displayName;
existing.lastActiveAt = createdAt;
}
};
(ideas.data || []).forEach(i => touch(i.author_uid, i.author_name, i.created_at));
(occasions.data || []).forEach(o => touch(o.author_uid, o.author_name, o.created_at));
(ideaComments.data || []).forEach(c => touch(c.uid, c.author_name, c.created_at));
(occasionComments.data || []).forEach(c => touch(c.uid, c.author_name, c.created_at));
for (const [uid, rec] of moderationByUid.entries()) {
if (!byUid.has(uid)) {
byUid.set(uid, { uid, displayName: rec.display_name || 'عضو', lastActiveAt: rec.updated_at, contributionsCount: 0 });
}
}
return [...byUid.values()]
.map(m => {
const mod = moderationByUid.get(m.uid);
return { ...m, status: mod?.status ?? 'active', reason: mod?.reason ?? '' };
})
.sort((a, b) => new Date(b.lastActiveAt) - new Date(a.lastActiveAt));
}
export async function getMembers({ fresh = false } = {}) {
if (!fresh && _membersMemo && Date.now() - _membersMemo.at < 30000) {
return (await _membersMemo.promise).map(m => ({ ...m }));
}
const entry = { at: Date.now(), promise: _computeMembers() };
_membersMemo = entry;
try {
return (await entry.promise).map(m => ({ ...m }));
} catch (err) {
if (_membersMemo === entry) _membersMemo = null;
throw err;
}
}
export async function getMemberModeration(uid) {
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('member_moderation').select('status, reason').eq('uid', String(uid)).maybeSingle());
if (error) throw error;
return { status: data?.status ?? 'active', reason: data?.reason ?? '' };
}
export async function setMemberModeration(uid, { status, reason = '', displayName = '' } = {}) {
if (!uid) throw new Error('ما في معرف عضو');
if (!['active', 'banned-full', 'banned-partial'].includes(status)) throw new Error('حالة الرقابة ما صالحة');
const sb = await _sbWrite();
const patchMembersMemo = (nextStatus, nextReason) => {
if (!_membersMemo) return;
const cur = _membersMemo;
cur.promise = cur.promise.then(list => {
if (!list.some(m => m.uid === uid)) { _membersMemo = null; return list; }
return list.map(m => m.uid === uid ? { ...m, status: nextStatus, reason: nextReason } : m);
});
};
if (status === 'active') {
const { error } = await _run(sb.from('member_moderation').delete().eq('uid', String(uid)));
if (error) _fail(error, 'moderation');
patchMembersMemo('active', '');
return { uid, status: 'active', reason: '' };
}
const record = { uid, displayName: displayName || 'عضو', status, reason: reason.trim(), updatedAt: new Date().toISOString() };
const { error } = await _run(sb.from('member_moderation').upsert({
uid: String(uid), display_name: record.displayName, status, reason: record.reason, updated_at: record.updatedAt,
}, { onConflict: 'uid' }));
if (error) _fail(error, 'moderation');
patchMembersMemo(record.status, record.reason ?? '');
return record;
}
export async function logAdminAction(entry) {
const record = {
actorName: entry.actorName || 'غير معروف', actorRole: entry.actorRole || 'غير معروف',
action: entry.action || '', summary: entry.summary || '', at: new Date().toISOString(),
};
const sb = await _sbWrite();
const { error } = await _run(sb.from('activity_log').insert({
actor_name: record.actorName, actor_role: record.actorRole, action: record.action, summary: record.summary,
}));
if (error) _fail(error, 'log');
return record;
}
export async function getActivityLog({ limit: max = 50 } = {}) {
const sb = await _sbWrite();
const { data, error } = await _run(sb.from('activity_log').select('*').order('at', { ascending: false }).limit(max));
if (error) throw error;
return (data || []).map(r => ({
id: String(r.id), actorName: r.actor_name, actorRole: r.actor_role, action: r.action, summary: r.summary, at: r.at,
}));
}
