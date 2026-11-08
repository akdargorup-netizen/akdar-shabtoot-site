import { onAuthChange, signInWithGoogle, signOut, updateDisplayName, getCurrentUser, preloadGoogleSignIn, isOwner } from '../data/auth.js';
import { openConfirm } from '../shared/confirm-modal.js';
import { renderIcons } from '../shared/icons.js';
import { staffBadge } from '../shared/staff-badge.js';
import { getStaffRole } from '../data/admin-auth.js';
import { escapeHtml } from '../shared/sanitize.js';
function bindAvatarFallback(root) {
const img = root && root.querySelector('.profile-header__avatar-img');
if (!img) return;
const fallback = () => {
const box = img.parentElement;
if (!box) return;
box.innerHTML = '<i data-lucide="user-round"></i>';
renderIcons();
};
img.addEventListener('error', fallback, { once: true });
if (img.complete && img.naturalWidth === 0) fallback();
}
function renderProfileHeaderInner(user) {
const loggedIn = user && !user.isAnonymous;
const avatar = user?.photoURL
? `<img src="${escapeHtml(user.photoURL)}" alt="" class="profile-header__avatar-img" referrerpolicy="no-referrer" decoding="async" />`
: `<i data-lucide="user-round"></i>`;
const name   = escapeHtml(loggedIn ? (user.displayName || 'عضو مسجّل بحساب Google') : 'زائر');
const handle = loggedIn ? 'عضو مسجّل بحساب Google' : 'من أهل شبتوت';
const authBtn = loggedIn
? `
      <div class="profile-header__actions">
        <button class="btn btn--secondary btn--sm" data-auth-toggle="edit-name" type="button">تعديل الاسم</button>
        <button class="btn btn--secondary btn--sm" data-auth-toggle="signout" type="button">تسجيل الخروج</button>
      </div>
    `
: `<button class="btn btn--secondary btn--sm" data-auth-toggle="signin" type="button">تسجيل الدخول بحساب Google</button>`;
return `
    <div class="profile-header__avatar" aria-hidden="true">${avatar}</div>
    <p class="profile-header__name">${name}${loggedIn ? staffBadge(getStaffRole()) : ''}</p>
    <p class="profile-header__handle">${handle}</p>
    ${authBtn}
  `;
}
export function renderSettings() {
return `
    <section class="page settings-page">

      <!-- ── رأس الملف الشخصي ── -->
      <div class="profile-header" id="profile-header">
        ${renderProfileHeaderInner(null)}
      </div>

      <!-- ── العرض ── -->
      <div class="appearance-section-label">العرض</div>
      <section class="settings-list">

        <div class="settings-item" data-action="appearance" style="cursor:pointer">
          <div class="settings-icon"><span data-icon="moon"></span></div>
          <div class="settings-content">
            <h4>المظهر والخطوط</h4>
            <p>الثيم وحجم الخط</p>
          </div>
          <span data-icon="chevron-left" style="color:var(--text-muted)"></span>
        </div>

      </section>

      <!-- ── الرسائل ── -->
      <div class="appearance-section-label">الرسائل</div>
      <section class="settings-list">

        <div class="settings-item" data-action="settings-notifications" style="cursor:pointer">
          <div class="settings-icon"><span data-icon="bell"></span></div>
          <div class="settings-content">
            <h4>الرسائل</h4>
            <p>تحكّم في تصنيفات الإشعارات التي توصل ليك</p>
          </div>
          <span data-icon="chevron-left" style="color:var(--text-muted)"></span>
        </div>

      </section>

      <!-- ── المجتمع ── -->
      <div class="appearance-section-label">المجتمع</div>
      <section class="settings-list">

        <div class="settings-item" data-action="contribute" style="cursor:pointer">
          <div class="settings-icon"><span data-icon="book-open"></span></div>
          <div class="settings-content">
            <h4>ساهم في التوثيق</h4>
            <p>صور، قصص، معلومات من تاريخ البلد</p>
          </div>
          <span data-icon="chevron-left" style="color:var(--text-muted)"></span>
        </div>

        <div class="settings-item" data-action="report-error" style="cursor:pointer">
          <div class="settings-icon"><span data-icon="flag"></span></div>
          <div class="settings-content">
            <h4>الإبلاغ عن خطأ</h4>
            <p>شاركنا لو لاحظت غلطة</p>
          </div>
          <span data-icon="chevron-left" style="color:var(--text-muted)"></span>
        </div>

      </section>

      <!-- ── معلومات إضافية ── -->
      <div class="appearance-section-label">معلومات إضافية</div>
      <section class="settings-list">

        <div class="settings-item" data-action="share-app" style="cursor:pointer">
          <div class="settings-icon"><span data-icon="share-2"></span></div>
          <div class="settings-content">
            <h4>مشاركة التطبيق</h4>
            <p>وصّل التطبيق لأهل البلد</p>
          </div>
          <span data-icon="chevron-left" style="color:var(--text-muted)"></span>
        </div>

        <div class="settings-item" data-action="about-app" style="cursor:pointer">
          <div class="settings-icon"><span data-icon="info"></span></div>
          <div class="settings-content">
            <h4>عن التطبيق</h4>
            <p>الفكرة، الرعاية، والمساهمون</p>
          </div>
          <span data-icon="chevron-left" style="color:var(--text-muted)"></span>
        </div>

      </section>

      <!-- ── تذييل ── -->
      <section class="settings-footer">
        <p class="app-name">أخضر شبتوت بحري</p>
        <p class="app-version" id="app-version-line">نسخة أولية 1.0</p>
        <p class="about-footer__copy">© 2027 جميع الحقوق محفوظة</p>
      </section>

    </section>
  `;
}
async function fillVersionLine() {
const el = document.getElementById('app-version-line');
if (!el) return;
try {
const res = await fetch('./service-worker.js', { cache: 'no-store' });
const m = /CACHE_VERSION\s*=\s*['"]shabtoot-v(\d+)['"]/.exec((await res.text()).slice(0, 4000));
if (!m) return;
let text = `نسخة الواجهة ${m[1]}`;
try {
if (window.Capacitor?.isNativePlatform?.()) {
const info = await window.Capacitor.Plugins?.App?.getInfo?.();
if (info?.build) text += ` · الغلاف ${info.build}`;
}
} catch {   }
try {
const last = JSON.parse(localStorage.getItem('akdar_ota_last_v1') || 'null');
if (last && last.ok === false && Date.now() - Number(last.at || 0) < 24 * 3600 * 1000) text += ' · تعذّر جلب التحديث الأخير';
} catch {   }
try {
if (isOwner()) {
const e = JSON.parse(localStorage.getItem('akdar_last_send_error_v1') || 'null');
if (e && Date.now() - Number(e.at || 0) < 24 * 3600 * 1000) text += ` · آخر خطأ إرسال: ${e.code}${e.kind ? ` (${e.kind})` : ''}${e.msg ? ` — ${e.msg}` : ''}`;
}
} catch {   }
if (document.getElementById('app-version-line') === el) el.textContent = text;
} catch {   }
}
let _notifHandler = null;
let _authUnsub     = null;
export function initSettings() {
preloadGoogleSignIn();
fillVersionLine();
if (_notifHandler) {
document.removeEventListener('click', _notifHandler);
_notifHandler = null;
}
if (_authUnsub) {
_authUnsub();
_authUnsub = null;
}
_notifHandler = function (e) {
const authBtn = e.target.closest('[data-auth-toggle]');
if (authBtn) {
const action = authBtn.dataset.authToggle;
if (action === 'signin') signInWithGoogle();
else if (action === 'signout') {
openConfirm({
title: 'تسجيل الخروج',
message: 'متأكد إنك داير تسجّل خروجك من حسابك؟',
confirmLabel: 'تسجيل الخروج',
cancelLabel: 'إلغاء',
danger: true,
icon: 'log-out',
}).then(confirmed => {
if (confirmed) signOut();
});
}
else if (action === 'edit-name') {
const current = getCurrentUser();
const name = (window.prompt('اكتب الاسم الداير يظهر لأهل البلد:', current?.displayName || '') || '').trim();
if (name) updateDisplayName(name);
}
return;
}
};
document.addEventListener('click', _notifHandler);
_authUnsub = onAuthChange((user) => {
const header = document.getElementById('profile-header');
if (!header) return;
header.innerHTML = renderProfileHeaderInner(user);
renderIcons();
bindAvatarFallback(header);
});
}
(function () {
if (localStorage.getItem('vision-enhanced') === 'true') {
document.documentElement.setAttribute('data-vision', 'enhanced');
}
})();
