import { getWorshipLectures } from '../../data/db.js';
import { thumb, extractYouTubeId } from '../../core/youtube.js';
import { emptyState }              from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { showToast }               from '../../shared/toast.js';
import { logAdminAction }          from '../../shared/admin-activity.js';
import { stageOrRun, applyPending, setBatchRefresh, stageDelete, stageAdd, stagedMsg } from '../../shared/admin-batch.js';
import { renderIcons }             from '../../shared/icons.js';
import { escapeHtml }              from '../../shared/sanitize.js';
import { canHardDelete, confirmDelete, enhanceAdminPage, rowTitle } from '../../shared/admin-ui.js';
let _cleanupModal = null;
export function renderAdminLectures() {
return `
    <section class="page admin-lectures-page">
      <div class="admin-content-toolbar">
        <p>من هنا تنشر المحاضرات الدينية — ألصق رابط يوتيوب بأي صيغة. النشر فوري ويظهر في قسم العبادة.</p>
        <button class="cta-button cta-button--full" data-action="compose-lecture">
          <i data-lucide="plus"></i>
          محاضرة جديدة
        </button>
      </div>
      <div class="admin-content-list" id="admin-content-list">
        <div class="admin-content-preview" style="height:74px;"></div>
        <div class="admin-content-preview" style="height:74px;"></div>
      </div>
    </section>
  `;
}
export async function initAdminLectures() {
const page = document.querySelector('.admin-lectures-page');
if (!page) return;
setBatchRefresh(page, () => _loadList(page));
enhanceAdminPage(page);
page.querySelector('[data-action="compose-lecture"]')?.addEventListener('click', () => {
_openModal(null, () => _loadList(page));
});
await _loadList(page);
}
async function _loadList(page) {
const list = page.querySelector('#admin-content-list');
if (!list) return;
try {
const items = applyPending('lectures', await getWorshipLectures());
if (!items.length) {
list.innerHTML = emptyState({ icon: 'headphones', title: 'لسع ما في محاضرات منشورة', desc: 'ابدأ بنشر أول محاضرة.' });
renderIcons();
return;
}
list.innerHTML = items.map(_renderRow).join('');
renderIcons();
list.querySelectorAll('[data-action="edit-lecture"]').forEach(btn => {
btn.addEventListener('click', () => {
const item = items.find(m => String(m.id) === btn.dataset.id);
if (item) _openModal(item, () => _loadList(page));
});
});
list.querySelectorAll('[data-action="delete-lecture"]').forEach(btn => {
btn.addEventListener('click', async () => {
if (!await confirmDelete({ what: 'المحاضرة', name: rowTitle(btn) })) return;
let stagedDel;
try {
stagedDel = await stageDelete('lectures', btn.dataset.id, { label: btn.dataset.title || rowTitle(btn) || String(btn.dataset.id) });
} catch (err) {
showToast(err?.message || 'ما قدرنا نحذف المحاضرة', 'error');
return;
}
showToast(stagedDel ? stagedMsg('delete') : 'المحاضرة اتمسحت', 'success');
if (!stagedDel) logAdminAction('حذف محاضرة دينية', btn.dataset.title || String(btn.dataset.id));
await _loadList(page);
});
});
} catch (err) {
console.error('[AdminLectures] فشل التحميل:', err);
list.innerHTML = errorState({ subject: 'المحاضرات' });
renderIcons(list);
bindErrorRetry(list, () => _loadList(page));
}
}
function _renderRow(item) {
return `
    <div class="admin-content-row">
      <div class="admin-content-preview">
        <div class="admin-content-preview__thumb">
          ${item.youtubeId ? `<img src="${escapeHtml(thumb(item.youtubeId))}" alt="" loading="lazy" decoding="async">` : '<i data-lucide="headphones"></i>'}
        </div>
        <div class="admin-content-preview__body">
          <div class="admin-content-preview__head">
            <h4 class="admin-content-preview__title">${escapeHtml(item.title || 'محاضرة')}</h4>
            ${item.important ? '<span class="badge badge--warning">مهم</span>' : ''}
          </div>
          <span class="admin-content-preview__meta">${escapeHtml(item.speaker || '')}</span>
        </div>
      </div>
      <div class="admin-content-row__actions">
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="edit-lecture" data-id="${item.id}">
          <i data-lucide="pencil"></i><span>تعديل</span>
        </button>
        ${canHardDelete() ? `<button class="btn btn--sm btn--danger admin-action-btn" data-action="delete-lecture" data-id="${item.id}" data-title="${escapeHtml(item.title || '')}">
          <i data-lucide="trash-2"></i><span>حذف</span>
        </button>` : ''}
      </div>
    </div>
  `;
}
function _openModal(existing, onSuccess) {
closeComposeModal();
const isEdit = Boolean(existing);
const v = (x) => (x ? escapeHtml(x) : '');
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${isEdit ? 'تعديل محاضرة' : 'محاضرة جديدة'}">
      <div class="modal__handle"></div>
      <div class="modal__header"><h3 class="modal__title">${isEdit ? 'تعديل المحاضرة' : 'محاضرة جديدة'}</h3></div>
      <div class="modal__body">
        <div class="input-group">
          <label class="input-label" for="admin-lec-link">رابط فيديو يوتيوب</label>
          <input class="input" type="text" id="admin-lec-link" placeholder="https://youtu.be/..." value="${v(existing?.youtubeId)}">
          <p class="input-error-msg hidden" id="admin-lec-link-error"></p>
          <div class="admin-content-preview" id="admin-lec-preview" style="margin-top: var(--space-2); ${existing?.youtubeId ? '' : 'display:none;'}">
            <div class="admin-content-preview__thumb">${existing?.youtubeId ? `<img src="${thumb(existing.youtubeId)}" alt="" loading="lazy" decoding="async">` : ''}</div>
            <div class="admin-content-preview__body"><span class="admin-content-preview__meta">معاينة الثامبنيل</span></div>
          </div>
        </div>
        <div class="input-group">
          <label class="input-label" for="admin-lec-title">عنوان المحاضرة</label>
          <input class="input" type="text" id="admin-lec-title" value="${v(existing?.title)}">
        </div>
        <div class="input-group">
          <label class="input-label" for="admin-lec-speaker">المحاضِر (اختياري)</label>
          <input class="input" type="text" id="admin-lec-speaker" placeholder="اسم الشيخ أو المحاضر" value="${v(existing?.speaker)}">
        </div>
        <div class="input-group">
          <label class="input-label" for="admin-lec-excerpt">وصف قصير (اختياري)</label>
          <textarea class="input" id="admin-lec-excerpt" rows="3" placeholder="جملة أو جملتين عن موضوع المحاضرة...">${v(existing?.excerpt)}</textarea>
        </div>
        <div class="admin-toggle-row">
          <span>محاضرة مهمة (تظهر أول القائمة قبل باقي المحاضرات)</span>
          <label class="switch">
            <input type="checkbox" id="admin-lec-important" ${existing?.important ? 'checked' : ''}>
            <span class="switch__track"></span>
          </label>
        </div>

        <p class="input-error-msg hidden" id="admin-lec-error"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="admin-lec-cancel">إلغاء</button>
        <button class="btn btn--primary" id="admin-lec-submit">${isEdit ? 'حفظ التعديلات' : 'نشر المحاضرة'}</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
const $ = (id) => backdrop.querySelector(id);
const linkEl = $('#admin-lec-link'), linkErrorEl = $('#admin-lec-link-error'), previewEl = $('#admin-lec-preview');
const errorEl = $('#admin-lec-error'), submitBtn = $('#admin-lec-submit');
const close = () => { backdrop.remove(); _cleanupModal = null; };
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
const submit = async () => {
const title     = $('#admin-lec-title').value.trim();
const speaker   = $('#admin-lec-speaker').value.trim();
const excerpt   = $('#admin-lec-excerpt').value.trim();
const youtubeId = extractYouTubeId(linkEl.value.trim());
if (!youtubeId) {
linkErrorEl.textContent = 'رابط يوتيوب غير صالح — تأكد من الصيغة';
linkErrorEl.classList.remove('hidden');
return;
}
if (!title) {
errorEl.textContent = 'لو سمحت اكتب عنوان المحاضرة';
errorEl.classList.remove('hidden');
return;
}
errorEl.classList.add('hidden');
submitBtn.disabled = true;
submitBtn.textContent = isEdit ? 'قاعدين نحفظ...' : 'قاعدين ننشر...';
try {
const payload = { youtubeId, title, speaker, excerpt, important: Boolean($('#admin-lec-important')?.checked) };
if (isEdit) {
const staged = await stageOrRun('lectures', existing.id, payload, { label: title });
showToast(staged ? stagedMsg() : 'التعديلات اتحفظت', 'success');
if (!staged) logAdminAction('تعديل محاضرة دينية', title);
} else {
const stagedAdd = await stageAdd('lectures', payload, { label: title });
showToast(stagedAdd ? stagedMsg('add') : 'المحاضرة اتنشرت', 'success');
if (!stagedAdd) logAdminAction('نشر محاضرة دينية', title);
}
close();
onSuccess?.();
} catch (err) {
console.error('[AdminLectures] فشل الحفظ:', err);
submitBtn.disabled = false;
submitBtn.textContent = isEdit ? 'حفظ التعديلات' : 'نشر المحاضرة';
errorEl.textContent = err?.message || 'الحفظ لسع ما تم — حاول مرة أخرى';
errorEl.classList.remove('hidden');
}
};
$('#admin-lec-cancel').addEventListener('click', close);
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
