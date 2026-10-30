import { getIdeas, purgeArchivedContent } from '../../data/db.js';
import { stageOrRun, stageDelete, stageArchive, stageApprove, stagedMsg, applyPending, setBatchRefresh } from '../../shared/admin-batch.js';
import { IDEA_CATEGORIES } from '../../data/idea-box-data.js';
import { categoryLabel, STATUS_BADGE_CLASS } from '../idea-box.js';
import { emptyState } from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { showToast } from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { canHardDelete, confirmDelete, confirmPurge, enhanceAdminPage, rowTitle } from '../../shared/admin-ui.js';
let _cleanupModal = null;
export function renderAdminIdeaBox() {
return `
    <section class="page admin-idea-box-page">

      <div class="admin-content-toolbar">
        <p class="admin-pending-note hidden" id="admin-pending-note"></p>
        <p>
          الأفكار المقترحة من الأهالي — التصويت وترتيبها آلي، دورك هنا
          مراجعة المحتوى، تصحيح أي خطأ إملائي أو غير مناسب بالتعديل،
          أو حذف فكرة مكررة تماماً. أفكار تجاوزت ٤٥ يوم بتتأرشف تلقائياً
          — تقدر تؤرشف فكرة فوراً أو تستعيدها يدوياً.
        </p>
      </div>

      <div class="admin-content-list" id="admin-content-list">
        <div class="admin-content-preview" style="height:74px;"></div>
        <div class="admin-content-preview" style="height:74px;"></div>
      </div>

      ${canHardDelete() ? `<div style="padding: var(--space-2) var(--spacing-page-x) 0;">
        <button class="btn btn--ghost btn--sm btn--full" data-action="purge-archived-ideas">
          <i data-lucide="trash-2"></i>
          حذف كل الأفكار المؤرشفة نهائياً
        </button>
      </div>` : ''}

    </section>
  `;
}
export async function initAdminIdeaBox() {
const page = document.querySelector('.admin-idea-box-page');
if (!page) return;
setBatchRefresh(page, () => _loadList(page));
enhanceAdminPage(page);
page.querySelector('[data-action="purge-archived-ideas"]')?.addEventListener('click', async () => {
if (!await confirmPurge({ what: 'الأفكار المؤرشفة' })) return;
const { ideas } = await purgeArchivedContent('ideas');
showToast(ideas ? `اتمسحت ${ideas} فكرة من الأرشيف` : 'ما في أفكار مؤرشفة حالياً', 'success');
if (ideas) logAdminAction('إفراغ أرشيف الأفكار', `${ideas} فكرة`);
await _loadList(page);
});
await _loadList(page);
}
async function _loadList(page) {
const list = page.querySelector('#admin-content-list');
if (!list) return;
try {
const items = applyPending('ideas', await getIdeas({ sort: 'new', includeArchived: true, includePending: true }));
items.sort((a, b) => _needsReview(b) - _needsReview(a));
const pendingCount = items.filter(_needsReview).length;
const note = page.querySelector('#admin-pending-note');
if (note) {
note.textContent = pendingCount ? `${pendingCount} بانتظار المراجعة (جديدة أو مخفية بالبلاغات) — ما تظهر للناس إلا بعد موافقتك` : '';
note.classList.toggle('hidden', !pendingCount);
}
if (!items.length) {
list.innerHTML = emptyState({
icon: 'lightbulb',
title: 'لسع ما في أفكار مقترحة',
desc: 'أي فكرة يضيفها أهل البلد حتظهر هنا للمراجعة.',
});
renderIcons();
return;
}
list.innerHTML = items.map(_renderRow).join('');
renderIcons();
list.querySelectorAll('[data-action="approve-idea"]').forEach(btn => {
btn.addEventListener('click', async () => {
btn.disabled = true;
try {
const stagedApr = await stageApprove('ideas', btn.dataset.id, { label: btn.dataset.title || String(btn.dataset.id) });
showToast(stagedApr ? stagedMsg('approve') : 'الموافقة تمت — الفكرة بقت ظاهرة للناس', 'success');
if (!stagedApr) logAdminAction('موافقة على فكرة', btn.dataset.title || String(btn.dataset.id));
} catch (err) {
btn.disabled = false;
showToast(err.message || 'الموافقة على الفكرة لسع ما تمت — جرّب تاني', 'error');
return;
}
await _loadList(page);
});
});
list.querySelectorAll('[data-action="edit-idea"]').forEach(btn => {
btn.addEventListener('click', () => {
const item = items.find(i => i.id === btn.dataset.id);
if (item) _openEditModal(item, () => _loadList(page));
});
});
list.querySelectorAll('[data-action="toggle-archive-idea"]').forEach(btn => {
btn.addEventListener('click', async () => {
const nextState = btn.dataset.archived === '1' ? 'restored' : 'archived';
const stagedArc = await stageArchive('ideas', btn.dataset.id, nextState, { label: btn.dataset.title || rowTitle(btn) || String(btn.dataset.id) });
showToast(stagedArc ? stagedMsg('archive') : nextState === 'archived' ? 'اترشّفت الفكرة' : 'ارجعت الفكرة من الأرشيف', 'success');
if (!stagedArc) logAdminAction(nextState === 'archived' ? 'أرشفة فكرة' : 'استعادة فكرة من الأرشيف', btn.dataset.title || String(btn.dataset.id));
await _loadList(page);
});
});
list.querySelectorAll('[data-action="delete-idea"]').forEach(btn => {
btn.addEventListener('click', async () => {
if (!await confirmDelete({ what: 'الفكرة', name: rowTitle(btn), note: 'حيتحذف معاها كل الأصوات والتعليقات. لو داير تخفيها بس استخدم الأرشفة.' })) return;
const stagedDel = await stageDelete('ideas', btn.dataset.id, { label: btn.dataset.title || String(btn.dataset.id) });
showToast(stagedDel ? stagedMsg('delete') : 'الفكرة اتمسحت', 'success');
if (!stagedDel) logAdminAction('حذف فكرة', btn.dataset.title || String(btn.dataset.id));
await _loadList(page);
});
});
} catch (err) {
console.error('[AdminIdeaBox] فشل التحميل:', err);
list.innerHTML = errorState({ subject: 'الأفكار' });
renderIcons(list);
bindErrorRetry(list, () => _loadList(page));
}
}
function _needsReview(item) {
return item.moderation === 'pending' || item.moderation === 'reported';
}
function _renderRow(item) {
return `
    <div class="admin-content-row${item.archived ? ' admin-content-row--archived' : ''}">
      <div class="admin-content-preview">
        <div class="admin-content-preview__thumb"><i data-lucide="lightbulb"></i></div>
        <div class="admin-content-preview__body">
          <div class="admin-content-preview__head">
            <h4 class="admin-content-preview__title">${escapeHtml(item.title)}</h4>
            <span class="badge ${STATUS_BADGE_CLASS[item.statusKey]}">${item.statusLabel}</span>
            ${item.moderation === 'pending' ? '<span class="badge badge--warning">قيد المراجعة</span>' : ''}
            ${item.moderation === 'reported' ? `<span class="badge badge--warning">مخفي بالبلاغات (${item.reportsCount ?? 0})</span>` : ''}
            ${item.deletedByAuthor ? '<span class="badge badge--default">حذفه صاحبه</span>' : ''}
            ${item.archived ? '<span class="badge badge--default">مؤرشف</span>' : ''}
          </div>
          <span class="admin-content-preview__meta">
            ${escapeHtml(item.authorName)} · ${categoryLabel(item.category)} ·
            👍 ${item.votesUp} · 👎 ${item.votesDown} · 💬 ${item.commentsCount}
          </span>
        </div>
      </div>
      <div class="admin-content-row__actions">
        ${_needsReview(item) ? `
        <button class="btn btn--sm btn--primary admin-action-btn" data-action="approve-idea" data-id="${item.id}" data-title="${escapeHtml(item.title || '')}">
          <i data-lucide="check"></i><span>${item.moderation === 'reported' ? 'استعادة ونشر' : 'موافقة ونشر'}</span>
      </button>` : ''}
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="edit-idea" data-id="${item.id}">
          <i data-lucide="pencil"></i><span>تعديل</span>
      </button>
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="toggle-archive-idea" data-id="${item.id}" data-title="${escapeHtml(item.title || '')}" data-archived="${item.archived ? '1' : '0'}">
          <i data-lucide="${item.archived ? 'archive-restore' : 'archive'}"></i><span>${item.archived ? 'استعادة' : 'أرشفة'}</span>
      </button>
        ${canHardDelete() ? `<button class="btn btn--sm btn--danger admin-action-btn" data-action="delete-idea" data-id="${item.id}" data-title="${escapeHtml(item.title || '')}">
          <i data-lucide="trash-2"></i><span>حذف</span>
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
const categoryOptionsHtml = IDEA_CATEGORIES.map(c =>
`<option value="${c.key}" ${item.category === c.key ? 'selected' : ''}>${c.label}</option>`
).join('');
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="تعديل الفكرة">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">تعديل الفكرة</h3>
      </div>
      <div class="modal__body">

        <div class="input-group">
          <label class="input-label" for="admin-idea-title">العنوان</label>
          <input class="input" type="text" id="admin-idea-title" value="${escapeHtml(item.title)}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-idea-description">الوصف</label>
          <textarea class="input" id="admin-idea-description" rows="4">${escapeHtml(item.description)}</textarea>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-idea-benefit">الفائدة المتوقعة</label>
          <textarea class="input" id="admin-idea-benefit" rows="2">${escapeHtml(item.benefit)}</textarea>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-idea-category">التصنيف</label>
          <select class="input" id="admin-idea-category">${categoryOptionsHtml}</select>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-idea-entity">الجهة المقترحة</label>
          <input class="input" type="text" id="admin-idea-entity" value="${escapeHtml(item.proposedEntity || '')}" placeholder="مثال: لجنة البلد">
        </div>

        <p class="input-error-msg hidden" id="admin-idea-error"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="admin-idea-cancel">إلغاء</button>
        <button class="btn btn--primary" id="admin-idea-submit">حفظ التعديلات</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
const titleEl       = backdrop.querySelector('#admin-idea-title');
const descriptionEl = backdrop.querySelector('#admin-idea-description');
const benefitEl      = backdrop.querySelector('#admin-idea-benefit');
const categoryEl     = backdrop.querySelector('#admin-idea-category');
const entityEl       = backdrop.querySelector('#admin-idea-entity');
const errorEl        = backdrop.querySelector('#admin-idea-error');
const submitBtn      = backdrop.querySelector('#admin-idea-submit');
const close = () => { backdrop.remove(); _cleanupModal = null; };
const submit = async () => {
const title = titleEl.value.trim();
if (!title) {
errorEl.textContent = 'العنوان لازم';
errorEl.classList.remove('hidden');
return;
}
errorEl.classList.add('hidden');
submitBtn.disabled = true;
submitBtn.textContent = 'قاعدين نحفظ...';
try {
const staged = await stageOrRun('ideas', item.id, {
title,
description:    descriptionEl.value.trim(),
benefit:        benefitEl.value.trim(),
category:       categoryEl.value,
proposedEntity: entityEl.value.trim(),
}, { label: title });
showToast(staged ? stagedMsg() : 'التعديلات اتحفظت', 'success');
if (!staged) logAdminAction('تعديل فكرة', title);
close();
onSuccess?.();
} catch (err) {
errorEl.textContent = err.message || 'الحفظ لسع ما تم';
errorEl.classList.remove('hidden');
submitBtn.disabled = false;
submitBtn.textContent = 'حفظ التعديلات';
}
};
backdrop.querySelector('#admin-idea-cancel').addEventListener('click', close);
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
backdrop.querySelector('#admin-idea-submit').addEventListener('click', submit);
_cleanupModal = close;
}
