import { renderIcons } from './icons.js';
let _cleanup = null;
export function openConfirm({
title,
message,
confirmLabel = 'موافق',
cancelLabel  = 'إلغاء',
danger       = false,
icon         = 'help-circle',
} = {}) {
return new Promise(resolve => {
closeConfirm();
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop overlay-backdrop--center';
backdrop.innerHTML = `
      <div class="modal modal--center confirm-modal" role="alertdialog" aria-modal="true" aria-label="${title}">
        <div class="modal__handle"></div>
        <div class="modal__body confirm-modal__body">
          <div class="confirm-modal__icon${danger ? ' confirm-modal__icon--danger' : ''}"><i data-lucide="${icon}"></i></div>
          <h3 class="modal__title confirm-modal__title">${title}</h3>
          <p class="confirm-modal__desc">${message}</p>
        </div>
        <div class="modal__footer">
          <button class="btn ${danger ? 'btn--danger' : 'btn--primary'} btn--full" id="confirm-modal-yes">${confirmLabel}</button>
          <button class="btn btn--ghost btn--full" id="confirm-modal-cancel">${cancelLabel}</button>
        </div>
      </div>
    `;
document.body.appendChild(backdrop);
renderIcons(backdrop);
let settled = false;
const finish = (result) => {
if (settled) return;
settled = true;
closeConfirm();
resolve(result);
};
backdrop.querySelector('#confirm-modal-yes').addEventListener('click', () => finish(true));
backdrop.querySelector('#confirm-modal-cancel').addEventListener('click', () => finish(false));
backdrop.addEventListener('click', e => { if (e.target === backdrop) finish(false); });
_cleanup = () => backdrop.remove();
});
}
export function closeConfirm() {
if (_cleanup) {
_cleanup();
_cleanup = null;
}
}
