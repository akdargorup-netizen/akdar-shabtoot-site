import { renderIcons } from './icons.js';
const MIN_LENGTH = 2;
let _cleanup = null;
export function promptRequiredName(suggested = '', maxLength = 40) {
return new Promise(resolve => {
closeNameRequiredModal();
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop overlay-backdrop--center';
backdrop.innerHTML = `
      <div class="modal modal--center login-prompt-modal" role="dialog" aria-modal="true" aria-label="اكتب اسمك">
        <div class="modal__body login-prompt-modal__body">
          <div class="login-prompt-modal__icon"><i data-lucide="user-round-pen"></i></div>
          <h3 class="modal__title login-prompt-modal__title">عرّف نفسك لأهل البلد</h3>
          <p class="login-prompt-modal__desc">
            اكتب الاسم الذي تحب أن يظهر به على تعليقاتك وأفكارك ومشاركاتك في مناسبات البلد.
          </p>
          <div class="input-group">
            <input
              type="text"
              class="input"
              id="name-required-input"
              maxlength="${maxLength}"
              autocomplete="name"
              placeholder="اكتب اسمك هنا..."
              value="${(suggested || '').replace(/"/g, '&quot;')}"
            />
            <p class="input-error-msg" id="name-required-error" style="display:none;">
              اكتب اسم لا يقل عن حرفين
            </p>
          </div>
        </div>
        <div class="modal__footer">
          <button class="btn btn--primary btn--full" id="name-required-submit">تأكيد الاسم</button>
        </div>
      </div>
    `;
document.body.appendChild(backdrop);
renderIcons(backdrop);
const input    = backdrop.querySelector('#name-required-input');
const errorMsg = backdrop.querySelector('#name-required-error');
const submitBtn = backdrop.querySelector('#name-required-submit');
const trySubmit = () => {
const name = input.value.trim().slice(0, maxLength);
if (name.length < MIN_LENGTH) {
input.classList.add('input--error');
errorMsg.style.display = 'flex';
input.focus();
return;
}
closeNameRequiredModal();
resolve(name);
};
input.addEventListener('input', () => {
input.classList.remove('input--error');
errorMsg.style.display = 'none';
});
input.addEventListener('keydown', e => {
if (e.key === 'Enter') trySubmit();
});
submitBtn.addEventListener('click', trySubmit);
_cleanup = () => backdrop.remove();
setTimeout(() => input.focus(), 50);
});
}
export function closeNameRequiredModal() {
if (_cleanup) {
_cleanup();
_cleanup = null;
}
}
