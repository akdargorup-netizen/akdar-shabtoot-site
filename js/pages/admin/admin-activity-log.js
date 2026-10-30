import { getActivityLog } from '../../shared/admin-activity.js';
import { formatRelativeTime } from '../../data/db.js';
import { emptyState } from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { enhanceAdminPage } from '../../shared/admin-ui.js';
const LOG_LIMIT = 100;
export function renderAdminActivityLog() {
return `
    <section class="page admin-activity-log-page">

      <div class="admin-content-toolbar">
        <p>
          آخر ${LOG_LIMIT} إجراء إداري (نشر/تعديل/حذف/أرشفة/حظر...)
          من كل أقسام اللوحة — منو عمله ومتين.
        </p>
      </div>

      <div class="admin-content-list" id="admin-content-list">
        <div class="admin-content-preview" style="height:64px;"></div>
        <div class="admin-content-preview" style="height:64px;"></div>
        <div class="admin-content-preview" style="height:64px;"></div>
      </div>

    </section>
  `;
}
export async function initAdminActivityLog() {
const page = document.querySelector('.admin-activity-log-page');
if (!page) return;
enhanceAdminPage(page);
await _loadList(page);
}
async function _loadList(page) {
const list = page.querySelector('#admin-content-list');
if (!list) return;
try {
const entries = await getActivityLog({ limit: LOG_LIMIT });
if (!entries.length) {
list.innerHTML = emptyState({
icon: 'scroll-text',
title: 'لسع ما في إجراءات مسجّلة',
desc: 'أول تعديل إداري (نشر/تعديل/حذف) حيظهر هنا.',
});
renderIcons();
return;
}
list.innerHTML = entries.map(_renderRow).join('');
renderIcons();
} catch (err) {
console.error('[AdminActivityLog] فشل تحميل السجل:', err);
list.innerHTML = errorState({ subject: 'سجل النشاط' });
renderIcons();
bindErrorRetry(list, () => _loadList(page));
}
}
function _renderRow(entry) {
const actor   = escapeHtml(entry.actorName || 'غير معروف');
const role    = escapeHtml(entry.actorRole || '');
const action  = escapeHtml(entry.action || '');
const summary = (entry.summary || '').trim();
const when    = entry.at ? formatRelativeTime(entry.at) : '—';
return `
    <div class="admin-content-row">
      <div class="admin-content-preview">
        <div class="admin-content-preview__thumb"><i data-icon="scroll-text"></i></div>
        <div class="admin-content-preview__body">
          <div class="admin-content-preview__head">
            <h4 class="admin-content-preview__title">${action || 'إجراء'}</h4>
            <span class="badge badge--default">${role}</span>
          </div>
          <span class="admin-content-preview__meta">
            ${actor} · ${when}
          </span>
          ${summary ? `<span class="admin-content-preview__meta">${escapeHtml(summary)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}
