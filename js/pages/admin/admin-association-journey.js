import {
getAssociationJourneyArticles,
} from '../../data/db.js';
import { ASSOCIATION_JOURNEY_SECTIONS } from '../../data/association-journey-data.js';
import { createImageUploadField } from '../../shared/image-upload-field.js';
import { emptyState }             from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { showToast }              from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { stageOrRun, applyPending, setBatchRefresh, stageDelete, stageAdd, stagedMsg } from '../../shared/admin-batch.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { ARTICLE_BODY_HINT } from '../../shared/article-markup.js';
import { canHardDelete, confirmDelete, enhanceAdminPage, rowTitle } from '../../shared/admin-ui.js';
let _cleanupModal = null;
let _uploadField   = null;
export function renderAdminAssociationJourney() {
return `
    <section class="page admin-association-journey-page">

      <div class="admin-content-toolbar">
        <p>
          من هنا تنشر مقالات مسيرة الرابطة — اختر القسم (الحكاية/
          الإنجازات/السجل الذهبي) واكتب العنوان والمحتوى. كل فقرة في
          سطر مستقل داخل صندوق النص، وتظهر مفصولة داخل جوكر القراءة.
          النشر فوري ويظهر لكل المستخدمين مباشرة في صفحة القسم المختار.
        </p>
        <button class="cta-button cta-button--full" data-action="compose-journey">
          <i data-lucide="plus"></i>
          مقال جديد
        </button>
      </div>

      <div class="admin-content-list" id="admin-content-list">
        <div class="admin-content-preview" style="height:74px;"></div>
        <div class="admin-content-preview" style="height:74px;"></div>
      </div>

    </section>
  `;
}
export async function initAdminAssociationJourney() {
const page = document.querySelector('.admin-association-journey-page');
if (!page) return;
setBatchRefresh(page, () => _loadList(page));
enhanceAdminPage(page);
page.querySelector('[data-action="compose-journey"]')?.addEventListener('click', () => {
_openComposeModal(null, () => _loadList(page));
});
await _loadList(page);
}
async function _loadList(page) {
const list = page.querySelector('#admin-content-list');
if (!list) return;
try {
const items = applyPending('journey', await getAssociationJourneyArticles(undefined, { full: true }));
if (!items.length) {
list.innerHTML = emptyState({
icon: 'scroll-text',
title: 'لسع ما في مقالات منشورة',
desc: 'ابدأ بنشر أول مقال من مسيرة الرابطة.',
});
renderIcons();
return;
}
list.innerHTML = items.map(_renderRow).join('');
renderIcons();
list.querySelectorAll('[data-action="edit-journey"]').forEach(btn => {
btn.addEventListener('click', () => {
const item = items.find(a => String(a.id) === btn.dataset.id);
if (item) _openComposeModal(item, () => _loadList(page));
});
});
list.querySelectorAll('[data-action="delete-journey"]').forEach(btn => {
btn.addEventListener('click', async () => {
if (!await confirmDelete({ what: 'المقال', name: rowTitle(btn) })) return;
const stagedDel = await stageDelete('journey', btn.dataset.id, { label: btn.dataset.title || String(btn.dataset.id) });
showToast(stagedDel ? stagedMsg('delete') : 'المقال اتمسح', 'success');
if (!stagedDel) logAdminAction('حذف مقال (مسيرة الرابطة)', btn.dataset.title || String(btn.dataset.id));
await _loadList(page);
});
});
} catch (err) {
console.error('[AdminAssociationJourney] فشل التحميل:', err);
list.innerHTML = errorState({ subject: 'المقالات' });
renderIcons(list);
bindErrorRetry(list, () => _loadList(page));
}
}
function _renderRow(item) {
return `
    <div class="admin-content-row">
      <div class="admin-content-preview">
        <div class="admin-content-preview__thumb">
          ${item.image ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async">` : '<i data-lucide="scroll-text"></i>'}
        </div>
        <div class="admin-content-preview__body">
          <div class="admin-content-preview__head">
            <h4 class="admin-content-preview__title">${escapeHtml(item.title || 'مقال')}</h4>
            ${item.important ? '<span class="badge badge--warning">مهم</span>' : ''}
          </div>
          <span class="admin-content-preview__meta">${item.category || item.section} · ${item.date || ''}</span>
        </div>
      </div>
      <div class="admin-content-row__actions">
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="edit-journey" data-id="${item.id}">
          <i data-lucide="pencil"></i><span>تعديل</span>
      </button>
        ${canHardDelete() ? `<button class="btn btn--sm btn--danger admin-action-btn" data-action="delete-journey" data-id="${item.id}" data-title="${escapeHtml(item.title || '')}">
          <i data-lucide="trash-2"></i><span>حذف</span>
      </button>` : ''}
      </div>
    </div>
  `;
}
function _openComposeModal(existing, onSuccess) {
closeComposeModal();
const isEdit = Boolean(existing);
const selectedSection = existing?.section || ASSOCIATION_JOURNEY_SECTIONS[0]?.key || 'story';
const sectionsHtml = ASSOCIATION_JOURNEY_SECTIONS.map(s => `
    <label class="admin-type-option${selectedSection === s.key ? ' is-selected' : ''}">
      <input type="radio" name="journey-section" value="${s.key}" ${selectedSection === s.key ? 'checked' : ''}>
      <span>${s.label}</span>
    </label>
  `).join('');
const bodyText = existing?.body?.length ? existing.body.join('\n\n') : '';
_uploadField = createImageUploadField({
pathPrefix:  'association-journey',
existingUrl: existing?.image || '',
label:       'صورة المقال (اختياري)',
allowGalleryPick: true,
});
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${isEdit ? 'تعديل مقال' : 'مقال جديد'}">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">${isEdit ? 'تعديل المقال' : 'مقال جديد'}</h3>
      </div>
      <div class="modal__body">

        <div class="input-group">
          <label class="input-label">القسم</label>
          <div class="admin-type-grid" id="admin-journey-section-grid">${sectionsHtml}</div>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-journey-title">العنوان</label>
          <input class="input" type="text" id="admin-journey-title" placeholder="مثال: كيف بدأت الرابطة" value="${existing?.title ? escapeHtml(existing.title) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-journey-source">المصدر (اختياري)</label>
          <input class="input" type="text" id="admin-journey-source" placeholder="مثال: أرشيف الرابطة" value="${existing?.source ? escapeHtml(existing.source) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-journey-date">التاريخ (اختياري)</label>
          <input class="input" type="text" id="admin-journey-date" placeholder="مثال: ٢٠١٨ أو تركها فاضية" value="${existing?.date ? escapeHtml(existing.date) : ''}">
        </div>

        ${_uploadField.html}

        <div class="input-group">
          <label class="input-label" for="admin-journey-body">نص المقال</label>
          <textarea class="input" id="admin-journey-body" rows="8" placeholder="${escapeHtml(ARTICLE_BODY_HINT)}">${escapeHtml(bodyText)}</textarea>
        </div>

        <div class="admin-toggle-row">
          <span>مقال مهم (يظهر أول القائمة قبل باقي المقالات)</span>
          <label class="switch">
            <input type="checkbox" id="admin-journey-important" ${existing?.important ? 'checked' : ''}>
            <span class="switch__track"></span>
          </label>
        </div>

        <p class="input-error-msg hidden" id="admin-journey-error"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="admin-journey-cancel">إلغاء</button>
        <button class="btn btn--primary" id="admin-journey-submit">${isEdit ? 'حفظ التعديلات' : 'نشر المقال'}</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
_uploadField.mount(backdrop);
const grid       = backdrop.querySelector('#admin-journey-section-grid');
const titleEl    = backdrop.querySelector('#admin-journey-title');
const sourceEl   = backdrop.querySelector('#admin-journey-source');
const dateEl     = backdrop.querySelector('#admin-journey-date');
const bodyEl     = backdrop.querySelector('#admin-journey-body');
const importantEl = backdrop.querySelector('#admin-journey-important');
const errorEl    = backdrop.querySelector('#admin-journey-error');
const submitBtn  = backdrop.querySelector('#admin-journey-submit');
grid.querySelectorAll('.admin-type-option').forEach(opt => {
opt.addEventListener('click', () => {
grid.querySelectorAll('.admin-type-option').forEach(o => o.classList.remove('is-selected'));
opt.classList.add('is-selected');
});
});
const close = () => { backdrop.remove(); _cleanupModal = null; _uploadField = null; };
const submit = async () => {
const title   = titleEl.value.trim();
const source  = sourceEl.value.trim();
const date    = dateEl.value.trim();
const image   = _uploadField.getValue();
const section = grid.querySelector('input[name="journey-section"]:checked')?.value || ASSOCIATION_JOURNEY_SECTIONS[0]?.key;
const important = Boolean(importantEl?.checked);
const body = bodyEl.value
.split(/\n+/)
.map(p => p.trim())
.filter(Boolean);
if (!title) {
errorEl.textContent = 'لو سمحت اكتب عنوان المقال';
errorEl.classList.remove('hidden');
return;
}
if (!body.length) {
errorEl.textContent = 'لو سمحت اكتب نص المقال';
errorEl.classList.remove('hidden');
return;
}
errorEl.classList.add('hidden');
submitBtn.disabled = true;
submitBtn.textContent = isEdit ? 'قاعدين نحفظ...' : 'قاعدين ننشر...';
try {
const payload = { title, source, date, image, section, body, important };
if (isEdit) {
const staged = await stageOrRun('journey', existing.id, payload, { label: title });
showToast(staged ? stagedMsg() : 'التعديلات اتحفظت', 'success');
if (!staged) logAdminAction('تعديل مقال (مسيرة الرابطة)', title);
} else {
const stagedAdd = await stageAdd('journey', payload, { label: title });
showToast(stagedAdd ? stagedMsg('add') : 'المقال اتنشر لأهل البلد', 'success');
if (!stagedAdd) logAdminAction('نشر مقال (مسيرة الرابطة)', title);
}
close();
onSuccess?.();
} catch (err) {
console.error('[AdminAssociationJourney] فشل الحفظ:', err);
submitBtn.disabled = false;
submitBtn.textContent = isEdit ? 'حفظ التعديلات' : 'نشر المقال';
errorEl.textContent = 'الحفظ لسع ما تم — حاول مرة أخرى';
errorEl.classList.remove('hidden');
}
};
backdrop.querySelector('#admin-journey-cancel').addEventListener('click', close);
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
submitBtn.addEventListener('click', submit);
titleEl.focus();
_cleanupModal = close;
}
export function closeComposeModal() {
if (_cleanupModal) {
_cleanupModal();
_cleanupModal = null;
}
}
