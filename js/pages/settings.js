import { onAuthChange, signInWithGoogle, signOut, updateDisplayName, getCurrentUser, preloadGoogleSignIn } from '../data/auth.js';
import { openConfirm } from '../shared/confirm-modal.js';
import { renderIcons } from '../shared/icons.js';
import { staffBadge } from '../shared/staff-badge.js';
import { getStaffRole } from '../data/admin-auth.js';
import { escapeHtml } from '../shared/sanitize.js';
function renderProfileHeaderInner(user) {
const loggedIn = user && !user.isAnonymous;
const avatar = user?.photoURL
? `<img src="${escapeHtml(user.photoURL)}" alt="" class="profile-header__avatar-img" loading="lazy" decoding="async" />`
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
        <p class="app-version">نسخة أولية 1.0</p>
        <p class="about-footer__copy">© 2027 جميع الحقوق محفوظة</p>
      </section>

    </section>
  `;
}
let _notifHandler = null;
let _authUnsub     = null;
export function initSettings() {
preloadGoogleSignIn();
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
const name = (window.prompt('اكتب الاسم العايز يظهر لأهل البلد:', current?.displayName || '') || '').trim();
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
});
}
(function () {
if (localStorage.getItem('vision-enhanced') === 'true') {
document.documentElement.setAttribute('data-vision', 'enhanced');
}
})();
