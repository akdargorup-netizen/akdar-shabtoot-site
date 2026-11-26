import { NUBIAN_LANGUAGE_CATEGORIES } from '../../data/nubian-language-data.js';
import { showToast }              from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { stageOrRun, stageAdd, stagedMsg } from '../../shared/admin-batch.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { renderWordGrid } from '../nubian-language/nubian-word-render.js';
import { confirmAction } from '../../shared/admin-ui.js';
import { closeComposeModal, setCleanup } from './admin-nubian-modals.js';
import { findSameAr } from '../../data/nubian-admin-data.js';
const PREVIEW_CLIP = 'w/preview.m4a';
let _cats = NUBIAN_LANGUAGE_CATEGORIES;
const categoryLabel = (key) => _cats.find(c => c.key === key)?.title || key;
export function openWordComposeModal(existing, onSuccess, opts = {}) {
closeComposeModal();
_cats = opts.categories?.length ? opts.categories : NUBIAN_LANGUAGE_CATEGORIES;
const isEdit = Boolean(existing);
const selectedCategory = existing?.category || opts.category || _cats[0]?.key;
const categoryOptionsHtml = _cats.map(c => `
    <option value="${escapeHtml(c.key)}" ${selectedCategory === c.key ? 'selected' : ''}>${escapeHtml(c.title)}</option>
  `).join('');
const hasExtras = Boolean(existing?.group || existing?.note);
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${isEdit ? 'تعديل كلمة' : 'كلمة جديدة'}">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">${isEdit ? 'تعديل الكلمة' : 'كلمة جديدة'}</h3>
      </div>
      <div class="modal__body">

        <div class="nadm-preview-wrap">
          <span class="nadm-preview-label">هكذا ستظهر في التطبيق</span>
          <div class="nadm-preview" id="admin-nubian-preview" aria-live="polite"></div>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-nubian-ar">١) الكلمة بالعربي</label>
          <input class="input" type="text" id="admin-nubian-ar" placeholder="مثال: التحية" value="${existing?.ar ? escapeHtml(existing.ar) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-nubian-nub">٢) بالنوبي (بحروف عربية)</label>
          <input class="input" type="text" id="admin-nubian-nub" placeholder="مثال: سيرين آقمي" value="${existing?.nub ? escapeHtml(existing.nub) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-nubian-translit">٣) النطق بالحروف اللاتينية (اختياري)</label>
          <input class="input" type="text" id="admin-nubian-translit" dir="ltr" placeholder="Sērēn Agmē" value="${existing?.translit ? escapeHtml(existing.translit) : ''}">
          <p class="nadm-hint">رموز مفيدة: ē ō ā ī ū ŋ — انسخها من هنا لو لوحة المفاتيح ما فيها.</p>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-nubian-category">٤) أي قسم؟</label>
          <select class="input" id="admin-nubian-category">${categoryOptionsHtml}</select>
        </div>

        <details class="nadm-more" ${hasExtras ? 'open' : ''}>
          <summary>خيارات إضافية (مجموعة فرعية · ملاحظة)</summary>

          <div class="input-group">
            <label class="input-label" for="admin-nubian-group">مجموعة فرعية</label>
            <input class="input" type="text" id="admin-nubian-group" placeholder="مثال: أيام الأسبوع — لتقسيم الكلمات الكتيرة داخل نفس القسم" value="${existing?.group ? escapeHtml(existing.group) : ''}">
          </div>

          <div class="input-group">
            <label class="input-label" for="admin-nubian-note">ملاحظة (تظهر بدل الترجمة لو لسع ما اتسجلت)</label>
            <input class="input" type="text" id="admin-nubian-note" placeholder="مثال: لسع ما اتسجلت في المصدر" value="${existing?.note ? escapeHtml(existing.note) : ''}">
          </div>
        </details>

        <p class="input-error-msg hidden" id="admin-nubian-error"></p>
      </div>
      <div class="modal__footer nadm-footer">
        <button class="btn btn--ghost" id="admin-nubian-cancel">إلغاء</button>
        ${isEdit ? '' : '<button class="btn btn--secondary" id="admin-nubian-submit-more">حفظ وإضافة أخرى</button>'}
        <button class="btn btn--primary" id="admin-nubian-submit">${isEdit ? 'حفظ التعديلات' : 'حفظ الكلمة'}</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
