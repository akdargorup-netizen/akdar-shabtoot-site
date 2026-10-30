import { getInboxMessages, markInboxMessageReviewed, deleteInboxMessage, publishUrgentAnnouncement, unpublishUrgentAnnouncement, getUrgentAnnouncementStatus, getContactRecipients, setContactRecipients } from '../../data/db.js';
import { emptyState } from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { showToast } from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { canHardDelete, confirmDelete, enhanceAdminPage, rowTitle } from '../../shared/admin-ui.js';
const TYPE_META = {
contribution:  { label: 'مساهمة توثيق', icon: 'book-open' },
error_report:  { label: 'بلاغ خطأ',      icon: 'flag' },
join_request:  { label: 'طلب انضمام',    icon: 'user-plus' },
course_request: { label: 'طلب كورس من الأمانة', icon: 'graduation-cap' },
blood_donor_request:     { label: 'طلب متبرع بالدم',        icon: 'droplet' },
medical_donation_request: { label: 'إعلان جمع تبرعات',      icon: 'hand-coins' },
};
const PUBLISHABLE_TYPES = {
blood_donor_request:      'blood_donor',
medical_donation_request: 'medical_donation',
};
let _activeFilter = '';
export function renderAdminInbox() {
return `
    <section class="page admin-inbox-page">

      <div class="admin-content-toolbar">
        <p>
          مساهمات التوثيق وبلاغات الأخطاء وطلبات متبرعي الدم وإعلانات
          جمع التبرعات التي أرسلها الأهالي من التطبيق. الرد الفعلي على
          مساهمات التوثيق/بلاغات الأخطاء يوصل ليك على واتساب/إيميل كما
          هو — وطلبات الدم والتبرعات لازم تُنشر يدويًا كإعلان (خبر/إشعار)
          بعد التأكد من صحتها. هنا سجل مراجعة تقدر تعلّم عليه "خلصت
          المراجعة" أو تحذفه.
        </p>
      </div>

      <div id="admin-inbox-urgent-status"></div>

      <!-- جهات الاستلام: رقم واتساب "ساهم في التوثيق" + بريد "الإبلاغ عن خطأ" -->
      <div class="admin-recipients-card" id="admin-inbox-recipients"></div>

      <div class="admin-content-filters">
        <select class="input" id="admin-inbox-filter-type">
          <option value="">كل الأنواع</option>
          <option value="contribution">مساهمات توثيق</option>
          <option value="error_report">بلاغات أخطاء</option>
          <option value="join_request">طلبات انضمام</option>
          <option value="course_request">طلبات كورس الأمانة الأكاديمية</option>
          <option value="blood_donor_request">طلبات متبرعين بالدم</option>
          <option value="medical_donation_request">إعلانات جمع تبرعات</option>
        </select>
      </div>

      <div class="admin-content-list" id="admin-content-list">
        <div class="admin-content-preview" style="height:74px;"></div>
        <div class="admin-content-preview" style="height:74px;"></div>
      </div>

    </section>
  `;
}
export async function initAdminInbox() {
const page = document.querySelector('.admin-inbox-page');
if (!page) return;
enhanceAdminPage(page);
page.querySelector('#admin-inbox-filter-type')?.addEventListener('change', (e) => {
_activeFilter = e.target.value;
_loadList(page);
});
await Promise.all([_loadList(page), _loadUrgentStatus(page), _loadRecipients(page)]);
}
async function _loadRecipients(page) {
const slot = page.querySelector('#admin-inbox-recipients');
if (!slot) return;
const r = await getContactRecipients().catch(() => null);
if (!r) { slot.innerHTML = ''; return; }
slot.innerHTML = `
    <h4 class="admin-recipients-card__title"><i data-lucide="send"></i> جهات الاستلام</h4>
    <div class="input-group">
      <label class="input-label" for="recipient-whatsapp">رقم واتساب مساهمات التوثيق</label>
      <input class="input" type="tel" inputmode="numeric" dir="ltr" id="recipient-whatsapp" placeholder="249xxxxxxxxx" value="${escapeHtml(r.contributionWhatsapp || '')}">
      <span class="input-hint">بصيغة دولية بدون + أو مسافات (مثال: 249912345678)</span>
    </div>
    <div class="input-group">
      <label class="input-label" for="recipient-email">بريد بلاغات الأخطاء</label>
      <input class="input" type="email" dir="ltr" id="recipient-email" placeholder="name@example.com" value="${escapeHtml(r.reportEmail || '')}">
    </div>
    <p class="input-error-msg hidden" id="recipient-error"></p>
    <button class="btn btn--primary btn--full" id="recipient-save">حفظ المستلمين</button>
  `;
renderIcons(slot);
const errorEl = slot.querySelector('#recipient-error');
slot.querySelector('#recipient-save').addEventListener('click', async (e) => {
const btn = e.currentTarget;
const phone = slot.querySelector('#recipient-whatsapp').value.replace(/\D/g, '');
const email = slot.querySelector('#recipient-email').value.trim();
if (phone.length < 8 || phone.length > 15) {
errorEl.textContent = 'رقم الواتساب غير صحيح — اكتبه بصيغة دولية بدون + أو مسافات';
errorEl.classList.remove('hidden');
return;
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
errorEl.textContent = 'البريد الإلكتروني غير صحيح';
errorEl.classList.remove('hidden');
return;
}
errorEl.classList.add('hidden');
btn.disabled = true;
try {
await setContactRecipients({ contributionWhatsapp: phone, reportEmail: email });
showToast('المستلمين اتحفظوا', 'success');
logAdminAction('تغيير جهات استلام المساهمات والبلاغات', `${phone} / ${email}`);
} catch (err) {
console.error('[AdminInbox] فشل حفظ المستلمين:', err);
errorEl.textContent = 'الحفظ لسع ما تم — حاول مرة أخرى';
errorEl.classList.remove('hidden');
} finally {
btn.disabled = false;
}
});
}
async function _loadUrgentStatus(page) {
const slot = page.querySelector('#admin-inbox-urgent-status');
if (!slot) return;
const status = await getUrgentAnnouncementStatus().catch(() => null);
const isLive = status?.active && new Date(status.expiresAt) > new Date();
if (!isLive) {
slot.innerHTML = '';
return;
}
const expiresLabel = new Date(status.expiresAt).toLocaleString('ar-EG', {
day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
});
slot.innerHTML = `
    <div class="admin-urgent-status">
      <i data-lucide="siren"></i>
      <div class="admin-urgent-status__body">
        <p class="admin-urgent-status__title">نداء عاجل شغال هسّع: ${escapeHtml(status.title)}</p>
        <p class="admin-urgent-status__meta">ينتهي تلقائيًا ${expiresLabel}</p>
      </div>
      <button class="btn btn--sm btn--danger" id="admin-urgent-unpublish">إيقاف النداء</button>
    </div>
  `;
renderIcons(slot);
slot.querySelector('#admin-urgent-unpublish')?.addEventListener('click', async () => {
await unpublishUrgentAnnouncement();
showToast('النداء اتوقف', 'success');
logAdminAction('إيقاف نداء عاجل', status.title);
_loadUrgentStatus(page);
});
}
async function _loadList(page) {
const list = page.querySelector('#admin-content-list');
if (!list) return;
try {
const items = await getInboxMessages(_activeFilter ? { type: _activeFilter } : {});
if (!items.length) {
list.innerHTML = emptyState({
icon: 'inbox',
title: 'مافي رسائل واردة',
desc: 'أي مساهمة أو بلاغ خطأ من صفحة التواصل حيظهر هنا.',
});
renderIcons();
return;
}
const itemsById = new Map(items.map(i => [String(i.id), i]));
list.innerHTML = items.map(_renderRow).join('');
renderIcons();
list.querySelectorAll('[data-action="view-message"]').forEach(el => {
const open = () => {
const item = itemsById.get(String(el.dataset.id));
if (item) _openMessageModal(item);
};
el.addEventListener('click', open);
el.addEventListener('keydown', e => {
if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
});
});
list.querySelectorAll('[data-action="review-message"]').forEach(btn => {
btn.addEventListener('click', async () => {
await markInboxMessageReviewed(btn.dataset.id);
showToast('اتعلّمت كمراجعة', 'success');
logAdminAction('تعليم رسالة واردة كمُراجَعة', btn.dataset.title || String(btn.dataset.id));
await _loadList(page);
});
});
list.querySelectorAll('[data-action="delete-message"]').forEach(btn => {
btn.addEventListener('click', async () => {
if (!await confirmDelete({ what: 'الرسالة', name: rowTitle(btn) })) return;
await deleteInboxMessage(btn.dataset.id);
showToast('الرسالة اتمسحت', 'success');
logAdminAction('حذف رسالة واردة', btn.dataset.title || String(btn.dataset.id));
await _loadList(page);
});
});
} catch (err) {
console.error('[AdminInbox] فشل التحميل:', err);
list.innerHTML = errorState({ subject: 'الرسائل' });
renderIcons(list);
bindErrorRetry(list, () => _loadList(page));
}
}
function _renderRow(item) {
const meta = TYPE_META[item.type] || { label: item.type, icon: 'mail' };
const dateLabel = new Date(item.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
const isNew = item.status === 'new';
return `
    <div class="admin-content-row">
      <div class="admin-content-preview" data-action="view-message" data-id="${item.id}" role="button" tabindex="0">
        <div class="admin-content-preview__thumb"><i data-lucide="${meta.icon}"></i></div>
        <div class="admin-content-preview__body">
          <div class="admin-content-preview__head">
            <h4 class="admin-content-preview__title">${escapeHtml(item.body)}</h4>
            <span class="badge ${isNew ? 'badge--warning' : 'badge--default'}">${isNew ? 'جديدة' : 'خلصت المراجعة'}</span>
          </div>
          <span class="admin-content-preview__meta">
            ${meta.label} · ${escapeHtml(item.authorName || 'زائر')} · ${dateLabel}
          </span>
        </div>
      </div>
      <div class="admin-content-row__actions">
        ${isNew ? `
          <button class="btn btn--sm btn--ghost admin-action-btn" data-action="review-message" data-id="${item.id}" data-title="${escapeHtml((item.body || '').slice(0, 40))}">
            <i data-lucide="check"></i><span>تمت المراجعة</span>
      </button>
        ` : ''}
        ${canHardDelete() ? `<button class="btn btn--sm btn--danger admin-action-btn" data-action="delete-message" data-id="${item.id}" data-title="${escapeHtml((item.body || '').slice(0, 40))}">
          <i data-lucide="trash-2"></i><span>حذف</span>
      </button>` : ''}
      </div>
    </div>
  `;
}
function _openMessageModal(item) {
const meta = TYPE_META[item.type] || { label: item.type, icon: 'mail' };
const dateLabel = new Date(item.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
const isNew = item.status === 'new';
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(meta.label)}">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">${escapeHtml(meta.label)}</h3>
        <span class="badge ${isNew ? 'badge--warning' : 'badge--default'}">${isNew ? 'جديدة' : 'خلصت المراجعة'}</span>
      </div>
      <div class="modal__body">
        <p class="admin-inbox-detail__meta">
          <i data-lucide="user"></i>
          ${escapeHtml(item.authorName || 'زائر')}
          <span class="admin-inbox-detail__meta-dot">·</span>
          ${dateLabel}
        </p>
        <p class="admin-inbox-detail__body">${escapeHtml(item.body)}</p>
      </div>
      <div class="modal__footer">
        ${PUBLISHABLE_TYPES[item.type] ? `
          <button class="btn btn--primary" id="inbox-detail-publish"><i data-lucide="siren"></i>نشر كنداء عاجل</button>
        ` : ''}
        ${isNew ? `<button class="btn btn--ghost" id="inbox-detail-review"><i data-lucide="check"></i>خلصت المراجعة</button>` : ''}
        ${canHardDelete() ? `<button class="btn btn--danger" id="inbox-detail-delete"><i data-lucide="trash-2"></i>حذف</button>` : ''}
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
const close = () => backdrop.remove();
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
backdrop.querySelector('#inbox-detail-publish')?.addEventListener('click', () => {
close();
_openPublishModal(item);
});
backdrop.querySelector('#inbox-detail-review')?.addEventListener('click', async () => {
await markInboxMessageReviewed(item.id);
showToast('اتعلّمت كمراجعة', 'success');
logAdminAction('تعليم رسالة واردة كمُراجَعة', (item.body || '').slice(0, 40));
close();
const page = document.querySelector('.admin-inbox-page');
if (page) _loadList(page);
});
backdrop.querySelector('#inbox-detail-delete')?.addEventListener('click', async () => {
if (!await confirmDelete({ what: 'الرسالة', name: (item.body || '').slice(0, 40) })) return;
await deleteInboxMessage(item.id);
showToast('الرسالة اتمسحت', 'success');
logAdminAction('حذف رسالة واردة', (item.body || '').slice(0, 40));
close();
const page = document.querySelector('.admin-inbox-page');
if (page) _loadList(page);
});
}
function _openPublishModal(item) {
const type = PUBLISHABLE_TYPES[item.type];
const suggestedTitle = item.type === 'blood_donor_request'
? 'محتاج متبرع بالدم — عاجل'
: 'حالة مرضية مستعجلة — محتاجين تبرعكم';
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="نشر نداء عاجل">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">نشر كنداء إنساني عاجل</h3>
      </div>
      <div class="modal__body">
        <p class="input-hint" style="margin-bottom: var(--space-3);">
          حيظهر مؤقتًا في الرئيسية والأخبار وبيت المناسبات، ويوجّه المستخدمين لصفحة الطوارئ والصحة.
        </p>
        <div class="input-group">
          <label class="input-label" for="urgent-title">عنوان مختصر وواضح</label>
          <input class="input" type="text" id="urgent-title" maxlength="80" value="${escapeHtml(suggestedTitle)}">
        </div>
        <div class="input-group">
          <label class="input-label" for="urgent-body">التفاصيل (حتظهر كاملة كما هي)</label>
          <textarea class="input" id="urgent-body" rows="4">${escapeHtml(item.body)}</textarea>
        </div>
        <div class="input-group">
          <label class="input-label" for="urgent-duration">مدة ظهور النداء</label>
          <select class="input" id="urgent-duration">
            <option value="6">6 ساعات</option>
            <option value="12">12 ساعة</option>
            <option value="24" selected>يوم واحد (24 ساعة)</option>
            <option value="48">يومين (48 ساعة)</option>
            <option value="72">3 أيام (72 ساعة)</option>
          </select>
        </div>
        <p class="input-error-msg hidden" id="urgent-error"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="urgent-cancel">إلغاء</button>
        <button class="btn btn--primary" id="urgent-submit"><i data-lucide="siren"></i>نشر النداء</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
const close = () => backdrop.remove();
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
backdrop.querySelector('#urgent-cancel').addEventListener('click', close);
const titleEl    = backdrop.querySelector('#urgent-title');
const bodyEl      = backdrop.querySelector('#urgent-body');
const durationEl  = backdrop.querySelector('#urgent-duration');
const errorEl     = backdrop.querySelector('#urgent-error');
const submitBtn   = backdrop.querySelector('#urgent-submit');
submitBtn.addEventListener('click', async () => {
errorEl.classList.add('hidden');
submitBtn.disabled = true;
submitBtn.textContent = 'قاعدين ننشر...';
try {
await publishUrgentAnnouncement({
type,
title: titleEl.value,
body: bodyEl.value,
durationHours: Number(durationEl.value),
sourceMessageId: item.id,
});
showToast('النداء العاجل اتنشر', 'success');
logAdminAction('نشر نداء عاجل', titleEl.value);
close();
const page = document.querySelector('.admin-inbox-page');
if (page) _loadUrgentStatus(page);
} catch (err) {
errorEl.textContent = err.message || 'النداء لسع ما اتنشر';
errorEl.classList.remove('hidden');
submitBtn.disabled = false;
submitBtn.innerHTML = '<i data-lucide="siren"></i>نشر النداء';
renderIcons(submitBtn);
}
});
}
