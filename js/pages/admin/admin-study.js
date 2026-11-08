import { getStudyVideos } from '../../data/db.js';
import { STUDY_STAGES, stageLabel } from '../../data/study-data.js';
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
export function renderAdminStudy() {
return `
    <section class="page admin-study-page">

      <div class="admin-content-toolbar">
        <p>
          من هنا تنشر حصص الطلاب (ألصق رابط يوتيوب بأي صيغة) للشهادة المتوسطة
          والسودانية. النشر فوري ويظهر لكل المستخدمين مباشرة.
        </p>
        <button class="cta-button cta-button--full" data-action="compose-study">
          <i data-lucide="plus"></i>
          حصة جديدة
        </button>
      </div>

      <div class="admin-content-list" id="admin-content-list">
        <div class="admin-content-preview" style="height:74px;"></div>
        <div class="admin-content-preview" style="height:74px;"></div>
      </div>

    </section>
  `;
}
export async function initAdminStudy() {
const page = document.querySelector('.admin-study-page');
if (!page) return;
setBatchRefresh(page, () => _loadList(page));
enhanceAdminPage(page);
page.querySelector('[data-action="compose-study"]')?.addEventListener('click', () => {
_openVideoModal(null, () => _loadList(page));
});
await _loadList(page);
}
function _loadList(page) {
return _loadVideos(page);
}
async function _loadVideos(page) {
const list = page.querySelector('#admin-content-list');
if (!list) return;
try {
const items = applyPending('study', await getStudyVideos());
if (!items.length) {
list.innerHTML = emptyState({ icon: 'clapperboard', title: 'لسع ما في حصص منشورة', desc: 'ابدأ بنشر أول حصة.' });
renderIcons();
return;
}
list.innerHTML = items.map(_renderVideoRow).join('');
renderIcons();
list.querySelectorAll('[data-action="edit-study"]').forEach(btn => {
btn.addEventListener('click', () => {
const item = items.find(m => String(m.id) === btn.dataset.id);
if (item) _openVideoModal(item, () => _loadList(page));
});
});
list.querySelectorAll('[data-action="delete-study"]').forEach(btn => {
btn.addEventListener('click', async () => {
if (!await confirmDelete({ what: 'الحصة', name: rowTitle(btn) })) return;
let stagedDel;
try {
stagedDel = await stageDelete('study', btn.dataset.id, { label: btn.dataset.title || rowTitle(btn) || String(btn.dataset.id) });
} catch (err) {
showToast(err?.message || 'ما قدرنا نحذف الحصة', 'error');
return;
}
showToast(stagedDel ? stagedMsg('delete') : 'الحصة اتمسحت', 'success');
if (!stagedDel) logAdminAction('حذف حصة (خدمات الطلاب)', btn.dataset.title || String(btn.dataset.id));
await _loadList(page);
});
});
} catch (err) {
console.error('[AdminStudy] فشل تحميل الحصص:', err);
list.innerHTML = errorState({ subject: 'الحصص' });
renderIcons(list);
bindErrorRetry(list, () => _loadList(page));
}
}
function _renderVideoRow(item) {
return `
    <div class="admin-content-row">
      <div class="admin-content-preview">
        <div class="admin-content-preview__thumb">
          ${item.youtubeId ? `<img src="${escapeHtml(thumb(item.youtubeId))}" alt="" loading="lazy" decoding="async">` : '<i data-lucide="clapperboard"></i>'}
        </div>
        <div class="admin-content-preview__body">
          <div class="admin-content-preview__head">
            <h4 class="admin-content-preview__title">${escapeHtml(item.title || 'حصة')}</h4>
            ${item.important ? '<span class="badge badge--warning">مهم</span>' : ''}
          </div>
          <span class="admin-content-preview__meta">${escapeHtml(stageLabel(item.stage))}${item.subject ? ' · ' + escapeHtml(item.subject) : ''}${item.teacher ? ' · ' + escapeHtml(item.teacher) : ''}</span>
        </div>
      </div>
      <div class="admin-content-row__actions">
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="edit-study" data-id="${item.id}">
          <i data-lucide="pencil"></i><span>تعديل</span>
        </button>
        ${canHardDelete() ? `<button class="btn btn--sm btn--danger admin-action-btn" data-action="delete-study" data-id="${item.id}" data-title="${escapeHtml(item.title || '')}">
          <i data-lucide="trash-2"></i><span>حذف</span>
        </button>` : ''}
      </div>
    </div>
  `;
}
function _stageOptions(stages, selected, name) {
return stages.map(s => `
    <label class="admin-type-option${selected === s.key ? ' is-selected' : ''}">
      <input type="radio" name="${name}" value="${s.key}" ${selected === s.key ? 'checked' : ''}>
      <span>${s.label}</span>
    </label>
  `).join('');
}
function _mountModal(html) {
closeComposeModal();
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = html;
document.body.appendChild(backdrop);
renderIcons();
const close = () => { backdrop.remove(); _cleanupModal = null; };
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
_cleanupModal = close;
return { backdrop, close };
}
function _bindStageGrid(grid) {
grid.querySelectorAll('.admin-type-option').forEach(opt => {
opt.addEventListener('click', () => {
grid.querySelectorAll('.admin-type-option').forEach(o => o.classList.remove('is-selected'));
opt.classList.add('is-selected');
});
});
}
function _openVideoModal(existing, onSuccess) {
const isEdit = Boolean(existing);
const selected = existing?.stage || STUDY_STAGES[0].key;
const v = (x) => (x ? escapeHtml(x) : '');
const { backdrop, close } = _mountModal(`
    <div class="modal" role="dialog" aria-modal="true" aria-label="${isEdit ? 'تعديل حصة' : 'حصة جديدة'}">
      <div class="modal__handle"></div>
      <div class="modal__header"><h3 class="modal__title">${isEdit ? 'تعديل الحصة' : 'حصة جديدة'}</h3></div>
      <div class="modal__body">

        <div class="input-group">
          <label class="input-label" for="admin-study-link">رابط فيديو يوتيوب</label>
          <input class="input" type="text" id="admin-study-link" placeholder="https://youtu.be/..." value="${v(existing?.youtubeId)}">
          <p class="input-error-msg hidden" id="admin-study-link-error"></p>
          <div class="admin-content-preview" id="admin-study-preview" style="margin-top: var(--space-2); ${existing?.youtubeId ? '' : 'display:none;'}">
            <div class="admin-content-preview__thumb">${existing?.youtubeId ? `<img src="${thumb(existing.youtubeId)}" alt="" loading="lazy" decoding="async">` : ''}</div>
            <div class="admin-content-preview__body"><span class="admin-content-preview__meta">معاينة الثامبنيل</span></div>
          </div>
        </div>

        <div class="input-group">
          <label class="input-label">المرحلة</label>
          <div class="admin-type-grid" id="admin-study-stage-grid">${_stageOptions(STUDY_STAGES, selected, 'study-stage')}</div>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-study-title">عنوان الحصة</label>
          <input class="input" type="text" id="admin-study-title" placeholder="مثال: الرياضيات — الوحدة الأولى" value="${v(existing?.title)}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-study-subject">المادة (اختياري)</label>
          <input class="input" type="text" id="admin-study-subject" placeholder="مثال: الرياضيات" value="${v(existing?.subject)}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-study-teacher">المعلّم (اختياري)</label>
          <input class="input" type="text" id="admin-study-teacher" placeholder="اسم المعلّم" value="${v(existing?.teacher)}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-study-excerpt">وصف قصير (اختياري)</label>
          <textarea class="input" id="admin-study-excerpt" rows="3" placeholder="جملة أو جملتين عن محتوى الحصة...">${v(existing?.excerpt)}</textarea>
        </div>

        <div class="admin-toggle-row">
          <span>حصة مهمة (تظهر أول القائمة قبل باقي الحصص)</span>
          <label class="switch">
            <input type="checkbox" id="admin-study-important" ${existing?.important ? 'checked' : ''}>
            <span class="switch__track"></span>
          </label>
        </div>

        <p class="input-error-msg hidden" id="admin-study-error"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="admin-study-cancel">إلغاء</button>
        <button class="btn btn--primary" id="admin-study-submit">${isEdit ? 'حفظ التعديلات' : 'نشر الحصة'}</button>
      </div>
    </div>
  `);
const $ = (id) => backdrop.querySelector(id);
const linkEl = $('#admin-study-link'), linkErrorEl = $('#admin-study-link-error'), previewEl = $('#admin-study-preview');
const grid = $('#admin-study-stage-grid'), errorEl = $('#admin-study-error'), submitBtn = $('#admin-study-submit');
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
_bindStageGrid(grid);
const submit = async () => {
const title     = $('#admin-study-title').value.trim();
const subject   = $('#admin-study-subject').value.trim();
const teacher   = $('#admin-study-teacher').value.trim();
const excerpt   = $('#admin-study-excerpt').value.trim();
const stage     = grid.querySelector('input[name="study-stage"]:checked')?.value || STUDY_STAGES[0].key;
const youtubeId = extractYouTubeId(linkEl.value.trim());
if (!youtubeId) {
linkErrorEl.textContent = 'رابط يوتيوب غير صالح — تأكد من الصيغة';
linkErrorEl.classList.remove('hidden');
return;
}
if (!title) {
errorEl.textContent = 'لو سمحت اكتب عنوان الحصة';
errorEl.classList.remove('hidden');
return;
}
errorEl.classList.add('hidden');
submitBtn.disabled = true;
submitBtn.textContent = isEdit ? 'قاعدين نحفظ...' : 'قاعدين ننشر...';
try {
const payload = { youtubeId, stage, title, subject, teacher, excerpt, important: Boolean($('#admin-study-important')?.checked) };
if (isEdit) {
const staged = await stageOrRun('study', existing.id, payload, { label: title });
showToast(staged ? stagedMsg() : 'التعديلات اتحفظت', 'success');
if (!staged) logAdminAction('تعديل حصة (خدمات الطلاب)', title);
} else {
const stagedAdd = await stageAdd('study', payload, { label: title });
showToast(stagedAdd ? stagedMsg('add') : 'الحصة اتنشرت للطلاب', 'success');
if (!stagedAdd) logAdminAction('نشر حصة (خدمات الطلاب)', title);
}
close();
onSuccess?.();
} catch (err) {
console.error('[AdminStudy] فشل حفظ الحصة:', err);
submitBtn.disabled = false;
submitBtn.textContent = isEdit ? 'حفظ التعديلات' : 'نشر الحصة';
errorEl.textContent = err?.message || 'الحفظ لسع ما تم — حاول مرة أخرى';
errorEl.classList.remove('hidden');
}
};
$('#admin-study-cancel').addEventListener('click', close);
submitBtn.addEventListener('click', submit);
linkEl.focus();
}
export function closeComposeModal() {
if (_cleanupModal) {
_cleanupModal();
_cleanupModal = null;
}
}
