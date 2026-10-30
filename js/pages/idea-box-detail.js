import { navigateTo } from '../core/router.js';
import { isTransientFailure, shouldQueue, BUSY_HINT } from '../shared/transient-error.js';
import { getIdea, getUserVote, getIdeaComments, addIdeaComment, toggleIdeaCommentLike, formatRelativeTime } from '../data/db.js';
import { requireRealAuth, getCurrentUser } from '../data/auth.js';
import { categoryLabel, STATUS_ICON, STATUS_BADGE_CLASS, updateIdeaProgressUI, applyLocalVote, voteErrorMessage } from './idea-box.js';
import { sendIdeaVote, getPendingReaction } from '../shared/reaction-outbox.js';
import { formatCompactCount } from '../shared/arabic-digits.js';
import { showToast } from '../shared/toast.js';
import { errorState, bindErrorRetry } from '../shared/error-state.js';
import { renderIcons } from '../shared/icons.js';
import { escapeHtml } from '../shared/sanitize.js';
import { staffBadge, staffRoleField } from '../shared/staff-badge.js';
import { SubmissionGuardError } from '../shared/submission-guard.js';
import { queueIdeaComment, getQueuedIdeaComments } from '../shared/comment-outbox.js';
import { playLikeSound, playCommentSound, playVoteUpSound, playVoteDownSound } from '../shared/sound-fx.js';
import { itemAttrs, itemMenuButton, bindItemActions, editedMark } from '../shared/item-actions.js';
import { isAdminSessionUnlocked } from '../data/admin-auth.js';
let _currentIdea = null;
let _currentVote = null;
let _commentIndex = new Map();
const IDEA_COMMENT_MAX_LENGTH = 500;
export function openIdeaDetail(idea, userVote = null) {
_currentIdea = idea;
_currentVote = userVote;
window.__ideaDetailModule = { idea };
navigateTo('idea-box-detail');
}
function _authorInitial(name) {
return (name || '؟').trim().charAt(0);
}
function _commentView(comment, currentUid) {
const isOwn = !!currentUid && comment.uid === currentUid;
const deleted = !!comment.deletedByAuthor;
const reported = comment.moderation === 'reported';
const hidden = reported && !isOwn && !isAdminSessionUnlocked();
return { isOwn, deleted, reported, hidden, interactive: !deleted && !hidden };
}
function _commentTextHtml(comment, view) {
if (view.deleted) return `<p class="occasion-bubble__text item-placeholder-text">تم حذف هذا التعليق</p>`;
if (view.hidden)  return `<p class="occasion-bubble__text item-placeholder-text">تعليق قيد مراجعة المشرف</p>`;
return `${view.reported ? '<p class="item-reported-note"><i data-icon="flag"></i> قيد مراجعة المشرف بعد بلاغات</p>' : ''}`;
}
function _commentItemAttrs(comment) {
return itemAttrs({ kind: 'idea-comment', id: comment.id, parent: _currentIdea?.id ?? '', owner: comment.uid, created: comment.createdAt, moderation: comment.moderation });
}
function _renderCommentLike(comment, currentUid) {
const liked = !!currentUid && (comment.likedBy ?? []).includes(currentUid);
const count = comment.likesCount ?? 0;
return `
    <button type="button" class="occasion-bubble__like${liked ? ' active' : ''}" data-action="idea-comment-like" data-comment-id="${escapeHtml(comment.id)}" aria-pressed="${liked}" aria-label="إعجاب بالتعليق">
      <i data-icon="heart"></i>
      <span class="occasion-bubble__like-count">${count > 0 ? formatCompactCount(count) : ''}</span>
    </button>
  `;
}
function _renderComment(comment, currentUid) {
const view = _commentView(comment, currentUid);
const isOwn = view.isOwn;
const pending = !!comment._pending;
return `
    <div class="occasion-bubble-row ${isOwn ? 'occasion-bubble-row--own' : 'occasion-bubble-row--other'}" data-comment-id="${escapeHtml(comment.id)}" ${pending ? '' : _commentItemAttrs(comment)}>
      <span class="avatar avatar--sm occasion-bubble-row__avatar" aria-hidden="true">${_authorInitial(comment.authorName)}</span>
      <div class="occasion-bubble" data-own="${isOwn}" data-status="${pending ? 'pending' : 'sent'}">
        ${view.hidden || pending ? '' : itemMenuButton({ small: true, corner: true })}
        <p class="occasion-bubble__author">${escapeHtml(comment.authorName)}${staffBadge(comment.staffRole)}</p>
        ${_commentTextHtml(comment, view)}
        ${view.interactive ? `<p class="occasion-bubble__text">${escapeHtml(comment.text)}</p>` : ''}
        <div class="occasion-bubble__footer">
          <span class="occasion-bubble__meta">
            <span class="occasion-bubble__time">${formatRelativeTime(comment.createdAt)}${view.interactive ? editedMark(comment) : ''}</span>
            ${isOwn && view.interactive ? `<i class="occasion-bubble__status-icon" data-icon="${pending ? 'clock' : 'check'}" aria-label="${pending ? 'لسع ما اترسلت — قاعدة تنتظر الخدمة' : 'اترسلت'}"></i>` : ''}
          </span>
          ${view.interactive && !pending ? _renderCommentLike(comment, currentUid) : ''}
        </div>
      </div>
    </div>
  `;
}
export function renderIdeaBoxDetail() {
const idea = _currentIdea;
if (!idea) {
return `
      <section class="page idea-detail-page">
        <p class="error-state">الفكرة دي مش موجودة هسّع — ممكن تكون اتحذفت</p>
      </section>
    `;
}
return `
    <section class="page idea-detail-page">

      <article class="idea-card idea-detail-card" data-idea-id="${idea.id}" ${itemAttrs({ kind: 'idea', id: idea.id, owner: idea.authorUid, created: idea.createdAt, moderation: idea.moderation })}>

        <div class="idea-card__head">
          <div class="idea-card__author">
            <span class="avatar avatar--sm" aria-hidden="true">${_authorInitial(idea.authorName)}</span>
            <span class="idea-card__author-info">
              <span class="idea-card__author-name">${escapeHtml(idea.authorName)}</span>${staffBadge(idea.staffRole)}
            </span>
          </div>
          ${itemMenuButton()}
        </div>

        <div class="idea-card__tags">
          <span class="badge ${STATUS_BADGE_CLASS[idea.statusKey]}">
            <i data-icon="${STATUS_ICON[idea.statusKey]}"></i>
            ${idea.statusLabel}
          </span>
          ${idea.isTopVoted ? `<span class="badge idea-card__top-badge"><i data-icon="star"></i> الأكثر تأييدًا</span>` : ''}
        </div>

        <div class="idea-card__body">
          <h3 class="idea-detail-card__title">${escapeHtml(idea.title)}</h3>
          <p class="idea-detail-card__desc">${escapeHtml(idea.description)}</p>

          ${idea.benefit ? `
            <div class="idea-detail-card__benefit">
              <span class="idea-detail-card__benefit-label">
                <i data-icon="sparkles"></i>
                الفائدة المتوقعة
              </span>
              <p>${escapeHtml(idea.benefit)}</p>
            </div>
          ` : ''}
        </div>

        <div class="idea-card__meta idea-detail-card__meta">
          <span>${idea.date}${editedMark(idea)}</span>
          <span class="idea-card__dot" aria-hidden="true">•</span>
          <span>${categoryLabel(idea.category)}</span>
          <span class="idea-card__dot" aria-hidden="true">•</span>
          <span>الجهة المقترحة: ${escapeHtml(idea.proposedEntity)}</span>
        </div>

        <div class="idea-card__progress${idea.hasEnoughVotes ? '' : ' idea-card__progress--pending'}" id="idea-detail-progress">
          <div class="progress-info">
            <span class="progress-label">نسبة التأييد</span>
            <span class="progress-value" id="idea-detail-percent">${idea.hasEnoughVotes ? `${idea.percent}%` : 'لسع قليلة'}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" id="idea-detail-fill" style="width: ${idea.hasEnoughVotes ? idea.percent : 100}%;"></div>
          </div>
          <p class="idea-card__progress-hint${idea.hasEnoughVotes ? ' hidden' : ''}" id="idea-detail-progress-hint">النسبة بتوضح بعد ٥ أصوات على الأقل (${idea.totalVotes} الآن)</p>
        </div>

        <div class="idea-vote-buttons idea-detail-card__votes">
          <button class="idea-vote-btn idea-vote-btn--up${_currentVote === 'up' ? ' active' : ''}" data-action="vote-idea-detail" data-vote="up" aria-label="متفق مع الفكرة دي">
            <i data-icon="thumbs-up"></i>
            <span class="idea-vote-btn__label">أؤيد</span>
            <span class="idea-vote-count" aria-label="${idea.votesUp} شخص">
              <i data-icon="users"></i><span class="idea-vote-count__num" id="idea-detail-up-count">${idea.votesUp}</span>
            </span>
          </button>
          <button class="idea-vote-btn idea-vote-btn--down${_currentVote === 'down' ? ' active' : ''}" data-action="vote-idea-detail" data-vote="down" aria-label="لا متفق مع الفكرة دي">
            <i data-icon="thumbs-down"></i>
            <span class="idea-vote-btn__label">لا أؤيد</span>
            <span class="idea-vote-count" aria-label="${idea.votesDown} شخص">
              <i data-icon="users"></i><span class="idea-vote-count__num" id="idea-detail-down-count">${idea.votesDown}</span>
            </span>
          </button>
        </div>

      </article>

      <section class="occasion-detail-comments">
        <h3 class="occasion-detail-comments__heading">
          <i data-icon="message-circle"></i>
          التعليقات
        </h3>

        <div class="occasion-detail-comments__list" id="idea-detail-comments-list">
          <p class="occasion-detail-comments__loading">قاعدين نجيب التعليقات...</p>
        </div>

        <form class="occasion-detail-comment-form" id="idea-detail-comment-form">
          <div class="occasion-detail-comment-form__row">
            <textarea
              class="occasion-detail-comment-form__input"
              id="idea-detail-comment-input"
              rows="1"
              maxlength="${IDEA_COMMENT_MAX_LENGTH}"
              placeholder="شاركنا رأيك في هذه الفكرة..."
            ></textarea>
            <button type="submit" class="occasion-detail-comment-form__submit" aria-label="إرسال التعليق">
              <i data-icon="send"></i>
            </button>
          </div>
          <span class="occasion-detail-comment-form__counter" id="idea-detail-comment-counter">0/${IDEA_COMMENT_MAX_LENGTH}</span>
        </form>
      </section>

    </section>
  `;
}
function _bindDetailRefresh(page, ideaId) {
const onRefreshed = (e) => {
if (!page.isConnected) { window.removeEventListener('akdar:data-refreshed', onRefreshed); return; }
const d = e.detail || {};
if (d.collection === 'idea_comments' && String(d.id) === String(ideaId)) _loadComments(page, ideaId);
};
window.addEventListener('akdar:data-refreshed', onRefreshed);
}
let _onOutboxEvent = null;
function _bindOutboxEvents(page, ideaId) {
if (_onOutboxEvent) {
window.removeEventListener('akdar:comment-synced', _onOutboxEvent);
window.removeEventListener('akdar:comment-failed', _onOutboxEvent);
}
_onOutboxEvent = (e) => {
const d = e.detail || {};
if (d.kind !== 'idea' || String(d.ideaId) !== String(ideaId)) return;
if (!page.isConnected) return;
if (e.type === 'akdar:comment-synced') {
_loadComments(page, ideaId);
} else {
page.querySelector(`[data-comment-id="${CSS.escape(String(d.tempId))}"]`)?.remove();
const input = page.querySelector('#idea-detail-comment-input');
if (input && !input.value && d.text) input.value = d.text;
showToast(d.message || 'تعليقك ما اتبعتش', 'error');
}
};
window.addEventListener('akdar:comment-synced', _onOutboxEvent);
window.addEventListener('akdar:comment-failed', _onOutboxEvent);
}
async function _loadComments(page, ideaId) {
const list = page.querySelector('#idea-detail-comments-list');
if (!list) return;
try {
const comments = await getIdeaComments(ideaId);
const queued = getQueuedIdeaComments(ideaId);
if (!comments.length && !queued.length) {
_commentIndex = new Map();
list.innerHTML = `<p class="occasion-detail-comments__empty">كن أول من يعلّق على هذه الفكرة.</p>`;
return;
}
_commentIndex = new Map(comments.map(c => [c.id, c]));
const currentUid = getCurrentUser()?.uid || null;
const visible = comments.filter(c => !c.deletedByAuthor);
if (!visible.length && !queued.length) {
list.innerHTML = `<p class="occasion-detail-comments__empty">كن أول من يعلّق على هذه الفكرة.</p>`;
return;
}
list.innerHTML = [...visible, ...queued].map(c => _renderComment(c, currentUid)).join('');
renderIcons(list);
} catch {
list.innerHTML = errorState({ subject: 'التعليقات' });
renderIcons(list);
bindErrorRetry(list, () => _loadComments(page, ideaId));
}
}
function _bindCounter(textarea, counterEl) {
if (!textarea || !counterEl) return;
textarea.addEventListener('input', () => {
counterEl.textContent = `${textarea.value.length}/${IDEA_COMMENT_MAX_LENGTH}`;
});
}
async function _toggleCommentLike(list, ideaId, btn) {
if (btn.dataset.busy) return;
const commentId = btn.dataset.commentId;
btn.dataset.busy = '1';
try {
const ok = await requireRealAuth();
if (!ok) return;
const { liked, likesCount } = await toggleIdeaCommentLike(ideaId, commentId, getCurrentUser().uid);
if (liked) playLikeSound();
const target = [...list.querySelectorAll('[data-action="idea-comment-like"]')]
.find(b => b.dataset.commentId === commentId) ?? btn;
target.classList.toggle('active', liked);
target.setAttribute('aria-pressed', String(liked));
const countEl = target.querySelector('.occasion-bubble__like-count');
if (countEl) countEl.textContent = likesCount > 0 ? formatCompactCount(likesCount) : '';
const cached = _commentIndex.get(commentId);
if (cached) {
const uid = getCurrentUser().uid;
cached.likedBy = (cached.likedBy ?? []).filter(u => u !== uid);
if (liked) cached.likedBy.push(uid);
cached.likesCount = likesCount;
}
} catch (err) {
showToast(err.message || 'الإعجاب لسع ما اتسجّل — جرّب تاني', 'error');
} finally {
delete btn.dataset.busy;
}
}
function _bindCommentActions(page, ideaId) {
const list = page.querySelector('#idea-detail-comments-list');
if (!list) return;
list.addEventListener('click', e => {
const likeBtn = e.target.closest('[data-action="idea-comment-like"]');
if (likeBtn) _toggleCommentLike(list, ideaId, likeBtn);
});
}
function _bindCommentForm(page, ideaId) {
const form = page.querySelector('#idea-detail-comment-form');
if (!form) return;
const input   = form.querySelector('#idea-detail-comment-input');
const counter = form.querySelector('#idea-detail-comment-counter');
_bindCounter(input, counter);
form.addEventListener('submit', async e => {
e.preventDefault();
const text = input.value.trim();
if (!text) return;
const ok = await requireRealAuth();
if (!ok) return;
const user = getCurrentUser();
const submitBtn = form.querySelector('.occasion-detail-comment-form__submit');
submitBtn.disabled = true;
const clientId = (globalThis.crypto?.randomUUID?.() || `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
const draft = { uid: user.uid, authorName: user.displayName || 'مستخدم', text, ...staffRoleField(), clientId };
const parkInQueue = (busyMsg) => {
const queued = queueIdeaComment(ideaId, draft);
input.value = '';
if (counter) counter.textContent = `0/${IDEA_COMMENT_MAX_LENGTH}`;
const list = page.querySelector('#idea-detail-comments-list');
if (list) {
if (list.querySelector('.occasion-detail-comments__empty')) list.innerHTML = '';
list.insertAdjacentHTML('beforeend', _renderComment(queued, user.uid));
renderIcons(list.lastElementChild);
}
showToast(busyMsg, 'info');
};
if (!navigator.onLine) {
parkInQueue('مافي اتصال بالشبكة — تعليقك حيتبعت تلقائي أول ما ترجع');
submitBtn.disabled = false;
return;
}
try {
const newComment = await addIdeaComment(ideaId, draft);
input.value = '';
if (counter) counter.textContent = `0/${IDEA_COMMENT_MAX_LENGTH}`;
playCommentSound();
_commentIndex.set(newComment.id, newComment);
const list = page.querySelector('#idea-detail-comments-list');
if (list) {
if (list.querySelector('.occasion-detail-comments__empty')) list.innerHTML = '';
list.insertAdjacentHTML('beforeend', _renderComment(newComment, user.uid));
renderIcons(list.lastElementChild);
}
showToast('تعليقك اتضاف', 'success');
} catch (err) {
console.error('[Idea] فشل إضافة التعليق:', err);
if (shouldQueue(err)) {
parkInQueue(navigator.onLine ? 'الخدمة مشغولة هسّع — تعليقك محفوظ وحيتبعت تلقائي أول ما تهدأ' : 'مافي اتصال بالشبكة — تعليقك حيتبعت تلقائي أول ما ترجع');
return;
}
const raw = err?.code || `${err?.name || ''}-${err?.message || ''}`;
const code = ` (${String(raw).replace(/[^\w/-]/g, '').slice(0, 40)})`;
showToast(err instanceof SubmissionGuardError ? err.message : (isTransientFailure(err) ? BUSY_HINT : `تعليقك لسع ما اتضاف — جرّب تاني${code}`), 'error');
} finally {
submitBtn.disabled = false;
}
});
}
function _setDetailVote(card, vote) {
card.querySelectorAll('.idea-vote-btn').forEach(b => b.classList.toggle('active', b.dataset.vote === vote));
}
function _setDetailPending(card, on) {
card.querySelectorAll('.idea-vote-btn').forEach(b => { if (on) b.dataset.pending = 'true'; else delete b.dataset.pending; });
}
function _renderDetailCounts(card, counts) {
const { votesUp, votesDown } = counts;
card.querySelector('#idea-detail-up-count').textContent = votesUp;
card.querySelector('#idea-detail-down-count').textContent = votesDown;
card.querySelector('.idea-vote-btn--up .idea-vote-count').setAttribute('aria-label', `${votesUp} شخص`);
card.querySelector('.idea-vote-btn--down .idea-vote-count').setAttribute('aria-label', `${votesDown} شخص`);
updateIdeaProgressUI(card, { votesUp, votesDown });
}
function _commitDetailVote(counts, vote) {
_currentIdea = { ..._currentIdea, ...counts };
_currentVote = vote;
window.__ideaDetailModule = { idea: _currentIdea };
}
function _bindVoteButtons(card, ideaId) {
card.querySelectorAll('[data-action="vote-idea-detail"]').forEach(btn => {
btn.addEventListener('click', async () => {
const ok = await requireRealAuth();
if (!ok) return;
const user = getCurrentUser();
const { vote } = btn.dataset;
const prev = _currentVote;
if (vote === prev) return;
const prevCounts = { votesUp: _currentIdea?.votesUp ?? 0, votesDown: _currentIdea?.votesDown ?? 0 };
const local = applyLocalVote(prevCounts, prev, vote);
_setDetailVote(card, vote);
_renderDetailCounts(card, local);
vote === 'up' ? playVoteUpSound() : playVoteDownSound();
try {
const out = await sendIdeaVote(ideaId, user.uid, vote);
const counts = out.pending ? local : out.result;
_setDetailPending(card, out.pending);
_renderDetailCounts(card, counts);
_commitDetailVote(counts, vote);
} catch (err) {
_setDetailVote(card, prev);
_renderDetailCounts(card, prevCounts);
showToast(voteErrorMessage(err), 'error');
}
});
});
}
window.addEventListener('akdar:reaction-synced', (e) => {
const d = e.detail;
if (d?.kind !== 'idea-vote' || !d.result || String(_currentIdea?.id) !== String(d.targetId)) return;
const card = document.querySelector('.idea-detail-card');
if (!card) return;
_setDetailPending(card, false);
_setDetailVote(card, d.desired);
_renderDetailCounts(card, d.result);
_commitDetailVote(d.result, d.desired);
});
window.addEventListener('akdar:reaction-failed', (e) => {
const d = e.detail;
if (d?.kind !== 'idea-vote' || String(_currentIdea?.id) !== String(d.targetId)) return;
const card = document.querySelector('.idea-detail-card');
if (!card) return;
const counts = applyLocalVote({ votesUp: _currentIdea?.votesUp ?? 0, votesDown: _currentIdea?.votesDown ?? 0 }, d.desired, null);
_setDetailPending(card, false);
_setDetailVote(card, null);
_renderDetailCounts(card, counts);
_commitDetailVote(counts, null);
});
export async function initIdeaBoxDetail() {
const page = document.querySelector('.idea-detail-page');
if (!page || !_currentIdea) return;
const ideaId = _currentIdea.id;
const card = page.querySelector('.idea-detail-card');
const commentsLoad = _loadComments(page, ideaId);
_bindDetailRefresh(page, ideaId);
_bindOutboxEvents(page, ideaId);
if (card) {
try {
const user = getCurrentUser();
const [fresh, vote] = await Promise.all([
getIdea(ideaId),
user ? getUserVote(ideaId, user.uid) : Promise.resolve(null),
]);
if (fresh) {
_currentIdea = { ..._currentIdea, votesUp: fresh.votesUp, votesDown: fresh.votesDown };
card.querySelector('#idea-detail-up-count').textContent = fresh.votesUp;
card.querySelector('#idea-detail-down-count').textContent = fresh.votesDown;
card.querySelector('.idea-vote-btn--up .idea-vote-count').setAttribute('aria-label', `${fresh.votesUp} شخص`);
card.querySelector('.idea-vote-btn--down .idea-vote-count').setAttribute('aria-label', `${fresh.votesDown} شخص`);
updateIdeaProgressUI(card, { votesUp: fresh.votesUp, votesDown: fresh.votesDown });
}
card.querySelectorAll('.idea-vote-btn').forEach(b => b.classList.remove('active'));
if (vote === 'up') card.querySelector('.idea-vote-btn--up')?.classList.add('active');
if (vote === 'down') card.querySelector('.idea-vote-btn--down')?.classList.add('active');
_currentVote = vote;
if (user && getPendingReaction('idea-vote', ideaId, user.uid)) _setDetailPending(card, true);
} catch {
}
_bindVoteButtons(card, ideaId);
}
await commentsLoad;
_bindCommentForm(page, ideaId);
_bindCommentActions(page, ideaId);
_bindItemMenus(page, card, ideaId);
}
function _bindItemMenus(page, card, ideaId) {
const list = page.querySelector('#idea-detail-comments-list');
if (card) {
bindItemActions(card, {
getData: () => _currentIdea,
onChange: ({ action, result }) => {
if (action === 'delete') { navigateTo('idea-box'); return; }
if (action === 'report') {
if (result?.hidden) navigateTo('idea-box');
return;
}
if (action === 'edit' && result) _applyIdeaEdit(card, result);
},
});
}
if (list) {
bindItemActions(list, {
getData: d => _commentIndex.get(d.id),
onChange: () => _loadComments(page, ideaId),
});
}
}
function _applyIdeaEdit(card, fresh) {
_currentIdea = { ..._currentIdea, ...fresh };
window.__ideaDetailModule = { idea: _currentIdea };
const titleEl = card.querySelector('.idea-detail-card__title');
if (titleEl) titleEl.textContent = _currentIdea.title;
const descEl = card.querySelector('.idea-detail-card__desc');
if (descEl) descEl.textContent = _currentIdea.description;
const benefitBox = card.querySelector('.idea-detail-card__benefit');
if (benefitBox) {
const p = benefitBox.querySelector('p');
if (_currentIdea.benefit) { if (p) p.textContent = _currentIdea.benefit; }
else benefitBox.remove();
} else if (_currentIdea.benefit) {
card.querySelector('.idea-card__body')?.insertAdjacentHTML('beforeend', `
      <div class="idea-detail-card__benefit">
        <span class="idea-detail-card__benefit-label"><i data-icon="sparkles"></i> الفائدة المتوقعة</span>
        <p>${escapeHtml(_currentIdea.benefit)}</p>
      </div>
    `);
renderIcons(card);
}
const dateEl = card.querySelector('.idea-detail-card__meta > span:first-child');
if (dateEl && !dateEl.querySelector('.item-edited-mark')) dateEl.insertAdjacentHTML('beforeend', editedMark({ editedAt: true }));
}
