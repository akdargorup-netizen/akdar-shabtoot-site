import { importancePayload } from './importance.js';
import { stageOrRun, stagedMsg } from './admin-batch.js';
import { confirmAction } from './admin-ui.js';
import { logAdminAction } from './admin-activity.js';
import { showToast } from './toast.js';
import { renderIcons } from './icons.js';
const BTN_CLASS = 'admin-clear-important';
const _isImportant = (item) => Boolean(item && item.important);
export function syncClearImportant(page, items, { section, noun, onDone } = {}) {
if (!page || !section) return;
const toolbar = page.querySelector('.admin-content-toolbar');
if (!toolbar) return;
const important = (Array.isArray(items) ? items : []).filter(_isImportant);
let btn = toolbar.querySelector(`.${BTN_CLASS}`);
if (!btn) {
btn = document.createElement('button');
btn.type = 'button';
btn.className = `btn btn--ghost ${BTN_CLASS}`;
btn.dataset.action = 'clear-important';
btn.innerHTML = '<i data-lucide="rotate-ccw"></i><span></span>';
toolbar.appendChild(btn);
renderIcons(btn);
btn.addEventListener('click', () => _run(btn));
}
btn._state = { section, noun: noun || 'عنصر', important, onDone };
btn.querySelector('span').textContent = `إلغاء تحديد كل المهم (${important.length})`;
btn.classList.toggle('hidden', important.length === 0);
}
async function _run(btn) {
const st = btn._state;
if (!st || !st.important.length || btn.disabled) return;
const { section, noun, important, onDone } = st;
const n = important.length;
const ok = await confirmAction({
title: 'إلغاء تحديد كل المهم؟',
message: `حيتشال وسم «مهم» من ${n} ${noun}، فترجع كلها لترتيبها العادي.\nبعدها تقدر تحدد المهم من جديد بالترتيب اللي تريده.\nالمحتوى نفسه ما بيتغيّر.`,
confirmLabel: 'ألغِ تحديد الكل',
icon: 'rotate-ccw',
});
if (!ok) return;
btn.disabled = true;
let done = 0;
let failed = 0;
let staged = false;
try {
for (const item of important) {
try {
const wasStaged = await stageOrRun(
section, item.id, importancePayload(false, item),
{ label: item.title || item.name || String(item.id) },
);
if (wasStaged) staged = true;
done++;
} catch (err) {
failed++;
console.error('[AdminImportant] فشل إلغاء التحديد:', item?.id, err);
}
}
} finally {
btn.disabled = false;
}
if (failed) {
showToast(`اتشال وسم المهم من ${done} من ${n} ${noun} — ${failed} ما اتحفظت، حاول مرة تانية`, 'error', 5000);
} else {
showToast(staged ? stagedMsg() : `اتشال وسم المهم من ${done} ${noun}`, 'success');
}
if (done && !staged) logAdminAction('إلغاء تحديد كل المهم', `${done} ${noun}`);
try { await onDone?.(); } catch (err) { console.error('[AdminImportant] تعذّر تحديث القائمة:', err); }
}
