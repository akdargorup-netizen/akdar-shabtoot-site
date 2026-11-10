import { getNubianPhraseCategories, addNubianPhraseCategory, updateNubianPhraseCategory, deleteNubianPhraseCategory } from '../../data/db.js';
import { loadStats } from '../../data/nubian-admin-data.js';
import { errorState } from '../../shared/error-state.js';
import { showToast }  from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { stageOrRun, stageAdd, stagedMsg } from '../../shared/admin-batch.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { canHardDelete, confirmDelete } from '../../shared/admin-ui.js';
import { closeComposeModal, setCleanup } from './admin-nubian-modals.js';
export async function openPhraseComposeModal(existing, onSuccess, preloadedCategories, defaultCategory) {
closeComposeModal();
const categories = preloadedCategories || await getNubianPhraseCategories();
if (!categories.length) {
showToast('لازم تضيف تصنيف واحد على الأقل أولاً (زر "التصنيفات")', 'error');
return;
}
const isEdit = Boolean(existing);
const selectedCategory = existing?.category || (categories.some(c => c.key === defaultCategory) ? defaultCategory : categories[0].key);
const categoryOptionsHtml = categories.map(c => `
    <option value="${c.key}" ${selectedCategory === c.key ? 'selected' : ''}>${escapeHtml(c.title)}</option>
  `).join('');
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${isEdit ? 'تعديل جملة' : 'جملة جديدة'}">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">${isEdit ? 'تعديل الجملة' : 'جملة جديدة'}</h3>
      </div>
      <div class="modal__body">

        <div class="input-group">
          <label class="input-label" for="admin-phrase-category">التصنيف</label>
          <select class="input" id="admin-phrase-category">${categoryOptionsHtml}</select>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-phrase-ar">الجملة بالعربي</label>
          <input class="input" type="text" id="admin-phrase-ar" placeholder="مثال: إزيك؟" value="${existing?.ar ? escapeHtml(existing.ar) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-phrase-nub">بالنوبي (بحروف عربية)</label>
          <input class="input" type="text" id="admin-phrase-nub" placeholder="مثال: نفسك سو؟" value="${existing?.nub ? escapeHtml(existing.nub) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-phrase-translit">بالحروف اللاتينية (اختياري)</label>
          <input class="input" type="text" id="admin-phrase-translit" placeholder="مثال: Nafsek so?" value="${existing?.translit ? escapeHtml(existing.translit) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-phrase-note">ملاحظة (اختياري — تظهر بدل الترجمة لو لسع ما اتسجلت)</label>
          <input class="input" type="text" id="admin-phrase-note" placeholder="مثال: لسع ما اتسجلت في المصدر" value="${existing?.note ? escapeHtml(existing.note) : ''}">
        </div>

        <p class="input-error-msg hidden" id="admin-phrase-error"></p>
      </div>
      <div class="modal__footer nadm-footer">
        <button class="btn btn--ghost" id="admin-phrase-cancel">إلغاء</button>
        ${isEdit ? '' : '<button class="btn btn--secondary" id="admin-phrase-submit-more">حفظ وإضافة أخرى</button>'}
        <button class="btn btn--primary" id="admin-phrase-submit">${isEdit ? 'حفظ التعديلات' : 'إضافة الجملة'}</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
const categoryEl = backdrop.querySelector('#admin-phrase-category');
const arEl       = backdrop.querySelector('#admin-phrase-ar');
const nubEl      = backdrop.querySelector('#admin-phrase-nub');
const translitEl = backdrop.querySelector('#admin-phrase-translit');
const noteEl     = backdrop.querySelector('#admin-phrase-note');
const errorEl    = backdrop.querySelector('#admin-phrase-error');
const submitBtn  = backdrop.querySelector('#admin-phrase-submit');
const moreBtn    = backdrop.querySelector('#admin-phrase-submit-more');
const close = () => { backdrop.remove(); setCleanup(null); };
const submit = async ({ again = false } = {}) => {
const category = categoryEl.value;
const ar       = arEl.value.trim();
const nub      = nubEl.value.trim();
const translit = translitEl.value.trim();
const note     = noteEl.value.trim();
if (!ar) {
errorEl.textContent = 'لو سمحت اكتب الجملة بالعربي';
errorEl.classList.remove('hidden');
return;
}
if (!nub && !translit && !note) {
errorEl.textContent = 'لو سمحت اكتب الترجمة بالنوبي، أو ملاحظة توضح إنها لسع ما اتسجلت';
errorEl.classList.remove('hidden');
return;
}
errorEl.classList.add('hidden');
submitBtn.disabled = true;
if (moreBtn) moreBtn.disabled = true;
submitBtn.textContent = isEdit ? 'قاعدين نحفظ...' : 'قاعدين نضيف...';
let savedInfo = null;
try {
const payload = { category, ar, nub, translit, note };
if (isEdit) {
const staged = await stageOrRun('nubian-phrase', existing.id, payload, { label: ar });
savedInfo = { op: 'edit', id: existing.id, staged, item: { ...existing, ...payload } };
showToast(staged ? stagedMsg() : 'التعديلات اتحفظت', 'success');
if (!staged) logAdminAction('تعديل جملة نوبية', ar);
} else {
const stagedAdd = await stageAdd('nubian-phrase', payload, { label: ar });
savedInfo = { op: 'add', id: `new_${Date.now()}`, staged: stagedAdd, item: { ...payload, id: `new_${Date.now()}` } };
showToast(stagedAdd ? stagedMsg('add') : 'الجملة اتضافت', 'success');
if (!stagedAdd) logAdminAction('إضافة جملة نوبية', ar);
}
close();
onSuccess?.(savedInfo);
if (again) openPhraseComposeModal(null, onSuccess, categories, category);
} catch (err) {
console.error('[AdminNubian] فشل حفظ الجملة:', err);
submitBtn.disabled = false;
if (moreBtn) moreBtn.disabled = false;
submitBtn.textContent = isEdit ? 'حفظ التعديلات' : 'إضافة الجملة';
errorEl.textContent = err?.userFacing ? err.message : 'الحفظ لسع ما تم — حاول مرة أخرى';
errorEl.classList.remove('hidden');
}
};
backdrop.querySelector('#admin-phrase-cancel').addEventListener('click', close);
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
submitBtn.addEventListener('click', () => submit());
moreBtn?.addEventListener('click', () => submit({ again: true }));
arEl.focus();
setCleanup(close);
}
export async function openCategoryManagerModal(onChange) {
closeComposeModal();
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="إدارة تصنيفات تعلم الكلام">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">تصنيفات تعلم الكلام</h3>
      </div>
      <div class="modal__body">
        <div id="admin-phrase-cat-list" class="admin-content-list">
          <div class="admin-content-preview" style="height:60px;"></div>
        </div>

        <div class="input-group" style="margin-top: var(--space-4);">
          <label class="input-label" for="admin-phrase-cat-new-title">تصنيف جديد</label>
          <input class="input" type="text" id="admin-phrase-cat-new-title" placeholder="مثال: في السوق">
        </div>
        <p class="input-error-msg hidden" id="admin-phrase-cat-error"></p>
        <button class="btn btn--secondary btn--full" id="admin-phrase-cat-add" style="margin-top: var(--space-2);">
          <i data-lucide="plus"></i>
          إضافة تصنيف
        </button>
      </div>
      <div class="modal__footer">
        <button class="btn btn--primary" id="admin-phrase-cat-close">تم</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
const listEl   = backdrop.querySelector('#admin-phrase-cat-list');
const titleEl  = backdrop.querySelector('#admin-phrase-cat-new-title');
const errorEl  = backdrop.querySelector('#admin-phrase-cat-error');
const addBtn   = backdrop.querySelector('#admin-phrase-cat-add');
const close = () => { backdrop.remove(); setCleanup(null); };
let _changed = false;
async function refreshList() {
try {
const categories = await getNubianPhraseCategories();
if (!categories.length) {
listEl.innerHTML = `<p class="input-error-msg" style="margin:0;">ما في تصنيفات لسع — أضف واحد تحت.</p>`;
return;
}
listEl.innerHTML = categories.map(c => `
        <div class="admin-content-row" data-cat-key="${c.key}">
          <div class="admin-content-preview">
            <div class="admin-content-preview__thumb"><i data-lucide="${c.icon || 'message-square'}"></i></div>
            <div class="admin-content-preview__body">
              <h4 class="admin-content-preview__title">${escapeHtml(c.title)}</h4>
            </div>
          </div>
          <div class="admin-content-row__actions">
            <button class="btn btn--sm btn--ghost admin-action-btn" data-action="rename-cat" data-key="${c.key}">
              <i data-lucide="pencil"></i><span>تعديل الاسم</span>
      </button>
            ${canHardDelete() ? `<button class="btn btn--sm btn--danger admin-action-btn" data-action="delete-cat" data-key="${c.key}">
              <i data-lucide="trash-2"></i><span>حذف</span>
      </button>` : ''}
          </div>
        </div>
      `).join('');
renderIcons(listEl);
listEl.querySelectorAll('[data-action="rename-cat"]').forEach(btn => {
btn.addEventListener('click', async () => {
const cat = categories.find(c => c.key === btn.dataset.key);
const newTitle = prompt('اسم التصنيف الجديد:', cat?.title || '');
if (newTitle === null) return;
const trimmed = newTitle.trim();
if (!trimmed) return;
await updateNubianPhraseCategory(btn.dataset.key, { title: trimmed });
showToast('اتعدّل اسم التصنيف', 'success');
logAdminAction('تعديل تصنيف جمل نوبية', `${cat?.title || ''} ← ${trimmed}`);
_changed = true;
await refreshList();
});
});
listEl.querySelectorAll('[data-action="delete-cat"]').forEach(btn => {
btn.addEventListener('click', async () => {
const cat = categories.find(c => c.key === btn.dataset.key);
let phrasesInCat = null;
try { phrasesInCat = (await loadStats('phrases')).find(r => r.category === btn.dataset.key)?.total || 0; } catch {   }
const note = phrasesInCat === null ? 'حيمسح معاه كل الجمل اللي داخله كمان.'
: phrasesInCat > 0 ? `حيمسح معاه ${phrasesInCat} جملة داخله كمان.` : '';
if (!await confirmDelete({ what: 'التصنيف', name: cat?.title || '', note })) return;
await deleteNubianPhraseCategory(btn.dataset.key);
showToast('اتمسح التصنيف', 'success');
logAdminAction('حذف تصنيف جمل نوبية', cat?.title || btn.dataset.key);
_changed = true;
await refreshList();
});
});
} catch (err) {
console.error('[AdminNubian] فشل تحميل التصنيفات:', err);
listEl.innerHTML = errorState({ subject: 'التصنيفات' });
renderIcons(listEl);
}
}
addBtn.addEventListener('click', async () => {
const title = titleEl.value.trim();
if (!title) {
errorEl.textContent = 'لو سمحت اكتب اسم التصنيف';
errorEl.classList.remove('hidden');
return;
}
errorEl.classList.add('hidden');
addBtn.disabled = true;
try {
await addNubianPhraseCategory({ title, icon: 'message-square' });
showToast('اتضاف التصنيف', 'success');
logAdminAction('إضافة تصنيف جمل نوبية', title);
titleEl.value = '';
_changed = true;
await refreshList();
} catch (err) {
console.error('[AdminNubian] فشل إضافة التصنيف:', err);
errorEl.textContent = 'إضافة التصنيف لسع ما تمت — حاول مرة أخرى';
errorEl.classList.remove('hidden');
} finally {
addBtn.disabled = false;
}
});
backdrop.querySelector('#admin-phrase-cat-close').addEventListener('click', () => {
close();
if (_changed) onChange?.();
});
backdrop.addEventListener('click', e => {
if (e.target === backdrop) {
close();
if (_changed) onChange?.();
}
});
setCleanup(close);
await refreshList();
}
