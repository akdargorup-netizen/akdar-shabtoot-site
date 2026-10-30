import { getNews, getEvents, purgeArchivedContent } from '../../data/db.js';
import { NEWS_CATEGORIES }        from '../../data/local-data.js';
import { createImageUploadField } from '../../shared/image-upload-field.js';
import { emptyState }             from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { showToast }              from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { stageOrRun, applyPending, setBatchRefresh, stageArchive, stageDelete, stageAdd, stagedMsg } from '../../shared/admin-batch.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { ARTICLE_BODY_HINT } from '../../shared/article-markup.js';
import { canHardDelete, confirmDelete, confirmPurge, enhanceAdminPage, rowTitle } from '../../shared/admin-ui.js';
let _cleanupModal = null;
let _uploadField   = null;
export function renderAdminNews() {
return `
    <section class="page admin-news-page">

      <div class="admin-content-toolbar">
        <p>
          من هنا تنشر أخبار البلد — خبر عادي أو "خبر عاجل" يظهر مثبّت
          أعلى صفحة الأخبار. النشر فوري ويظهر لكل المستخدمين مباشرة.
          الأخبار التي تجاوزت ٤٥ يوم بتتأرشف تلقائياً (تختفي من الخلاصة
          العامة بس تفضل هنا) — تقدر تؤرشف خبر فوراً أو تستعيده يدوياً.
        </p>
        <button class="cta-button cta-button--full" data-action="compose-news">
          <i data-lucide="plus"></i>
          خبر جديد
        </button>
      </div>

      <div class="admin-content-list" id="admin-content-list">
        <div class="admin-news-preview" style="height:74px;"></div>
        <div class="admin-news-preview" style="height:74px;"></div>
      </div>

      ${canHardDelete() ? `<div style="padding: var(--space-2) var(--spacing-page-x) 0;">
        <button class="btn btn--ghost btn--sm btn--full" data-action="purge-archived-news">
          <i data-lucide="trash-2"></i>
          حذف كل الأخبار المؤرشفة نهائياً
        </button>
      </div>` : ''}

    </section>
  `;
}
export async function initAdminNews() {
const page = document.querySelector('.admin-news-page');
if (!page) return;
setBatchRefresh(page, () => _loadList(page));
enhanceAdminPage(page);
page.querySelector('[data-action="compose-news"]')?.addEventListener('click', () => {
_openComposeModal(null, () => _loadList(page));
});
page.querySelector('[data-action="purge-archived-news"]')?.addEventListener('click', async () => {
if (!await confirmPurge({ what: 'الأخبار المؤرشفة' })) return;
const { news } = await purgeArchivedContent('news');
showToast(news ? `اتمسح ${news} خبر من الأرشيف` : 'ما في أخبار مؤرشفة هسع', 'success');
if (news) logAdminAction('إفراغ أرشيف الأخبار', `${news} خبر`);
await _loadList(page);
});
await _loadList(page);
}
async function _loadList(page) {
const list = page.querySelector('#admin-content-list');
if (!list) return;
try {
const items = applyPending('news', await getNews({ includeArchived: true }));
if (!items.length) {
list.innerHTML = emptyState({
icon: 'newspaper',
title: 'لسع ما في أخبار منشورة',
desc: 'ابدأ بنشر أول خبر للأهالي.',
});
renderIcons();
return;
}
list.innerHTML = items.map(_renderRow).join('');
renderIcons();
list.querySelectorAll('[data-action="edit-news"]').forEach(btn => {
btn.addEventListener('click', () => {
const item = items.find(n => String(n.id) === btn.dataset.id);
if (item) _openComposeModal(item, () => _loadList(page));
});
});
list.querySelectorAll('[data-action="toggle-archive-news"]').forEach(btn => {
btn.addEventListener('click', async () => {
const nextState = btn.dataset.archived === '1' ? 'restored' : 'archived';
const stagedArc = await stageArchive('news', btn.dataset.id, nextState, { label: btn.dataset.title || rowTitle(btn) || String(btn.dataset.id) });
showToast(stagedArc ? stagedMsg('archive') : nextState === 'archived' ? 'اترشّف الخبر' : 'رجّع الخبر من الأرشيف', 'success');
if (!stagedArc) logAdminAction(nextState === 'archived' ? 'أرشفة خبر' : 'استعادة خبر من الأرشيف', btn.dataset.title || String(btn.dataset.id));
await _loadList(page);
});
});
list.querySelectorAll('[data-action="delete-news"]').forEach(btn => {
btn.addEventListener('click', async () => {
if (!await confirmDelete({ what: 'الخبر', name: rowTitle(btn), note: 'لو داير تخفيه بس استخدم الأرشفة.' })) return;
const stagedDel = await stageDelete('news', btn.dataset.id, { label: btn.dataset.title || String(btn.dataset.id) });
showToast(stagedDel ? stagedMsg('delete') : 'الخبر اتمسح', 'success');
if (!stagedDel) logAdminAction('حذف خبر', btn.dataset.title || String(btn.dataset.id));
await _loadList(page);
});
});
} catch (err) {
console.error('[AdminNews] فشل التحميل:', err);
list.innerHTML = errorState({ subject: 'الأخبار' });
renderIcons(list);
bindErrorRetry(list, () => _loadList(page));
}
}
function _renderRow(item) {
return `
    <div class="admin-content-row${item.archived ? ' admin-content-row--archived' : ''}">
      <div class="admin-news-preview">
        <div class="admin-news-preview__thumb">
          ${item.image ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async">` : '<i data-lucide="newspaper"></i>'}
        </div>
        <div class="admin-news-preview__body">
          <div class="admin-news-preview__head">
            <h4 class="admin-news-preview__title">${escapeHtml(item.title || 'خبر')}</h4>
            ${item.breaking ? '<span class="badge badge--error">عاجل</span>' : ''}
            ${item.archived ? '<span class="badge badge--default">مؤرشف</span>' : ''}
          </div>
          <span class="admin-news-preview__meta">${item.category} · ${item.date || ''}</span>
        </div>
      </div>
      <div class="admin-content-row__actions">
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="edit-news" data-id="${item.id}">
          <i data-lucide="pencil"></i><span>تعديل</span>
      </button>
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="toggle-archive-news" data-id="${item.id}" data-archived="${item.archived ? '1' : '0'}">
          <i data-lucide="${item.archived ? 'archive-restore' : 'archive'}"></i><span>${item.archived ? 'استعادة' : 'أرشفة'}</span>
      </button>
        ${canHardDelete() ? `<button class="btn btn--sm btn--danger admin-action-btn" data-action="delete-news" data-id="${item.id}" data-title="${escapeHtml(item.title || '')}">
          <i data-lucide="trash-2"></i><span>حذف</span>
      </button>` : ''}
      </div>
    </div>
  `;
}
async function _openComposeModal(existing, onSuccess) {
closeComposeModal();
const events = await getEvents().catch(() => []);
const linkedId = existing?.eventId ? String(existing.eventId) : '';
const eventOptions = events.map(ev => `
    <option value="${escapeHtml(String(ev.id))}" ${String(ev.id) === linkedId ? 'selected' : ''}>${escapeHtml(ev.title || 'فعالية')}${ev.date ? ' — ' + escapeHtml(ev.date) : ''}</option>
  `).join('');
const orphanOption = (linkedId && !events.some(ev => String(ev.id) === linkedId))
? `<option value="${escapeHtml(linkedId)}" selected>(فعالية محذوفة)</option>` : '';
const isEdit = Boolean(existing);
const selectedCategory = existing?.categoryKey || 'community';
const categoriesHtml = NEWS_CATEGORIES.map(c => `
    <label class="admin-type-option${selectedCategory === c.key ? ' is-selected' : ''}">
      <input type="radio" name="news-category" value="${c.key}" ${selectedCategory === c.key ? 'checked' : ''}>
      <span>${c.label}</span>
    </label>
  `).join('');
const bodyText = existing?.body?.join('\n') || '';
_uploadField = createImageUploadField({
pathPrefix:  'news',
existingUrl: existing?.image || '',
label:       'صورة الخبر (اختياري)',
allowGalleryPick: true,
});
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${isEdit ? 'تعديل خبر' : 'خبر جديد'}">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">${isEdit ? 'تعديل الخبر' : 'خبر جديد'}</h3>
      </div>
      <div class="modal__body">

        <div class="input-group">
          <label class="input-label">التصنيف</label>
          <div class="admin-type-grid" id="admin-news-category-grid">${categoriesHtml}</div>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-news-title">العنوان</label>
          <input class="input" type="text" id="admin-news-title" placeholder="مثال: افتتاح مشروع..." value="${existing?.title ? escapeHtml(existing.title) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-news-source">المصدر</label>
          <input class="input" type="text" id="admin-news-source" placeholder="مثال: الرابطة" value="${existing?.source ? escapeHtml(existing.source) : ''}">
        </div>

        ${_uploadField.html}

        <div class="input-group">
          <label class="input-label" for="admin-news-body">نص الخبر (كل سطر فقرة)</label>
          <textarea class="input" id="admin-news-body" rows="7" placeholder="${escapeHtml(ARTICLE_BODY_HINT)}">${escapeHtml(bodyText)}</textarea>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-news-event">ربط بفعالية (اختياري)</label>
          <select class="input" id="admin-news-event">
            <option value="">بدون ربط</option>
            ${orphanOption}${eventOptions}
          </select>
          <span class="input-hint">لو اخترت فعالية، يظهر في الخبر زر لمشاهدتها.</span>
        </div>

        <div class="admin-toggle-row">
          <span>خبر عاجل (يظهر مثبّت أعلى الصفحة)</span>
          <input type="checkbox" id="admin-news-breaking" ${existing?.breaking ? 'checked' : ''}>
        </div>

        <p class="input-error-msg hidden" id="admin-news-error"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="admin-news-cancel">إلغاء</button>
        <button class="btn btn--primary" id="admin-news-submit">${isEdit ? 'حفظ التعديلات' : 'نشر الخبر'}</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
_uploadField.mount(backdrop);
const grid       = backdrop.querySelector('#admin-news-category-grid');
const titleEl    = backdrop.querySelector('#admin-news-title');
const sourceEl   = backdrop.querySelector('#admin-news-source');
const bodyEl     = backdrop.querySelector('#admin-news-body');
const breakingEl = backdrop.querySelector('#admin-news-breaking');
const eventEl    = backdrop.querySelector('#admin-news-event');
const errorEl    = backdrop.querySelector('#admin-news-error');
const submitBtn  = backdrop.querySelector('#admin-news-submit');
grid.querySelectorAll('.admin-type-option').forEach(opt => {
opt.addEventListener('click', () => {
grid.querySelectorAll('.admin-type-option').forEach(o => o.classList.remove('is-selected'));
opt.classList.add('is-selected');
});
});
const close = () => { backdrop.remove(); _cleanupModal = null; _uploadField = null; };
const submit = async () => {
const title  = titleEl.value.trim();
const source = sourceEl.value.trim();
const image  = _uploadField.getValue();
const body   = bodyEl.value.split('\n').map(p => p.trim()).filter(Boolean);
const category = grid.querySelector('input[name="news-category"]:checked')?.value || 'community';
if (!title || !body.length) {
errorEl.textContent = 'لو سمحت اكتب عنوان ونص الخبر';
errorEl.classList.remove('hidden');
return;
}
errorEl.classList.add('hidden');
submitBtn.disabled = true;
submitBtn.textContent = isEdit ? 'قاعدين نحفظ...' : 'قاعدين ننشر...';
try {
const payload = { title, source, image, body, category, breaking: breakingEl.checked, type: 'news', eventId: eventEl.value || '' };
if (isEdit) {
const staged = await stageOrRun('news', existing.id, payload, { label: title });
showToast(staged ? stagedMsg() : 'التعديلات اتحفظت', 'success');
if (!staged) logAdminAction('تعديل خبر', title);
} else {
const stagedAdd = await stageAdd('news', payload, { label: title });
showToast(stagedAdd ? stagedMsg('add') : 'الخبر اتنشر لأهل البلد', 'success');
if (!stagedAdd) logAdminAction('نشر خبر', title);
}
close();
onSuccess?.();
} catch (err) {
console.error('[AdminNews] فشل الحفظ:', err);
submitBtn.disabled = false;
submitBtn.textContent = isEdit ? 'حفظ التعديلات' : 'نشر الخبر';
errorEl.textContent = 'الحفظ لسع ما تم — حاول مرة أخرى';
errorEl.classList.remove('hidden');
}
};
backdrop.querySelector('#admin-news-cancel').addEventListener('click', close);
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
