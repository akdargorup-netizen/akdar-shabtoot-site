import { getOccasions, getUserOccasionLike } from '../data/db.js';
import { handleOccasionLike, markPendingLikes } from '../shared/reaction-ui.js';
import { requireRealAuth, getCurrentUser } from '../data/auth.js';
import { OCCASION_CATEGORIES, getOccasionCategory, getOccasionVisualChip } from '../data/occasion-categories.js';
import { formatCompactCount } from '../shared/arabic-digits.js';
import { emptyState, syncFilterEmpty } from '../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../shared/error-state.js';
import { openAddOccasionModal } from '../shared/occasion-form-modal.js';
import { showToast } from '../shared/toast.js';
import { renderReviewNotice } from '../shared/review-notice.js';
import { fetchUrgentAnnouncement, renderUrgentBanner } from '../shared/urgent-announcement.js';
import { getNewIds, markSeen } from '../shared/content-freshness.js';
import { itemAttrs, itemMenuButton, bindItemActions, editedMark } from '../shared/item-actions.js';
import { renderIcons } from '../shared/icons.js';
import { escapeHtml } from '../shared/sanitize.js';
import { staffBadge } from '../shared/staff-badge.js';
function renderFilters() {
const chips = [{ key: 'all', label: 'الكل' }, ...OCCASION_CATEGORIES];
return chips.map((cat, i) => `
    <button class="filter-chip${i === 0 ? ' active' : ''}" data-filter="${cat.key}">${cat.label}</button>
  `).join('');
}
const _occasionsCache = new Map();
let _newIds = new Set();
function renderOccasionCard(occasion, liked = false) {
if (occasion.moderation === 'pending') return renderReviewNotice('occasion', occasion.id);
const cat = getOccasionCategory(occasion.category);
const visualChip = getOccasionVisualChip(occasion.category);
const totalComments = occasion.commentsCount ?? 0;
const isNew = _newIds.has(String(occasion.id));
return `
    <article class="occasion-card occasion-card--feed${occasion.moderation === 'pending' ? ' occasion-card--pending' : ''}${occasion.moderation === 'reported' ? ' occasion-card--reported' : ''}" data-occasion-id="${occasion.id}" data-chip="${visualChip}" data-category="${escapeHtml(occasion.category)}" data-created-at="${occasion.createdAt}" ${itemAttrs({ kind: 'occasion', id: occasion.id, owner: occasion.authorUid, created: occasion.createdAt, moderation: occasion.moderation })}>

      ${occasion.moderation === 'reported' ? `
        <p class="pending-review-note"><i data-icon="flag"></i> وصلت بلاغات على هذه المناسبة — اتخفت عن الناس لحد ما يراجعها المشرف، وأنت وحدك الشايفها هسّع.</p>
      ` : ''}
      ${occasion.moderation === 'pending' ? `
        <p class="pending-review-note"><i data-icon="clock"></i> قيد المراجعة — ما تظهر للناس إلا بعد موافقة المشرف، وأنت وحدك الشايفها هسّع.</p>
      ` : ''}

      <!-- الرأس: أيقونة التصنيف + الاسم أولًا (مع شارة "جديد") ثم "الوقت · التصنيف"
           بلون هادئ — لا سطر "نشرها" منفصل بعد الآن. -->
      <div class="occasion-card__head">
        <span class="occasion-card__tile" aria-hidden="true"><i data-icon="${cat.icon}"></i></span>
        <div class="occasion-card__head-body">
          <div class="occasion-card__name-row">
            <p class="occasion-card__author">${escapeHtml(occasion.authorName || 'مستخدم')}${staffBadge(occasion.staffRole)}</p>
            ${isNew ? '<span class="content-new-badge">جديد</span>' : ''}
          </div>
          <p class="occasion-card__head-line">
            <span class="occasion-card__head-time">${occasion.date}${editedMark(occasion)}</span>
            <span class="occasion-card__head-dot" aria-hidden="true">·</span>
            <span class="occasion-card__head-cat">${cat.label}</span>
          </p>
        </div>
        ${itemMenuButton()}
      </div>

      <!-- المتن: العنوان ثم صاحب المناسبة (مع تعريف اختياري كـ"الفقيد") -->
      <div class="occasion-card__main">
        <h3 class="occasion-card__title">${escapeHtml(occasion.title)}</h3>
        <p class="occasion-card__owner">${cat.ownerCaption ? `<span class="occasion-card__owner-caption">${cat.ownerCaption}</span>` : ''}${escapeHtml(occasion.ownerName)}</p>
      </div>
      ${(occasion.eventDate || occasion.eventLocation) ? `
        <div class="occasion-card__meta">
          ${occasion.eventDate ? `<span class="occasion-card__meta-item"><i data-icon="calendar"></i>${escapeHtml(occasion.eventDate)}</span>` : ''}
          ${occasion.eventLocation ? `<span class="occasion-card__meta-item"><i data-icon="map-pin"></i>${escapeHtml(occasion.eventLocation)}</span>` : ''}
        </div>
      ` : ''}
      ${occasion.text ? `<p class="occasion-card__text">${escapeHtml(occasion.text)}</p>` : ''}

      <!-- كبسولة الأفعال: إعجاب | [فعل التصنيف + عدّاد] | مشاركة. محايدة في حالتها
           العادية، وتتلوّن بلون القسم عند الضغط أو تفعيل الإعجاب. الإعجاب مخفي
           بالـCSS في التعزية (البيانات المخزّنة لا تتأثر). -->
      <div class="occasion-card__actions">
        <button class="occasion-like-btn${liked ? ' active' : ''}" data-action="occasion-like" data-occasion-id="${occasion.id}" data-count="${occasion.likesCount ?? 0}" aria-pressed="${liked}" aria-label="إعجاب">
          <i data-icon="heart"></i>
          <span class="occasion-like-btn__count">${formatCompactCount(occasion.likesCount ?? 0)}</span>
        </button>
        <button class="occasion-comment-btn" data-action="occasion-details" data-occasion-id="${occasion.id}" aria-label="${cat.shortVerb}">
          <i data-icon="message-circle"></i>
          <span class="occasion-comment-btn__verb">${cat.shortVerb}</span>
          <span class="occasion-comment-btn__count">${formatCompactCount(totalComments)}</span>
        </button>
        <button class="occasion-share-btn" data-action="share-occasion" data-occasion-id="${occasion.id}" aria-label="مشاركة المناسبة">
          <i data-icon="share-2"></i>
        </button>
      </div>

    </article>
  `;
}
function renderSkeletonCards(n = 3) {
return Array.from({ length: n }, () => `
    <article class="occasion-card occasion-card--skeleton" aria-hidden="true">
      <!-- يحاكي البطاقة الحقيقية: أفتار + اسم/وقت، العنوان، صاحب المناسبة، زمان ومكان، صف الأفعال -->
      <div class="occasion-card__skeleton-head">
        <div class="page-skeleton__avatar"></div>
        <div class="page-skeleton__stack">
          <div class="page-skeleton__line page-skeleton__line--sm" style="width:46%"></div>
          <div class="page-skeleton__line page-skeleton__line--sm" style="width:30%;height:10px"></div>
        </div>
      </div>
      <div class="page-skeleton__line page-skeleton__line--lg"></div>
      <div class="page-skeleton__line page-skeleton__line--sm" style="width:40%"></div>
      <div class="page-skeleton__line page-skeleton__line--md" style="height:12px"></div>
      <div class="page-skeleton__line page-skeleton__line--md" style="height:12px;width:44%"></div>
      <div class="page-skeleton__actions">
        <div class="page-skeleton__pill"></div>
        <div class="page-skeleton__pill"></div>
        <div class="page-skeleton__pill page-skeleton__pill--icon"></div>
      </div>
    </article>
  `).join('');
}
export function renderCommunityOccasions() {
return `
    <section class="page community-occasions-page">

      <div class="page-intro">
        <p>هنا مكان المباركة والتعزية، لنؤدي واجبنا بكل سهولة.</p>
        <button class="cta-button cta-button--full" data-action="add-occasion">
          <i data-icon="plus"></i>
          ضيف مناسبتك من هنا
        </button>
      </div>

      <div class="occasions-filters" id="occasions-filters">
        ${renderFilters()}
        <button class="filter-chip" data-time-toggle="week">الأسبوع دا</button>
      </div>

      <div id="occasions-urgent-slot"></div>

      <section class="occasions-feed" id="occasions-feed">
        ${renderSkeletonCards()}
      </section>

    </section>
  `;
}
export async function initCommunityOccasions() {
const page = document.querySelector('.community-occasions-page');
if (!page) return;
page.querySelectorAll('.filter-chip[data-filter]').forEach(btn => {
btn.addEventListener('click', () => {
page.querySelectorAll('.filter-chip[data-filter]').forEach(b => b.classList.remove('active'));
btn.classList.add('active');
_applyOccasionFilters(page);
});
});
page.querySelector('.filter-chip[data-time-toggle]')?.addEventListener('click', function () {
this.classList.toggle('active');
_applyOccasionFilters(page);
});
page.querySelector('[data-action="add-occasion"]')?.addEventListener('click', async () => {
const ok = await requireRealAuth();
if (!ok) return;
openAddOccasionModal(async () => {
await _loadFeed(page);
});
});
const urgentSlot = page.querySelector('#occasions-urgent-slot');
if (urgentSlot) {
fetchUrgentAnnouncement().then(announcement => {
if (!announcement) return;
const bannerHtml = renderUrgentBanner(announcement, 'occasions');
if (!bannerHtml) return;
urgentSlot.innerHTML = bannerHtml;
renderIcons(urgentSlot);
});
}
_bindFeedRefresh(page);
await _loadFeed(page, { swr: true });
}
function _applyOccasionFilters(page) {
const activeCategory = page.querySelector('.filter-chip[data-filter].active')?.dataset.filter || 'all';
const weekOnly = page.querySelector('.filter-chip[data-time-toggle]')?.classList.contains('active');
const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
page.querySelectorAll('.occasion-card:not(.occasion-card--skeleton)').forEach(card => {
const matchesCategory = activeCategory === 'all' || card.dataset.category === activeCategory;
const matchesTime = !weekOnly || new Date(card.dataset.createdAt).getTime() >= weekAgo;
card.hidden = !(matchesCategory && matchesTime);
});
if (syncFilterEmpty(page.querySelector('#occasions-feed'), '.occasion-card:not(.occasion-card--skeleton)', {
title: 'ما في مناسبات بالفلتر دا',
desc: 'جرّب تصنيف تاني، أو الغِ "الأسبوع دا".',
})) renderIcons();
}
function _bindFeedRefresh(page) {
const onRefreshed = e => {
if (!page.isConnected) { window.removeEventListener('akdar:data-refreshed', onRefreshed); return; }
if (e.detail?.collection === 'occasions') _loadFeed(page);
};
window.addEventListener('akdar:data-refreshed', onRefreshed);
}
async function _loadFeed(page, { swr = false } = {}) {
const feed = page.querySelector('#occasions-feed');
if (!feed) return;
try {
const occasions = await getOccasions({ viewerUid: getCurrentUser()?.uid || null, swr });
if (!occasions.length) {
feed.innerHTML = emptyState({
icon: 'flower-2',
title: 'لسع ما في مناسبات',
desc: 'كن أول زول يضيف مناسبة هنا.',
});
renderIcons();
return;
}
_occasionsCache.clear();
occasions.forEach(occasion => _occasionsCache.set(occasion.id, occasion));
_newIds = getNewIds('occasions', occasions);
markSeen('occasions', occasions);
const currentUid = getCurrentUser()?.uid || null;
const likedFlags = currentUid
? await Promise.all(occasions.map(o => getUserOccasionLike(o.id, currentUid).catch(() => false)))
: occasions.map(() => false);
const cards = occasions.map((occasion, i) => renderOccasionCard(occasion, likedFlags[i]));
feed.innerHTML = cards.join('');
renderIcons();
markPendingLikes(feed, currentUid);
_applyOccasionFilters(page);
_bindShareButtons(feed);
feed.querySelectorAll('[data-action="occasion-details"]').forEach(btn => {
btn.addEventListener('click', async () => {
const { occasionId } = btn.dataset;
const occasion = _occasionsCache.get(occasionId);
if (!occasion) return;
const ok = await requireRealAuth();
if (!ok) return;
const { openOccasionDetail } = await import('./occasion-detail.js');
openOccasionDetail(occasion);
});
});
feed.querySelectorAll('[data-action="occasion-like"]').forEach(btn => {
btn.addEventListener('click', () => _handleLikeClick(btn));
});
bindItemActions(feed, {
getData: d => _occasionsCache.get(d.id),
onChange: () => _loadFeed(page),
});
} catch {
feed.innerHTML = errorState({ subject: 'المناسبات' });
renderIcons(feed);
bindErrorRetry(feed, () => _loadFeed(page));
}
}
function _bindShareButtons(feed) {
feed.querySelectorAll('[data-action="share-occasion"]').forEach(btn => {
btn.addEventListener('click', () => {
const occasion = _occasionsCache.get(btn.dataset.occasionId);
if (!occasion) return;
const cat = getOccasionCategory(occasion.category);
const lines = [`${cat.label}: ${occasion.title}`, occasion.ownerName];
if (occasion.eventDate) lines.push(`📅 ${occasion.eventDate}`);
if (occasion.eventLocation) lines.push(`📍 ${occasion.eventLocation}`);
const text = lines.filter(Boolean).join('\n');
if (navigator.share) {
navigator.share({ title: occasion.title, text }).catch(() => {});
} else {
navigator.clipboard?.writeText(text);
showToast('النص اتنسخ ✓', 'success');
}
});
});
}
function _handleLikeClick(btn) {
return handleOccasionLike(btn);
}
