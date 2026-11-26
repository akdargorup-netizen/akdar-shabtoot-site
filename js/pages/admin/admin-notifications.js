import {
getNotifications,
addNotification,
updateNotification,
deleteNotification,
setNotificationArchiveState,
purgeArchivedContent,
} from '../../data/db.js';
import { NOTIFICATION_TYPES } from '../../data/local-data.js';
import { emptyState }         from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { showToast }          from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { refreshNotifBadge }  from '../../shared/notif-badge.js';
import { getDeviceId }        from '../../shared/device-id.js';
import { sendPush }           from '../../shared/push.js';
import { isAdmin, isOwner }   from '../../data/auth.js';
import { isDeveloperSession } from '../../data/admin-auth.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { canHardDelete, confirmDelete, confirmPurge, enhanceAdminPage, rowTitle } from '../../shared/admin-ui.js';
import { RUNTIME_CONFIG } from '../../data/runtime-config.js';
let _cleanupModal = null;
const PUSH_KEY_STORAGE = 'akdar_push_key';
function _readPushKey() {
try { return sessionStorage.getItem(PUSH_KEY_STORAGE) || ''; } catch { return ''; }
}
function _writePushKey(key) {
try {
if (key) sessionStorage.setItem(PUSH_KEY_STORAGE, key);
else sessionStorage.removeItem(PUSH_KEY_STORAGE);
} catch {   }
}
function _pushFailMessage(reason, status) {
const saved = ' — الرسالة اتحفظت داخل التطبيق بس';
if (reason === 'github-error') {
if (status === 401 || status === 403) return `GitHub رفض التوكن (${status}): انتهت صلاحيته أو ينقصه إذن Contents: Read and write${saved}`;
if (status === 404) return `GitHub ما لقى الريبو (404): تأكد أن التوكن مخصّص لريبو akdar-shabtoot${saved}`;
return `GitHub رجّع خطأ (${status ?? '؟'})${saved}`;
}
if (reason === 'token-not-configured') return `السر GITHUB_DISPATCH_TOKEN غير مضاف في Supabase${saved}`;
if (reason === 'network-error') return `ما قدرنا نوصل لدالة Supabase (النت أو CORS)${saved}`;
if (reason === 'unauthorized') return 'مفتاح الإرسال غلط أو الحساب بدون صلاحية admin — الرسالة اتحفظت داخل التطبيق بس، ما اترسلت كإشعار';
if (reason === 'token-required') return 'الإرسال كإشعار يتطلب الدخول بحساب مشرف (admin) — مفتاح الإرسال القديم اتقفل — الرسالة اتحفظت داخل التطبيق بس';
if (reason === 'key-not-configured') return 'مفتاح الإرسال لسع ما اتظبط على السيرفر — الرسالة اتحفظت داخل التطبيق بس';
return `الرسالة اتحفظت داخل التطبيق، لكن ما اترسلت كإشعار للأجهزة (${reason || 'غير معروف'}${status ? ' ' + status : ''})`;
}
export function renderAdminNotifications() {
if (!isDeveloperSession()) {
return `<section class="page admin-notif-page"><p class="admin-content-toolbar">إرسال الرسائل متاح للمطوّر فقط.</p></section>`;
}
return `
    <section class="page admin-notif-page">

      <div class="admin-content-toolbar">
        <p>
          من هنا بتتحكم في كل رسالة توصل للأهالي — خبر، مناسبة، أو
          رسالة مجتمع زي التبريك والتعازي. الإرسال فوري ويظهر
          في شارة الرسائل لكل المستخدمين مباشرة. الرسائل التي تجاوزت ٤٥ يوم
          بتتأرشف تلقائياً (تختفي من خلاصة الأهالي بس تفضل هنا) — تقدر
          تؤرشف رسالة فوراً أو تستعيدها يدوياً.
        </p>
        <button class="cta-button cta-button--full" data-action="compose-notif">
          <i data-lucide="plus"></i>
          رسالة جديدة
        </button>
      </div>

      <div class="admin-content-list" id="admin-content-list">
        <div class="notification-item notification-item--skeleton"></div>
        <div class="notification-item notification-item--skeleton"></div>
      </div>

      ${canHardDelete() ? `<div style="padding: var(--space-2) var(--spacing-page-x) 0;">
        <button class="btn btn--ghost btn--sm btn--full" data-action="purge-archived-notifs">
          <i data-lucide="trash-2"></i>
          حذف كل الرسائل المؤرشفة نهائياً
        </button>
      </div>` : ''}

    </section>
  `;
}
export async function initAdminNotifications() {
const page = document.querySelector('.admin-notif-page');
if (!page || !isDeveloperSession()) return;
enhanceAdminPage(page);
page.querySelector('[data-action="compose-notif"]')?.addEventListener('click', () => {
_openComposeModal(null, () => _loadList(page));
});
page.querySelector('[data-action="purge-archived-notifs"]')?.addEventListener('click', async () => {
if (!await confirmPurge({ what: 'الرسائل المؤرشفة' })) return;
const { notifications } = await purgeArchivedContent('notifications');
showToast(notifications ? `اتمسحت ${notifications} رسالة من الأرشيف` : 'ما في رسائل مؤرشفة هسع', 'success');
if (notifications) logAdminAction('إفراغ أرشيف الرسائل', `${notifications} رسالة`);
refreshNotifBadge();
await _loadList(page);
});
await _loadList(page);
}
async function _loadList(page) {
const list = page.querySelector('#admin-content-list');
if (!list) return;
try {
const items = await getNotifications({ includeArchived: true });
if (!items.length) {
list.innerHTML = emptyState({
icon: 'bell-off',
title: 'لسع ما في رسائل مُرسلة',
desc: 'ابدأ بإرسال أول رسالة للأهالي.',
});
renderIcons();
return;
}
list.innerHTML = items.map(_renderRow).join('');
renderIcons();
list.querySelectorAll('[data-action="edit-notif"]').forEach(btn => {
btn.addEventListener('click', () => {
const item = items.find(n => String(n.id) === btn.dataset.id);
if (item) _openComposeModal(item, () => _loadList(page));
});
});
list.querySelectorAll('[data-action="toggle-archive-notif"]').forEach(btn => {
btn.addEventListener('click', async () => {
const nextState = btn.dataset.archived === '1' ? 'restored' : 'archived';
await setNotificationArchiveState(btn.dataset.id, nextState);
showToast(nextState === 'archived' ? 'الرسالة اترشفت' : 'رجعت الرسالة من الأرشيف', 'success');
logAdminAction(nextState === 'archived' ? 'أرشفة رسالة' : 'استعادة رسالة من الأرشيف', btn.dataset.title || String(btn.dataset.id));
refreshNotifBadge();
await _loadList(page);
});
});
list.querySelectorAll('[data-action="delete-notif"]').forEach(btn => {
btn.addEventListener('click', async () => {
if (!await confirmDelete({ what: 'الرسالة', name: rowTitle(btn) })) return;
await deleteNotification(btn.dataset.id);
showToast('اتمسحت الرسالة', 'success');
logAdminAction('حذف رسالة', btn.dataset.title || String(btn.dataset.id));
refreshNotifBadge();
await _loadList(page);
});
});
} catch (err) {
console.error('[AdminNotifications] فشل التحميل:', err);
list.innerHTML = errorState({ subject: 'الرسائل' });
renderIcons(list);
bindErrorRetry(list, () => _loadList(page));
}
}
function _renderRow(item) {
const type = NOTIFICATION_TYPES.find(t => t.key === item.type) || NOTIFICATION_TYPES.find(t => t.key === 'system');
return `
    <div class="admin-content-row${item.archived ? ' admin-content-row--archived' : ''}">
      <div class="notification-item ${item.read ? '' : 'unread'}" data-type="${type.key}">
        <div class="notification-icon" data-lucide="${type.icon}"></div>
        <div class="notification-content">
          <div class="notification-content__head">
            <h4 class="notification-title">${escapeHtml(item.title || 'رسالة')}</h4>
            <span class="notification-chip">${type.label}</span>
            ${item.devOnly ? '<span class="notification-chip notification-chip--dev">تجريبية — تظهر ليك بس</span>' : ''}
            ${item.archived ? '<span class="notification-chip">مؤرشفة</span>' : ''}
          </div>
          <p class="notification-text">${escapeHtml(item.body || '')}</p>
          <span class="notification-time">${item.date || ''}</span>
        </div>
      </div>
      <div class="admin-content-row__actions">
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="edit-notif" data-id="${item.id}">
          <i data-lucide="pencil"></i><span>تعديل</span>
      </button>
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="toggle-archive-notif" data-id="${item.id}" data-title="${escapeHtml(item.title || '')}" data-archived="${item.archived ? '1' : '0'}">
          <i data-lucide="${item.archived ? 'archive-restore' : 'archive'}"></i><span>${item.archived ? 'استعادة' : 'أرشفة'}</span>
      </button>
        ${canHardDelete() ? `<button class="btn btn--sm btn--danger admin-action-btn" data-action="delete-notif" data-id="${item.id}" data-title="${escapeHtml(item.title || '')}">
          <i data-lucide="trash-2"></i><span>حذف</span>
      </button>` : ''}
      </div>
    </div>
  `;
}
function _openComposeModal(existing, onSuccess) {
closeComposeModal();
const isEdit = Boolean(existing);
const typesHtml = NOTIFICATION_TYPES.filter(t => !t.personal).map(t => `
    <label class="admin-type-option${(existing?.type || 'news') === t.key ? ' is-selected' : ''}">
      <input type="radio" name="notif-type" value="${t.key}" ${(existing?.type || 'news') === t.key ? 'checked' : ''}>
      <i data-lucide="${t.icon}"></i>
      <span>${t.label}</span>
    </label>
  `).join('');
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${isEdit ? 'تعديل رسالة' : 'رسالة جديدة'}">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">${isEdit ? 'تعديل الرسالة' : 'رسالة جديدة'}</h3>
      </div>
      <div class="modal__body">

        <div class="input-group">
          <label class="input-label">التصنيف</label>
          <div class="admin-type-grid" id="admin-type-grid">${typesHtml}</div>
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-notif-title">العنوان</label>
          <input class="input" type="text" id="admin-notif-title" maxlength="100" placeholder="مثال: نداء تكافل" value="${existing?.title ? escapeHtml(existing.title) : ''}">
        </div>

        <div class="input-group">
          <label class="input-label" for="admin-notif-body">نص الرسالة</label>
          <textarea class="input" id="admin-notif-body" rows="3" maxlength="400" placeholder="اكتب رسالة واضحة ومختصرة...">${existing?.body ? escapeHtml(existing.body) : ''}</textarea>
        </div>

        <div class="admin-toggle-row">
          <span>رسالة تجريبية (تظهر ليك بس على هذا الجهاز)</span>
          <input type="checkbox" id="admin-notif-dev-only" ${existing?.devOnly ? 'checked' : ''}>
        </div>
        <p class="input-hint">مفيدة لتجرّب شكل الرسالة قبل الإرسال الفعلي للأهالي — ما حتوصل لأي مستخدم تاني.</p>

        ${isEdit || !RUNTIME_CONFIG.enableRemoteNotifications ? '' : `
        <div class="input-group">
          <label class="input-label" for="admin-notif-key">مفتاح الإرسال (للإشعار على الأجهزة)</label>
          <input class="input" type="password" id="admin-notif-key" autocomplete="off" value="${escapeHtml(_readPushKey())}" placeholder="اتركه فاضي لحفظ الرسالة داخل التطبيق بس">
          <p class="input-hint">لو أنت مسجّل بحساب مشرف (admin) ما تحتاج المفتاح. من غير الاثنين الرسالة بتظهر جوّا التطبيق بس، وما بتوصل كإشعار على شاشة القفل.</p>
        </div>`}

        <p class="input-error-msg hidden" id="admin-notif-error"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="admin-notif-cancel">إلغاء</button>
        <button class="btn btn--primary" id="admin-notif-submit">${isEdit ? 'حفظ التعديلات' : 'إرسال الآن'}</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
const grid      = backdrop.querySelector('#admin-type-grid');
const titleEl   = backdrop.querySelector('#admin-notif-title');
const bodyEl    = backdrop.querySelector('#admin-notif-body');
const devOnlyEl = backdrop.querySelector('#admin-notif-dev-only');
const keyEl     = backdrop.querySelector('#admin-notif-key');
const errorEl   = backdrop.querySelector('#admin-notif-error');
const submitBtn = backdrop.querySelector('#admin-notif-submit');
grid.querySelectorAll('.admin-type-option').forEach(opt => {
opt.addEventListener('click', () => {
grid.querySelectorAll('.admin-type-option').forEach(o => o.classList.remove('is-selected'));
opt.classList.add('is-selected');
});
});
const close = () => { backdrop.remove(); _cleanupModal = null; };
const submit = async () => {
const title = titleEl.value.trim();
const body  = bodyEl.value.trim();
const typeKey = grid.querySelector('input[name="notif-type"]:checked')?.value || 'news';
if (!title || !body) {
errorEl.textContent = 'لو سمحت اكتب عنوان ونص الرسالة';
errorEl.classList.remove('hidden');
return;
}
errorEl.classList.add('hidden');
const type = NOTIFICATION_TYPES.find(t => t.key === typeKey);
const devOnly = Boolean(devOnlyEl?.checked);
submitBtn.disabled = true;
submitBtn.textContent = isEdit ? 'قاعدين نحفظ...' : 'قاعدين نبعت...';
try {
if (isEdit) {
await updateNotification(existing.id, {
title, body, type: typeKey, page: type?.page || '',
devOnly, devSessionId: devOnly ? getDeviceId() : null,
});
showToast('التعديلات اتحفظت', 'success');
logAdminAction('تعديل رسالة', title);
} else {
await addNotification({
title, body, type: typeKey, page: type?.page || '',
...(devOnly ? { devOnly: true, devSessionId: getDeviceId() } : {}),
});
const pushKey = keyEl?.value.trim() || '';
_writePushKey(pushKey);
if (RUNTIME_CONFIG.enableRemoteNotifications && !devOnly && (pushKey || isAdmin() || isOwner())) {
sendPush({ title, body, page: type?.page || '', type: typeKey }, pushKey).then(result => {
if (result.sent) return;
if (result.reason === 'unauthorized') _writePushKey('');
showToast(_pushFailMessage(result.reason, result.status), 'error');
});
}
showToast(
devOnly ? 'اترسلت تجريبي — بتظهر ليك بس'
: !RUNTIME_CONFIG.enableRemoteNotifications ? 'اتحفظت محليًا — الإرسال الخارجي معطّل في وضع التطوير'
: (pushKey || isAdmin() || isOwner()) ? 'اترسلت الرسالة لأهل البلد'
: 'اتحفظت جوّا التطبيق بس — ما اترسلت كإشعار (ما في مفتاح إرسال ولا حساب مشرف)',
'success'
);
logAdminAction(devOnly ? 'إرسال رسالة تجريبية' : 'إرسال رسالة لأهل البلد', title);
}
refreshNotifBadge();
close();
onSuccess?.();
} catch (err) {
console.error('[AdminNotifications] فشل الحفظ:', err);
submitBtn.disabled = false;
submitBtn.textContent = isEdit ? 'حفظ التعديلات' : 'إرسال الآن';
errorEl.textContent = 'الحفظ لسع ما تم — حاول مرة أخرى';
errorEl.classList.remove('hidden');
}
};
backdrop.querySelector('#admin-notif-cancel').addEventListener('click', close);
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
