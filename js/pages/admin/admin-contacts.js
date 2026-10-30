import {
getContacts,
} from '../../data/db.js';
import { CONTACT_CATEGORY_DEFS } from '../../data/contacts-seed-data.js';
import { emptyState }            from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { showToast }             from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { stageOrRun, applyPending, setBatchRefresh, stageDelete, stageAdd, stagedMsg } from '../../shared/admin-batch.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { canHardDelete, confirmDelete, enhanceAdminPage, rowTitle } from '../../shared/admin-ui.js';
let _cleanupModal = null;
let _allItems     = [];
export function renderAdminContacts() {
const categoryOptionsHtml = CONTACT_CATEGORY_DEFS.map(c =>
`<option value="${c.key}">${c.emoji} ${c.label}</option>`
).join('');
return `
    <section class="page admin-contacts-page">

      <div class="admin-content-toolbar">
        <p>
          من هنا تضيف وتعدّل وتحذف جهات الاتصال — اسم الجهة، الدور
          (اختياري)، رقم الهاتف، والقسم الذي تظهر تحته في دليل الاتصال.
          التعديل فوري ويظهر لكل المستخدمين مباشرة.
        </p>
        <button class="cta-button cta-button--full" data-action="compose-contact">
          <i data-lucide="plus"></i>
          جهة جديدة
        </button>
      </div>

      <div class="admin-content-filters">
        <input
          type="text"
          class="input"
          id="admin-contacts-search"
          placeholder="دوّر باسم أو دور..."
          autocomplete="off"
          style="flex:1;"
        />
        <select class="input" id="admin-contacts-filter-category" style="flex:0 0 auto; max-width:45%;">
          <option value="">كل الأقسام</option>
          ${categoryOptionsHtml}
        </select>
      </div>

      <div class="admin-content-list" id="admin-content-list">
        <div class="admin-content-preview" style="height:74px;"></div>
        <div class="admin-content-preview" style="height:74px;"></div>
        <div class="admin-content-preview" style="height:74px;"></div>
      </div>

    </section>
  `;
}
export async function initAdminContacts() {
const page = document.querySelector('.admin-contacts-page');
if (!page) return;
setBatchRefresh(page, () => _loadList(page));
enhanceAdminPage(page);
page.querySelector('[data-action="compose-contact"]')?.addEventListener('click', () => {
_openComposeModal(null, () => _loadList(page));
});
const searchInput = page.querySelector('#admin-contacts-search');
const categorySelect = page.querySelector('#admin-contacts-filter-category');
searchInput?.addEventListener('input', () => _applyFilters(page));
categorySelect?.addEventListener('change', () => _applyFilters(page));
await _loadList(page);
}
async function _loadList(page) {
const list = page.querySelector('#admin-content-list');
if (!list) return;
try {
_allItems = applyPending('contacts', await getContacts());
_renderFiltered(page, _allItems);
} catch (err) {
console.error('[AdminContacts] فشل التحميل:', err);
list.innerHTML = errorState({ subject: 'جهات الاتصال' });
renderIcons(list);
bindErrorRetry(list, () => _loadList(page));
}
}
function _applyFilters(page) {
const q = (page.querySelector('#admin-contacts-search')?.value || '').trim().toLowerCase();
const categoryKey = page.querySelector('#admin-contacts-filter-category')?.value || '';
const filtered = _allItems.filter(item => {
const matchesQuery = !q || `${item.name} ${item.role || ''}`.toLowerCase().includes(q);
const matchesCategory = !categoryKey || item.categoryKey === categoryKey;
return matchesQuery && matchesCategory;
});
_renderFiltered(page, filtered);
}
function _renderFiltered(page, items) {
const list = page.querySelector('#admin-content-list');
if (!list) return;
if (!items.length) {
list.innerHTML = emptyState({
icon: 'phone',
title: 'مافي جهات اتصال مطابقة',
desc: 'جرب كلمة بحث تانية أو اختار "كل الأقسام".',
});
renderIcons();
return;
}
const order = CONTACT_CATEGORY_DEFS.map(c => c.key);
const sorted = [...items].sort((a, b) => {
const catDiff = order.indexOf(a.categoryKey) - order.indexOf(b.categoryKey);
if (catDiff !== 0) return catDiff;
return String(a.name).localeCompare(String(b.name), 'ar');
});
list.innerHTML = sorted.map(_renderRow).join('');
renderIcons();
list.querySelectorAll('[data-action="edit-contact"]').forEach(btn => {
btn.addEventListener('click', () => {
const item = _allItems.find(c => String(c.id) === btn.dataset.id);
if (item) _openComposeModal(item, () => _loadList(page));
});
});
list.querySelectorAll('[data-action="delete-contact"]').forEach(btn => {
btn.addEventListener('click', async () => {
if (!await confirmDelete({ what: 'الجهة', name: rowTitle(btn) })) return;
const stagedDel = await stageDelete('contacts', btn.dataset.id, { label: btn.dataset.title || String(btn.dataset.id) });
showToast(stagedDel ? stagedMsg('delete') : 'الجهة اتمسحت', 'success');
if (!stagedDel) logAdminAction('حذف جهة اتصال', btn.dataset.title || String(btn.dataset.id));
await _loadList(page);
});
});
}
function _renderRow(item) {
return `
    <div class="admin-content-row">
      <div class="admin-content-preview">
        <div class="admin-content-preview__thumb">
          <i data-lucide="phone"></i>
        </div>
        <div class="admin-content-preview__body">
          <div class="admin-content-preview__head">
            <h4 class="admin-content-preview__title">${escapeHtml(item.name || 'جهة اتصال')}</h4>
          </div>
          <span class="admin-content-preview__meta">${item.category || item.categoryKey}${item.role ? ' · ' + escapeHtml(item.role) : ''} · ${escapeHtml(item.phone || '')}</span>
        </div>
      </div>
      <div class="admin-content-row__actions">
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="edit-contact" data-id="${item.id}">
          <i data-lucide="pencil"></i><span>تعديل</span>
      </button>
        ${canHardDelete() ? `<button class="btn btn--sm btn--danger admin-action-btn" data-action="delete-contact" data-id="${item.id}" data-title="${escapeHtml(item.name || '')}">
          <i data-lucide="trash-2"></i><span>حذف</span>
      </button>` : ''}
      </div>
    </div>
  `;
}
function _openComposeModal(existing, onSuccess) {
closeComposeModal();
const isEdit = Boolean(existing);
const selectedCategory = existing?.categoryKey || CONTACT_CATEGORY_DEFS[0]?.key || '';
const categoryOptionsHtml = CONTACT_CATEGORY_DEFS.map(c =>
`<option value="${c.key}" ${selectedCategory === c.key ? 'selected' : ''}>${c.emoji} ${c.label}</option>`
).join('');
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${isEdit ? 'تعديل جهة اتصال' : 'جهة اتصال جديدة'}">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">${isEdit ? 'تعديل الجهة' : 'جهة اتصال جديدة'}</h3>
      </div>
      <div class="modal__body">

        <div class="input-group">
          <label class="input-label" for="admin-contact-name">اسم الجهة</label>
          <input class="input" type="text" id="admin-contact-name" placeholder="مثال: لجنة المسجد الكبير" value="${existing?.name ? escapeHtml(existing.name) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-contact-role">الدور / الوصف (اختياري)</label>
          <input class="input" type="text" id="admin-contact-role" placeholder="مثال: أسطى بناء" value="${existing?.role ? escapeHtml(existing.role) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-contact-phone">رقم الهاتف</label>
          <input class="input" type="tel" id="admin-contact-phone" placeholder="مثال: +249900000000" value="${existing?.phone ? escapeHtml(existing.phone) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-contact-category">القسم</label>
          <select class="input" id="admin-contact-category">${categoryOptionsHtml}</select>
        </div>

        <div class="admin-toggle-row">
          <span>يظهر للمساعد الذكي (جهة عامة فقط: صيدلية، مركز صحي، لجنة... لا تفعّله لأرقام الأفراد)</span>
          <input type="checkbox" id="admin-contact-ai-public" ${existing?.aiPublic ? 'checked' : ''}>
        </div>

        <p class="input-error-msg hidden" id="admin-contact-error"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="admin-contact-cancel">إلغاء</button>
        <button class="btn btn--primary" id="admin-contact-submit">${isEdit ? 'حفظ التعديلات' : 'إضافة الجهة'}</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
const nameEl     = backdrop.querySelector('#admin-contact-name');
const roleEl     = backdrop.querySelector('#admin-contact-role');
const phoneEl    = backdrop.querySelector('#admin-contact-phone');
const categoryEl = backdrop.querySelector('#admin-contact-category');
const aiPublicEl = backdrop.querySelector('#admin-contact-ai-public');
const errorEl    = backdrop.querySelector('#admin-contact-error');
const submitBtn  = backdrop.querySelector('#admin-contact-submit');
const close = () => { backdrop.remove(); _cleanupModal = null; };
const submit = async () => {
const name       = nameEl.value.trim();
const role       = roleEl.value.trim();
const phone      = phoneEl.value.trim();
const categoryKey = categoryEl.value;
if (!name) {
errorEl.textContent = 'لو سمحت اكتب اسم الجهة';
errorEl.classList.remove('hidden');
return;
}
if (!phone) {
errorEl.textContent = 'لو سمحت اكتب رقم التلفون';
errorEl.classList.remove('hidden');
return;
}
errorEl.classList.add('hidden');
submitBtn.disabled = true;
submitBtn.textContent = isEdit ? 'قاعدين نحفظ...' : 'قاعدين نضيف...';
try {
const payload = { name, role: role || null, phone, categoryKey, aiPublic: !!aiPublicEl?.checked };
if (isEdit) {
const staged = await stageOrRun('contacts', existing.id, payload, { label: name });
showToast(staged ? stagedMsg() : 'التعديلات اتحفظت', 'success');
if (!staged) logAdminAction('تعديل جهة اتصال', name);
} else {
const stagedAdd = await stageAdd('contacts', payload, { label: name });
showToast(stagedAdd ? stagedMsg('add') : 'الجهة اتضافت للدليل', 'success');
if (!stagedAdd) logAdminAction('إضافة جهة اتصال', name);
}
close();
onSuccess?.();
} catch (err) {
console.error('[AdminContacts] فشل الحفظ:', err);
submitBtn.disabled = false;
submitBtn.textContent = isEdit ? 'حفظ التعديلات' : 'إضافة الجهة';
errorEl.textContent = 'الحفظ لسع ما تم — حاول مرة أخرى';
errorEl.classList.remove('hidden');
}
};
backdrop.querySelector('#admin-contact-cancel').addEventListener('click', close);
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
submitBtn.addEventListener('click', submit);
nameEl.focus();
_cleanupModal = close;
}
export function closeComposeModal() {
if (_cleanupModal) {
_cleanupModal();
_cleanupModal = null;
}
}
