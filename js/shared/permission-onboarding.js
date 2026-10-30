import { initPush, requestPermission } from './push.js';
import { renderIcons } from './icons.js';
import { RUNTIME_CONFIG } from '../data/runtime-config.js';
const SEEN_KEY = 'permission-onboarding-seen';
export async function initPermissionOnboarding() {
if (localStorage.getItem(SEEN_KEY) === 'true') return;
if (!RUNTIME_CONFIG.enableRealPush) {
localStorage.setItem(SEEN_KEY, 'true');
return;
}
const supported = ('Notification' in window) && ('serviceWorker' in navigator) && ('PushManager' in window);
if (!supported) {
localStorage.setItem(SEEN_KEY, 'true');
return;
}
if (Notification.permission !== 'default') {
localStorage.setItem(SEEN_KEY, 'true');
return;
}
await initPush().catch(() => {});
_showModal();
}
function _showModal() {
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop overlay-backdrop--center';
backdrop.innerHTML = `
    <div class="modal modal--center login-prompt-modal" role="dialog" aria-modal="true" aria-label="تفعيل الإشعارات">
      <div class="modal__body login-prompt-modal__body">
        <div class="login-prompt-modal__icon"><i data-lucide="bell-ring"></i></div>
        <h3 class="modal__title login-prompt-modal__title">فعّل الإشعارات</h3>
        <p class="login-prompt-modal__desc">
          حتى توصل ليك أخبار البلد والمناسبات والتنبيهات المهمة أول بأول،
          حتى لو التطبيق قافل. التطبيق محتاج إذنك للإشعارات لكي يشتغل صح.
        </p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--primary btn--full" id="perm-onboarding-agree">موافقة ومتابعة</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons(backdrop);
const agreeBtn = backdrop.querySelector('#perm-onboarding-agree');
agreeBtn.addEventListener('click', async () => {
agreeBtn.disabled = true;
agreeBtn.textContent = 'جاري التفعيل...';
let closed = false;
const finish = () => {
if (closed) return;
closed = true;
localStorage.setItem(SEEN_KEY, 'true');
backdrop.remove();
};
const watchdog = setTimeout(finish, 20000);
try {
await requestPermission();
} catch (_) {   }
clearTimeout(watchdog);
finish();
});
}
