import {
addNews, updateNews, deleteNews, setNewsArchiveState,
addEvent, updateEvent, deleteEvent,
addStudyVideo, updateStudyVideo, deleteStudyVideo,
addWorshipLecture, updateWorshipLecture, deleteWorshipLecture,
addHistoryArticle, updateHistoryArticle, deleteHistoryArticle,
addAssociationJourneyArticle, updateAssociationJourneyArticle, deleteAssociationJourneyArticle,
addProject, updateProject, deleteProject,
addNubianWord, updateNubianWord, deleteNubianWord,
addNubianPhrase, updateNubianPhrase, deleteNubianPhrase,
addGalleryItem, updateGalleryItem, deleteGalleryItem,
addContact, updateContact, deleteContact,
updateIdea, deleteIdea, setIdeaArchiveState, approveIdea,
updateOccasion, deleteOccasion, setOccasionArchiveState, approveOccasion,
uploadImage,
} from '../data/db.js';
import { NEWS_CATEGORIES } from '../data/local-data.js';
import { isAdminSessionUnlocked, getAdminRole } from '../data/admin-auth.js';
import { logAdminAction } from './admin-activity.js';
import { openConfirm } from './confirm-modal.js';
import { showToast } from './toast.js';
import { renderIcons } from './icons.js';
import { escapeHtml } from './sanitize.js';
import {
isPendingToken, getPendingImage, markPendingUploaded, deletePendingImage,
listPendingTokens, previewUrlFor, tokenForPreview, hydratePreviews,
} from './pending-images.js';
const MODE_KEY  = 'sbb:admin-batch-mode';
const QUEUE_KEY = 'sbb:admin-batch-queue';
const AUTO_RETRY_LIMIT = 6;
const AUTO_INTERVAL_MS = 45000;
const SECTIONS = {
news: {
label: 'الأخبار', action: 'edit-news',
update: updateNews, add: addNews, remove: deleteNews, archive: setNewsArchiveState,
toItem: (item, p) => {
const { category, ...rest } = p;
const cat = NEWS_CATEGORIES.find(c => c.key === category);
return { ...item, ...rest, categoryKey: category ?? item.categoryKey, category: cat?.label ?? item.category };
},
},
events:          { label: 'الفعاليات',        action: 'edit-event',    update: updateEvent,        add: addEvent,        remove: deleteEvent },
study:           { label: 'خدمات الطلاب',     action: 'edit-study',    update: updateStudyVideo,   add: addStudyVideo,   remove: deleteStudyVideo },
lectures:        { label: 'المحاضرات الدينية', action: 'edit-lecture',  update: updateWorshipLecture, add: addWorshipLecture, remove: deleteWorshipLecture },
history:         { label: 'تاريخ بلدنا',       action: 'edit-history',  update: updateHistoryArticle, add: addHistoryArticle, remove: deleteHistoryArticle },
journey:         { label: 'مسيرة الرابطة',     action: 'edit-journey',  update: updateAssociationJourneyArticle, add: addAssociationJourneyArticle, remove: deleteAssociationJourneyArticle },
projects:        { label: 'المشاريع',         action: 'edit-project',  update: updateProject,      add: addProject,      remove: deleteProject },
gallery:         { label: 'صور البلد',         action: 'edit-gallery',  update: updateGalleryItem,  add: addGalleryItem,  remove: deleteGalleryItem },
contacts:        { label: 'دليل الاتصال',      action: 'edit-contact',  update: updateContact,      add: addContact,      remove: deleteContact },
'nubian-word':   { label: 'آنداندي (كلمات)',   action: 'edit-nubian',   update: updateNubianWord,   add: addNubianWord,   remove: deleteNubianWord },
'nubian-phrase': { label: 'آنداندي (جمل)',     action: 'edit-nubian-phrase', update: updateNubianPhrase, add: addNubianPhrase, remove: deleteNubianPhrase },
ideas:           { label: 'صندوق الأفكار',     action: 'edit-idea',     update: updateIdea,         remove: deleteIdea,     archive: setIdeaArchiveState,     approve: approveIdea },
occasions:       { label: 'بيت المناسبات',     action: 'edit-occasion', update: updateOccasion,     remove: deleteOccasion, archive: setOccasionArchiveState, approve: approveOccasion },
};
const OP_TEXT = { add: 'إضافة جديدة', update: 'تعديل', delete: 'حذف' };
let _queue = _loadQueue();
let _committing = false;
let _progress = null;
let _refresh = null;
let _warnedPersist = false;
function _loadQueue() {
try {
const raw = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
if (!Array.isArray(raw)) return [];
return raw
.filter(e => e && SECTIONS[e.section])
.map(e => ({ ...e, op: e.op || 'update', patch: e.patch || {} }));
} catch {
return [];
}
}
function _persist() {
try {
localStorage.setItem(QUEUE_KEY, JSON.stringify(_queue));
} catch (err) {
console.warn('[AdminBatch] تعذّر حفظ نسخة محلية:', err);
if (!_warnedPersist) {
_warnedPersist = true;
showToast('ما قدرنا نحفظ نسخة محلية — احفظ التعديلات قبل ما تقفل التطبيق', 'error', 5000);
}
}
}
function _emit() {
window.dispatchEvent(new CustomEvent('admin-batch:change'));
}
const _isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;
const _isTmp = (id) => String(id).startsWith('tmp_');
const _newTmpId = () => `tmp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
function _isNetErr(err) {
if (!_isOnline()) return true;
const msg = String(err?.message || err || '');
return err?.name === 'TypeError' || err?.name === 'AbortError' ||
/failed to fetch|networkerror|network request|load failed|timeout|timed out|aborted|offline|انقطع|الاتصال|الشبكة|النت/i.test(msg);
}
export function isBatchMode() {
try { if (getAdminRole() === 'nubian') return false; } catch {   }
try { return localStorage.getItem(MODE_KEY) === '1'; } catch { return false; }
}
export function setBatchMode(on) {
try { localStorage.setItem(MODE_KEY, on ? '1' : '0'); } catch {   }
_emit();
}
export function stagedMsg(kind = 'edit') {
const what = { edit: 'التعديل', add: 'الإضافة', delete: 'الحذف', archive: 'الأرشفة', approve: 'الموافقة' }[kind] || 'التعديل';
if (isBatchMode() && _isOnline()) return `اتسجّل ${what} — اضغط "حفظ الكل" لتطبيقه`;
return `اتسجّل ${what} عندك — حيترفع لوحده لما النت يرجع`;
}
function _walk(value, fn, depth = 0) {
if (typeof value === 'string') return fn(value);
if (depth > 4 || value == null) return value;
if (Array.isArray(value)) return value.map(v => _walk(v, fn, depth + 1));
if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
const out = {};
for (const [k, v] of Object.entries(value)) out[k] = _walk(v, fn, depth + 1);
return out;
}
return value;
}
const _tokenize = (patch) => _walk(patch, tokenForPreview);
const _previewize = (item) => _walk(item, (v) => (isPendingToken(v) ? previewUrlFor(v) : v));
function _collectTokens(value, set = new Set()) {
_walk(value, (v) => { if (isPendingToken(v)) set.add(v); return v; });
return set;
}
async function _resolveImages(patch) {
const tokens = [..._collectTokens(patch)];
if (!tokens.length) return patch;
const urls = new Map();
for (const t of tokens) {
const rec = await getPendingImage(t);
if (!rec) throw new Error('الصورة المحفوظة على الجهاز ضاعت — اختارها تاني');
if (rec.url) { urls.set(t, rec.url); continue; }
const result = await uploadImage(rec.blob, { pathPrefix: rec.pathPrefix || 'uploads' });
if (result?.path && rec.thumb) {
try { await uploadImage(rec.thumb, { pathPrefix: rec.pathPrefix || 'uploads', exactPath: result.path.replace(/(\.[a-z]+)$/, '_t$1') }); }
catch (e) { console.warn('[AdminBatch] تعذّر رفع النسخة المصغّرة (غير حرج):', e); }
}
await markPendingUploaded(t, result.url);
urls.set(t, result.url);
}
return _walk(patch, (v) => (urls.has(v) ? urls.get(v) : v));
}
async function _gcImages() {
try {
const used = new Set();
_queue.forEach(e => _collectTokens(e.patch, used));
for (const t of await listPendingTokens()) if (!used.has(t)) await deletePendingImage(t);
} catch {   }
}
function _find(k) { return _queue.find(e => e.k === k); }
function _put(entry) {
_queue = _find(entry.k) ? _queue.map(e => (e.k === entry.k ? entry : e)) : [..._queue, entry];
}
function _drop(k) { _queue = _queue.filter(e => e.k !== k); }
const _autoNow = () => !isBatchMode() || !_isOnline();
function _commitStage(k) {
_persist(); _emit();
_gcImages();
if (_queue.some(e => e.k === k && e.auto)) _scheduleAuto();
}
export async function stageOrRun(section, id, patch, { label = '' } = {}) {
const def = SECTIONS[section];
if (!def) throw new Error(`[AdminBatch] قسم غير مسجّل: ${section}`);
patch = _tokenize(patch);
const k = `${section}:${id}`;
const prev = _find(k);
if (_isTmp(id)) {
if (!prev) throw new Error('الإضافة المعلّقة دي ما عادت موجودة');
_put({ ...prev, patch: { ...prev.patch, ...patch }, label: label || prev.label, at: Date.now(), error: undefined });
_commitStage(k);
return true;
}
if (prev?.op === 'delete') return true;
if (!isBatchMode() && _isOnline()) {
try {
await def.update(id, await _resolveImages(patch));
if (prev) { _drop(k); _persist(); _emit(); _gcImages(); }
return false;
} catch (err) {
if (!_isNetErr(err)) throw err;
}
}
_put({
k, section, id, op: prev?.op === 'add' ? 'add' : 'update',
patch: { ...(prev?.patch || {}), ...patch },
archive: prev?.archive, approve: prev?.approve,
label: label || prev?.label || String(id),
at: Date.now(), auto: _autoNow(), tries: 0,
});
_commitStage(k);
return true;
}
export async function stageAdd(section, payload, { label = '' } = {}) {
const def = SECTIONS[section];
if (!def?.add) throw new Error(`[AdminBatch] القسم ما يدعم الإضافة: ${section}`);
payload = _tokenize(payload);
if (!isBatchMode() && _isOnline()) {
try {
await def.add(await _resolveImages(payload));
return false;
} catch (err) {
if (!_isNetErr(err)) throw err;
}
}
const id = _newTmpId();
const k = `${section}:${id}`;
_put({ k, section, id, op: 'add', patch: payload, label: label || 'عنصر جديد', at: Date.now(), auto: _autoNow(), tries: 0 });
_commitStage(k);
return true;
}
export async function stageDelete(section, id, { label = '' } = {}) {
const def = SECTIONS[section];
if (!def?.remove) throw new Error(`[AdminBatch] القسم ما يدعم الحذف: ${section}`);
const k = `${section}:${id}`;
const prev = _find(k);
if (_isTmp(id)) {
_drop(k); _persist(); _emit(); _gcImages(); _runRefresh();
return true;
}
if (!isBatchMode() && _isOnline()) {
try {
await def.remove(id);
if (prev) { _drop(k); _persist(); _emit(); _gcImages(); }
return false;
} catch (err) {
if (!_isNetErr(err)) throw err;
}
}
_put({ k, section, id, op: 'delete', patch: {}, label: label || prev?.label || String(id), at: Date.now(), auto: _autoNow(), tries: 0 });
_commitStage(k);
return true;
}
export async function stageArchive(section, id, state, { label = '' } = {}) {
return _stageFlag(section, id, 'archive', state, label, (def, i) => def.archive(i, state));
}
export async function stageApprove(section, id, { label = '' } = {}) {
return _stageFlag(section, id, 'approve', true, label, (def, i) => def.approve(i));
}
async function _stageFlag(section, id, flag, value, label, runNow) {
const def = SECTIONS[section];
if (!def?.[flag]) throw new Error(`[AdminBatch] القسم ما يدعم هذه العملية: ${section}/${flag}`);
const k = `${section}:${id}`;
const prev = _find(k);
if (prev?.op === 'delete') return true;
if (!_isTmp(id) && !isBatchMode() && _isOnline()) {
try {
await runNow(def, id);
if (prev) {
const next = { ...prev, [flag]: undefined };
const empty = prev.op === 'update' && !Object.keys(prev.patch).length && !next.archive && !next.approve;
if (empty) _drop(k); else _put(next);
_persist(); _emit();
}
return false;
} catch (err) {
if (!_isNetErr(err)) throw err;
}
}
_put({
k, section, id, op: prev?.op || 'update', patch: prev?.patch || {},
archive: prev?.archive, approve: prev?.approve, [flag]: value,
label: label || prev?.label || String(id), at: Date.now(), auto: _autoNow(), tries: 0,
});
_commitStage(k);
return true;
}
export function applyPending(section, itemOrItems) {
const def = SECTIONS[section];
const entries = _queue.filter(e => e.section === section);
if (!def || !entries.length) return itemOrItems;
const byId = new Map(entries.filter(e => e.op !== 'add').map(e => [String(e.id), e]));
const kinds = new Map(entries.map(e => [String(e.id), e.op === 'add' ? 'add' : e.op === 'delete' ? 'delete' : 'edit']));
const hydrate = new Set();
const view = (item, e) => {
let merged = item;
if (e.op !== 'delete' && Object.keys(e.patch).length) {
merged = def.toItem ? def.toItem(item, e.patch) : { ...item, ...e.patch };
}
if (e.archive) merged = { ...merged, archived: e.archive === 'archived' };
if (e.approve) merged = { ...merged, moderation: 'approved' };
_collectTokens(merged, hydrate);
return { ..._previewize(merged), _pending: true };
};
if (Array.isArray(itemOrItems)) {
const out = itemOrItems
.filter(item => byId.get(String(item?.id))?.op !== 'delete')
.map(item => {
const e = item && byId.get(String(item.id));
return e ? view(item, e) : item;
});
const adds = entries.filter(e => e.op === 'add').sort((a, b) => b.at - a.at).map(e => {
const base = { id: e.id, archived: false, createdAt: e.at, date: '' };
return view(base, { ...e, op: 'update' });
});
_markRowsSoon(section, kinds);
if (hydrate.size) _hydrateLater(hydrate);
return [...adds, ...out];
}
const e = itemOrItems && byId.get(String(itemOrItems.id));
const addEntry = !e && entries.find(x => x.op === 'add' && String(x.id) === String(itemOrItems?.id));
const res = e ? view(itemOrItems, e) : addEntry ? view(itemOrItems, { ...addEntry, op: 'update' }) : itemOrItems;
if (hydrate.size) _hydrateLater(hydrate);
return res;
}
let _hydrating = false;
function _hydrateLater(tokens) {
const missing = [...tokens].filter(t => !previewUrlFor(t));
if (!missing.length || _hydrating) return;
_hydrating = true;
hydratePreviews(missing).then(changed => { if (changed) _runRefresh(); }).catch(() => {}).finally(() => { _hydrating = false; });
}
export function setBatchRefresh(page, fn) {
_refresh = (page && typeof fn === 'function') ? { page, fn } : null;
}
function _runRefresh() {
const r = _refresh;
if (!r || !r.page?.isConnected) return;
try { Promise.resolve(r.fn()).catch(() => {}); } catch {   }
}
export function pendingCount() { return _queue.length; }
export function listPending()  { return _queue.slice(); }
function _markRowsSoon(section, kinds) {
const action = SECTIONS[section].action;
setTimeout(() => {
document.querySelectorAll(`[data-action="${action}"][data-id]`).forEach(btn => {
const row = btn.closest('.admin-content-row, .admin-gallery-tile');
if (!row) return;
const kind = kinds.get(String(btn.dataset.id));
row.classList.toggle('admin-pending', Boolean(kind));
if (kind) row.dataset.pendingKind = kind; else delete row.dataset.pendingKind;
});
}, 0);
}
export function discardPending(k) {
_queue = _queue.filter(e => e.k !== k);
_persist(); _emit(); _runRefresh(); _gcImages();
}
export function discardAll() {
_queue = [];
_persist(); _emit(); _runRefresh(); _gcImages();
}
function _errText(err) {
const m = String(err?.message || '').trim();
return m ? m.slice(0, 140) : 'فشل الحفظ';
}
async function _runEntry(e) {
const def = SECTIONS[e.section];
if (e.op === 'delete') { await def.remove(e.id); return; }
if (e.op === 'add') {
const res = await def.add(await _resolveImages(e.patch));
const newId = res?.id;
if (newId != null) {
if (e.archive && def.archive) await def.archive(newId, e.archive);
if (e.approve && def.approve) await def.approve(newId);
}
return;
}
if (Object.keys(e.patch).length) await def.update(e.id, await _resolveImages(e.patch));
if (e.archive && def.archive) await def.archive(e.id, e.archive);
if (e.approve && def.approve) await def.approve(e.id);
}
export async function commitAll({ auto = false } = {}) {
const eligible = (e) => !auto || (e.auto && (e.tries || 0) < AUTO_RETRY_LIMIT);
if (_committing) return { ok: 0, failed: _queue.length };
const snapshot = _queue.filter(eligible);
if (!snapshot.length) return { ok: 0, failed: _queue.length };
if (!_isOnline()) {
if (!auto) showToast('ما في نت هسع — تعديلاتك محفوظة عندك، حيترفع لوحده لما النت يرجع', 'error', 4500);
return { ok: 0, failed: _queue.length };
}
_committing = true;
const saved = [];
let failed = 0;
let consecutive = 0;
try {
for (let i = 0; i < snapshot.length; i++) {
const e = snapshot[i];
_progress = { i: i + 1, n: snapshot.length };
_emit();
try {
await _runEntry(e);
saved.push(e);
consecutive = 0;
_queue = _queue.filter(q => !(q.k === e.k && q.at === e.at));
_persist();
} catch (err) {
console.error('[AdminBatch] فشل حفظ', e.k, err);
failed++;
consecutive++;
const q = _find(e.k);
if (q) { q.error = _errText(err); q.tries = (q.tries || 0) + 1; }
_persist();
if (consecutive >= 2) break;
}
}
} finally {
_committing = false;
_progress = null;
}
if (saved.length) {
const names = saved.slice(0, 4).map(e => `${SECTIONS[e.section].label} (${OP_TEXT[e.op]}): ${e.label}`).join('، ');
const more = saved.length > 4 ? ` و${saved.length - 4} آخرين` : '';
logAdminAction(auto ? 'رفع تلقائي بعد رجوع النت' : 'حفظ مجموعة تعديلات', `${saved.length} عملية — ${names}${more}`.slice(0, 300));
}
if (auto) {
if (saved.length) showToast(`النت رجع — اترفع ${saved.length} من تعديلاتك`, 'success', 4500);
} else if (!failed && !_queue.length) {
showToast(`اتحفظ ${saved.length} عملية`, 'success');
} else if (saved.length) {
showToast(`اتحفظ ${saved.length} وبقي ${_queue.length} معلّق — راجع السبب`, 'error', 5000);
} else {
showToast('ما اتحفظ شي — تعديلاتك لسع معلّقة، حاول تاني', 'error', 5000);
}
_emit();
_runRefresh();
_gcImages();
return { ok: saved.length, failed: _queue.length };
}
let _autoTimer = null;
export async function autoSync() {
if (_committing) return;
if (!_queue.some(e => e.auto && (e.tries || 0) < AUTO_RETRY_LIMIT)) return;
if (!_isOnline() || !isAdminSessionUnlocked()) return;
await commitAll({ auto: true });
}
function _scheduleAuto(delay = 3000) {
if (_autoTimer) return;
_autoTimer = setTimeout(async () => {
_autoTimer = null;
try { await autoSync(); } catch {   }
if (_queue.some(e => e.auto && (e.tries || 0) < AUTO_RETRY_LIMIT)) _scheduleAuto(AUTO_INTERVAL_MS);
}, delay);
}
export function resetAutoTries() {
_queue.forEach(e => { if (e.auto) e.tries = 0; });
_persist();
}
let _bar = null;
let _sheet = null;
function _onAdminRoute() {
const cur = document.querySelector('#app-content')?.dataset.currentPage || '';
return cur.startsWith('admin');
}
function _ensureBar() {
if (_bar) return _bar;
_bar = document.createElement('div');
_bar.className = 'admin-batch-bar';
_bar.hidden = true;
_bar.setAttribute('role', 'region');
_bar.setAttribute('aria-label', 'عمليات معلّقة');
_bar.innerHTML = `
    <div class="admin-batch-bar__info">
      <i data-lucide="list-checks"></i>
      <span class="admin-batch-bar__text"></span>
    </div>
    <div class="admin-batch-bar__actions">
      <button type="button" class="btn btn--ghost btn--sm" data-batch="review">مراجعة</button>
      <button type="button" class="btn btn--primary btn--sm" data-batch="save">حفظ الكل</button>
    </div>
  `;
document.body.appendChild(_bar);
renderIcons(_bar);
_bar.querySelector('[data-batch="review"]').addEventListener('click', openReviewSheet);
_bar.querySelector('[data-batch="save"]').addEventListener('click', () => { commitAll(); });
return _bar;
}
function _renderBar() {
const show = _queue.length > 0 && isAdminSessionUnlocked() && _onAdminRoute();
document.body.classList.toggle('has-batch-bar', show);
if (!show) { if (_bar) _bar.hidden = true; return; }
const bar = _ensureBar();
bar.hidden = false;
const text = bar.querySelector('.admin-batch-bar__text');
const save = bar.querySelector('[data-batch="save"]');
const review = bar.querySelector('[data-batch="review"]');
if (_committing && _progress) {
text.textContent = `قاعدين نحفظ (${_progress.i} من ${_progress.n})...`;
} else {
const n = _queue.length;
const failedN = _queue.filter(e => e.error).length;
text.textContent = failedN
? `${n} معلّق — ${failedN} منها فشلت`
: (n === 1 ? 'عملية واحدة معلّقة' : `${n} عمليات معلّقة`);
if (!_isOnline()) text.textContent += ' — بانتظار النت';
}
save.disabled = _committing;
review.disabled = _committing;
save.textContent = _committing ? 'قاعدين نحفظ...' : 'حفظ الكل';
}
function _opLabel(e) {
const parts = [];
if (e.op === 'add') parts.push('إضافة جديدة');
else if (e.op === 'delete') parts.push('حذف');
else if (Object.keys(e.patch).length) parts.push('تعديل');
if (e.op !== 'delete') {
if (e.archive) parts.push(e.archive === 'archived' ? 'أرشفة' : 'استعادة من الأرشيف');
if (e.approve) parts.push('موافقة');
}
return parts.join(' + ') || OP_TEXT[e.op];
}
function openReviewSheet() {
closeReviewSheet();
if (!_queue.length) return;
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="العمليات المعلّقة">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">العمليات المعلّقة</h3>
      </div>
      <div class="modal__body">
        <p class="admin-batch-note">دي عمليات لسع ما وصلت للأهالي. اضغط "حفظ الكل" لتطبيقها كلها مرة واحدة. وما اتسجّل وقت انقطاع النت (علامة "تلقائي") بيترفع لوحده لما النت يرجع.</p>
        <div class="admin-batch-list" id="admin-batch-list"></div>
      </div>
      <div class="modal__footer">
        <button class="btn btn--primary btn--full" data-batch="save-all">حفظ الكل</button>
        <button class="btn btn--ghost btn--full" data-batch="discard-all">تجاهل الكل</button>
        <button class="btn btn--ghost btn--full" data-batch="close">إغلاق</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
_sheet = backdrop;
const paint = () => {
const list = backdrop.querySelector('#admin-batch-list');
if (!_queue.length) { closeReviewSheet(); return; }
list.innerHTML = _queue.map(e => `
      <div class="admin-batch-item${e.error ? ' admin-batch-item--error' : ''}${e.op === 'delete' ? ' admin-batch-item--delete' : ''}">
        <div class="admin-batch-item__body">
          <span class="admin-batch-item__section">${escapeHtml(SECTIONS[e.section].label)} · ${escapeHtml(_opLabel(e))}${e.auto ? ' · تلقائي' : ''}</span>
          <strong class="admin-batch-item__title">${escapeHtml(e.label)}</strong>
          ${e.error ? `<span class="admin-batch-item__error">${escapeHtml(e.error)}</span>` : ''}
        </div>
        <button type="button" class="btn btn--ghost btn--sm" data-discard="${escapeHtml(e.k)}">تجاهل</button>
      </div>
    `).join('');
list.querySelectorAll('[data-discard]').forEach(btn => {
btn.addEventListener('click', () => discardPending(btn.dataset.discard));
});
const saveBtn = backdrop.querySelector('[data-batch="save-all"]');
saveBtn.disabled = _committing;
saveBtn.textContent = _committing && _progress ? `قاعدين نحفظ (${_progress.i} من ${_progress.n})...` : 'حفظ الكل';
};
paint();
const onChange = () => { if (_sheet === backdrop) paint(); };
window.addEventListener('admin-batch:change', onChange);
backdrop._off = () => window.removeEventListener('admin-batch:change', onChange);
backdrop.querySelector('[data-batch="close"]').addEventListener('click', closeReviewSheet);
backdrop.addEventListener('click', e => { if (e.target === backdrop) closeReviewSheet(); });
backdrop.querySelector('[data-batch="save-all"]').addEventListener('click', async () => {
await commitAll();
if (!_queue.length) closeReviewSheet();
});
backdrop.querySelector('[data-batch="discard-all"]').addEventListener('click', async () => {
const yes = await openConfirm({
title: 'تجاهل كل العمليات المعلّقة؟',
message: `${_queue.length} عملية حتتمسح من جهازك ولا يمكن استرجاعها.`,
confirmLabel: 'تجاهل الكل',
cancelLabel: 'تراجع',
danger: true,
icon: 'trash-2',
});
if (yes) { discardAll(); closeReviewSheet(); }
});
}
function closeReviewSheet() {
if (!_sheet) return;
_sheet._off?.();
_sheet.remove();
_sheet = null;
}
export async function confirmDisableBatchMode() {
if (!_queue.length) return true;
const save = await openConfirm({
title: 'عندك عمليات معلّقة',
message: `${_queue.length} عملية لسع ما اتحفظت. تحفظها هسع قبل ما توقف الوضع؟`,
confirmLabel: 'احفظ وأوقف',
cancelLabel: 'أوقف وخلّيها معلّقة',
icon: 'list-checks',
});
if (save) {
const r = await commitAll();
return r.failed === 0;
}
return true;
}
function _initUi() {
window.addEventListener('admin-batch:change', _renderBar);
window.addEventListener('popstate', () => setTimeout(_renderBar, 0));
window.addEventListener('offline', _renderBar);
window.addEventListener('online', () => { _renderBar(); _scheduleAuto(1500); });
document.addEventListener('visibilitychange', () => {
if (document.visibilityState === 'visible') _scheduleAuto(1500);
});
const watch = () => {
const app = document.querySelector('#app-content');
if (!app) return false;
new MutationObserver(() => { _renderBar(); _scheduleAuto(1500); }).observe(app, { attributes: true, attributeFilter: ['data-current-page'] });
return true;
};
if (!watch()) document.addEventListener('DOMContentLoaded', watch, { once: true });
_renderBar();
const tokens = new Set();
_queue.forEach(e => _collectTokens(e.patch, tokens));
if (tokens.size) hydratePreviews([...tokens]).then(changed => { if (changed) _runRefresh(); }).catch(() => {});
if (_queue.some(e => e.auto)) _scheduleAuto(4000);
}
if (typeof document !== 'undefined') {
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _initUi, { once: true });
else _initUi();
}
