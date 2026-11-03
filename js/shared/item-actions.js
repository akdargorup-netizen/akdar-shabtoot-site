import { getCurrentUser, requireRealAuth } from '../data/auth.js';
import { isAdminSessionUnlocked } from '../data/admin-auth.js';
import {
editOwnPost, deleteOwnPost, reportPost,
editOwnComment, deleteOwnComment, reportComment, restoreComment,
} from '../data/db.js';
import { OCCASION_COMMENT_MAX_LENGTH } from '../data/occasion-categories.js';
import { isWithinEditWindow, editMinutesLeft, REPORT_REASONS } from '../data/moderation-config.js';
import { renderIcons } from './icons.js';
import { escapeHtml } from './sanitize.js';
import { showToast } from './toast.js';
import { openConfirm } from './confirm-modal.js';
import { SubmissionGuardError } from './submission-guard.js';
const LONG_PRESS_MS   = 500;
const MOVE_TOLERANCE  = 10;
const INTERACTIVE_SEL = 'button, a, input, textarea, select, label, form, [data-item-menu]';
export function itemAttrs({ kind, id, parent = '', owner = '', created = '', moderation = '' }) {
return [
`data-item-kind="${escapeHtml(kind)}"`,
`data-item-id="${escapeHtml(String(id))}"`,
`data-item-parent="${escapeHtml(String(parent))}"`,
`data-item-owner="${escapeHtml(String(owner || ''))}"`,
`data-item-created="${escapeHtml(String(created || ''))}"`,
`data-item-mod="${escapeHtml(String(moderation || ''))}"`,
].join(' ');
}
export function itemMenuButton({ small = false, corner = false } = {}) {
return `
    <button type="button" class="item-menu-btn${small ? ' item-menu-btn--sm' : ''}${corner ? ' item-menu-btn--corner' : ''}" data-item-menu aria-haspopup="dialog" aria-label="خيارات">
      <i data-icon="ellipsis-vertical"></i>
    </button>
  `;
}
export function editedMark(item) {
return item?.editedAt ? '<span class="item-edited-mark">· معدّل</span>' : '';
}
function _parse(host) {
const d = host.dataset;
const kind = d.itemKind || '';
return {
kind,
base: kind.replace('-comment', ''),
isComment: kind.endsWith('-comment'),
id: d.itemId || '',
parent: d.itemParent || '',
owner: d.itemOwner || '',
created: d.itemCreated || '',
moderation: d.itemMod || '',
};
}
export function bindItemActions(root, options = {}) {
if (!root) return;
root._itemActionsOpts = options;
if (root._itemActionsBound) return;
root._itemActionsBound = true;
let timer = null;
let startX = 0, startY = 0;
let lastFire = 0;
const open = host => {
lastFire = Date.now();
openItemMenu(host, root._itemActionsOpts || {});
};
const cancel = () => { clearTimeout(timer); timer = null; };
root.addEventListener('click', e => {
if (Date.now() - lastFire < 600 && !e.target.closest('[data-item-menu]')) {
e.preventDefault();
e.stopPropagation();
return;
}
const btn = e.target.closest('[data-item-menu]');
if (!btn) return;
const host = btn.closest('[data-item-kind]');
if (host && root.contains(host)) {
e.preventDefault();
e.stopPropagation();
open(host);
}
}, true);
root.addEventListener('pointerdown', e => {
if (e.pointerType === 'mouse' || !e.isPrimary) return;
if (e.target.closest(INTERACTIVE_SEL)) return;
const host = e.target.closest('[data-item-kind]');
if (!host || !root.contains(host)) return;
startX = e.clientX; startY = e.clientY;
cancel();
timer = setTimeout(() => {
timer = null;
try { navigator.vibrate?.(12); } catch {   }
open(host);
}, LONG_PRESS_MS);
});
root.addEventListener('pointermove', e => {
if (timer && Math.hypot(e.clientX - startX, e.clientY - startY) > MOVE_TOLERANCE) cancel();
});
['pointerup', 'pointercancel', 'scroll'].forEach(ev =>
root.addEventListener(ev, cancel, { passive: true, capture: true }));
root.addEventListener('contextmenu', e => {
if (e.target.closest('input, textarea')) return;
const host = e.target.closest('[data-item-kind]');
if (!host || !root.contains(host)) return;
e.preventDefault();
if (Date.now() - lastFire < 800) return;
cancel();
open(host);
});
}
let _closeSheet = null;
function _closeAny() {
if (_closeSheet) { _closeSheet(); _closeSheet = null; }
}
function _sheet({ title, bodyHtml, label }) {
_closeAny();
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop item-sheet-backdrop';
backdrop.innerHTML = `
    <div class="modal item-sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(label || title)}">
      <div class="modal__handle"></div>
      ${title ? `<div class="item-sheet__title">${escapeHtml(title)}</div>` : ''}
      ${bodyHtml}
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons(backdrop);
const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); };
const onKey = e => { if (e.key === 'Escape') { close(); _closeSheet = null; } };
document.addEventListener('keydown', onKey);
backdrop.addEventListener('click', e => { if (e.target === backdrop) { close(); _closeSheet = null; } });
_closeSheet = close;
return { backdrop, close };
}
function _viewerCan(desc) {
const uid = getCurrentUser()?.uid || null;
const own = !!uid && desc.owner === uid;
const reported = desc.moderation === 'reported';
const withinWindow = isWithinEditWindow(desc.created);
return {
own,
canEdit: own && !reported && withinWindow,
minutesLeft: editMinutesLeft(desc.created),
canReport: !own,
canRestore: !own && reported && desc.isComment && isAdminSessionUnlocked(),
};
}
export function openItemMenu(host, options = {}) {
const desc = _parse(host);
if (!desc.kind || !desc.id) return;
const can = _viewerCan(desc);
const noun = desc.isComment ? 'التعليق' : (desc.base === 'idea' ? 'الفكرة' : 'المناسبة');
const actions = [];
if (can.canEdit)    actions.push({ key: 'edit',    icon: 'pencil',    label: `تعديل ${noun}` });
if (can.own)        actions.push({ key: 'delete',  icon: 'trash-2',   label: `حذف ${noun}`, danger: true });
if (can.canReport)  actions.push({ key: 'report',  icon: 'flag',      label: `إبلاغ عن ${noun}` });
if (can.canRestore) actions.push({ key: 'restore', icon: 'rotate-ccw', label: 'استعادة التعليق (مشرف)' });
if (!actions.length) return;
const hint = can.own
? (can.canEdit
? `التعديل متاح لـ ${can.minutesLeft} دقيقة أخرى`
: (desc.moderation === 'reported' ? '' : 'التعديل متاح ١٥ دقيقة بعد النشر فقط'))
: '';
const { backdrop, close } = _sheet({
title: 'خيارات',
label: `خيارات ${noun}`,
bodyHtml: `
      <div class="item-sheet__list" role="menu">
        ${actions.map(a => `
          <button type="button" class="item-sheet__action${a.danger ? ' item-sheet__action--danger' : ''}" role="menuitem" data-act="${a.key}">
            <i data-icon="${a.icon}"></i><span>${a.label}</span>
          </button>
        `).join('')}
      </div>
      ${hint ? `<p class="item-sheet__hint">${hint}</p>` : ''}
      <div class="item-sheet__footer"><button type="button" class="btn btn--ghost btn--full" data-act="cancel">إلغاء</button></div>
    `,
});
backdrop.addEventListener('click', e => {
const btn = e.target.closest('[data-act]');
if (!btn) return;
const act = btn.dataset.act;
close(); _closeSheet = null;
if (act === 'edit')    _doEdit(desc, options);
if (act === 'delete')  _doDelete(desc, options, noun);
if (act === 'report')  _doReport(desc, options, noun);
if (act === 'restore') _doRestore(desc, options);
});
}
function _errToast(err, fallback) {
const known = err instanceof SubmissionGuardError || (err && typeof err.message === 'string' && /[؀-ۿ]/.test(err.message));
showToast(known ? err.message : fallback, 'error');
}
async function _doDelete(desc, options, noun) {
const ok = await openConfirm({
title: `عايز تمسح ${noun}؟`,
message: desc.isComment ? 'تعليقك حيتحذف وما بتقدر ترجّعه.' : 'ما حيظهر للناس تاني.',
confirmLabel: 'امسح',
danger: true,
icon: 'trash-2',
});
if (!ok) return;
const uid = getCurrentUser()?.uid;
try {
if (desc.isComment) await deleteOwnComment(desc.base, desc.parent, desc.id, uid);
else                await deleteOwnPost(desc.base, desc.id, uid);
showToast('اتحذف', 'success');
options.onChange?.({ action: 'delete', desc, result: null });
} catch (err) {
_errToast(err, 'الحذف لسع ما تم — جرّب تاني');
}
}
async function _doRestore(desc, options) {
try {
const result = await restoreComment(desc.base, desc.parent, desc.id);
showToast('التعليق اتستعاد', 'success');
options.onChange?.({ action: 'restore', desc, result });
} catch (err) {
_errToast(err, 'استعادة التعليق لسع ما تمت — جرّب تاني');
}
}
async function _doReport(desc, options, noun) {
const ok = await requireRealAuth();
if (!ok) return;
const { backdrop, close } = _sheet({
title: `سبب الإبلاغ عن ${noun}`,
bodyHtml: `
      <div class="item-sheet__list">
        ${REPORT_REASONS.map(r => `
          <button type="button" class="item-sheet__action" data-reason="${r.key}">
            <i data-icon="flag"></i><span>${r.label}</span>
          </button>
        `).join('')}
      </div>
      <div class="item-sheet__footer"><button type="button" class="btn btn--ghost btn--full" data-cancel>إلغاء</button></div>
    `,
});
backdrop.addEventListener('click', async e => {
if (e.target.closest('[data-cancel]')) { close(); _closeSheet = null; return; }
const btn = e.target.closest('[data-reason]');
if (!btn) return;
btn.disabled = true;
const uid = getCurrentUser()?.uid;
try {
const result = desc.isComment
? await reportComment(desc.base, desc.parent, desc.id, uid, btn.dataset.reason)
: await reportPost(desc.base, desc.id, uid, btn.dataset.reason);
close(); _closeSheet = null;
showToast('وصلنا بلاغك، شكراً ليك', 'success');
options.onChange?.({ action: 'report', desc, result });
} catch (err) {
close(); _closeSheet = null;
_errToast(err, 'البلاغ لسع ما وصل — جرّب تاني');
}
});
}
function _editFields(desc) {
if (desc.isComment) {
return [{ key: 'text', label: 'التعليق', max: desc.base === 'idea' ? 500 : OCCASION_COMMENT_MAX_LENGTH, rows: 3, required: true }];
}
if (desc.base === 'idea') {
return [
{ key: 'title',       label: 'عنوان الفكرة', max: 80,  rows: 0, required: true },
{ key: 'description', label: 'وصف الفكرة',   max: 400, rows: 4, required: true },
{ key: 'benefit',     label: 'الفائدة المتوقعة (اختياري)', max: 300, rows: 2 },
];
}
return [
{ key: 'title',     label: 'عنوان المناسبة',    max: 100, rows: 0, required: true },
{ key: 'ownerName', label: 'اسم صاحب المناسبة', max: 60,  rows: 0, required: true },
{ key: 'text',      label: 'النص (اختياري)',     max: 300, rows: 3 },
];
}
function _doEdit(desc, options) {
const current = options.getData?.(desc) || {};
const fields = _editFields(desc);
const { backdrop, close } = _sheet({
title: desc.isComment ? 'تعديل التعليق' : (desc.base === 'idea' ? 'تعديل الفكرة' : 'تعديل المناسبة'),
bodyHtml: `
      <div class="modal__body item-edit__body">
        ${fields.map((f, i) => `
          <div class="input-group">
            <label class="input-label${f.required ? ' input-label--required' : ''}" for="item-edit-${i}">${f.label}</label>
            ${f.rows
? `<textarea class="input" id="item-edit-${i}" data-key="${f.key}" rows="${f.rows}" maxlength="${f.max}">${escapeHtml(current[f.key] ?? '')}</textarea>`
: `<input class="input" id="item-edit-${i}" data-key="${f.key}" type="text" maxlength="${f.max}" value="${escapeHtml(current[f.key] ?? '')}" />`}
          </div>
        `).join('')}
        <p class="input-error-msg hidden" id="item-edit-error"></p>
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn--primary" data-save>حفظ التعديل</button>
        <button type="button" class="btn btn--ghost" data-cancel>إلغاء</button>
      </div>
    `,
});
const errEl = backdrop.querySelector('#item-edit-error');
const saveBtn = backdrop.querySelector('[data-save]');
const showErr = msg => { errEl.textContent = msg; errEl.classList.remove('hidden'); };
backdrop.querySelector('[data-cancel]').addEventListener('click', () => { close(); _closeSheet = null; });
saveBtn.addEventListener('click', async () => {
const patch = {};
for (const f of fields) {
const v = backdrop.querySelector(`[data-key="${f.key}"]`).value.trim();
if (f.required && !v) { showErr(`${f.label} مطلوب`); return; }
if (v !== String(current[f.key] ?? '')) patch[f.key] = v;
}
if (!Object.keys(patch).length) { close(); _closeSheet = null; return; }
saveBtn.disabled = true;
saveBtn.textContent = 'قاعدين نحفظ...';
const uid = getCurrentUser()?.uid;
try {
const result = desc.isComment
? await editOwnComment(desc.base, desc.parent, desc.id, uid, patch.text)
: await editOwnPost(desc.base, desc.id, uid, patch);
close(); _closeSheet = null;
showToast('التعديل اتحفظ', 'success');
options.onChange?.({ action: 'edit', desc, result });
} catch (err) {
saveBtn.disabled = false;
saveBtn.textContent = 'حفظ التعديل';
showErr(err?.message && /[؀-ۿ]/.test(err.message) ? err.message : 'التعديل لسع ما اتحفظ — جرّب تاني');
}
});
}
