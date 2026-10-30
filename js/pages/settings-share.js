import { showToast }    from '../shared/toast.js';
import { shareContent } from '../shared/share.js';
const APP_URL  = 'https://shabtot-bahri.app';
const APP_TEXT = 'تطبيق أخضر شبتوت بحري — تابع أخبار البلد ووثّق ذاكرتها';
export function renderShareApp() {
return `
    <section class="page share-page">

      <div class="contact-admin-intro">
        <p class="contact-admin-intro__sub">
          شارك مع أهل البلد والأصحاب أينما كانوا.
        </p>
      </div>

      <div class="settings-list">

        <div class="settings-item" data-share="native" style="cursor:pointer">
          <div class="settings-icon"><span data-icon="share-2"></span></div>
          <div class="settings-content">
            <h4>مشاركة مباشرة</h4>
            <p>عبر واتساب أو أي برنامج تاني</p>
          </div>
          <span data-icon="chevron-left" style="color:var(--text-muted)"></span>
        </div>

        <div class="settings-item" data-share="copy" style="cursor:pointer">
          <div class="settings-icon"><span data-icon="copy"></span></div>
          <div class="settings-content">
            <h4>نسخ الرابط</h4>
            <p>${APP_URL}</p>
          </div>
          <span data-icon="chevron-left" style="color:var(--text-muted)"></span>
        </div>

      </div>

      <!-- ═══════════════════════════════════════════════════════════
           رمز QR — للطباعة أو المشاركة بالصورة (مفيد خصوصاً لمستخدمي
           آيفون: يمسحون الرمز فيوصلهم مباشرة لرابط التثبيت اليدوي)
           ═══════════════════════════════════════════════════════════ -->
      <div class="settings-list" style="margin-top: var(--space-6)">
        <div class="settings-item" style="flex-direction:column; align-items:center; padding: var(--space-6) var(--space-4); cursor:default">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&color=245-245-232&bgcolor=15-23-18&data=${encodeURIComponent(APP_URL)}"
            alt="رمز QR لرابط التطبيق"
            width="200" height="200"
            style="border-radius: var(--radius-lg); margin-bottom: var(--space-3)"
            loading="lazy"
          />
          <p style="font-size: var(--text-xs); color: var(--text-muted); text-align:center">
            امسح الرمز بكاميرا الجوال للوصول المباشر — مفيد للطباعة أو المشاركة بدون كتابة الرابط
          </p>
        </div>
      </div>

    </section>
  `;
}
let _shareHandler = null;
export function initShareApp() {
if (_shareHandler) {
document.removeEventListener('click', _shareHandler);
_shareHandler = null;
}
_shareHandler = function (e) {
const item = e.target.closest('[data-share]');
if (!item) return;
switch (item.dataset.share) {
case 'native':
shareContent({ title: 'أخضر شبتوت بحري', text: APP_TEXT, url: APP_URL });
break;
case 'copy':
copyText(APP_URL);
showToast('الرابط اتنسخ ✓', 'success');
break;
}
};
document.addEventListener('click', _shareHandler);
}
function copyText(text) {
if (navigator.clipboard) {
navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
} else {
fallbackCopy(text);
}
}
function fallbackCopy(text) {
const ta = document.createElement('textarea');
ta.value = text;
ta.style.position = 'fixed';
ta.style.opacity  = '0';
document.body.appendChild(ta);
ta.select();
document.execCommand('copy');
document.body.removeChild(ta);
}
