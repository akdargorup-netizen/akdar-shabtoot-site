export function isPolicyArticle(a) {
const t = String(a?.title || '').replace(/[\u064B-\u0652\u0640]/g, '');
return /سياس[ةيه]\s*(ال)?تحرير/.test(t) || t.includes('التحريرية');
}
export async function fetchPolicyArticle() {
try {
const { getHistoryArticles, getHistoryArticle } = await import('../data/db.js');
const list   = await getHistoryArticles();
const policy = list.find(isPolicyArticle);
if (!policy) return null;
return policy.lite ? ((await getHistoryArticle(policy.id)) || policy) : policy;
} catch {
return null;
}
}
const SEEN_KEY = 'akdar-policy-prompt-seen';
export function policyPromptSeen() {
try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return true; }
}
function markPolicyPromptSeen() {
try { localStorage.setItem(SEEN_KEY, '1'); } catch {   }
}
export async function maybeShowPolicyPrompt(onRead) {
if (policyPromptSeen()) return;
markPolicyPromptSeen();
const { openConfirm } = await import('./confirm-modal.js');
const read = await openConfirm({
title:        'قبل أن تبدأ القراءة',
message:      'نوصيك بقراءة سياسة التحرير أولاً؛ فيها كيف نكتب مقالاتنا ونوثّق معلوماتنا وما نلتزم به أمامك.',
confirmLabel: 'اقرأ سياسة التحرير',
cancelLabel:  'لاحقاً',
icon:         'scroll-text',
});
if (read) onRead?.();
}
