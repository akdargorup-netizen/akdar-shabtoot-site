import { requireRealAuth, getCurrentUser } from '../data/auth.js';
import { sendOccasionLike, listPendingReactions } from './reaction-outbox.js';
import { playLikeSound } from './sound-fx.js';
import { formatCompactCount } from './arabic-digits.js';
import { showToast } from './toast.js';
const _sel = (id) => `.occasion-like-btn[data-occasion-id="${CSS.escape(String(id))}"]`;
function _setLikeUI(btn, liked, count) {
btn.classList.toggle('active', liked);
btn.setAttribute('aria-pressed', String(liked));
if (count == null) return;
const countEl = btn.querySelector('.occasion-like-btn__count');
if (countEl) countEl.textContent = formatCompactCount(count);
btn.dataset.count = String(count);
}
export async function handleOccasionLike(btn) {
const { occasionId } = btn.dataset;
const ok = await requireRealAuth();
if (!ok) return;
const user = getCurrentUser();
const wasLiked = btn.classList.contains('active');
const want = !wasLiked;
const hasCount = btn.dataset.count !== undefined;
const baseCount = Number(btn.dataset.count) || 0;
btn.disabled = true;
_setLikeUI(btn, want, hasCount ? Math.max(0, baseCount + (want ? 1 : -1)) : null);
if (want) playLikeSound();
try {
const out = await sendOccasionLike(occasionId, user.uid, want);
if (out.pending) {
btn.dataset.pending = 'true';
} else {
delete btn.dataset.pending;
if (out.result) _setLikeUI(btn, out.result.liked, out.result.likesCount);
}
} catch (err) {
_setLikeUI(btn, wasLiked, hasCount ? baseCount : null);
showToast(err.message || 'الإعجاب لسع ما اتسجّل — جرّب تاني', 'error');
} finally {
btn.disabled = false;
}
}
export function markPendingLikes(root, uid) {
if (!uid || !root) return;
for (const e of listPendingReactions('occasion-like', uid)) {
root.querySelectorAll(_sel(e.targetId)).forEach((b) => { b.dataset.pending = 'true'; });
}
}
window.addEventListener('akdar:reaction-synced', (e) => {
const d = e.detail;
if (d?.kind !== 'occasion-like' || !d.result) return;
document.querySelectorAll(_sel(d.targetId)).forEach((b) => {
delete b.dataset.pending;
_setLikeUI(b, d.result.liked, d.result.likesCount);
});
});
window.addEventListener('akdar:reaction-failed', (e) => {
const d = e.detail;
if (d?.kind !== 'occasion-like') return;
document.querySelectorAll(_sel(d.targetId)).forEach((b) => {
delete b.dataset.pending;
const has = b.dataset.count !== undefined;
_setLikeUI(b, !d.desired, has ? Math.max(0, Number(b.dataset.count) + (d.desired ? -1 : 1)) : null);
});
});
