import { getIdeas, getUserVote } from '../data/db.js';
import { sendIdeaVote, listPendingReactions } from '../shared/reaction-outbox.js';
import { showToast } from '../shared/toast.js';
import { SubmissionGuardError } from '../shared/submission-guard.js';
import { requireRealAuth, getCurrentUser } from '../data/auth.js';
import { IDEA_CATEGORIES, IDEA_VOTE_THRESHOLDS } from '../data/idea-box-data.js';
import { emptyState } from '../shared/empty-state.js';
import { escapeHtml } from '../shared/sanitize.js';
import { staffBadge } from '../shared/staff-badge.js';
import { errorState, bindErrorRetry } from '../shared/error-state.js';
import { openAddIdeaModal } from '../shared/idea-form-modal.js';
import { renderReviewNotice } from '../shared/review-notice.js';
import { getNewIds, markSeen } from '../shared/content-freshness.js';
import { itemAttrs, itemMenuButton, bindItemActions, editedMark } from '../shared/item-actions.js';
import { playVoteUpSound, playVoteDownSound } from '../shared/sound-fx.js';
import { renderIcons } from '../shared/icons.js';
const _ideasCache = new Map();
const _votesCache  = new Map();
let _newIds = new Set();
export function categoryLabel(key) {
return IDEA_CATEGORIES.find(c => c.key === key)?.label || key;
}
export const STATUS_ICON = {
promising: 'trending-up',
discussion: 'users',
weak: 'trending-down',
};
export const STATUS_BADGE_CLASS = {
promising: 'badge--brand',
discussion: 'badge--warning',
weak: 'badge--error',
};
export function applyLocalVote({ votesUp = 0, votesDown = 0 }, prev, next) {
let up = votesUp; let down = votesDown;
if (prev === 'up') up -= 1;
if (prev === 'down') down -= 1;
if (next === 'up') up += 1;
if (next === 'down') down += 1;
return { votesUp: Math.max(0, up), votesDown: Math.max(0, down) };
}
export function voteErrorMessage(err) {
return err instanceof SubmissionGuardError || /محظور|صلاحية/.test(err?.message || '')
? err.message
: 'صوتك ما اتسجّل — جرّب تاني';
}
export function updateIdeaProgressUI(card, { votesUp, votesDown }) {
const total = votesUp + votesDown;
const percent = total > 0 ? Math.round((votesUp / total) * 100) : 0;
const hasEnoughVotes = total >= IDEA_VOTE_THRESHOLDS.minVotesForVerdict;
const progress = card.querySelector('.idea-card__progress');
const fill = card.querySelector('.progress-fill');
const value = card.querySelector('.progress-value');
const hint = card.querySelector('.idea-card__progress-hint');
progress?.classList.toggle('idea-card__progress--pending', !hasEnoughVotes);
if (fill) fill.style.width = `${hasEnoughVotes ? percent : 100}%`;
if (value) value.textContent = hasEnoughVotes ? `${percent}%` : 'لسع قليلة';
if (hint) {
hint.textContent = `النسبة بتوضح بعد ٥ أصوات على الأقل (${total} الآن)`;
hint.classList.toggle('hidden', hasEnoughVotes);
}
return { percent, total, hasEnoughVotes };
}
function renderIdeaCard(idea, userVote) {
if (idea.moderation === 'pending') return renderReviewNotice('idea', idea.id);
const authorInitial = (idea.authorName || '؟').trim().charAt(0);
const isNew = _newIds.has(String(idea.id));
return `
    <article class="idea-card${idea.moderation === 'pending' ? ' idea-card--pending' : ''}${idea.moderation === 'reported' ? ' idea-card--reported' : ''}" data-idea-id="${idea.id}" data-category="${idea.category}" data-status="${idea.statusKey}" ${itemAttrs({ kind: 'idea', id: idea.id, owner: idea.authorUid, created: idea.createdAt, moderation: idea.moderation })}>

      <div class="idea-card__head">
        <div class="idea-card__author">
          <span class="avatar avatar--sm" aria-hidden="true">${authorInitial}</span>
          <span class="idea-card__author-info">
            <span class="idea-card__author-label">صاحب الفكرة</span>
            <span class="idea-card__author-name">${escapeHtml(idea.authorName)}${staffBadge(idea.staffRole)}</span>
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

      ${idea.moderation === 'reported' ? `
        <p class="pending-review-note"><i data-icon="flag"></i> وصلت بلاغات على هذه الفكرة — اتخفت عن الناس لحد ما يراجعها المشرف، وأنت وحدك الشايفها هسّع.</p>
      ` : ''}

      ${idea.moderation === 'pending' ? `
        <p class="pending-review-note"><i data-icon="clock"></i> قيد المراجعة — ما تظهر للناس إلا بعد موافقة المشرف، وأنت وحدك الشايفها هسّع.</p>
      ` : ''}

      <div class="idea-card__body">
        <h3 class="idea-card__title">${escapeHtml(idea.title)}</h3>
      </div>

      <div class="idea-card__info">
        <div class="idea-card__meta">
          ${isNew ? '<span class="content-new-badge">جديد</span>' : ''}
          <span>${idea.date}${editedMark(idea)}</span>
          <span class="idea-card__dot" aria-hidden="true">•</span>
          <span>${categoryLabel(idea.category)}</span>
        </div>

        <div class="idea-card__entity">
          <span class="idea-card__entity-icon" aria-hidden="true">
            <i data-icon="building-2"></i>
          </span>
          <span class="idea-card__entity-body">
            <span class="idea-card__entity-label">الجهة المقترحة</span>
            <span class="idea-card__entity-value">${escapeHtml(idea.proposedEntity)}</span>
          </span>
        </div>
      </div>

      <div class="idea-card__progress${idea.hasEnoughVotes ? '' : ' idea-card__progress--pending'}">
        <div class="progress-info">
          <span class="progress-label">نسبة التأييد</span>
          <span class="progress-value">${idea.hasEnoughVotes ? `${idea.percent}%` : 'لسع قليلة'}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${idea.hasEnoughVotes ? idea.percent : 100}%;"></div>
        </div>
        <p class="idea-card__progress-hint${idea.hasEnoughVotes ? ' hidden' : ''}">النسبة بتوضح بعد ٥ أصوات على الأقل (${idea.totalVotes} الآن)</p>
      </div>

      <div class="idea-card__footer">
        <div class="idea-vote-buttons">
          <button class="idea-vote-btn idea-vote-btn--up${userVote === 'up' ? ' active' : ''}" data-action="vote-idea" data-vote="up" data-idea-id="${idea.id}" aria-label="متفق مع الفكرة دي">
            <i data-icon="thumbs-up"></i>
            <span class="idea-vote-btn__label">أؤيد</span>
            <span class="idea-vote-count" aria-label="${idea.votesUp} شخص">
              <i data-icon="users"></i><span class="idea-vote-count__num">${idea.votesUp}</span>
            </span>
          </button>
          <button class="idea-vote-btn idea-vote-btn--down${userVote === 'down' ? ' active' : ''}" data-action="vote-idea" data-vote="down" data-idea-id="${idea.id}" aria-label="لا متفق مع الفكرة دي">
            <i data-icon="thumbs-down"></i>
            <span class="idea-vote-btn__label">لا أؤيد</span>
            <span class="idea-vote-count" aria-label="${idea.votesDown} شخص">
              <i data-icon="users"></i><span class="idea-vote-count__num">${idea.votesDown}</span>
            </span>
          </button>
        </div>
        <button class="idea-card__details" data-action="idea-details" data-idea-id="${idea.id}">
          <span>عرض التفاصيل والتعليقات</span>
          <i data-icon="chevron-left"></i>
        </button>
      </div>

    </article>
  `;
}
function renderSkeletonCards(n = 3) {
return Array.from({ length: n }, () => `
    <article class="idea-card idea-card--skeleton" aria-hidden="true">
      <!-- يحاكي البطاقة الحقيقية: صاحب الفكرة، الحالة، العنوان، الوصف، شريط التأييد -->
      <div class="page-skeleton__row">
        <div class="page-skeleton__avatar page-skeleton__avatar--sm"></div>
        <div class="page-skeleton__line page-skeleton__line--sm"></div>
      </div>
      <div class="page-skeleton__pill page-skeleton__pill--tag"></div>
      <div class="page-skeleton__line page-skeleton__line--lg"></div>
      <div class="page-skeleton__line"></div>
      <div class="page-skeleton__line page-skeleton__line--md"></div>
      <div class="page-skeleton__actions">
        <div class="page-skeleton__pill"></div>
        <div class="page-skeleton__pill"></div>
      </div>
    </article>
  `).join('');
}
export function renderIdeaBox() {
return `
    <section class="page idea-box-page">

      <div class="page-intro">
        <p>
          عندك فكرة ممكن تفيد البلد؟ اطرحها هنا. خلي الناس يشوفوها،
          يأيدوها أو يناقشوها، ويمكن تكون بداية مشروع يخدم شبتوت بحري.
        </p>
        <button class="cta-button cta-button--full" data-action="add-idea">
          <i data-icon="plus"></i>
          إضافة فكرة
        </button>
      </div>

      <section class="idea-box-feed" id="idea-box-feed">
        ${renderSkeletonCards()}
      </section>

    </section>
  `;
}
export async function initIdeaBox() {
const page = document.querySelector('.idea-box-page');
if (!page) return;
page.querySelector('[data-action="add-idea"]')?.addEventListener('click', async () => {
const ok = await requireRealAuth();
if (!ok) return;
openAddIdeaModal(async () => {
await _loadFeed(page);
});
});
_bindFeedRefresh(page);
await _loadFeed(page, { swr: true });
}
function _bindFeedRefresh(page) {
const onRefreshed = e => {
if (!page.isConnected) { window.removeEventListener('akdar:data-refreshed', onRefreshed); return; }
if (e.detail?.collection === 'ideas') _loadFeed(page);
};
window.addEventListener('akdar:data-refreshed', onRefreshed);
}
async function _loadFeed(page, { swr = false } = {}) {
const feed = page.querySelector('#idea-box-feed');
if (!feed) return;
try {
const ideas = await getIdeas({ sort: 'new', viewerUid: getCurrentUser()?.uid || null, swr });
if (!ideas.length) {
feed.innerHTML = emptyState({
icon: 'lightbulb',
title: 'لسع ما في أفكار',
desc: 'كن أول زول يضيف فكرة هنا.',
});
renderIcons();
return;
}
const user = getCurrentUser();
_ideasCache.clear();
_votesCache.clear();
_newIds = getNewIds('ideas', ideas);
markSeen('ideas', ideas);
const cards = await Promise.all(ideas.map(async idea => {
const vote = user ? await getUserVote(idea.id, user.uid) : null;
_ideasCache.set(idea.id, idea);
_votesCache.set(idea.id, vote);
return renderIdeaCard(idea, vote);
}));
feed.innerHTML = cards.join('');
renderIcons();
feed.querySelectorAll('[data-action="idea-details"]').forEach(btn => {
btn.addEventListener('click', async () => {
const { ideaId } = btn.dataset;
const idea = _ideasCache.get(ideaId);
if (!idea) return;
const { openIdeaDetail } = await import('./idea-box-detail.js');
openIdeaDetail(idea, _votesCache.get(ideaId) ?? null);
});
});
_bindVoteButtons(feed);
_markPendingVotes(feed, user?.uid);
bindItemActions(feed, {
getData: d => _ideasCache.get(d.id),
onChange: () => _loadFeed(page),
});
} catch {
feed.innerHTML = errorState({ subject: 'الأفكار' });
renderIcons(feed);
bindErrorRetry(feed, () => _loadFeed(page));
}
}
function _setVoteActive(card, vote) {
card?.querySelectorAll('.idea-vote-btn').forEach(b => b.classList.toggle('active', b.dataset.vote === vote));
}
function _renderVoteCounts(card, { votesUp, votesDown }) {
const upCount = card.querySelector('.idea-vote-btn--up .idea-vote-count');
const downCount = card.querySelector('.idea-vote-btn--down .idea-vote-count');
upCount.querySelector('.idea-vote-count__num').textContent = votesUp;
upCount.setAttribute('aria-label', `${votesUp} شخص`);
downCount.querySelector('.idea-vote-count__num').textContent = votesDown;
downCount.setAttribute('aria-label', `${votesDown} شخص`);
return updateIdeaProgressUI(card, { votesUp, votesDown });
}
function _setVotePending(card, on) {
card?.querySelectorAll('.idea-vote-btn').forEach(b => { if (on) b.dataset.pending = 'true'; else delete b.dataset.pending; });
}
function _storeVote(ideaId, counts, vote) {
const cached = _ideasCache.get(ideaId);
if (cached) {
const total = counts.votesUp + counts.votesDown;
_ideasCache.set(ideaId, { ...cached, ...counts, percent: total > 0 ? Math.round((counts.votesUp / total) * 100) : 0 });
}
_votesCache.set(ideaId, vote);
}
function _bindVoteButtons(feed) {
feed.querySelectorAll('[data-action="vote-idea"]').forEach(btn => {
btn.addEventListener('click', async () => {
const ok = await requireRealAuth();
if (!ok) return;
const { ideaId, vote } = btn.dataset;
const user = getCurrentUser();
const card = feed.querySelector(`.idea-card[data-idea-id="${ideaId}"]`);
const prev = _votesCache.get(ideaId) ?? null;
if (!card || vote === prev) return;
const cached = _ideasCache.get(ideaId);
const prevCounts = { votesUp: cached?.votesUp ?? 0, votesDown: cached?.votesDown ?? 0 };
const local = applyLocalVote(prevCounts, prev, vote);
_setVoteActive(card, vote);
_renderVoteCounts(card, local);
vote === 'up' ? playVoteUpSound() : playVoteDownSound();
try {
const out = await sendIdeaVote(ideaId, user.uid, vote);
const counts = out.pending ? local : out.result;
_setVotePending(card, out.pending);
_renderVoteCounts(card, counts);
_storeVote(ideaId, counts, vote);
} catch (err) {
_setVoteActive(card, prev);
_renderVoteCounts(card, prevCounts);
showToast(voteErrorMessage(err), 'error');
}
});
});
}
window.addEventListener('akdar:reaction-synced', (e) => {
const d = e.detail;
if (d?.kind !== 'idea-vote' || !d.result) return;
const card = document.querySelector(`.idea-card[data-idea-id="${CSS.escape(d.targetId)}"]`);
_storeVote(d.targetId, d.result, d.desired);
if (!card) return;
_setVotePending(card, false);
_setVoteActive(card, d.desired);
_renderVoteCounts(card, d.result);
});
window.addEventListener('akdar:reaction-failed', (e) => {
const d = e.detail;
if (d?.kind !== 'idea-vote') return;
const cached = _ideasCache.get(d.targetId);
const counts = applyLocalVote({ votesUp: cached?.votesUp ?? 0, votesDown: cached?.votesDown ?? 0 }, d.desired, null);
_storeVote(d.targetId, counts, null);
const card = document.querySelector(`.idea-card[data-idea-id="${CSS.escape(d.targetId)}"]`);
if (!card) return;
_setVotePending(card, false);
_setVoteActive(card, null);
_renderVoteCounts(card, counts);
});
function _markPendingVotes(feed, uid) {
if (!uid) return;
for (const e of listPendingReactions('idea-vote', uid)) {
_setVotePending(feed.querySelector(`.idea-card[data-idea-id="${CSS.escape(e.targetId)}"]`), true);
}
}
