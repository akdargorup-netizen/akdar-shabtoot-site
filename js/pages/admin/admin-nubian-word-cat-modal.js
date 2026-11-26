import { getNubianWordCategories, saveNubianWordCategory, deleteNubianWordCategory } from '../../data/db.js';
import { loadStats } from '../../data/nubian-admin-data.js';
import { errorState } from '../../shared/error-state.js';
import { showToast } from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { canHardDelete, confirmDelete } from '../../shared/admin-ui.js';
import { closeComposeModal, setCleanup } from './admin-nubian-modals.js';
const ICONS = [
'folder', 'book-open', 'message-circle', 'hand-helping', 'users', 'heart', 'clock', 'hash', 'user', 'home',
'sprout', 'paw-print', 'map-pin', 'compass', 'palette', 'cloud-sun', 'thermometer', 'utensils', 'music', 'star',
'shirt', 'bus', 'school', 'handshake',
];
export async function openWordCategoryManagerModal(onChange) {
closeComposeModal();
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal nadm-catmodal" role="dialog" aria-modal="true" aria-label="تصنيفات الكلمات">
      <div class="modal__handle"></div>
      <div class="modal__header"><h3 class="modal__title" id="nwc-title">تصنيفات الكلمات</h3></div>
      <div class="modal__body" id="nwc-body"></div>
      <div class="modal__footer nadm-footer" id="nwc-footer"></div>
    </div>`;
document.body.appendChild(backdrop);
const titleEl = backdrop.querySelector('#nwc-title');
const bodyEl = backdrop.querySelector('#nwc-body');
const footEl = backdrop.querySelector('#nwc-footer');
let _changed = false;
const close = () => { backdrop.remove(); setCleanup(null); if (_changed) onChange?.(); };
setCleanup(close);
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
async function showList() {
titleEl.textContent = 'تصنيفات الكلمات';
footEl.innerHTML = '<button type="button" class="btn btn--primary nadm-wide" id="nwc-done">تم</button>';
footEl.querySelector('#nwc-done').addEventListener('click', close);
bodyEl.innerHTML = `
      <button type="button" class="cta-button nadm-wide" id="nwc-add"><i data-lucide="plus"></i><span>تصنيف جديد</span></button>
      <div class="nadm-catlist" id="nwc-list"><div class="admin-content-preview" style="height:64px;"></div></div>`;
renderIcons(bodyEl);
bodyEl.querySelector('#nwc-add').addEventListener('click', () => showForm(null));
const listEl = bodyEl.querySelector('#nwc-list');
try {
const cats = await getNubianWordCategories();
listEl.innerHTML = cats.map((c) => `
        <div class="nadm-catline">
          <button type="button" class="nadm-catline__main" data-edit="${escapeHtml(c.key)}">
            <span class="nadm-catline__icon"><i data-lucide="${escapeHtml(c.icon || 'folder')}"></i></span>
            <span class="nadm-catline__title">${escapeHtml(c.title)}</span>
            ${c.custom ? '<span class="nadm-catline__tag">جديد</span>' : ''}
            <span class="nadm-catline__edit"><i data-lucide="pencil"></i><span>تعديل</span></span>
          </button>
          ${c.custom && canHardDelete() ? `<button type="button" class="nadm-catline__del" data-del="${escapeHtml(c.key)}" aria-label="حذف ${escapeHtml(c.title)}"><i data-lucide="trash-2"></i></button>` : ''}
        </div>`).join('');
renderIcons(listEl);
listEl.onclick = async (e) => {
const ed = e.target.closest('[data-edit]');
if (ed) { showForm(cats.find((c) => c.key === ed.dataset.edit) || null); return; }
const del = e.target.closest('[data-del]');
if (!del) return;
const cat = cats.find((c) => c.key === del.dataset.del);
let n = null;
try { n = (await loadStats('words')).find((r) => r.category === del.dataset.del)?.total || 0; } catch {   }
const note = n === null ? 'حيمسح معاه كل الكلمات اللي داخله كمان.' : n > 0 ? `حيمسح معاه ${n} كلمة داخله كمان.` : '';
if (!await confirmDelete({ what: 'التصنيف', name: cat?.title || '', note })) return;
try {
await deleteNubianWordCategory(del.dataset.del);
showToast('اتمسح التصنيف', 'success');
logAdminAction('حذف تصنيف كلمات نوبية', cat?.title || del.dataset.del);
_changed = true;
showList();
} catch (err) {
console.error('[AdminNubian] فشل حذف التصنيف:', err);
showToast(err?.message || 'ما قدرنا نمسح التصنيف', 'error');
}
};
} catch (err) {
console.error('[AdminNubian] فشل تحميل التصنيفات:', err);
listEl.innerHTML = errorState({ subject: 'التصنيفات' });
renderIcons(listEl);
}
}
function showForm(cat) {
const isEdit = Boolean(cat);
let icon = cat?.icon || 'folder';
const palette = ICONS.includes(icon) ? ICONS : [icon, ...ICONS];
titleEl.textContent = isEdit ? 'تعديل التصنيف' : 'تصنيف جديد';
bodyEl.innerHTML = `
      <div class="input-group">
        <label class="input-label" for="nwc-name">اسم التصنيف</label>
        <input class="input" type="text" id="nwc-name" maxlength="60" placeholder="مثال: الملابس" value="${escapeHtml(cat?.title || '')}">
      </div>
      <div class="input-group">
        <span class="input-label">الأيقونة</span>
        <div class="nadm-iconpick" id="nwc-icons" role="radiogroup" aria-label="الأيقونة">
          ${palette.map((n) => `<button type="button" class="nadm-iconpick__btn${n === icon ? ' active' : ''}" role="radio" aria-checked="${n === icon}" data-icon-pick="${escapeHtml(n)}"><i data-lucide="${escapeHtml(n)}"></i></button>`).join('')}
        </div>
      </div>
      <p class="input-error-msg hidden" id="nwc-error"></p>`;
footEl.innerHTML = `
      <button type="button" class="btn btn--ghost nadm-wide" id="nwc-back">رجوع</button>
      <button type="button" class="btn btn--primary nadm-wide" id="nwc-save">${isEdit ? 'حفظ التعديل' : 'إضافة التصنيف'}</button>`;
renderIcons(backdrop);
const nameEl = bodyEl.querySelector('#nwc-name');
const errEl = bodyEl.querySelector('#nwc-error');
const saveBtn = footEl.querySelector('#nwc-save');
bodyEl.querySelector('#nwc-icons').addEventListener('click', (e) => {
const b = e.target.closest('[data-icon-pick]');
if (!b) return;
icon = b.dataset.iconPick;
bodyEl.querySelectorAll('[data-icon-pick]').forEach((x) => {
const on = x === b;
x.classList.toggle('active', on);
x.setAttribute('aria-checked', String(on));
});
});
footEl.querySelector('#nwc-back').addEventListener('click', showList);
const save = async () => {
const title = nameEl.value.trim();
if (!title) { errEl.textContent = 'لو سمحت اكتب اسم التصنيف'; errEl.classList.remove('hidden'); nameEl.focus(); return; }
errEl.classList.add('hidden');
saveBtn.disabled = true;
try {
await saveNubianWordCategory({ key: cat?.key, title, icon });
showToast(isEdit ? 'اتعدّل التصنيف' : 'اتضاف التصنيف', 'success');
logAdminAction(isEdit ? 'تعديل تصنيف كلمات نوبية' : 'إضافة تصنيف كلمات نوبية', title);
_changed = true;
showList();
} catch (err) {
console.error('[AdminNubian] فشل حفظ التصنيف:', err);
errEl.textContent = err?.message || 'الحفظ لسع ما تم — حاول مرة أخرى';
errEl.classList.remove('hidden');
saveBtn.disabled = false;
}
};
saveBtn.addEventListener('click', save);
nameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
if (!isEdit) nameEl.focus();
}
await showList();
}
