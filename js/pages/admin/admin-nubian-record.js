import { createAudioUploadField, deleteClip } from '../../shared/audio-upload-field.js';
import { stageOrRun, stagedMsg } from '../../shared/admin-batch.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { showToast } from '../../shared/toast.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { confirmAction } from '../../shared/admin-ui.js';
let _closeActive = null;
const REFILL_AT = 3;
const TEXTS = {
words: {
section: 'nubian-word', prefix: 'w', log: 'تسجيل صوت كلمة نوبية', fieldLabel: 'صوت الكلمة 🎙️',
one: 'كلمة', many: 'كلمات', all: 'الكلمات', where: 'القاموس', none: 'ما في كلمات تنتظر',
noneHere: 'ما في كلمة تنتظر صوتًا هنا.', same: 'هذه الكلمة',
},
phrases: {
section: 'nubian-phrase', prefix: 'p', log: 'تسجيل صوت جملة نوبية', fieldLabel: 'صوت الجملة 🎙️',
one: 'جملة', many: 'جمل', all: 'الجمل', where: '«تعلم الكلام»', none: 'ما في جمل تنتظر',
noneHere: 'ما في جملة تنتظر صوتًا هنا.', same: 'هذه الجملة',
},
};
export function openRecordMode({ kind = 'words', words, total, fetchMore, titleOf, scopeTitle = '', onClose } = {}) {
_closeActive?.();
const T = TEXTS[kind] || TEXTS.words;
const queue = [...(words || [])];
const seen = new Set(queue.map(w => String(w.id)));
const confirmed = new Set();
const failed = [];
const grand = Math.max(Number(total) || 0, queue.length);
let hasMore = typeof fetchMore === 'function' && grand > queue.length;
let fetching = null;
let saved = 0;
let inFlight = 0;
let chain = Promise.resolve();
let field = null;
let closing = false;
const root = document.createElement('div');
root.className = 'nrec';
root.setAttribute('role', 'dialog');
root.setAttribute('aria-modal', 'true');
root.setAttribute('aria-label', 'وضع التسجيل');
root.innerHTML = `
    <header class="nrec__bar">
      <button type="button" class="nrec__close" data-nrec="close" aria-label="إغلاق وضع التسجيل"><i data-lucide="x"></i></button>
      <div class="nrec__progress">
        <strong class="nrec__count" data-nrec-count></strong>
        <span class="nrec__scope">${escapeHtml(scopeTitle || 'كل التصنيفات')}</span>
        <div class="nrec__track"><div class="nrec__fill" data-nrec-fill></div></div>
      </div>
    </header>
    <div class="nrec__alert hidden" data-nrec-alert role="alert"></div>
    <main class="nrec__body" data-nrec-body></main>
    <footer class="nrec__foot" data-nrec-foot></footer>`;
document.body.appendChild(root);
document.documentElement.classList.add('nrec-open');
const $ = (s) => root.querySelector(s);
const bodyEl = $('[data-nrec-body]');
const footEl = $('[data-nrec-foot]');
const isRecording = () => Boolean(root.querySelector('.audio-upload-actions .is-recording'));
const waiting = () => queue.length + (hasMore ? Math.max(0, grand - seen.size) : 0);
function close() {
root.remove();
document.documentElement.classList.remove('nrec-open');
_closeActive = null;
onClose?.(confirmed.size);
}
_closeActive = close;
function paintProgress() {
const left = waiting();
const pend = inFlight ? ` · ${inFlight} قيد الحفظ` : '';
$('[data-nrec-count]').textContent = left ? `${saved} تم · ${left} متبقية${pend}` : `تم تسجيل ${saved} ${T.one}${pend}`;
$('[data-nrec-fill]').style.width = `${grand ? Math.min(100, Math.round((saved / grand) * 100)) : 100}%`;
}
function paintAlert() {
const el = $('[data-nrec-alert]');
if (!failed.length) { el.classList.add('hidden'); el.innerHTML = ''; return; }
el.classList.remove('hidden');
el.innerHTML = `
      <span>تعذّر حفظ ${failed.length === 1 ? `«${escapeHtml(failed[0].w.ar || '')}»` : `${failed.length} ${T.many}`} — تسجيلك محفوظ هنا.</span>
      <button type="button" class="btn btn--sm btn--primary" data-nrec="retry">أعد المحاولة</button>`;
}
function enqueueSave(w, f) {
inFlight++;
paintProgress();
chain = chain.then(async () => {
let uploaded = '';
try {
const audio = await f.commit();
if (!audio.changed || !audio.path) throw Object.assign(new Error('سجّل الصوت أولًا'), { userFacing: true });
uploaded = audio.path;
const staged = await stageOrRun(T.section, w.id, { audio: audio.path }, { label: w.ar });
if (!staged) logAdminAction(T.log, w.ar);
else showToast(stagedMsg(), 'success');
uploaded = '';
w.audio = audio.path;
confirmed.add(String(w.id));
} catch (err) {
console.error('[AdminNubian/record] فشل الحفظ:', err);
if (uploaded) deleteClip(uploaded);
failed.push({ w, field: f });
} finally {
inFlight--;
paintProgress();
paintAlert();
if (!field && !queue.length) showDoneIfFinished();
}
});
}
function retryFailed() {
const items = failed.splice(0, failed.length);
paintAlert();
items.forEach(({ w, field: f }) => enqueueSave(w, f));
}
function refill() {
if (!hasMore || fetching) return fetching;
fetching = (async () => {
try {
const offset = Math.max(0, seen.size - confirmed.size);
const batch = (await fetchMore(offset)) || [];
const fresh = batch.filter(w => !seen.has(String(w.id)));
fresh.forEach(w => { seen.add(String(w.id)); queue.push(w); });
if (!batch.length || !fresh.length) hasMore = false;
} catch (err) {
console.error('[AdminNubian/record] تعذّر جلب الدفعة التالية:', err);
hasMore = false;
showToast(`تعذّر تحميل بقية ${T.all} — أعد فتح وضع التسجيل`, 'error');
} finally {
fetching = null;
paintProgress();
}
})();
return fetching;
}
function showDoneIfFinished() {
if (field || queue.length || fetching || hasMore) return;
showDone();
}
function showDone() {
field = null;
paintProgress();
const pending = inFlight || failed.length;
bodyEl.innerHTML = `
      <div class="nrec__done">
        <div class="nrec__done-icon"><i data-lucide="${pending ? 'loader' : 'party-popper'}"></i></div>
        <h2>${pending ? 'نكمل الحفظ...' : saved ? 'ما شاء الله، خلّصت!' : T.none}</h2>
        <p>${pending
? 'بعض التسجيلات لسع ما اتحفظت — انتظر لحظة أو أعد المحاولة من الشريط فوق.'
: saved ? `سجّلت صوت ${saved} ${T.one} وهي تظهر للناس في ${T.where}.` : T.noneHere}</p>
      </div>`;
footEl.innerHTML = `<button type="button" class="btn btn--primary nrec__btn nrec__btn--wide" data-nrec="close">رجوع</button>`;
renderIcons(root);
}
async function showWord() {
if (queue.length <= REFILL_AT) refill();
if (!queue.length) {
if (fetching) {
bodyEl.innerHTML = `<div class="nrec__done"><p>جاري تحميل ${T.all} التالية...</p></div>`;
footEl.innerHTML = '';
await fetching;
}
if (!queue.length) { showDone(); return; }
}
const w = queue[0];
paintProgress();
field = createAudioUploadField({
pathPrefix: T.prefix, existingPath: '', label: T.fieldLabel,
onChange: (has) => { const b = $('[data-nrec="save"]'); if (b) b.disabled = !has; },
});
const sub = [w.nub && `<div class="nrec__nub" lang="und">${escapeHtml(w.nub)}</div>`,
w.translit && `<div class="nrec__translit" dir="ltr">${escapeHtml(w.translit)}</div>`,
w.note && `<div class="nrec__note">${escapeHtml(w.note)}</div>`].filter(Boolean).join('');
bodyEl.innerHTML = `
      <div class="nrec__card">
        <span class="nrec__cat">${escapeHtml(titleOf?.(w.category) || w.category || '')}</span>
        <h2 class="nrec__ar">${escapeHtml(w.ar || '')}</h2>
        ${sub}
      </div>
      <div class="nrec__field">${field.html}</div>`;
footEl.innerHTML = `
      <button type="button" class="btn btn--ghost nrec__btn" data-nrec="skip" ${queue.length > 1 || hasMore ? '' : 'hidden'}>
        <i data-lucide="skip-forward"></i><span>تخطّي</span>
      </button>
      <button type="button" class="btn btn--primary nrec__btn nrec__btn--wide" data-nrec="save" disabled>
        <i data-lucide="check"></i><span>حفظ والتالي</span>
      </button>`;
field.mount(bodyEl);
renderIcons(root);
bodyEl.scrollTop = 0;
}
function save() {
if (!field || !queue.length || !field.hasAudio()) return;
if (isRecording()) { showToast('أوقف التسجيل أولًا ثم احفظ', 'error'); return; }
const w = queue.shift();
const f = field;
field = null;
saved++;
enqueueSave(w, f);
showWord();
}
async function skip() {
if (queue.length < 2 && !hasMore) return;
if (isRecording()) { showToast('أوقف التسجيل أولًا', 'error'); return; }
if (field?.hasAudio() && !await confirmAction({
title: 'تسجيل غير محفوظ',
message: `سجّلت صوتًا لـ${T.same} ولم تحفظه. تتخطّاها وتتجاهل التسجيل؟`,
confirmLabel: 'تخطَّ',
})) return;
if (queue.length < 2) await refill();
if (queue.length < 2) return;
queue.push(queue.shift());
showWord();
}
async function requestClose() {
if (closing) return;
if (isRecording()) { showToast('أوقف التسجيل أولًا', 'error'); return; }
if (field?.hasAudio() && !await confirmAction({
title: 'تسجيل غير محفوظ',
message: 'عندك تسجيل لم يُحفظ. تخرج وتتجاهله؟',
confirmLabel: 'اخرج',
danger: true,
})) return;
closing = true;
if (inFlight) {
showToast('ننهي حفظ آخر التسجيلات...', 'info');
await chain;
}
if (failed.length && !await confirmAction({
title: 'تسجيلات لم تُحفظ',
message: `تعذّر حفظ ${failed.length} ${failed.length === 1 ? T.one : T.many}. لو خرجت ستضيع تسجيلاتها. تخرج؟`,
confirmLabel: 'اخرج وتجاهلها',
danger: true,
})) { closing = false; return; }
close();
}
root.addEventListener('click', (e) => {
const a = e.target.closest('[data-nrec]')?.dataset.nrec;
if (a === 'save') save();
else if (a === 'skip') skip();
else if (a === 'retry') retryFailed();
else if (a === 'close') requestClose();
});
showWord();
}
