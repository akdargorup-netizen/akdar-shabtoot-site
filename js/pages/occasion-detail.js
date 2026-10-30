import { navigateTo } from '../core/router.js';
import { getOccasion, getOccasionComments, addOccasionComment, getUserOccasionComment, getUserOccasionLike, toggleOccasionCommentLike, formatRelativeTime } from '../data/db.js';
import { requireRealAuth, getCurrentUser } from '../data/auth.js';
import { getOccasionCategory, getOccasionVisualChip, OCCASION_COMMENT_MAX_LENGTH } from '../data/occasion-categories.js';
import { formatCompactCount } from '../shared/arabic-digits.js';
import { showToast } from '../shared/toast.js';
import { errorState, bindErrorRetry } from '../shared/error-state.js';
import { renderIcons } from '../shared/icons.js';
import { escapeHtml } from '../shared/sanitize.js';
import { staffBadge, staffRoleField } from '../shared/staff-badge.js';
import { SubmissionGuardError } from '../shared/submission-guard.js';
import { handleOccasionLike, markPendingLikes } from '../shared/reaction-ui.js';
import { queueComment, getQueuedUserComment, getQueuedComments } from '../shared/comment-outbox.js';
import { isTransientFailure, shouldQueue } from '../shared/transient-error.js';
import { playLikeSound, playCommentSound } from '../shared/sound-fx.js';
import { itemAttrs, itemMenuButton, bindItemActions, editedMark } from '../shared/item-actions.js';
import { isAdminSessionUnlocked } from '../data/admin-auth.js';
let _currentOccasion = null;
let _onCommentSynced = null;
let _currentCommentsByUid = new Map();
export function openOccasionDetail(occasion) {
_currentOccasion = occasion;
window.__occasionDetailModule = { occasion };
navigateTo('occasion-detail');
}
function _authorInitial(name) {
return (name || '؟').trim().charAt(0);
}
function _renderCommentLike(comment, currentUid) {
const liked = !!currentUid && (comment.likedBy ?? []).includes(currentUid);
const count = comment.likesCount ?? 0;
return `
    <button type="button" class="occasion-bubble__like${liked ? ' active' : ''}" data-action="occasion-comment-like" data-comment-id="${escapeHtml(comment.uid)}" aria-pressed="${liked}" aria-label="إعجاب بالتعليق">
      <i data-icon="heart"></i>
      <span class="occasion-bubble__like-count">${count > 0 ? formatCompactCount(count) : ''}</span>
    </button>
  `;
}
function _renderComment(comment, currentUid) {
const isOwn = !!currentUid && comment.uid === currentUid;
const pending = !!comment._pending;
const reported = comment.moderation === 'reported';
const hidden = reported && !isOwn && !isAdminSessionUnlocked();
const itemAttr = pending ? '' : itemAttrs({
kind: 'occasion-comment', id: comment.uid, parent: _currentOccasion?.id ?? '',
owner: comment.uid, created: comment.createdAt, moderation: comment.moderation,
});
return `
    <div class="occasion-bubble-row ${isOwn ? 'occasion-bubble-row--own' : 'occasion-bubble-row--other'}" ${itemAttr}>
      <span class="avatar avatar--sm occasion-bubble-row__avatar" aria-hidden="true">${_authorInitial(comment.authorName)}</span>
      <div class="occasion-bubble" data-own="${isOwn}" data-status="${pending ? 'pending' : 'sent'}">
        ${pending || hidden ? '' : itemMenuButton({ small: true, corner: true })}
        <p class="occasion-bubble__author">${escapeHtml(comment.authorName)}${staffBadge(comment.staffRole)}</p>
        ${hidden
? '<p class="occasion-bubble__text item-placeholder-text">تعليق قيد مراجعة المشرف</p>'
: `${reported ? '<p class="item-reported-note"><i data-icon="flag"></i> قيد مراجعة المشرف بعد بلاغات</p>' : ''}<p class="occasion-bubble__text">${escapeHtml(comment.text)}</p>`}
        <div class="occasion-bubble__footer">
          <span class="occasion-bubble__meta">
            <span class="occasion-bubble__time">${formatRelativeTime(comment.createdAt)}${hidden ? '' : editedMark(comment)}</span>
            ${isOwn ? `<i class="occasion-bubble__status-icon" data-icon="${pending ? 'clock' : 'check'}" aria-label="${pending ? 'لسع ما اترسلت — قاعدة تنتظر الشبكة' : 'اترسلت'}"></i>` : ''}
          </span>
          ${pending || hidden ? '' : _renderCommentLike(comment, currentUid)}
        </div>
      </div>
    </div>
  `;
}
export function renderOccasionDetail() {
const occasion = _currentOccasion;
if (!occasion) {
return `
      <section class="page occasion-detail-page">
        <p class="error-state">المناسبة دي مش موجودة هسّع — ممكن تكون اتحذفت</p>
      </section>
    `;
}
const cat = getOccasionCategory(occasion.category);
const visualChip = getOccasionVisualChip(occasion.category);
return `
    <section class="page occasion-detail-page">

      <article class="occasion-card occasion-detail-card" data-occasion-id="${occasion.id}" data-chip="${visualChip}" ${itemAttrs({ kind: 'occasion', id: occasion.id, owner: occasion.authorUid, created: occasion.createdAt, moderation: occasion.moderation })}>

        <!-- أ. أفتار دائري بأول حرف الاسم + سطر واحد مضغوط جنبه:
             الاسم · الوقت · التصنيف (نفس رأس كارت الخلاصة بالحرف) -->
        <div class="occasion-card__head">
          <span class="occasion-card__tile" aria-hidden="true"><i data-icon="${cat.icon}"></i></span>
          <div class="occasion-card__head-body">
            <p class="occasion-card__author">${escapeHtml(occasion.authorName || 'مستخدم')}${staffBadge(occasion.staffRole)}</p>
            <p class="occasion-card__head-line">
              <span class="occasion-card__head-time">${occasion.date}${editedMark(occasion)}</span>
              <span class="occasion-card__head-dot" aria-hidden="true">·</span>
              <span class="occasion-card__head-cat">${cat.label}</span>
            </p>
          </div>
          ${itemMenuButton()}
        </div>

        <h3 class="occasion-detail-card__title">${escapeHtml(occasion.title)}</h3>
        <p class="occasion-card__owner">${cat.ownerCaption ? `<span class="occasion-card__owner-caption">${cat.ownerCaption}</span>` : ''}${escapeHtml(occasion.ownerName)}</p>
        ${(occasion.eventDate || occasion.eventLocation) ? `
          <div class="occasion-card__meta">
            ${occasion.eventDate ? `<span class="occasion-card__meta-item"><i data-icon="calendar"></i>${escapeHtml(occasion.eventDate)}</span>` : ''}
            ${occasion.eventLocation ? `<span class="occasion-card__meta-item"><i data-icon="map-pin"></i>${escapeHtml(occasion.eventLocation)}</span>` : ''}
          </div>
        ` : ''}
        ${occasion.text ? `<p class="occasion-detail-card__text">${escapeHtml(occasion.text)}</p>` : ''}

        <!-- صف الأفعال: إعجاب + مشاركة فقط. عدّاد التعليقات في عنوان القسم تحت. -->
        <div class="occasion-card__actions">
          <button class="occasion-like-btn" data-action="occasion-like" data-occasion-id="${occasion.id}" data-count="${occasion.likesCount ?? 0}" aria-pressed="false" aria-label="إعجاب">
            <i data-icon="heart"></i>
            <span class="occasion-like-btn__count">${formatCompactCount(occasion.likesCount ?? 0)}</span>
          </button>
          <button class="occasion-share-btn" data-action="share-occasion" aria-label="مشاركة المناسبة">
            <i data-icon="share-2"></i>
          </button>
        </div>

      </article>

      <section class="occasion-detail-comments" data-chip="${visualChip}">
        <h3 class="occasion-detail-comments__heading">
          <i data-icon="message-circle"></i>
          ${cat.commentsTitle}
          <span class="occasion-detail-comments__count" id="occasion-detail-comments-count">${formatCompactCount(occasion.commentsCount ?? 0)}</span>
        </h3>

        <div class="occasion-detail-comments__list" id="occasion-detail-comments-list">
          <p class="occasion-detail-comments__loading">قاعدين نجيب التعليقات...</p>
        </div>

        <div id="occasion-detail-comment-area"></div>

      </section>

    </section>
  `;
}
function _renderCommentForm(actionVerb) {
return `
    <form class="occasion-detail-comment-form" id="occasion-detail-comment-form">
      <div class="occasion-detail-comment-form__row">
        <textarea
          class="occasion-detail-comment-form__input"
          id="occasion-detail-comment-input"
          rows="1"
          maxlength="${OCCASION_COMMENT_MAX_LENGTH}"
          placeholder="اكتب هنا..."
        ></textarea>
        <button type="submit" class="occasion-detail-comment-form__submit" aria-label="${actionVerb}">
          <i data-icon="send"></i>
        </button>
      </div>
      <span class="occasion-detail-comment-form__counter" id="occasion-detail-comment-counter">0/${OCCASION_COMMENT_MAX_LENGTH}</span>
    </form>
  `;
}
function _renderOwnCommentNotice(comment) {
const pending = !!comment._pending;
return `
    <div class="occasion-detail-own-comment ${pending ? 'occasion-detail-own-comment--pending' : ''}">
      <i data-icon="${pending ? 'clock' : 'check-circle-2'}"></i>
      <span>${pending ? 'لا يوجد اتصال بالشبكة — تعليقك حيتبعت تلقائيًا أول ما ترجع: ' : 'شاركت رأيك بالفعل: '}«${escapeHtml(comment.text)}»</span>
    </div>
  `;
}
const OWN_COMMENT_NOTICE_VISIBLE_MS = 3500;
const OWN_COMMENT_NOTICE_FADE_MS    = 300;
let _ownCommentFadeTimer = null;
function _scheduleOwnCommentFade(area) {
clearTimeout(_ownCommentFadeTimer);
_ownCommentFadeTimer = setTimeout(() => {
const notice = area.querySelector('.occasion-detail-own-comment:not(.occasion-detail-own-comment--pending)');
if (!notice) return;
notice.classList.add('occasion-detail-own-comment--fading');
setTimeout(() => {
if (area.contains(notice)) area.innerHTML = '';
}, OWN_COMMENT_NOTICE_FADE_MS);
}, OWN_COMMENT_NOTICE_VISIBLE_MS);
}
function _bindDetailRefresh(page, occasionId) {
const onRefreshed = (e) => {
if (!page.isConnected) { window.removeEventListener('akdar:data-refreshed', onRefreshed); return; }
const d = e.detail || {};
if (d.collection === 'occasion_comments' && String(d.id) === String(occasionId)) _loadComments(page, occasionId);
};
window.addEventListener('akdar:data-refreshed', onRefreshed);
}
async function _loadComments(page, occasionId, { optimistic = null } = {}) {
const list = page.querySelector('#occasion-detail-comments-list');
if (!list) return;
const currentUid = getCurrentUser()?.uid || null;
const queued = getQueuedComments(occasionId);
let comments = null;
let failure = null;
try {
comments = await getOccasionComments(occasionId);
} catch (err) {
failure = err;
console.error('[Occasion] فشل تحميل التعليقات:', err);
}
const base = comments || [];
const extra = optimistic && !base.some(c => c.uid === optimistic.uid) ? [optimistic] : [];
const merged = [...base, ...extra, ...queued];
if (comments) _currentCommentsByUid = new Map(comments.map(c => [c.uid, c]));
if (failure) {
const shown = merged.slice().reverse().map(c => _renderComment(c, currentUid)).join('');
list.innerHTML = shown + errorState({ subject: 'التعليقات', code: failure?.code || failure?.message });
bindErrorRetry(list, () => _loadComments(page, occasionId, { optimistic }));
} else if (!merged.length) {
list.innerHTML = `<p class="occasion-detail-comments__empty">كن أول زول يشارك هنا.</p>`;
} else {
list.innerHTML = merged.slice().reverse().map(c => _renderComment(c, currentUid)).join('');
}
if (!failure || merged.length) {
const countEl = page.querySelector('#occasion-detail-comments-count');
if (countEl) countEl.textContent = formatCompactCount(merged.length);
}
renderIcons();
}
async function _renderCommentArea(page, occasionId, actionVerb, { justSent = false } = {}) {
const area = page.querySelector('#occasion-detail-comment-area');
if (!area) return;
const user = getCurrentUser();
const queuedOwn = user ? getQueuedUserComment(occasionId, user.uid) : null;
let existing = queuedOwn;
if (!existing && user) { try { existing = await getUserOccasionComment(occasionId, user.uid); } catch { existing = null; } }
if (existing) {
if (justSent && !existing._pending) {
area.innerHTML = '';
return;
}
area.innerHTML = _renderOwnCommentNotice(existing);
renderIcons();
clearTimeout(_ownCommentFadeTimer);
if (!existing._pending) _scheduleOwnCommentFade(area);
return;
}
area.innerHTML = _renderCommentForm(actionVerb);
renderIcons();
_bindCommentForm(page, occasionId, area);
}
function _bindCommentForm(page, occasionId, area) {
const form = area.querySelector('#occasion-detail-comment-form');
if (!form) return;
const input   = form.querySelector('#occasion-detail-comment-input');
const counter = form.querySelector('#occasion-detail-comment-counter');
input.addEventListener('input', () => {
counter.textContent = `${input.value.length}/${OCCASION_COMMENT_MAX_LENGTH}`;
counter.classList.toggle('is-near', input.value.length >= OCCASION_COMMENT_MAX_LENGTH * 0.8);
});
form.addEventListener('submit', async e => {
e.preventDefault();
const text = input.value.trim();
if (!text) return;
const ok = await requireRealAuth();
if (!ok) return;
const user = getCurrentUser();
const submitBtn = form.querySelector('.occasion-detail-comment-form__submit');
submitBtn.disabled = true;
const draft = { uid: user.uid, authorName: user.displayName || 'مستخدم', text, ...staffRoleField() };
if (!navigator.onLine) {
queueComment(occasionId, draft);
playCommentSound();
await _loadComments(page, occasionId);
await _renderCommentArea(page, occasionId, form.dataset.actionVerb);
showToast('مافي اتصال بالشبكة — تعليقك حيتبعت تلقائي أول ما ترجع', 'info');
return;
}
try {
const saved = await addOccasionComment(occasionId, draft);
playCommentSound();
await _loadComments(page, occasionId, { optimistic: saved });
await _renderCommentArea(page, occasionId, form.dataset.actionVerb, { justSent: true });
showToast('تعليقك اتضاف', 'success');
} catch (err) {
if (!navigator.onLine || shouldQueue(err)) {
queueComment(occasionId, draft);
await _loadComments(page, occasionId);
await _renderCommentArea(page, occasionId, form.dataset.actionVerb);
showToast(navigator.onLine ? 'الخدمة مشغولة هسّع — تعليقك محفوظ وحيتبعت تلقائي أول ما تهدأ' : 'مافي اتصال بالشبكة — تعليقك حيتبعت تلقائي أول ما ترجع', 'info');
return;
}
const known = err?.message === 'لقد علّقت على هذه المناسبة من قبل' || err instanceof SubmissionGuardError;
if (!known) console.error('[Occasion] فشل إضافة التعليق:', err);
const raw = err?.code || `${err?.name || ''}-${err?.message || ''}`;
const code = !known ? ` (${String(raw).replace(/[^\w/-]/g, '').slice(0, 40)})` : '';
showToast(known ? err.message : `تعليقك لسع ما اتضاف — جرّب تاني${code}`, 'error');
submitBtn.disabled = false;
}
});
}
export async function initOccasionDetail() {
const page = document.querySelector('.occasion-detail-page');
if (!page || !_currentOccasion) return;
const occasionId = _currentOccasion.id;
const cat = getOccasionCategory(_currentOccasion.category);
try {
const fresh = await getOccasion(occasionId);
if (fresh) _currentOccasion = fresh;
} catch {   }
const likeCountEl = page.querySelector('[data-action="occasion-like"] .occasion-like-btn__count');
if (likeCountEl) {
likeCountEl.textContent = formatCompactCount(_currentOccasion.likesCount ?? 0);
likeCountEl.closest('[data-action="occasion-like"]')?.setAttribute('data-count', String(_currentOccasion.likesCount ?? 0));
}
_bindDetailRefresh(page, occasionId);
await Promise.all([
_loadComments(page, occasionId),
_renderCommentArea(page, occasionId, cat.actionVerb),
_initLikeButton(page, occasionId),
]);
_initCommentLikes(page, occasionId);
_initShareButton(page);
_bindItemMenus(page, occasionId, cat);
requestAnimationFrame(() => {
page.querySelector('.occasion-detail-comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
if (_onCommentSynced) window.removeEventListener('akdar:comment-synced', _onCommentSynced);
_onCommentSynced = e => {
if (e.detail?.occasionId !== occasionId) return;
if (!document.querySelector('.occasion-detail-page')) return;
_loadComments(page, occasionId);
_renderCommentArea(page, occasionId, cat.actionVerb);
};
window.addEventListener('akdar:comment-synced', _onCommentSynced);
}
function _bindItemMenus(page, occasionId, cat) {
const card = page.querySelector('.occasion-detail-card');
const list = page.querySelector('#occasion-detail-comments-list');
if (card) {
bindItemActions(card, {
getData: () => _currentOccasion,
onChange: ({ action, result }) => {
if (action === 'delete') { navigateTo('community-occasions'); return; }
if (action === 'report') {
if (result?.hidden) navigateTo('community-occasions');
return;
}
if (action === 'edit' && result) _applyOccasionEdit(card, result);
},
});
}
if (list) {
bindItemActions(list, {
getData: d => _currentCommentsByUid.get(d.id),
onChange: async () => {
await _loadComments(page, occasionId);
await _renderCommentArea(page, occasionId, cat.actionVerb);
},
});
}
}
function _applyOccasionEdit(card, fresh) {
_currentOccasion = { ..._currentOccasion, ...fresh };
window.__occasionDetailModule = { occasion: _currentOccasion };
const titleEl = card.querySelector('.occasion-detail-card__title');
if (titleEl) titleEl.textContent = _currentOccasion.title;
const ownerEl = card.querySelector('.occasion-card__owner');
if (ownerEl) ownerEl.textContent = _currentOccasion.ownerName;
const textEl = card.querySelector('.occasion-detail-card__text');
if (textEl) {
if (_currentOccasion.text) textEl.textContent = _currentOccasion.text;
else textEl.remove();
} else if (_currentOccasion.text) {
const p = document.createElement('p');
p.className = 'occasion-detail-card__text';
p.textContent = _currentOccasion.text;
card.querySelector('.occasion-card__actions')?.insertAdjacentElement('beforebegin', p);
}
const timeEl = card.querySelector('.occasion-card__head-time');
if (timeEl && !timeEl.querySelector('.item-edited-mark')) timeEl.insertAdjacentHTML('beforeend', editedMark({ editedAt: true }));
}
function _initCommentLikes(page, occasionId) {
const list = page.querySelector('#occasion-detail-comments-list');
if (!list) return;
list.addEventListener('click', async e => {
const btn = e.target.closest('[data-action="occasion-comment-like"]');
if (!btn || btn.dataset.busy) return;
const commentId = btn.dataset.commentId;
btn.dataset.busy = '1';
try {
const ok = await requireRealAuth();
if (!ok) return;
const { liked, likesCount } = await toggleOccasionCommentLike(occasionId, commentId, getCurrentUser().uid);
if (liked) playLikeSound();
const target = [...list.querySelectorAll('[data-action="occasion-comment-like"]')]
.find(b => b.dataset.commentId === commentId) ?? btn;
target.classList.toggle('active', liked);
target.setAttribute('aria-pressed', String(liked));
const countEl = target.querySelector('.occasion-bubble__like-count');
if (countEl) countEl.textContent = likesCount > 0 ? formatCompactCount(likesCount) : '';
} catch (err) {
showToast(err.message || 'الإعجاب لسع ما اتسجّل — جرّب تاني', 'error');
} finally {
delete btn.dataset.busy;
}
});
}
function _initShareButton(page) {
const btn = page.querySelector('[data-action="share-occasion"]');
if (!btn || !_currentOccasion) return;
btn.addEventListener('click', () => {
const cat = getOccasionCategory(_currentOccasion.category);
const lines = [`${cat.label}: ${_currentOccasion.title}`, _currentOccasion.ownerName];
if (_currentOccasion.eventDate) lines.push(`📅 ${_currentOccasion.eventDate}`);
if (_currentOccasion.eventLocation) lines.push(`📍 ${_currentOccasion.eventLocation}`);
const text = lines.filter(Boolean).join('\n');
if (navigator.share) {
navigator.share({ title: _currentOccasion.title, text }).catch(() => {});
} else {
navigator.clipboard?.writeText(text);
showToast('النص اتنسخ ✓', 'success');
}
});
}
async function _initLikeButton(page, occasionId) {
const btn = page.querySelector('[data-action="occasion-like"]');
if (!btn) return;
btn.addEventListener('click', () => handleOccasionLike(btn));
const user = getCurrentUser();
if (user) {
try {
const liked = await getUserOccasionLike(occasionId, user.uid);
btn.classList.toggle('active', liked);
btn.setAttribute('aria-pressed', String(liked));
markPendingLikes(page, user.uid);
} catch {   }
}
}
