import { createAudioUploadField, deleteClip } from '../../shared/audio-upload-field.js';
import { stageOrRun, stagedMsg } from '../../shared/admin-batch.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { showToast } from '../../shared/toast.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { closeComposeModal, setCleanup } from './admin-nubian-modals.js';
const KINDS = {
words:   { section: 'nubian-word',   prefix: 'w', noun: 'الكلمة', log: 'تسجيل صوت كلمة نوبية' },
phrases: { section: 'nubian-phrase', prefix: 'p', noun: 'الجملة', log: 'تسجيل صوت جملة نوبية' },
};
export function openAudioModal(item, kind, onSuccess) {
closeComposeModal();
const K = KINDS[kind] || KINDS.words;
const field = createAudioUploadField({ pathPrefix: K.prefix, existingPath: item.audio || '', label: 'النطق الصوتي 🎙️' });
const sub = [
item.nub && `<div class="nrec__nub" lang="und">${escapeHtml(item.nub)}</div>`,
item.translit && `<div class="nrec__translit" dir="ltr">${escapeHtml(item.translit)}</div>`,
item.note && `<div class="nrec__note">${escapeHtml(item.note)}</div>`,
].filter(Boolean).join('');
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="النطق الصوتي">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">النطق الصوتي</h3>
      </div>
      <div class="modal__body">
        <div class="nrec__card nadm-audio-card">
          <h2 class="nrec__ar">${escapeHtml(item.ar || '')}</h2>
          ${sub}
        </div>
        <div class="nrec__field">${field.html}</div>
        <p class="input-error-msg hidden" id="admin-nubian-audio-error"></p>
      </div>
      <div class="modal__footer nadm-footer">
        <button class="btn btn--ghost" id="admin-nubian-audio-cancel">إلغاء</button>
        <button class="btn btn--primary" id="admin-nubian-audio-submit">حفظ الصوت</button>
      </div>
    </div>`;
document.body.appendChild(backdrop);
renderIcons();
field.mount(backdrop);
const errorEl = backdrop.querySelector('#admin-nubian-audio-error');
const submitBtn = backdrop.querySelector('#admin-nubian-audio-submit');
const close = () => { backdrop.remove(); setCleanup(null); };
const submit = async () => {
submitBtn.disabled = true;
submitBtn.textContent = 'قاعدين نحفظ...';
errorEl.classList.add('hidden');
let uploaded = '';
try {
const audio = await field.commit();
if (!audio.changed) { close(); return; }
uploaded = audio.path;
const staged = await stageOrRun(K.section, item.id, { audio: audio.path }, { label: item.ar });
showToast(staged ? stagedMsg() : (audio.path ? 'الصوت اتحفظ' : 'اتحذف المقطع'), 'success');
if (!staged) {
logAdminAction(K.log, item.ar);
if (item.audio) deleteClip(item.audio);
}
uploaded = '';
close();
onSuccess?.({ op: 'edit', id: item.id, staged, item: { ...item, audio: audio.path } });
} catch (err) {
console.error('[AdminNubian/audio] فشل الحفظ:', err);
if (uploaded) deleteClip(uploaded);
submitBtn.disabled = false;
submitBtn.textContent = 'حفظ الصوت';
errorEl.textContent = err?.userFacing ? err.message : 'الحفظ لسع ما تم — حاول مرة أخرى';
errorEl.classList.remove('hidden');
}
};
backdrop.querySelector('#admin-nubian-audio-cancel').addEventListener('click', close);
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
submitBtn.addEventListener('click', submit);
setCleanup(close);
}
