import { isTripped, retryInMs } from '../data/adapters/rate-guard.js';
let _autoTimer = null;
function _clickPendingRetries() {
document.querySelectorAll('.error-state__retry').forEach((btn) => {
if (btn.isConnected && !btn.disabled) btn.click();
});
}
function _armAutoRetry() {
if (_autoTimer) return;
const wait = Math.max(retryInMs(), 0) + 800 + Math.random() * 3000;
_autoTimer = setTimeout(() => {
_autoTimer = null;
if (navigator.onLine === false) return;
_clickPendingRetries();
}, wait);
}
try {
window.addEventListener('akdar:rate-limited', _armAutoRetry);
window.addEventListener('online', () => setTimeout(_clickPendingRetries, 600 + Math.random() * 8000));
} catch {   }
export function errorState({ subject, message, code } = {}) {
const offline = typeof navigator !== 'undefined' && !navigator.onLine;
const icon  = offline ? 'wifi-off' : 'refresh-cw';
const paused = !offline && isTripped();
const title = offline ? 'مافي اتصال بالإنترنت هسّع' : (paused ? 'المحتوى سيصل قريبًا' : 'المحتوى لسع ما وصل');
let desc;
if (paused) {
_armAutoRetry();
desc = 'لحظات ويظهر تلقائيًا — ما تحتاج تعمل شيء.';
} else if (offline) {
desc = 'هذا الجزء محتاج اتصال بالنت — تحقق من شبكتك وحاول تاني.';
} else if (message) {
desc = message;
} else if (subject) {
desc = `جرّب تفتح ${subject} من جديد — غالبًا السبب ضعف الشبكة، خلّها تستقر وجرّب تاني.`;
} else {
desc = 'جرّب تفتح الصفحة دي من جديد — غالبًا السبب ضعف الشبكة، خلّها تستقر وجرّب تاني.';
}
return `
    <div class="error-state" role="alert">
      <i class="error-state__icon" data-lucide="${icon}"></i>
      <p class="error-state__title">${title}</p>
      <p class="error-state__desc">${desc}</p>
      ${code ? `<p class="error-state__code" dir="ltr" style="font-size:11px;opacity:.55;margin:0 0 8px">${String(code).replace(/[^\w:./ -]/g, '').slice(0, 60)}</p>` : ''}
      <button class="btn btn--secondary btn--sm error-state__retry" type="button" data-action="retry">
        <i data-lucide="refresh-cw"></i>
        <span>إعادة المحاولة</span>
      </button>
    </div>
  `;
}
export function bindErrorRetry(container, handler) {
container?.querySelector('[data-action="retry"]')
?.addEventListener('click', handler, { once: true });
}
