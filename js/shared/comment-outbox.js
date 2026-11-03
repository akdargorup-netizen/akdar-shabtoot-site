import { isTransientFailure, shouldQueue } from './transient-error.js';
const MAX_UNKNOWN_TRIES = 6;
const KEYS = { occasion: 'akdar_occasion_comment_outbox', idea: 'akdar_idea_comment_outbox' };
function _readAll(kind) {
try {
return JSON.parse(localStorage.getItem(KEYS[kind]) || '{}');
} catch {
return {};
}
}
function _writeAll(kind, data) {
try {
localStorage.setItem(KEYS[kind], JSON.stringify(data));
} catch {
}
}
function _queue(kind, parentId, comment) {
const all = _readAll(kind);
const list = all[parentId] || [];
const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const queued = { ...comment, id: tempId, createdAt: new Date().toISOString(), _pending: true };
list.push(queued);
all[parentId] = list;
_writeAll(kind, all);
return queued;
}
export function queueComment(occasionId, comment) {
return _queue('occasion', occasionId, comment);
}
export function queueIdeaComment(ideaId, comment) {
return _queue('idea', ideaId, comment);
}
export function getQueuedUserComment(occasionId, uid) {
const list = _readAll('occasion')[occasionId] || [];
return list.find(c => c.uid === uid) || null;
}
export function getQueuedComments(occasionId) {
return _readAll('occasion')[occasionId] || [];
}
export function getQueuedIdeaComments(ideaId) {
return _readAll('idea')[ideaId] || [];
}
function _removeFromQueue(kind, parentId, tempId) {
const all = _readAll(kind);
const list = (all[parentId] || []).filter(c => c.id !== tempId);
if (list.length) all[parentId] = list;
else delete all[parentId];
_writeAll(kind, all);
}
function _bumpTries(kind, parentId, tempId) {
const all = _readAll(kind);
const item = (all[parentId] || []).find(c => c.id === tempId);
if (!item) return 0;
item._tries = (item._tries || 0) + 1;
_writeAll(kind, all);
return item._tries;
}
function _hasQueuedItems() {
return ['occasion', 'idea'].some((kind) => {
const all = _readAll(kind);
return Object.keys(all).some(k => (all[k] || []).length > 0);
});
}
let _flushing = false;
let _failStreak = 0;
let _nextAt = 0;
export async function flushOutbox() {
if (_flushing || !navigator.onLine || !_hasQueuedItems() || Date.now() < _nextAt) return;
_flushing = true;
let failed = false;
try {
const { addOccasionComment, addIdeaComment } = await import('../data/db.js');
const occ = _readAll('occasion');
for (const occasionId of Object.keys(occ)) {
for (const queued of occ[occasionId] || []) {
try {
const { id, _pending, _tries, ...payload } = queued;
const saved = await addOccasionComment(occasionId, payload);
_removeFromQueue('occasion', occasionId, id);
window.dispatchEvent(new CustomEvent('akdar:comment-synced', {
detail: { kind: 'occasion', occasionId, tempId: id, comment: saved },
}));
} catch (err) {
if (err?.message === 'لقد علّقت على هذه المناسبة من قبل') {
_removeFromQueue('occasion', occasionId, queued.id);
} else {
failed = true;
}
}
}
}
const ideas = _readAll('idea');
for (const ideaId of Object.keys(ideas)) {
for (const queued of ideas[ideaId] || []) {
try {
const { id, _pending, _tries, createdAt, ...payload } = queued;
const saved = await addIdeaComment(ideaId, payload);
_removeFromQueue('idea', ideaId, id);
window.dispatchEvent(new CustomEvent('akdar:comment-synced', {
detail: { kind: 'idea', ideaId, tempId: id, comment: saved },
}));
} catch (err) {
if (isTransientFailure(err) || (shouldQueue(err) && _bumpTries('idea', ideaId, queued.id) < MAX_UNKNOWN_TRIES)) {
failed = true;
} else {
_removeFromQueue('idea', ideaId, queued.id);
window.dispatchEvent(new CustomEvent('akdar:comment-failed', {
detail: { kind: 'idea', ideaId, tempId: queued.id, text: queued.text, message: err?.message || '' },
}));
}
}
}
}
} finally {
_flushing = false;
if (failed) {
_failStreak = Math.min(_failStreak + 1, 6);
_nextAt = Date.now() + Math.min(30000 * 2 ** (_failStreak - 1), 300000) + Math.random() * 10000;
} else { _failStreak = 0; _nextAt = 0; }
}
}
window.addEventListener('online', () => { _nextAt = 0; setTimeout(flushOutbox, Math.random() * 8000); });
flushOutbox();
setInterval(() => { if (_hasQueuedItems()) flushOutbox(); }, 30000);
