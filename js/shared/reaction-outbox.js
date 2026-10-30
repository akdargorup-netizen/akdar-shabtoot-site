import { isTransientFailure, shouldQueue } from './transient-error.js';
const KEY = 'akdar_reaction_outbox';
const MAX_AGE_MS = 3 * 24 * 3600 * 1000;
const KINDS = ['idea-vote', 'occasion-like'];
const MAX_UNKNOWN_TRIES = 6;
const _keyOf = (kind, targetId, uid) => `${kind}|${targetId}|${uid}`;
function _readAll() {
try {
const v = JSON.parse(localStorage.getItem(KEY) || '{}');
return v && typeof v === 'object' ? v : {};
} catch {
return {};
}
}
function _writeAll(all) {
try {
if (Object.keys(all).length) localStorage.setItem(KEY, JSON.stringify(all));
else localStorage.removeItem(KEY);
} catch {
}
}
function _put(kind, targetId, uid, desired) {
const all = _readAll();
const rev = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
all[_keyOf(kind, targetId, uid)] = { kind, targetId: String(targetId), uid: String(uid), desired, rev, at: Date.now() };
_writeAll(all);
return rev;
}
function _removeIfRev(key, rev) {
const all = _readAll();
if (all[key] && all[key].rev === rev) {
delete all[key];
_writeAll(all);
}
}
function _bumpTries(key, rev) {
const all = _readAll();
if (!all[key] || all[key].rev !== rev) return 0;
all[key].tries = (all[key].tries || 0) + 1;
_writeAll(all);
return all[key].tries;
}
function _hasQueued() {
return Object.keys(_readAll()).length > 0;
}
export function getPendingReaction(kind, targetId, uid) {
if (!uid) return undefined;
return _readAll()[_keyOf(kind, targetId, uid)]?.desired;
}
export function listPendingReactions(kind, uid) {
return Object.values(_readAll()).filter(e => e.kind === kind && e.uid === String(uid));
}
async function _send(e) {
const { voteIdea, setOccasionLike } = await import('../data/db.js');
return e.kind === 'idea-vote'
? voteIdea(e.targetId, e.uid, e.desired)
: setOccasionLike(e.targetId, e.uid, e.desired);
}
const _inflight = new Set();
async function _drain(key, interactive) {
if (_inflight.has(key)) return { pending: true };
_inflight.add(key);
let last = null;
try {
for (;;) {
const e = _readAll()[key];
if (!e) return last ? { pending: false, result: last } : { pending: false };
if (Date.now() - e.at > MAX_AGE_MS) { _removeIfRev(key, e.rev); continue; }
const { getCurrentUser } = await import('../data/auth.js');
if (String(getCurrentUser()?.uid || '') !== e.uid) return { pending: true };
let res;
try {
res = await _send(e);
} catch (err) {
if (isTransientFailure(err)) return { pending: true, transient: true };
if (shouldQueue(err) && _bumpTries(key, e.rev) < MAX_UNKNOWN_TRIES) return { pending: true, transient: true };
_removeIfRev(key, e.rev);
if (interactive) throw err;
window.dispatchEvent(new CustomEvent('akdar:reaction-failed', {
detail: { kind: e.kind, targetId: e.targetId, desired: e.desired, message: err?.message || '' },
}));
try {
const { showToast } = await import('./toast.js');
showToast(err?.message || 'تفاعلك ما اتسجّل — جرّب تاني', 'error');
} catch {   }
return { pending: false };
}
last = res;
_removeIfRev(key, e.rev);
window.dispatchEvent(new CustomEvent('akdar:reaction-synced', {
detail: { kind: e.kind, targetId: e.targetId, uid: e.uid, desired: e.desired, result: res },
}));
}
} finally {
_inflight.delete(key);
}
}
async function _react(kind, targetId, uid, desired) {
if (!KINDS.includes(kind)) throw new Error('نوع تفاعل غير معروف');
_put(kind, targetId, uid, desired);
if (typeof navigator !== 'undefined' && navigator.onLine === false) return { pending: true };
return _drain(_keyOf(kind, targetId, uid), true);
}
export function sendIdeaVote(ideaId, uid, value) {
return _react('idea-vote', ideaId, uid, value);
}
export function sendOccasionLike(occasionId, uid, liked) {
return _react('occasion-like', occasionId, uid, !!liked);
}
let _failStreak = 0;
let _nextAt = 0;
export async function flushReactions() {
if (!navigator.onLine || !_hasQueued() || Date.now() < _nextAt) return;
let stillPending = false;
for (const key of Object.keys(_readAll())) {
const out = await _drain(key, false);
if (out.transient) stillPending = true;
}
if (stillPending) {
_failStreak = Math.min(_failStreak + 1, 6);
_nextAt = Date.now() + Math.min(30000 * 2 ** (_failStreak - 1), 300000) + Math.random() * 10000;
} else { _failStreak = 0; _nextAt = 0; }
}
window.addEventListener('online', () => { _nextAt = 0; setTimeout(flushReactions, Math.random() * 8000); });
flushReactions();
setInterval(() => { if (_hasQueued()) flushReactions(); }, 30000);