const categoryEl  = backdrop.querySelector('#admin-nubian-category');
const arEl        = backdrop.querySelector('#admin-nubian-ar');
const nubEl       = backdrop.querySelector('#admin-nubian-nub');
const translitEl  = backdrop.querySelector('#admin-nubian-translit');
const groupEl     = backdrop.querySelector('#admin-nubian-group');
const noteEl      = backdrop.querySelector('#admin-nubian-note');
const errorEl     = backdrop.querySelector('#admin-nubian-error');
const submitBtn   = backdrop.querySelector('#admin-nubian-submit');
const moreBtn     = backdrop.querySelector('#admin-nubian-submit-more');
const previewEl   = backdrop.querySelector('#admin-nubian-preview');
function _updatePreview() {
if (!previewEl) return;
const ar = arEl.value.trim();
if (!ar && !nubEl.value.trim() && !translitEl.value.trim()) {
previewEl.innerHTML = '<p class="nadm-preview__empty">اكتب الكلمة لتظهر معاينتها هنا</p>';
return;
}
previewEl.innerHTML = renderWordGrid([{
ar: ar || '…',
nub: nubEl.value.trim(),
translit: translitEl.value.trim(),
note: noteEl.value.trim(),
audio: existing?.audio ? PREVIEW_CLIP : '',
}]);
}
[arEl, nubEl, translitEl, noteEl].forEach(el => el.addEventListener('input', _updatePreview));
_updatePreview();
let _dupKey = '', _dupP = null;
const _prefetchDup = () => {
if (isEdit) return;
const ar = arEl.value.trim();
const key = `${categoryEl.value}|${ar}`;
if (!ar || key === _dupKey) return;
_dupKey = key;
_dupP = findSameAr('words', { category: categoryEl.value, ar }).catch(() => []);
};
arEl.addEventListener('change', _prefetchDup);
categoryEl.addEventListener('change', _prefetchDup);
const close = () => { backdrop.remove(); setCleanup(null); };
const submit = async ({ again = false } = {}) => {
const category = categoryEl.value;
const ar       = arEl.value.trim();
const nub      = nubEl.value.trim();
const translit = translitEl.value.trim();
const group    = groupEl.value.trim();
const note     = noteEl.value.trim();
if (!ar) {
errorEl.textContent = 'لو سمحت اكتب الكلمة بالعربي';
errorEl.classList.remove('hidden');
arEl.focus();
return;
}
if (!nub && !translit && !note) {
errorEl.textContent = 'لو سمحت اكتب الترجمة بالنوبي، أو ملاحظة توضح إنها لسع ما اتسجلت';
errorEl.classList.remove('hidden');
nubEl.focus();
return;
}
errorEl.classList.add('hidden');
if (!isEdit) {
const norm = (t) => String(t || '').replace(/\s+/g, ' ').trim();
_prefetchDup();
const same = _dupP ? await Promise.race([_dupP, new Promise(r => setTimeout(() => r([]), 2000))]) : [];
const dup = same.some(w => norm(w.nub) === norm(nub));
if (dup && !await confirmAction({
title: 'الكلمة دي موجودة',
message: `«${ar}» موجودة أصلًا في قسم «${categoryLabel(category)}» بنفس الترجمة. تضيفها مرة تانية؟`,
confirmLabel: 'أضفها',
})) return;
}
submitBtn.disabled = true;
if (moreBtn) moreBtn.disabled = true;
const idleLabel = isEdit ? 'حفظ التعديلات' : 'حفظ الكلمة';
submitBtn.textContent = 'قاعدين نحفظ...';
let savedInfo = null;
try {
const payload = { category, ar, nub, translit, group, note };
if (isEdit) {
const staged = await stageOrRun('nubian-word', existing.id, payload, { label: ar });
savedInfo = { op: 'edit', id: existing.id, staged, item: { ...existing, ...payload } };
showToast(staged ? stagedMsg() : 'التعديلات اتحفظت', 'success');
if (!staged) logAdminAction('تعديل كلمة نوبية', ar);
} else {
const stagedAdd = await stageAdd('nubian-word', payload, { label: ar });
savedInfo = { op: 'add', id: `new_${Date.now()}`, staged: stagedAdd, item: { ...payload, id: `new_${Date.now()}` } };
showToast(stagedAdd ? stagedMsg('add') : 'الكلمة اتضافت للقاموس', 'success');
if (!stagedAdd) logAdminAction('إضافة كلمة نوبية', ar);
}
close();
onSuccess?.(savedInfo);
if (again) openWordComposeModal(null, onSuccess, { category });
} catch (err) {
console.error('[AdminNubian] فشل الحفظ:', err);
submitBtn.disabled = false;
if (moreBtn) moreBtn.disabled = false;
submitBtn.textContent = idleLabel;
errorEl.textContent = err?.userFacing ? err.message : 'الحفظ لسع ما تم — حاول مرة أخرى';
errorEl.classList.remove('hidden');
}
};
backdrop.querySelector('#admin-nubian-cancel').addEventListener('click', close);
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
submitBtn.addEventListener('click', () => submit());
moreBtn?.addEventListener('click', () => submit({ again: true }));
arEl.focus();
setCleanup(close);
}
