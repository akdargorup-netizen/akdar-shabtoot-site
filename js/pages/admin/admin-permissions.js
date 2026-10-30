import {
getAdminAccounts,
addAdminAccount,
removeAdminAccount,
resetAdminAccountPassword,
getAdminAccountId,
isDeveloperSession,
ADMIN_AUTH_MODE,
} from '../../data/admin-auth.js';
import { emptyState } from '../../shared/empty-state.js';
import { showToast }  from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { confirmAction, enhanceAdminPage } from '../../shared/admin-ui.js';
let _cleanupModal = null;
export function renderAdminPermissions() {
return `
    <section class="page admin-permissions-page">

      <div class="admin-content-toolbar">
        <p>
          افتح لكل شخص يساعدك في الإدارة حساب خاص بكلمة سر منفصلة
          ودور محدد، بدل ما تشارك كلمة سرك الأساسية. تقدر تسحب وصول
          أي زول أو تصفّر كلمة سره في أي وقت.
        </p>

        <div class="admin-urgent-status admin-urgent-status--warning">
          <i data-icon="alert-triangle"></i>
          <div class="admin-urgent-status__body">
            <p class="admin-urgent-status__title">حساب هنا يفتح لوحة الإدارة بس</p>
            <p style="font-size: var(--text-xs); color: var(--text-muted); margin: 2px 0 0; line-height: var(--leading-relaxed);">
              ما في صلاحية كتابة حقيقية على قاعدة البيانات (نشر/تعديل/حذف) إلا
              بتشغيل <code>scripts/admin/set-claims.js</code> يدويًا لحساب
              Google الحقيقي الخاص بالشخص — بعد ما يسجّل دخول بيه في التطبيق
              مرة واحدة. من غيرها، حيدخل اللوحة لكن أي حفظ حيفشل
              (permission-denied). التفاصيل في <code>scripts/admin/README.md</code>.
            </p>
          </div>
        </div>

        <button class="cta-button cta-button--full" data-action="compose-account">
          <i data-lucide="user-plus"></i>
          حساب جديد
        </button>
      </div>

      <div class="admin-content-list" id="admin-content-list">
        <div class="admin-content-preview" style="height:74px;"></div>
        <div class="admin-content-preview" style="height:74px;"></div>
      </div>

    </section>
  `;
}
export async function initAdminPermissions() {
const page = document.querySelector('.admin-permissions-page');
if (!page) return;
enhanceAdminPage(page);
if (ADMIN_AUTH_MODE === 'claims') {
const { navigateTo } = await import('../../core/router.js');
showToast('الصلاحيات هنا جايّة من حسابات جوجل (set-claims.js) — الصفحة دي معطّلة', 'error');
navigateTo('admin');
return;
}
if (!isDeveloperSession()) {
const { navigateTo } = await import('../../core/router.js');
showToast('الوصول للقسم دا لجلسة المطوّر بس', 'error');
navigateTo('admin');
return;
}
page.querySelector('[data-action="compose-account"]')?.addEventListener('click', () => {
_openComposeModal(() => _loadList(page));
});
await _loadList(page);
}
async function _loadList(page) {
const list = page.querySelector('#admin-content-list');
if (!list) return;
const currentAccountId = getAdminAccountId();
const accounts = getAdminAccounts();
if (!accounts.length) {
list.innerHTML = emptyState({
icon: 'user-cog',
title: 'لسع ما في حسابات مشرفين',
desc: 'كل الدخول حالياً عن طريق مفتاح الاسترجاع بس. افتح أول حساب من الزر الفوق.',
});
renderIcons();
return;
}
list.innerHTML = accounts.map(a => _renderRow(a, a.id === currentAccountId)).join('');
renderIcons();
list.querySelectorAll('[data-action="reset-password"]').forEach(btn => {
btn.addEventListener('click', () => _openResetModal(btn.dataset.id, btn.dataset.name));
});
list.querySelectorAll('[data-action="delete-account"]').forEach(btn => {
btn.addEventListener('click', async () => {
const isSelf = btn.dataset.id === currentAccountId;
const ok = await confirmAction({
title: isSelf ? 'حذف حسابك أنت؟' : 'حذف الحساب؟',
message: isSelf
? 'دا حسابك الذي دخلت بيه هسّع — حذفه حيقفل جلستك فوراً.'
: `حساب \"${btn.dataset.name}\" حيفقد الوصول فوراً.`,
confirmLabel: 'احذف الحساب',
danger: true,
icon: 'user-x',
});
if (!ok) return;
removeAdminAccount(btn.dataset.id);
showToast('الحساب اتمسح', 'success');
logAdminAction('حذف حساب مشرف', btn.dataset.name || String(btn.dataset.id));
if (isSelf) {
import('../../core/router.js').then(({ navigateTo }) => navigateTo('settings'));
return;
}
_loadList(page);
});
});
}
function _renderRow(account, isSelf) {
const roleLabel = account.role === 'developer' ? 'مطوّر' : account.role === 'nubian' ? 'مشرف آنداندي' : 'مشرف';
const chipClass = account.role === 'developer' ? 'admin-role-chip--developer' : account.role === 'nubian' ? 'admin-role-chip--nubian' : 'admin-role-chip--admin';
const dateLabel = new Date(account.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
return `
    <div class="admin-content-row">
      <div class="admin-content-preview">
        <div class="admin-content-preview__thumb"><i data-lucide="user"></i></div>
        <div class="admin-content-preview__body">
          <div class="admin-content-preview__head">
            <h4 class="admin-content-preview__title">${escapeHtml(account.name)}${isSelf ? ' (أنت)' : ''}</h4>
            <span class="admin-role-chip ${chipClass}">${roleLabel}</span>
          </div>
          <span class="admin-content-preview__meta">حساب من ${dateLabel}</span>
        </div>
      </div>
      <div class="admin-content-row__actions">
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="reset-password" data-id="${account.id}" data-name="${escapeHtml(account.name)}">
          <i data-lucide="key-round"></i><span>تصفير كلمة السر</span>
      </button>
        <button class="btn btn--sm btn--danger admin-action-btn" data-action="delete-account" data-id="${account.id}" data-name="${escapeHtml(account.name)}">
          <i data-lucide="trash-2"></i><span>حذف</span>
      </button>
      </div>
    </div>
  `;
}
function closeComposeModal() {
if (_cleanupModal) {
_cleanupModal();
_cleanupModal = null;
}
}
function _openComposeModal(onSuccess) {
closeComposeModal();
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="حساب مشرف جديد">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">حساب مشرف جديد</h3>
      </div>
      <div class="modal__body">

        <div class="input-group">
          <label class="input-label" for="admin-account-name">الاسم</label>
          <input class="input" type="text" id="admin-account-name" placeholder="مثال: أحمد — مشرف الأخبار" autocomplete="off">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-account-password">كلمة السر (٤ حروف/أرقام على الأقل)</label>
          <input class="input" type="text" id="admin-account-password" placeholder="اختار كلمة سر واضحة له" autocomplete="off">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-account-role">الدور</label>
          <select class="input" id="admin-account-role">
            <option value="admin">مشرف — أقسام المحتوى والتواصل فقط</option>
            <option value="nubian">مشرف آنداندي — قسم قاموس اللغة النوبية فقط</option>
            <option value="developer">مطوّر — وصول كامل (بما فيه قسم النظام)</option>
          </select>
        </div>

        <p class="input-error-msg hidden" id="admin-account-error"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="admin-account-cancel">إلغاء</button>
        <button class="btn btn--primary" id="admin-account-submit">إضافة الحساب</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
const nameEl     = backdrop.querySelector('#admin-account-name');
const passwordEl = backdrop.querySelector('#admin-account-password');
const roleEl     = backdrop.querySelector('#admin-account-role');
const errorEl    = backdrop.querySelector('#admin-account-error');
const submitBtn  = backdrop.querySelector('#admin-account-submit');
const close = () => { backdrop.remove(); _cleanupModal = null; };
const submit = async () => {
errorEl.classList.add('hidden');
submitBtn.disabled = true;
submitBtn.textContent = 'قاعدين نضيف...';
try {
await addAdminAccount({
name: nameEl.value,
password: passwordEl.value,
role: roleEl.value,
});
showToast('الحساب اتفتح', 'success');
logAdminAction('فتح حساب مشرف', `${nameEl.value} (${roleEl.value})`);
close();
onSuccess?.();
} catch (err) {
errorEl.textContent = err.message || 'الإضافة لسع ما تمت';
errorEl.classList.remove('hidden');
submitBtn.disabled = false;
submitBtn.textContent = 'إضافة الحساب';
}
};
backdrop.querySelector('#admin-account-cancel').addEventListener('click', close);
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
backdrop.querySelector('#admin-account-submit').addEventListener('click', submit);
nameEl.focus();
_cleanupModal = close;
}
function _openResetModal(id, name) {
closeComposeModal();
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="تصفير كلمة السر">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">تصفير كلمة سر "${escapeHtml(name)}"</h3>
      </div>
      <div class="modal__body">
        <div class="input-group">
          <label class="input-label" for="admin-reset-password">كلمة السر الجديدة (٤ حروف/أرقام على الأقل)</label>
          <input class="input" type="text" id="admin-reset-password" placeholder="كلمة سر جديدة" autocomplete="off">
        </div>
        <p class="input-error-msg hidden" id="admin-reset-error"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="admin-reset-cancel">إلغاء</button>
        <button class="btn btn--primary" id="admin-reset-submit">حفظ كلمة السر</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
const passwordEl = backdrop.querySelector('#admin-reset-password');
const errorEl    = backdrop.querySelector('#admin-reset-error');
const submitBtn  = backdrop.querySelector('#admin-reset-submit');
const close = () => { backdrop.remove(); _cleanupModal = null; };
const submit = async () => {
errorEl.classList.add('hidden');
submitBtn.disabled = true;
submitBtn.textContent = 'قاعدين نحفظ...';
try {
await resetAdminAccountPassword(id, passwordEl.value);
showToast('كلمة السر اتغيّرت', 'success');
logAdminAction('تغيير كلمة سر مشرف', name);
close();
} catch (err) {
errorEl.textContent = err.message || 'التغيير لسع ما تم';
errorEl.classList.remove('hidden');
submitBtn.disabled = false;
submitBtn.textContent = 'حفظ كلمة السر';
}
};
backdrop.querySelector('#admin-reset-cancel').addEventListener('click', close);
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
backdrop.querySelector('#admin-reset-submit').addEventListener('click', submit);
passwordEl.focus();
_cleanupModal = close;
}
