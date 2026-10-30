import {
getProjects,
} from '../../data/db.js';
import { PROJECT_STATUSES, PROJECT_STATUS_ICON } from '../../data/projects-data.js';
import { createImageUploadField } from '../../shared/image-upload-field.js';
import { emptyState }             from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { showToast }              from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { stageOrRun, applyPending, setBatchRefresh, stageDelete, stageAdd, stagedMsg } from '../../shared/admin-batch.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { canHardDelete, confirmDelete, enhanceAdminPage, rowTitle } from '../../shared/admin-ui.js';
function statusLabel(key) {
return PROJECT_STATUSES.find(s => s.key === key)?.label || key;
}
function _parseExpenses(raw) {
return raw
.split(/\n+/)
.map(line => line.trim())
.filter(Boolean)
.map(line => {
const lastDash = line.lastIndexOf('-');
if (lastDash === -1) return { description: line, amount: 0 };
const amountPart = line.slice(lastDash + 1).trim();
const amount = Number(amountPart.replace(/[^\d.]/g, ''));
if (!amountPart || Number.isNaN(amount)) return { description: line, amount: 0 };
return { description: line.slice(0, lastDash).trim(), amount };
});
}
function _parseMethods(raw) {
return raw
.split(/\n+/)
.map(line => line.trim())
.filter(Boolean)
.map(line => {
const i = line.indexOf(' - ');
if (i === -1) return { name: line, account: '' };
return { name: line.slice(0, i).trim(), account: line.slice(i + 3).trim() };
});
}
let _cleanupModal = null;
let _uploadField   = null;
export function renderAdminProjects() {
return `
    <section class="page admin-projects-page">

      <div class="admin-content-toolbar">
        <p>
          من هنا تنشر وتحدّث مشاريع "متابعة المشاريع" — الحالة ونسبة
          الإنجاز والقسم المالي (لو موجود). النشر فوري ويظهر لكل
          المستخدمين مباشرة في صفحة المشروع.
        </p>
        <button class="cta-button cta-button--full" data-action="compose-project">
          <i data-lucide="plus"></i>
          مشروع جديد
        </button>
      </div>

      <div class="admin-content-list" id="admin-content-list">
        <div class="admin-content-preview" style="height:74px;"></div>
        <div class="admin-content-preview" style="height:74px;"></div>
      </div>

    </section>
  `;
}
export async function initAdminProjects() {
const page = document.querySelector('.admin-projects-page');
if (!page) return;
setBatchRefresh(page, () => _loadList(page));
enhanceAdminPage(page);
page.querySelector('[data-action="compose-project"]')?.addEventListener('click', () => {
_openComposeModal(null, () => _loadList(page));
});
await _loadList(page);
}
async function _loadList(page) {
const list = page.querySelector('#admin-content-list');
if (!list) return;
try {
const items = applyPending('projects', await getProjects());
if (!items.length) {
list.innerHTML = emptyState({
icon: 'trending-up',
title: 'لسع ما في مشاريع منشورة',
desc: 'ابدأ وانشر أول مشروع.',
});
renderIcons();
return;
}
list.innerHTML = items.map(_renderRow).join('');
renderIcons();
list.querySelectorAll('[data-action="edit-project"]').forEach(btn => {
btn.addEventListener('click', () => {
const item = items.find(p => String(p.id) === btn.dataset.id);
if (item) _openComposeModal(item, () => _loadList(page));
});
});
list.querySelectorAll('[data-action="delete-project"]').forEach(btn => {
btn.addEventListener('click', async () => {
if (!await confirmDelete({ what: 'المشروع', name: rowTitle(btn) })) return;
const stagedDel = await stageDelete('projects', btn.dataset.id, { label: btn.dataset.title || String(btn.dataset.id) });
showToast(stagedDel ? stagedMsg('delete') : 'المشروع اتمسح', 'success');
if (!stagedDel) logAdminAction('حذف مشروع', btn.dataset.title || String(btn.dataset.id));
await _loadList(page);
});
});
} catch (err) {
console.error('[AdminProjects] فشل التحميل:', err);
list.innerHTML = errorState({ subject: 'المشاريع' });
renderIcons(list);
bindErrorRetry(list, () => _loadList(page));
}
}
function _renderRow(item) {
const icon = PROJECT_STATUS_ICON[item.status] || 'flag';
return `
    <div class="admin-content-row">
      <div class="admin-content-preview">
        <div class="admin-content-preview__thumb">
          ${item.image ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async">` : `<i data-lucide="${icon}"></i>`}
        </div>
        <div class="admin-content-preview__body">
          <div class="admin-content-preview__head">
            <h4 class="admin-content-preview__title">${escapeHtml(item.title || 'مشروع')}</h4>
            ${item.finance ? '<span class="badge badge--default">مالي مفعّل</span>' : ''}
          </div>
          <span class="admin-content-preview__meta">${escapeHtml(statusLabel(item.status))} · ${item.progress ?? 0}%</span>
        </div>
      </div>
      <div class="admin-content-row__actions">
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="edit-project" data-id="${item.id}">
          <i data-lucide="pencil"></i><span>تعديل</span>
      </button>
        ${canHardDelete() ? `<button class="btn btn--sm btn--danger admin-action-btn" data-action="delete-project" data-id="${item.id}" data-title="${escapeHtml(item.title || '')}">
          <i data-lucide="trash-2"></i><span>حذف</span>
      </button>` : ''}
      </div>
    </div>
  `;
}
function _openComposeModal(existing, onSuccess) {
closeComposeModal();
const isEdit = Boolean(existing);
const selectedStatus = existing?.status || PROJECT_STATUSES[0]?.key || 'planned';
const statusHtml = PROJECT_STATUSES.map(s => `
    <label class="admin-type-option${selectedStatus === s.key ? ' is-selected' : ''}">
      <input type="radio" name="project-status" value="${s.key}" ${selectedStatus === s.key ? 'checked' : ''}>
      <span>${s.label}</span>
    </label>
  `).join('');
const executorsText    = existing?.executors?.length ? existing.executors.join('\n') : '';
const contributorsText = existing?.contributors?.length ? existing.contributors.join('\n') : '';
const hasFinance = Boolean(existing?.finance);
const finance = existing?.finance || {};
const expensesText = finance.expenses?.length
? finance.expenses.map(e => `${e.description} - ${e.amount}`).join('\n')
: '';
const methodsText = (existing?.contributionMethods || [])
.map(m => (m.account ? `${m.name} - ${m.account}` : m.name)).join('\n');
const neededMaterialsText = finance.neededMaterials?.length ? finance.neededMaterials.join('\n') : '';
_uploadField = createImageUploadField({
pathPrefix:  'projects',
existingUrl: existing?.image || '',
label:       'صورة المشروع (اختياري)',
allowGalleryPick: true,
});
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${isEdit ? 'تعديل مشروع' : 'مشروع جديد'}">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">${isEdit ? 'تعديل المشروع' : 'مشروع جديد'}</h3>
      </div>
      <div class="modal__body">

        <div class="input-group">
          <label class="input-label" for="admin-project-title">العنوان</label>
          <input class="input" type="text" id="admin-project-title" placeholder="مثال: تطوير المركز الصحي" value="${existing?.title ? escapeHtml(existing.title) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label">الحالة</label>
          <div class="admin-type-grid" id="admin-project-status-grid">${statusHtml}</div>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-project-progress">نسبة الإنجاز (%)</label>
          <input class="input" type="number" id="admin-project-progress" min="0" max="100" step="1" value="${existing?.progress ?? 0}">
        </div>

        ${_uploadField.html}

        <div class="input-group">
          <label class="input-label" for="admin-project-description">الوصف</label>
          <textarea class="input" id="admin-project-description" rows="4" placeholder="وصف مختصر للمشروع وهدفه.">${existing?.description ? escapeHtml(existing.description) : ''}</textarea>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-project-executors">الجهة المنفذة (اختياري)</label>
          <textarea class="input" id="admin-project-executors" rows="2" placeholder="كل جهة في سطر مستقل.">${escapeHtml(executorsText)}</textarea>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-project-contributors">المساهمون (اختياري)</label>
          <textarea class="input" id="admin-project-contributors" rows="2" placeholder="كل اسم في سطر مستقل.">${escapeHtml(contributorsText)}</textarea>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-project-methods">طرق المساهمة — المستلمون والحسابات (اختياري)</label>
          <textarea class="input" id="admin-project-methods" rows="4" dir="auto" placeholder="كل مستلم في سطر: الاسم - البنك ورقم الحساب">${escapeHtml(methodsText)}</textarea>
          <p class="input-hint">سطر لكل مستلم، بالشكل: الاسم - الحساب (مثلاً: أحمد محمد - بنك كذا 1234567). يظهر في صفحة المشروع كبطاقة بزر نسخ. لا تكتب إلا ما أكّدته الجهة المنفذة.</p>
        </div>

        <div class="admin-toggle-row">
          <span>قسم مالي (مطلوب/اتجمع)</span>
          <label class="switch">
            <input type="checkbox" id="admin-project-finance-toggle" ${hasFinance ? 'checked' : ''}>
            <span class="switch__track"></span>
          </label>
        </div>

        <div id="admin-project-finance-fields" class="${hasFinance ? '' : 'hidden'}">
          <div class="input-group">
            <label class="input-label" for="admin-project-goal">المبلغ المطلوب</label>
            <input class="input" type="number" id="admin-project-goal" min="0" step="1" value="${finance.goalAmount ?? ''}">
          </div>
          <div class="input-group">
            <label class="input-label" for="admin-project-raised">المبلغ المتجمّع</label>
            <input class="input" type="number" id="admin-project-raised" min="0" step="1" value="${finance.raisedAmount ?? ''}">
          </div>
          <div class="input-group">
            <label class="input-label" for="admin-project-currency">العملة</label>
            <input class="input" type="text" id="admin-project-currency" placeholder="جنيه" value="${finance.currency ? escapeHtml(finance.currency) : 'جنيه'}">
          </div>
          <div class="input-group">
            <label class="input-label" for="admin-project-source">مصدر الأرقام</label>
            <input class="input" type="text" id="admin-project-source" placeholder="مثال: لجنة تطوير المركز الصحي" value="${finance.sourceLabel ? escapeHtml(finance.sourceLabel) : ''}">
          </div>
          <div class="input-group">
            <label class="input-label" for="admin-project-updated">آخر تحديث</label>
            <input class="input" type="text" id="admin-project-updated" placeholder="مثال: ٢٠٢٦-٠٨-١٤" value="${finance.lastUpdated ? escapeHtml(finance.lastUpdated) : ''}">
          </div>

          <!-- خيارات ذكية إضافية — شفافية "ماذا صرفت؟" و"المواد الناقصة؟"
               فوق أرقام المطلوب/المتجمّع أعلاه (اللي أصلاً بتجاوب على
               "كم تحتاج؟" و"كم عندك؟"). كل بند سطر مستقل، نفس أسلوب
               الجهة المنفذة/المساهمين بالظبط. -->
          <div class="input-group">
            <label class="input-label" for="admin-project-expenses">تفاصيل المصروفات (اختياري)</label>
            <textarea class="input" id="admin-project-expenses" rows="3" placeholder="كل بند في سطر: الوصف - المبلغ">${escapeHtml(expensesText)}</textarea>
            <p class="input-hint">سطر لكل بند، بالشكل: الوصف - المبلغ (مثلاً: أسمنت وطوب - 120000)</p>
          </div>

          <div class="input-group">
            <label class="input-label" for="admin-project-needed-materials">المواد أو الاحتياجات الناقصة (اختياري)</label>
            <textarea class="input" id="admin-project-needed-materials" rows="2" placeholder="كل احتياج في سطر مستقل.">${escapeHtml(neededMaterialsText)}</textarea>
          </div>
        </div>

        <p class="input-error-msg hidden" id="admin-project-error"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="admin-project-cancel">إلغاء</button>
        <button class="btn btn--primary" id="admin-project-submit">${isEdit ? 'حفظ التعديلات' : 'نشر المشروع'}</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
_uploadField.mount(backdrop);
const statusGrid   = backdrop.querySelector('#admin-project-status-grid');
const titleEl       = backdrop.querySelector('#admin-project-title');
const progressEl     = backdrop.querySelector('#admin-project-progress');
const descriptionEl   = backdrop.querySelector('#admin-project-description');
const executorsEl       = backdrop.querySelector('#admin-project-executors');
const contributorsEl     = backdrop.querySelector('#admin-project-contributors');
const methodsEl            = backdrop.querySelector('#admin-project-methods');
const financeToggleEl     = backdrop.querySelector('#admin-project-finance-toggle');
const financeFieldsEl       = backdrop.querySelector('#admin-project-finance-fields');
const goalEl                 = backdrop.querySelector('#admin-project-goal');
const raisedEl                = backdrop.querySelector('#admin-project-raised');
const currencyEl                = backdrop.querySelector('#admin-project-currency');
const sourceEl                    = backdrop.querySelector('#admin-project-source');
const updatedEl                     = backdrop.querySelector('#admin-project-updated');
const expensesEl                      = backdrop.querySelector('#admin-project-expenses');
const neededMaterialsEl                 = backdrop.querySelector('#admin-project-needed-materials');
const errorEl                        = backdrop.querySelector('#admin-project-error');
const submitBtn                       = backdrop.querySelector('#admin-project-submit');
statusGrid.querySelectorAll('.admin-type-option').forEach(opt => {
opt.addEventListener('click', () => {
statusGrid.querySelectorAll('.admin-type-option').forEach(o => o.classList.remove('is-selected'));
opt.classList.add('is-selected');
});
});
financeToggleEl.addEventListener('change', () => {
financeFieldsEl.classList.toggle('hidden', !financeToggleEl.checked);
});
const close = () => { backdrop.remove(); _cleanupModal = null; _uploadField = null; };
const submit = async () => {
const title       = titleEl.value.trim();
const status       = statusGrid.querySelector('input[name="project-status"]:checked')?.value || PROJECT_STATUSES[0]?.key;
const progress       = Math.max(0, Math.min(100, Number(progressEl.value) || 0));
const image           = _uploadField.getValue();
const description       = descriptionEl.value.trim();
const executors = executorsEl.value.split(/\n+/).map(s => s.trim()).filter(Boolean);
const contributors = contributorsEl.value.split(/\n+/).map(s => s.trim()).filter(Boolean);
let finance = null;
if (financeToggleEl.checked) {
const sourceLabel = sourceEl.value.trim();
if (!sourceLabel) {
errorEl.textContent = 'لو سمحت اكتب مصدر الأرقام المالية';
errorEl.classList.remove('hidden');
return;
}
finance = {
goalAmount:   Math.max(0, Number(goalEl.value) || 0),
raisedAmount: Math.max(0, Number(raisedEl.value) || 0),
currency:     currencyEl.value.trim() || 'جنيه',
sourceLabel,
lastUpdated:  updatedEl.value.trim(),
expenses:        _parseExpenses(expensesEl.value),
neededMaterials: neededMaterialsEl.value.split(/\n+/).map(s => s.trim()).filter(Boolean),
};
}
if (!title) {
errorEl.textContent = 'لو سمحت اكتب عنوان المشروع';
errorEl.classList.remove('hidden');
return;
}
errorEl.classList.add('hidden');
submitBtn.disabled = true;
submitBtn.textContent = isEdit ? 'قاعدين نحفظ...' : 'قاعدين ننشر...';
try {
const contributionMethods = _parseMethods(methodsEl.value);
const payload = { title, status, progress, image, description, executors, contributors, contributionMethods, finance };
if (isEdit) {
const staged = await stageOrRun('projects', existing.id, payload, { label: title });
showToast(staged ? stagedMsg() : 'التعديلات اتحفظت', 'success');
if (!staged) logAdminAction('تعديل مشروع', title);
} else {
const stagedAdd = await stageAdd('projects', payload, { label: title });
showToast(stagedAdd ? stagedMsg('add') : 'المشروع اتنشر لأهل البلد', 'success');
if (!stagedAdd) logAdminAction('نشر مشروع', title);
}
close();
onSuccess?.();
} catch (err) {
console.error('[AdminProjects] فشل الحفظ:', err);
submitBtn.disabled = false;
submitBtn.textContent = isEdit ? 'حفظ التعديلات' : 'نشر المشروع';
errorEl.textContent = 'الحفظ لسع ما تم — حاول مرة أخرى';
errorEl.classList.remove('hidden');
}
};
backdrop.querySelector('#admin-project-cancel').addEventListener('click', close);
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
