const DISMISS_KEY   = 'ios-install-dismissed';
const SNOOZE_DAYS    = 14;
const BANNER_DELAY_MS = 2500;
export function initIOSInstallPrompt() {
if (!_isIOSSafari() || _isStandalone() || _isDismissed()) return;
setTimeout(_showBanner, BANNER_DELAY_MS);
}
function _isIOSSafari() {
const ua = navigator.userAgent;
const isIOS = /iphone|ipad|ipod/i.test(ua)
|| (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
return isIOS && isSafari;
}
function _isStandalone() {
return window.matchMedia('(display-mode: standalone)').matches
|| window.navigator.standalone === true;
}
function _isDismissed() {
const raw = localStorage.getItem(DISMISS_KEY);
if (!raw) return false;
if (raw === 'forever') return true;
const snoozedUntil = Number(raw);
return Date.now() < snoozedUntil;
}
function _snooze() {
const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
localStorage.setItem(DISMISS_KEY, String(until));
}
function _dismissForever() {
localStorage.setItem(DISMISS_KEY, 'forever');
}
function _showBanner() {
const banner = document.createElement('div');
banner.className = 'ios-install-banner';
banner.setAttribute('role', 'complementary');
banner.innerHTML = `
    <img class="ios-install-banner__icon" src="./assets/ios/apple-touch-icon.png" alt="" />
    <p class="ios-install-banner__text">ثبّت التطبيق على شاشتك الرئيسية للوصول السريع والإشعارات</p>
    <button type="button" class="ios-install-banner__cta">كيف؟</button>
    <button type="button" class="ios-install-banner__close" aria-label="إغلاق">
      <i data-lucide="x" style="width:16px;height:16px"></i>
    </button>
  `;
document.body.appendChild(banner);
window.lucide?.createIcons?.();
banner.querySelector('.ios-install-banner__cta').addEventListener('click', () => {
banner.remove();
_showSheet();
});
banner.querySelector('.ios-install-banner__close').addEventListener('click', () => {
banner.remove();
_snooze();
});
}
function _showSheet() {
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="ios-install-sheet" role="dialog" aria-modal="true" aria-labelledby="ios-install-title">
      <img class="ios-install-sheet__icon" src="./assets/ios/apple-touch-icon.png" alt="" />
      <h2 id="ios-install-title" class="ios-install-sheet__title">ثبّت أخضر شبتوت بحري</h2>
      <p class="ios-install-sheet__subtitle">أضِفه لشاشتك الرئيسية ليفتح بسرعة زي أي تطبيق، ويوصلك بالإشعارات</p>

      <div class="ios-install-sheet__steps">
        <div class="ios-install-step">
          <span class="ios-install-step__num">١</span>
          <i class="ios-install-step__icon" data-lucide="upload"></i>
          <span class="ios-install-step__text">اضغط زر <b>المشاركة</b> في شريط Safari السفلي</span>
        </div>
        <div class="ios-install-step">
          <span class="ios-install-step__num">٢</span>
          <i class="ios-install-step__icon" data-lucide="plus-square"></i>
          <span class="ios-install-step__text">مرّر لأسفل واختر <b>"إضافة إلى الشاشة الرئيسية"</b></span>
        </div>
        <div class="ios-install-step">
          <span class="ios-install-step__num">٣</span>
          <i class="ios-install-step__icon" data-lucide="check-circle"></i>
          <span class="ios-install-step__text">اضغط <b>"إضافة"</b> — وبكذا تصير الأيقونة على شاشتك</span>
        </div>
      </div>

      <button type="button" class="ios-install-sheet__dismiss">تمام، فهمت</button>
      <button type="button" class="ios-install-sheet__dont-show">لا تُظهر هذا مرة ثانية</button>
    </div>
  `;
document.body.appendChild(backdrop);
window.lucide?.createIcons?.();
const close = () => backdrop.remove();
backdrop.addEventListener('click', (e) => {
if (e.target === backdrop) close();
});
backdrop.querySelector('.ios-install-sheet__dismiss').addEventListener('click', () => {
_snooze();
close();
});
backdrop.querySelector('.ios-install-sheet__dont-show').addEventListener('click', () => {
_dismissForever();
close();
});
}
