const KEY = 'akdar_comment_hearts';
const MAX = 500;
function _read() {
try {
const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
return new Set(Array.isArray(raw) ? raw : []);
} catch {
return new Set();
}
}
const _k = (kind, parentId, commentId) => `${kind}:${parentId}:${commentId}`;
export function isHearted(kind, parentId, commentId) {
return _read().has(_k(kind, parentId, commentId));
}
export function toggleHeart(kind, parentId, commentId) {
const set = _read();
const key = _k(kind, parentId, commentId);
const liked = !set.has(key);
if (liked) set.add(key); else set.delete(key);
try { localStorage.setItem(KEY, JSON.stringify([...set].slice(-MAX))); } catch {   }
return liked;
}
export function applyHeart(comment, kind, parentId, commentId, uid) {
const hearted = !!uid && isHearted(kind, parentId, commentId);
return { ...comment, likedBy: hearted ? [uid] : [], likesCount: 0 };
}
