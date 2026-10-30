import {
getEvents,
} from '../../data/db.js';
import { EVENT_CATEGORIES }        from '../../data/videos-events-data.js';
import { thumb, extractYouTubeId } from '../../core/youtube.js';
import { emptyState }              from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { showToast }               from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { stageOrRun, applyPending, setBatchRefresh, stageDelete, stageAdd, stagedMsg } from '../../shared/admin-batch.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { canHardDelete, confirmDelete, enhanceAdminPage, rowTitle } from '../../shared/admin-ui.js';
let _cleanupModal = null;
const _FORM_CATEGORIES = EVENT_CATEGORIES.filter(c => c.key !== 'all');
export function renderAdminEvents() {
return `
    <section class="page admin-events-page">

      <div class="admin-content-toolbar">
        <p>
          من هنا تنشر فيديوهات مناسبات القرية — ألصق رابط يوتيوب أي
          صيغة (youtu.be، يوتيوب عادي، Shorts) واملأ البيانات. النشر
          فوري ويظهر لكل المستخدمين مباشرة في صفحة المناسبات.
        </p>
        <button class="cta-button cta-button--full" data-action="compose-event">
          <i data-lucide="plus"></i>
          مناسبة جديدة
        </button>
      </div>

      <div class="admin-content-list" id="admin-content-list">
        <div class="admin-content-preview" style="height:74px;"></div>
        <div class="admin-content-preview" style="height:74px;"></div>
      </div>

    </section>
  `;
}
export async function initAdminEvents() {
const page = document.querySelector('.admin-events-page');
if (!page) return;
setBatchRefresh(page, () => _loadList(page));
enhanceAdminPage(page);
page.querySelector('[data-action="compose-event"]')?.addEventListener('click', () => {
_openComposeModal(null, () => _loadList(page));
});
await _loadList(page);
}
async function _loadList(page) {
const list = page.querySelector('#admin-content-list');
if (!list) return;
try {
const items = applyPending('events', await getEvents());
if (!items.length) {
list.innerHTML = emptyState({
icon: 'calendar',
title: 'لسع ما في مناسبات منشورة',
desc: 'ابدأ بنشر أول فيديو لمناسبة.',
});
renderIcons();
return;
}
list.innerHTML = items.map(_renderRow).join('');
renderIcons();
list.querySelectorAll('[data-action="edit-event"]').forEach(btn => {
btn.addEventListener('click', () => {
const item = items.find(e => String(e.id) === btn.dataset.id);
if (item) _openComposeModal(item, () => _loadList(page));
});
});
list.querySelectorAll('[data-action="delete-event"]').forEach(btn => {
btn.addEventListener('click', async () => {
if (!await confirmDelete({ what: 'المناسبة', name: rowTitle(btn) })) return;
const stagedDel = await stageDelete('events', btn.dataset.id, { label: btn.dataset.title || String(btn.dataset.id) });
showToast(stagedDel ? stagedMsg('delete') : 'المناسبة اتمسحت', 'success');
if (!stagedDel) logAdminAction('حذف فعالية', btn.dataset.title || String(btn.dataset.id));
await _loadList(page);
});
});
} catch (err) {
console.error('[AdminEvents] فشل التحميل:', err);
list.innerHTML = errorState({ subject: 'المناسبات' });
renderIcons(list);
bindErrorRetry(list, () => _loadList(page));
}
}
function _renderRow(item) {
return `
    <div class="admin-content-row">
      <div class="admin-content-preview">
        <div class="admin-content-preview__thumb">
          ${item.youtubeId ? `<img src="${escapeHtml(thumb(item.youtubeId))}" alt="" loading="lazy" decoding="async">` : '<i data-lucide="calendar"></i>'}
        </div>
        <div class="admin-content-preview__body">
          <div class="admin-content-preview__head">
            <h4 class="admin-content-preview__title">${escapeHtml(item.title || 'مناسبة')}</h4>
            ${item.important ? '<span class="badge badge--warning">مهم</span>' : ''}
          </div>
          <span class="admin-content-preview__meta">${item.label || item.category} · ${item.date || ''}</span>
        </div>
      </div>
      <div class="admin-content-row__actions">
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="edit-event" data-id="${item.id}">
          <i data-lucide="pencil"></i><span>تعديل</span>
      </button>
        ${canHardDelete() ? `<button class="btn btn--sm btn--danger admin-action-btn" data-action="delete-event" data-id="${item.id}" data-title="${escapeHtml(item.title || '')}">
          <i data-lucide="trash-2"></i><span>حذف</span>
      </button>` : ''}
      </div>
    </div>
  `;
}
function _openComposeModal(existing, onSuccess) {
closeComposeModal();
const isEdit = Boolean(existing);
const selectedCategory = existing?.category || _FORM_CATEGORIES[0]?.key || 'social';
const categoriesHtml = _FORM_CATEGORIES.map(c => `
    <label class="admin-type-option${selectedCategory === c.key ? ' is-selected' : ''}">
      <input type="radio" name="event-category" value="${c.key}" ${selectedCategory === c.key ? 'checked' : ''}>
      <span>${c.label}</span>
    </label>
  `).join('');
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${isEdit ? 'تعديل مناسبة' : 'مناسبة جديدة'}">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">${isEdit ? 'تعديل المناسبة' : 'مناسبة جديدة'}</h3>
      </div>
      <div class="modal__body">

        <div class="input-group">
          <label class="input-label" for="admin-event-link">رابط فيديو يوتيوب</label>
          <input class="input" type="text" id="admin-event-link" placeholder="https://youtu.be/..." value="${existing?.youtubeId ? escapeHtml(existing.youtubeId) : ''}">
          <p class="input-error-msg hidden" id="admin-event-link-error"></p>
          <div class="admin-content-preview" id="admin-event-preview" style="margin-top: var(--space-2); ${existing?.youtubeId ? '' : 'display:none;'}">
            <div class="admin-content-preview__thumb">
              ${existing?.youtubeId ? `<img src="${thumb(existing.youtubeId)}" alt="" loading="lazy" decoding="async">` : ''}
            </div>
            <div class="admin-content-preview__body">
              <span class="admin-content-preview__meta">معاينة الثامبنيل</span>
            </div>
          </div>
        </div>

        <div class="input-group">
          <label class="input-label">التصنيف</label>
          <div class="admin-type-grid" id="admin-event-category-grid">${categoriesHtml}</div>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-event-title">العنوان</label>
          <input class="input" type="text" id="admin-event-title" placeholder="مثال: احتفالية عيد الأضحى" value="${existing?.title ? escapeHtml(existing.title) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-event-date">التاريخ</label>
          <input class="input" type="text" id="admin-event-date" placeholder="مثال: ١٦ مارس ٢٠٢٦" value="${existing?.date ? escapeHtml(existing.date) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-event-excerpt">مقتطف قصير (اختياري)</label>
          <textarea class="input" id="admin-event-excerpt" rows="3" placeholder="جملة أو جملتين عن المناسبة...">${existing?.excerpt ? escapeHtml(existing.excerpt) : ''}</textarea>
        </div>

        <div class="admin-toggle-row">
          <span>فعالية مهمة (تظهر أول القائمة قبل باقي الفعاليات)</span>
          <label class="switch">
            <input type="checkbox" id="admin-event-important" ${existing?.important ? 'checked' : ''}>
            <span class="switch__track"></span>
          </label>
        </div>

        <p class="input-error-msg hidden" id="admin-event-error"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="admin-event-cancel">إلغاء</button>
        <button class="btn btn--primary" id="admin-event-submit">${isEdit ? 'حفظ التعديلات' : 'نشر المناسبة'}</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
const linkEl      = backdrop.querySelector('#admin-event-link');
const linkErrorEl = backdrop.querySelector('#admin-event-link-error');
const previewEl   = backdrop.querySelector('#admin-event-preview');
const grid        = backdrop.querySelector('#admin-event-category-grid');
const titleEl     = backdrop.querySelector('#admin-event-title');
const dateEl      = backdrop.querySelector('#admin-event-date');
const excerptEl   = backdrop.querySelector('#admin-event-excerpt');
const importantEl = backdrop.querySelector('#admin-event-important');
const errorEl     = backdrop.querySelector('#admin-event-error');
const submitBtn   = backdrop.querySelector('#admin-event-submit');
linkEl.addEventListener('input', () => {
linkErrorEl.classList.add('hidden');
const id = extractYouTubeId(linkEl.value.trim());
if (id) {
previewEl.style.display = '';
previewEl.querySelector('.admin-content-preview__thumb').innerHTML = `<img src="${thumb(id)}" alt="" loading="lazy" decoding="async">`;
} else {
previewEl.style.display = 'none';
}
});
grid.querySelectorAll('.admin-type-option').forEach(opt => {
opt.addEventListener('click', () => {
grid.querySelectorAll('.admin-type-option').forEach(o => o.classList.remove('is-selected'));
opt.classList.add('is-selected');
});
});
const close = () => { backdrop.remove(); _cleanupModal = null; };
const submit = async () => {
const title    = titleEl.value.trim();
const date     = dateEl.value.trim();
const excerpt  = excerptEl.value.trim();
const category = grid.querySelector('input[name="event-category"]:checked')?.value || _FORM_CATEGORIES[0]?.key;
const youtubeId = extractYouTubeId(linkEl.value.trim());
if (!youtubeId) {
linkErrorEl.textContent = 'رابط يوتيوب غير صالح — تأكد من الصيغة';
linkErrorEl.classList.remove('hidden');
return;
}
if (!title) {
errorEl.textContent = 'لو سمحت اكتب عنوان المناسبة';
errorEl.classList.remove('hidden');
return;
}
errorEl.classList.add('hidden');
submitBtn.disabled = true;
submitBtn.textContent = isEdit ? 'قاعدين نحفظ...' : 'قاعدين ننشر...';
try {
const payload = { title, date, excerpt, category, youtubeId, important: Boolean(importantEl?.checked) };
if (isEdit) {
const staged = await stageOrRun('events', existing.id, payload, { label: title });
showToast(staged ? stagedMsg() : 'التعديلات اتحفظت', 'success');
if (!staged) logAdminAction('تعديل فعالية', title);
} else {
const stagedAdd = await stageAdd('events', payload, { label: title });
showToast(stagedAdd ? stagedMsg('add') : 'المناسبة اتنشرت لأهل البلد', 'success');
if (!stagedAdd) logAdminAction('نشر فعالية', title);
}
close();
onSuccess?.();
} catch (err) {
console.error('[AdminEvents] فشل الحفظ:', err);
submitBtn.disabled = false;
submitBtn.textContent = isEdit ? 'حفظ التعديلات' : 'نشر المناسبة';
errorEl.textContent = 'الحفظ لسع ما تم — حاول مرة أخرى';
errorEl.classList.remove('hidden');
}
};
backdrop.querySelector('#admin-event-cancel').addEventListener('click', close);
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
submitBtn.addEventListener('click', submit);
linkEl.focus();
_cleanupModal = close;
}
export function closeComposeModal() {
if (_cleanupModal) {
_cleanupModal();
_cleanupModal = null;
}
}
