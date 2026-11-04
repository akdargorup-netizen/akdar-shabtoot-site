import { getGalleryItems } from '../../data/db.js';
import { GALLERY_CATEGORIES }     from '../../data/gallery-data.js';
import { createImageUploadField } from '../../shared/image-upload-field.js';
import { emptyState }             from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { showToast }              from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { stageOrRun, applyPending, setBatchRefresh, stageDelete, stageAdd, stagedMsg } from '../../shared/admin-batch.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { canHardDelete, confirmDelete, rowTitle } from '../../shared/admin-ui.js';
let _cleanupModal = null;
let _uploadField   = null;
export function renderAdminGallery() {
return `
    <section class="page admin-gallery-page">

      <div class="admin-content-toolbar">
        <p>
          من هنا ترفع صور معرض "صور البلد" مباشرة من المعرض — اختر
          الصورة واملأ البيانات. النشر فوري ويظهر لكل المستخدمين مباشرة.
        </p>
        <button class="cta-button cta-button--full" data-action="compose-gallery">
          <i data-lucide="plus"></i>
          صورة جديدة
        </button>
      </div>

      <div class="admin-gallery-grid" id="admin-content-list">
        <div class="admin-gallery-tile admin-gallery-tile--skeleton skeleton-block"></div>
        <div class="admin-gallery-tile admin-gallery-tile--skeleton skeleton-block"></div>
        <div class="admin-gallery-tile admin-gallery-tile--skeleton skeleton-block"></div>
        <div class="admin-gallery-tile admin-gallery-tile--skeleton skeleton-block"></div>
      </div>

    </section>
  `;
}
export async function initAdminGallery() {
const page = document.querySelector('.admin-gallery-page');
if (!page) return;
setBatchRefresh(page, () => _loadList(page));
page.querySelector('[data-action="compose-gallery"]')?.addEventListener('click', () => {
_openComposeModal(null, () => _loadList(page));
});
await _loadList(page);
}
async function _loadList(page) {
const list = page.querySelector('#admin-content-list');
if (!list) return;
try {
const items = applyPending('gallery', await getGalleryItems());
if (!items.length) {
list.classList.add('admin-gallery-grid--empty');
list.innerHTML = emptyState({
icon: 'image-off',
title: 'لسع ما في صور منشورة',
desc: 'ابدأ برفع أول صورة لمعرض البلد.',
});
renderIcons();
return;
}
list.classList.remove('admin-gallery-grid--empty');
list.innerHTML = items.map(_renderTile).join('') + '';
list.classList.add('animate-fade-in');
renderIcons();
list.querySelectorAll('[data-action="edit-gallery"]').forEach(btn => {
btn.addEventListener('click', (e) => {
e.stopPropagation();
const item = items.find(g => String(g.id) === btn.dataset.id);
if (item) _openComposeModal(item, () => _loadList(page));
});
});
list.querySelectorAll('[data-action="delete-gallery"]').forEach(btn => {
btn.addEventListener('click', async (e) => {
e.stopPropagation();
if (!await confirmDelete({ what: 'الصورة', name: rowTitle(btn), note: 'لو الصورة مربوطة بمقال تاريخي أو من مسيرة الرابطة حتختفي منه كمان.' })) return;
const stagedDel = await stageDelete('gallery', btn.dataset.id, { label: btn.dataset.title || String(btn.dataset.id) });
showToast(stagedDel ? stagedMsg('delete') : 'الصورة اتمسحت', 'success');
if (!stagedDel) logAdminAction('حذف صورة', btn.dataset.title || String(btn.dataset.id));
await _loadList(page);
});
});
} catch (err) {
console.error('[AdminGallery] فشل التحميل:', err);
list.classList.add('admin-gallery-grid--empty');
list.innerHTML = errorState({ subject: 'الصور' });
renderIcons(list);
bindErrorRetry(list, () => _loadList(page));
}
}
function _renderTile(item) {
return `
    <div class="admin-gallery-tile">
      <div class="admin-gallery-tile__thumb">
        ${item.image ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy">` : '<i data-lucide="image-off"></i>'}
        <div class="admin-gallery-tile__overlay">
          <button class="btn btn--icon btn--sm" data-action="edit-gallery" data-id="${item.id}" aria-label="تعديل">
            <i data-lucide="pencil"></i>
          </button>
          ${canHardDelete() ? `<button class="btn btn--icon btn--sm btn--danger" data-action="delete-gallery" data-id="${item.id}" data-title="${escapeHtml(item.title || '')}" aria-label="حذف">
            <i data-lucide="trash-2"></i>
          </button>` : ''}
        </div>
      </div>
      <div class="admin-gallery-tile__body">
        <h4 class="admin-gallery-tile__title">${escapeHtml(item.title || 'صورة')}</h4>
        <span class="admin-gallery-tile__meta">${item.label || item.category}</span>
      </div>
    </div>
  `;
}
function _openComposeModal(existing, onSuccess) {
closeComposeModal();
const isEdit = Boolean(existing);
const selectedCategory = existing?.category || GALLERY_CATEGORIES[0]?.key || 'events';
const categoriesHtml = GALLERY_CATEGORIES.map(c => `
    <label class="admin-type-option${selectedCategory === c.key ? ' is-selected' : ''}">
      <input type="radio" name="gallery-category" value="${c.key}" ${selectedCategory === c.key ? 'checked' : ''}>
      <span>${c.label}</span>
    </label>
  `).join('');
_uploadField = createImageUploadField({
pathPrefix:  'gallery',
existingUrl: existing?.image || '',
label:       'الصورة',
});
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${isEdit ? 'تعديل صورة' : 'صورة جديدة'}">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">${isEdit ? 'تعديل الصورة' : 'صورة جديدة'}</h3>
      </div>
      <div class="modal__body">

        ${_uploadField.html}

        <div class="input-group">
          <label class="input-label">التصنيف</label>
          <div class="admin-type-grid" id="admin-gallery-category-grid">${categoriesHtml}</div>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-gallery-title">العنوان</label>
          <input class="input" type="text" id="admin-gallery-title" placeholder="مثال: لقطة من..." value="${existing?.title ? escapeHtml(existing.title) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-gallery-source">المصدر</label>
          <input class="input" type="text" id="admin-gallery-source" placeholder="مثال: أرشيف محلي" value="${existing?.source ? escapeHtml(existing.source) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-gallery-excerpt">وصف قصير (اختياري)</label>
          <textarea class="input" id="admin-gallery-excerpt" rows="2" placeholder="جملة أو جملتين عن الصورة...">${existing?.excerpt ? escapeHtml(existing.excerpt) : ''}</textarea>
        </div>

        <p class="input-error-msg hidden" id="admin-gallery-error"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="admin-gallery-cancel">إلغاء</button>
        <button class="btn btn--primary" id="admin-gallery-submit">${isEdit ? 'حفظ التعديلات' : 'نشر الصورة'}</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
_uploadField.mount(backdrop);
const grid       = backdrop.querySelector('#admin-gallery-category-grid');
const titleEl    = backdrop.querySelector('#admin-gallery-title');
const sourceEl   = backdrop.querySelector('#admin-gallery-source');
const excerptEl  = backdrop.querySelector('#admin-gallery-excerpt');
const errorEl    = backdrop.querySelector('#admin-gallery-error');
const submitBtn  = backdrop.querySelector('#admin-gallery-submit');
grid.querySelectorAll('.admin-type-option').forEach(opt => {
opt.addEventListener('click', () => {
grid.querySelectorAll('.admin-type-option').forEach(o => o.classList.remove('is-selected'));
opt.classList.add('is-selected');
});
});
const close = () => { backdrop.remove(); _cleanupModal = null; _uploadField = null; };
const submit = async () => {
const title    = titleEl.value.trim();
const source   = sourceEl.value.trim();
const excerpt  = excerptEl.value.trim();
const category = grid.querySelector('input[name="gallery-category"]:checked')?.value || GALLERY_CATEGORIES[0]?.key;
const image    = _uploadField.getValue();
if (!image) {
errorEl.textContent = 'لو سمحت ارفع صورة الأول';
errorEl.classList.remove('hidden');
return;
}
if (!title) {
errorEl.textContent = 'لو سمحت اكتب عنوان الصورة';
errorEl.classList.remove('hidden');
return;
}
errorEl.classList.add('hidden');
submitBtn.disabled = true;
submitBtn.textContent = isEdit ? 'قاعدين نحفظ...' : 'قاعدين ننشر...';
try {
const payload = { title, source, excerpt, category, image };
if (isEdit) {
const staged = await stageOrRun('gallery', existing.id, payload, { label: title });
showToast(staged ? stagedMsg() : 'التعديلات اتحفظت', 'success');
if (!staged) logAdminAction('تعديل صورة', title);
} else {
const stagedAdd = await stageAdd('gallery', payload, { label: title });
showToast(stagedAdd ? stagedMsg('add') : 'الصورة اتنشرت لأهل البلد', 'success');
if (!stagedAdd) logAdminAction('نشر صورة', title);
}
close();
onSuccess?.();
} catch (err) {
console.error('[AdminGallery] فشل الحفظ:', err);
submitBtn.disabled = false;
submitBtn.textContent = isEdit ? 'حفظ التعديلات' : 'نشر الصورة';
errorEl.textContent = 'الحفظ لسع ما تم — حاول مرة أخرى';
errorEl.classList.remove('hidden');
}
};
backdrop.querySelector('#admin-gallery-cancel').addEventListener('click', close);
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
