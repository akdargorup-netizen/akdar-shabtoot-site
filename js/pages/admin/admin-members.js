import { getMembers, setMemberModeration, formatRelativeTime } from '../../data/db.js';
import { emptyState } from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { showToast } from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { confirmAction, enhanceAdminPage } from '../../shared/admin-ui.js';
let _cleanupModal = null;
export function renderAdminMembers() {
return `
    <section class="page admin-members-page">

      <div class="admin-content-toolbar">
        <p>
          الأعضاء هنا مكتشَفون من نشاطهم الفعلي (أفكار، مناسبات،
          تعليقات) — ما في تسجيل مسبق. تقدر تحظر عضو حظرًا كاملاً
          (يقفل عليه التطبيق بالكامل)، أو حظرًا جزئيًا (يتصفح بس
          ممنوع من التعليق والمشاركة)، أو ترفع الحظر في أي وقت.
        </p>
      </div>

      <div class="admin-stats-row" id="admin-members-stats" aria-live="polite"></div>

      <div class="admin-content-list" id="admin-content-list">
        <div class="admin-content-preview" style="height:74px;"></div>
        <div class="admin-content-preview" style="height:74px;"></div>
      </div>

    </section>
  `;
}
function _renderStats(members) {
const total   = members.length;
const full    = members.filter(m => m.status === 'banned-full').length;
const partial = members.filter(m => m.status === 'banned-partial').length;
const active  = total - full - partial;
const cell = (value, label) => `
    <div class="admin-stat">
      <span class="admin-stat__value">${value}</span>
      <span class="admin-stat__label">${label}</span>
    </div>
  `;
return `
    ${cell(total, 'إجمالي الأعضاء')}
    ${cell(active, 'نشط')}
    ${cell(partial, 'محظور جزئيًا')}
    ${cell(full, 'محظور كليًا')}
  `;
}
export async function initAdminMembers() {
const page = document.querySelector('.admin-members-page');
if (!page) return;
enhanceAdminPage(page);
await _loadList(page);
}
async function _loadList(page) {
const list = page.querySelector('#admin-content-list');
if (!list) return;
try {
const members = await getMembers();
const statsBar = page.querySelector('#admin-members-stats');
if (statsBar) statsBar.innerHTML = _renderStats(members);
if (!members.length) {
list.innerHTML = emptyState({
icon: 'users',
title: 'لسع ما في أعضاء',
desc: 'أول ما زول ينشر فكرة أو مناسبة أو يعلّق، حيظهر هنا.',
});
renderIcons();
return;
}
list.innerHTML = members.map(_renderRow).join('');
renderIcons();
list.querySelectorAll('[data-action="ban-full"]').forEach(btn => {
btn.addEventListener('click', () => _openBanModal(btn.dataset.uid, btn.dataset.name, 'banned-full', () => _loadList(page)));
});
list.querySelectorAll('[data-action="ban-partial"]').forEach(btn => {
btn.addEventListener('click', () => _openBanModal(btn.dataset.uid, btn.dataset.name, 'banned-partial', () => _loadList(page)));
});
list.querySelectorAll('[data-action="unban"]').forEach(btn => {
btn.addEventListener('click', () => _unban(btn.dataset.uid, btn.dataset.name, () => _loadList(page)));
});
} catch (err) {
console.error('[AdminMembers] فشل تحميل الأعضاء:', err);
const statsBar = page.querySelector('#admin-members-stats');
if (statsBar) statsBar.innerHTML = '';
list.innerHTML = errorState({ subject: 'قائمة الأعضاء' });
renderIcons();
bindErrorRetry(list, () => _loadList(page));
}
}
function _statusMeta(status) {
if (status === 'banned-full')    return { label: 'محظور كليًا',  chipClass: 'badge--error' };
if (status === 'banned-partial') return { label: 'محظور جزئيًا', chipClass: 'badge--warning' };
return { label: 'نشط', chipClass: 'badge--default' };
}
function _renderRow(member) {
const meta = _statusMeta(member.status);
const nameSafe = escapeHtml(member.displayName);
const lastActive = member.lastActiveAt ? formatRelativeTime(member.lastActiveAt) : '—';
const actions = member.status === 'active'
? `
      <button class="btn btn--sm btn--ghost admin-action-btn" data-action="ban-partial" data-uid="${member.uid}" data-name="${nameSafe}">
        <i data-icon="message-square-off"></i><span>حظر جزئي</span>
      </button>
      <button class="btn btn--sm btn--danger admin-action-btn" data-action="ban-full" data-uid="${member.uid}" data-name="${nameSafe}">
        <i data-icon="shield-x"></i><span>حظر كامل</span>
      </button>
    `
: `
      <button class="btn btn--sm btn--ghost admin-action-btn" data-action="unban" data-uid="${member.uid}" data-name="${nameSafe}">
        <i data-icon="shield-check"></i><span>رفع الحظر</span>
      </button>
    `;
return `
    <div class="admin-content-row">
      <div class="admin-content-preview">
        <div class="admin-content-preview__thumb"><i data-icon="user"></i></div>
        <div class="admin-content-preview__body">
          <div class="admin-content-preview__head">
            <h4 class="admin-content-preview__title">${nameSafe}</h4>
            <span class="badge ${meta.chipClass}">${meta.label}</span>
          </div>
          <span class="admin-content-preview__meta">
            ${member.contributionsCount} مساهمة · آخر نشاط ${lastActive}
          </span>
          ${member.status !== 'active' && member.reason ? `<span class="admin-content-preview__meta">السبب: ${escapeHtml(member.reason)}</span>` : ''}
        </div>
      </div>
      <div class="admin-content-row__actions">
        ${actions}
      </div>
    </div>
  `;
}
function closeModal() {
if (_cleanupModal) {
_cleanupModal();
_cleanupModal = null;
}
}
function _openBanModal(uid, name, status, onSuccess) {
closeModal();
const isFull = status === 'banned-full';
const title = isFull ? `حظر "${escapeHtml(name)}" كليًا` : `حظر "${escapeHtml(name)}" جزئيًا`;
const warning = isFull
? 'الحظر الكامل يمنع هذا العضو من فتح التطبيق بالكامل.'
: 'الحظر الجزئي يسمح للعضو بالتصفح لكن يمنعه من التعليق والتصويت ونشر أفكار أو مناسبات جديدة.';
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">${title}</h3>
      </div>
      <div class="modal__body">
        <p class="input-hint" style="margin-bottom: var(--space-3);">${warning}</p>
        <div class="input-group">
          <label class="input-label" for="ban-reason">سبب الحظر (اختياري، يظهر للعضو)</label>
          <textarea class="input" id="ban-reason" rows="3" maxlength="300" placeholder="مثال: نشر محتوى مسيء متكرر"></textarea>
        </div>
        <p class="input-error-msg hidden" id="ban-error"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="ban-cancel">إلغاء</button>
        <button class="btn btn--danger" id="ban-submit">${isFull ? 'حظر كامل' : 'حظر جزئي'}</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons();
const reasonEl = backdrop.querySelector('#ban-reason');
const errorEl  = backdrop.querySelector('#ban-error');
const submitBtn = backdrop.querySelector('#ban-submit');
const close = () => { backdrop.remove(); _cleanupModal = null; };
const submit = async () => {
errorEl.classList.add('hidden');
submitBtn.disabled = true;
submitBtn.textContent = 'قاعدين نحفظ...';
try {
await setMemberModeration(uid, { status, reason: reasonEl.value, displayName: name });
showToast(isFull ? 'اتحظر العضو كلياً' : 'اتحظر العضو جزئياً', 'success');
logAdminAction(isFull ? 'حظر عضو كليًا' : 'حظر عضو جزئيًا', reasonEl.value ? `${name} — ${reasonEl.value}` : name);
close();
onSuccess?.();
} catch (err) {
errorEl.textContent = err.message || 'الحفظ لسع ما تم';
errorEl.classList.remove('hidden');
submitBtn.disabled = false;
submitBtn.textContent = isFull ? 'حظر كامل' : 'حظر جزئي';
}
};
backdrop.querySelector('#ban-cancel').addEventListener('click', close);
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
submitBtn.addEventListener('click', submit);
_cleanupModal = close;
}
async function _unban(uid, name, onSuccess) {
if (!await confirmAction({ title: 'رفع الحظر؟', message: `حيرجع "${name}" يقدر يشارك ويعلّق من تاني.`, confirmLabel: 'ارفع الحظر', icon: 'shield-check' })) return;
try {
await setMemberModeration(uid, { status: 'active' });
showToast('الحظر اتشال', 'success');
logAdminAction('رفع حظر عن عضو', name);
onSuccess?.();
} catch (err) {
console.error('[AdminMembers] فشل رفع الحظر:', err);
showToast('رفع الحظر لسع ما تم — جرّب تاني', 'error');
}
}
