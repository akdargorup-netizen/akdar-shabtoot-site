import { getOccasions, purgeArchivedContent } from '../../data/db.js';
import { stageOrRun, stageDelete, stageArchive, stageApprove, stagedMsg, applyPending, setBatchRefresh } from '../../shared/admin-batch.js';
import { OCCASION_CATEGORIES, getOccasionCategory } from '../../data/occasion-categories.js';
import { emptyState } from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { showToast } from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { canHardDelete, confirmDelete, confirmPurge, enhanceAdminPage, rowTitle } from '../../shared/admin-ui.js';
let _cleanupModal = null;
export function renderAdminOccasions() {
return `
    <section class="page admin-occasions-page">

      <div class="admin-content-toolbar">
        <p class="admin-pending-note hidden" id="admin-pending-note"></p>
        <p>
          مناسبات بيت مناسباتنا (تعازي، تبريكات، أعراس...) — محتوى
          ينشئه أهل البلد، دورك هنا مراجعتها، تصحيح أي خطأ بالتعديل،
          أو حذف أي مناسبة غير مناسبة أو مكررة. مناسبات تجاوزت ٦٠ يوم
          بتتأرشف تلقائياً — تقدر تؤرشف مناسبة فوراً أو تستعيدها يدوياً.
        </p>
      </div>

      <div class="admin-content-list" id="admin-content-list">
        <div class="admin-content-preview" style="height:74px;"></div>
        <div class="admin-content-preview" style="height:74px;"></div>
      </div>

      ${canHardDelete() ? `<div style="padding: var(--space-2) var(--spacing-page-x) 0;">
        <button class="btn btn--ghost btn--sm btn--full" data-action="purge-archived-occasions">
          <i data-lucide="trash-2"></i>
          حذف كل المناسبات المؤرشفة نهائياً
        </button>
      </div>` : ''}

    </section>
  `;
}
export async function initAdminOccasions() {
const page = document.querySelector('.admin-occasions-page');
if (!page) return;
setBatchRefresh(page, () => _loadList(page));
enhanceAdminPage(page);
page.querySelector('[data-action="purge-archived-occasions"]')?.addEventListener('click', async () => {
if (!await confirmPurge({ what: 'المناسبات المؤرشفة' })) return;
const { occasions } = await purgeArchivedContent('occasions');
showToast(occasions ? `اتمسحت ${occasions} مناسبة من الأرشيف` : 'ما في مناسبات مؤرشفة هسع', 'success');
if (occasions) logAdminAction('إفراغ أرشيف المناسبات', `${occasions} مناسبة`);
await _loadList(page);
});
await _loadList(page);
}
async function _loadList(page) {
const list = page.querySelector('#admin-content-list');
if (!list) return;
try {
const items = applyPending('occasions', await getOccasions({ includeArchived: true, includePending: true }));
items.sort((a, b) => _needsReview(b) - _needsReview(a));
const pendingCount = items.filter(_needsReview).length;
const note = page.querySelector('#admin-pending-note');
if (note) {
note.textContent = pendingCount ? `${pendingCount} بانتظار المراجعة (جديدة أو مخفية بالبلاغات) — ما تظهر للناس إلا بعد موافقتك` : '';
note.classList.toggle('hidden', !pendingCount);
}
if (!items.length) {
list.innerHTML = emptyState({
icon: 'flower-2',
title: 'لسع ما في مناسبات',
desc: 'أي مناسبة أهل البلد يضيفوها حتظهر هنا للمراجعة.',
});
renderIcons();
return;
}
list.innerHTML = items.map(_renderRow).join('');
renderIcons();
list.querySelectorAll('[data-action="approve-occasion"]').forEach(btn => {
btn.addEventListener('click', async () => {
btn.disabled = true;
try {
const stagedApr = await stageApprove('occasions', btn.dataset.id, { label: btn.dataset.title || String(btn.dataset.id) });
showToast(stagedApr ? stagedMsg('approve') : 'الموافقة تمت — المناسبة بقت ظاهرة للناس', 'success');
if (!stagedApr) logAdminAction('موافقة على مناسبة', btn.dataset.title || String(btn.dataset.id));
} catch (err) {
btn.disabled = false;
showToast(err.message || 'الموافقة على المناسبة لسع ما تمت — جرّب تاني', 'error');
return;
}
await _loadList(page);
});
});
list.querySelectorAll('[data-action="edit-occasion"]').forEach(btn => {
btn.addEventListener('click', () => {
const item = items.find(o => o.id === btn.dataset.id);
if (item) _openEditModal(item, () => _loadList(page));
});
});
list.querySelectorAll('[data-action="toggle-archive-occasion"]').forEach(btn => {
btn.addEventListener('click', async () => {
const nextState = btn.dataset.archived === '1' ? 'restored' : 'archived';
const stagedArc = await stageArchive('occasions', btn.dataset.id, nextState, { label: btn.dataset.title || rowTitle(btn) || String(btn.dataset.id) });
showToast(stagedArc ? stagedMsg('archive') : nextState === 'archived' ? 'اترشّفت المناسبة' : 'رجعت المناسبة من الأرشيف', 'success');
if (!stagedArc) logAdminAction(nextState === 'archived' ? 'أرشفة مناسبة' : 'استعادة مناسبة من الأرشيف', btn.dataset.title || String(btn.dataset.id));
await _loadList(page);
});
});
list.querySelectorAll('[data-action="delete-occasion"]').forEach(btn => {
btn.addEventListener('click', async () => {
if (!await confirmDelete({ what: 'المناسبة', name: rowTitle(btn), note: 'حيتحذف معاها كل التعليقات. لو داير تخفيها بس استخدم الأرشفة.' })) return;
const stagedDel = await stageDelete('occasions', btn.dataset.id, { label: btn.dataset.title || String(btn.dataset.id) });
showToast(stagedDel ? stagedMsg('delete') : 'المناسبة اتمسحت', 'success');
if (!stagedDel) logAdminAction('حذف مناسبة', btn.dataset.title || String(btn.dataset.id));
await _loadList(page);
});
});
} catch (err) {
console.error('[AdminOccasions] فشل التحميل:', err);
list.innerHTML = errorState({ subject: 'المناسبات' });
renderIcons(list);
bindErrorRetry(list, () => _loadList(page));
}
}
function _needsReview(item) {
return item.moderation === 'pending' || item.moderation === 'reported';
}
function _renderRow(item) {
const cat = getOccasionCategory(item.category);
return `
    <div class="admin-content-row${item.archived ? ' admin-content-row--archived' : ''}">
      <div class="admin-content-preview">
        <div class="admin-content-preview__thumb"><i data-icon="${cat.icon}"></i></div>
        <div class="admin-content-preview__body">
          <div class="admin-content-preview__head">
            <h4 class="admin-content-preview__title">${escapeHtml(item.title)}</h4>
            <span class="occasion-chip" data-chip="${cat.chipFamily}">${cat.label}</span>
            ${item.moderation === 'pending' ? '<span class="badge badge--warning">قيد المراجعة</span>' : ''}
            ${item.moderation === 'reported' ? `<span class="badge badge--warning">مخفي بالبلاغات (${item.reportsCount ?? 0})</span>` : ''}
            ${item.deletedByAuthor ? '<span class="badge badge--default">حذفه صاحبه</span>' : ''}
            ${item.archived ? '<span class="badge badge--default">مؤرشف</span>' : ''}
          </div>
          <span class="admin-content-preview__meta">
            ${escapeHtml(item.ownerName)} · ${escapeHtml(item.date)} · 💬 ${item.commentsCount ?? 0}
            ${item.eventDate ? ` · 🗓️ ${escapeHtml(item.eventDate)}` : ''}
            ${item.eventLocation ? ` · 📍 ${escapeHtml(item.eventLocation)}` : ''}
          </span>
        </div>
      </div>
      <div class="admin-content-row__actions">
        ${_needsReview(item) ? `
        <button class="btn btn--sm btn--primary admin-action-btn" data-action="approve-occasion" data-id="${item.id}" data-title="${escapeHtml(item.title || '')}">
          <i data-icon="check"></i><span>${item.moderation === 'reported' ? 'استعادة ونشر' : 'موافقة ونشر'}</span>
      </button>` : ''}
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="edit-occasion" data-id="${item.id}">
          <i data-icon="pencil"></i><span>تعديل</span>
      </button>
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="toggle-archive-occasion" data-id="${item.id}" data-title="${escapeHtml(item.title || '')}" data-archived="${item.archived ? '1' : '0'}">
          <i data-icon="${item.archived ? 'archive-restore' : 'archive'}"></i><span>${item.archived ? 'استعادة' : 'أرشفة'}</span>
      </button>
        ${canHardDelete() ? `<button class="btn btn--sm btn--danger admin-action-btn" data-action="delete-occasion" data-id="${item.id}" data-title="${escapeHtml(item.title || '')}">
          <i data-icon="trash-2"></i><span>حذف</span>
      </button>` : ''}
      </div>
    </div>
  `;
}
function _closeModal() {
if (_cleanupModal) {
_cleanupModal();
_cleanupModal = null;
}
}
function _openEditModal(item, onSuccess) {
_closeModal();
const categoryOptionsHtml = OCCASION_CATEGORIES.map(c =>
`<option value="${c.key}" ${item.category === c.key ? 'selected' : ''}>${c.label}</option>`
).join('');
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="تعديل المناسبة">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">تعديل المناسبة</h3>
      </div>
      <div class="modal__body">

        <div class="input-group">
          <label class="input-label" for="admin-occasion-title">العنوان</label>
          <input class="input" type="text" id="admin-occasion-title" value="${escapeHtml(item.title)}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-occasion-owner">الأسرة / صاحب المناسبة</label>
          <input class="input" type="text" id="admin-occasion-owner" value="${escapeHtml(item.ownerName)}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-occasion-category">النوع</label>
          <select class="input" id="admin-occasion-category">${categoryOptionsHtml}</select>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-occasion-date">الزمان</label>
          <input class="input" type="text" id="admin-occasion-date" value="${escapeHtml(item.eventDate || '')}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-occasion-location">المكان</label>
          <input class="input" type="text" id="admin-occasion-location" value="${escapeHtml(item.eventLocation || '')}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-occasion-text">النص</label>
          <textarea class="input" id="admin-occasion-text" rows="4">${escapeHtml(item.text)}</textarea>
        </div>

        <p class="input-error-msg hidden" id="admin-occasion-error"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="admin-occasion-cancel">إلغاء</button>
        <button class="btn btn--primary" id="admin-occasion-submit">حفظ التعديلات</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
const titleEl    = backdrop.querySelector('#admin-occasion-title');
const ownerEl    = backdrop.querySelector('#admin-occasion-owner');
const categoryEl = backdrop.querySelector('#admin-occasion-category');
const dateEl     = backdrop.querySelector('#admin-occasion-date');
const locationEl = backdrop.querySelector('#admin-occasion-location');
const textEl     = backdrop.querySelector('#admin-occasion-text');
const errorEl    = backdrop.querySelector('#admin-occasion-error');
const submitBtn  = backdrop.querySelector('#admin-occasion-submit');
const close = () => { backdrop.remove(); _cleanupModal = null; };
const submit = async () => {
const title = titleEl.value.trim();
const ownerName = ownerEl.value.trim();
const text = textEl.value.trim();
if (!title || !ownerName || !text) {
errorEl.textContent = 'كل الخانات لازم تتملى';
errorEl.classList.remove('hidden');
return;
}
errorEl.classList.add('hidden');
submitBtn.disabled = true;
submitBtn.textContent = 'قاعدين نحفظ...';
try {
const staged = await stageOrRun('occasions', item.id, {
title,
ownerName,
category: categoryEl.value,
text,
eventDate: dateEl.value.trim(),
eventLocation: locationEl.value.trim(),
}, { label: title });
showToast(staged ? stagedMsg() : 'التعديلات اتحفظت', 'success');
if (!staged) logAdminAction('تعديل مناسبة', title);
close();
onSuccess?.();
} catch (err) {
errorEl.textContent = err.message || 'الحفظ لسع ما تم';
errorEl.classList.remove('hidden');
submitBtn.disabled = false;
submitBtn.textContent = 'حفظ التعديلات';
}
};
backdrop.querySelector('#admin-occasion-cancel').addEventListener('click', close);
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
backdrop.querySelector('#admin-occasion-submit').addEventListener('click', submit);
_cleanupModal = close;
}
