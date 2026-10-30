import { getNotifications, markNotificationRead } from '../data/db.js';
import { NOTIFICATION_TYPES }                     from '../data/local-data.js';
import { refreshNotifBadge, setNotifBadge }      from '../shared/notif-badge.js';
import { escapeHtml } from '../shared/sanitize.js';
import { renderIcons } from '../shared/icons.js';
const TYPE_MAP = Object.fromEntries(NOTIFICATION_TYPES.map(t => [t.key, t]));
const DEFAULT_TYPE = { key: 'system', label: 'رسالة عامة', icon: 'bell', page: '' };
export function renderNotifications() {
return `
    <section class="page notifications-page">
      <section class="notifications-feed" id="notifications-feed">
        <div class="notification-group">
          <div class="notification-item notification-item--skeleton"></div>
          <div class="notification-item notification-item--skeleton"></div>
        </div>
      </section>
      <div class="empty-state notifications-empty hidden" id="notifications-empty" role="status">
        <i class="empty-state__icon" data-lucide="inbox"></i>
        <p class="empty-state__title">ما في رسائل هسّع</p>
        <p class="empty-state__description">لو في جديد سنوصل ليك.</p>
      </div>
    </section>
  `;
}
let _notifRefreshBound = false;
export async function initNotifications() {
const feed  = document.getElementById('notifications-feed');
const empty = document.getElementById('notifications-empty');
if (!feed) return;
if (!_notifRefreshBound) {
_notifRefreshBound = true;
window.addEventListener('akdar:data-refreshed', (e) => {
if (e.detail?.collection === 'notifications' && document.getElementById('notifications-feed')) initNotifications();
});
}
try {
const items = await getNotifications();
if (!items.length) {
feed.innerHTML = '';
empty.classList.remove('hidden');
renderIcons();
return;
}
const unread = items.filter(n => !n.read);
const read   = items.filter(n =>  n.read);
let html = '';
if (unread.length) html += _renderGroup('جديد', unread);
if (read.length)   html += _renderGroup('سابق', read);
feed.innerHTML = html;
feed.querySelectorAll('.notification-item[data-notif-id]').forEach(el => {
const openCard = async () => {
await _markRead(el);
const { targetKind, targetId } = el.dataset;
if (targetKind && targetId) {
await _openInteractionTarget(targetKind, targetId);
return;
}
const page = el.dataset.page;
if (page) {
const { navigateTo } = await import('../core/router.js');
navigateTo(page);
}
};
el.addEventListener('click', (e) => {
const moreBtn = e.target.closest('.notification-more');
if (moreBtn) {
e.stopPropagation();
const expanded = el.classList.toggle('is-expanded');
moreBtn.setAttribute('aria-expanded', String(expanded));
moreBtn.querySelector('.notification-more__label').textContent =
expanded ? 'عرض أقل' : 'قراءة المزيد';
_markRead(el);
return;
}
openCard();
});
});
_setupExpandButtons(feed);
renderIcons();
await Promise.all(unread.map(n => markNotificationRead(n.id).catch(() => {})));
setNotifBadge(0);
refreshNotifBadge();
} catch (err) {
console.error('[Notifications] فشل التحميل:', err);
feed.innerHTML = `
      <div class="empty-state" role="alert">
        <i class="empty-state__icon" data-lucide="wifi-off"></i>
        <p class="empty-state__title">الرسائل لسع ما وصلت</p>
        <p class="empty-state__description">تحقق من النت وحاول تاني.</p>
      </div>
    `;
renderIcons();
}
}
async function _openInteractionTarget(kind, id) {
try {
if (kind === 'occasion') {
const { getOccasion } = await import('../data/db.js');
const { openOccasionDetail } = await import('./occasion-detail.js');
const occasion = await getOccasion(id);
if (occasion) return openOccasionDetail(occasion);
} else if (kind === 'idea') {
const { getIdea, getUserVote } = await import('../data/db.js');
const { openIdeaDetail } = await import('./idea-box-detail.js');
const idea = await getIdea(id);
if (idea) {
const { getCurrentUser } = await import('../data/auth.js');
const uid = getCurrentUser()?.uid;
const userVote = uid ? await getUserVote(id, uid) : null;
return openIdeaDetail(idea, userVote);
}
}
} catch (err) {
console.error('[Notifications] فشل فتح المحتوى:', err);
}
}
function _renderGroup(title, items) {
return `
    <div class="notification-group">
      <h3 class="group-title">${title}</h3>
      ${items.map(_renderItem).join('')}
    </div>
  `;
}
function _renderItem(item) {
const type = TYPE_MAP[item.type] || DEFAULT_TYPE;
const page = item.page || type.page || '';
const noTitle = Boolean(item.personal && item.body);
return `
    <article
      class="notification-item notification-item--rich ${item.read ? '' : 'unread'}${noTitle ? ' notification-item--no-title' : ''}"
      data-notif-id="${item.id}"
      data-type="${type.key}"
      ${page ? `data-page="${page}"` : ''}
      ${item.targetKind ? `data-target-kind="${item.targetKind}"` : ''}
      ${item.targetId ? `data-target-id="${escapeHtml(String(item.targetId))}"` : ''}
    >
      <div class="notification-icon" data-lucide="${type.icon}"></div>
      <div class="notification-content">
        <div class="notification-meta">
          <span class="notification-chip">${escapeHtml(type.label)}</span>
          <span class="notification-time">${escapeHtml(item.date || '')}</span>
          ${!item.read ? '<span class="notification-dot" aria-label="غير مقروءة"></span>' : ''}
        </div>
        ${noTitle ? '' : `<h4 class="notification-title">${escapeHtml(item.title || 'رسالة')}</h4>`}
        <p class="notification-text">${escapeHtml(item.body || '')}</p>
        <button type="button" class="notification-more" hidden aria-expanded="false">
          <span class="notification-more__label">قراءة المزيد</span>
          <svg class="notification-more__chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M6 8l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </article>
  `;
}
function _setupExpandButtons(feed) {
const measure = () => {
feed.querySelectorAll('.notification-item--rich').forEach(card => {
const text = card.querySelector('.notification-text');
const more = card.querySelector('.notification-more');
if (!text || !more || card.classList.contains('is-expanded')) return;
more.hidden = text.scrollHeight - text.clientHeight <= 1;
});
};
requestAnimationFrame(measure);
document.fonts?.ready?.then(measure);
}
async function _markRead(el) {
if (!el.classList.contains('unread')) return;
await markNotificationRead(el.dataset.notifId);
el.classList.remove('unread');
el.querySelector('.notification-dot')?.remove();
refreshNotifBadge();
}
