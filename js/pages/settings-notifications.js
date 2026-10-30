import { initPush, requestPermission } from '../shared/push.js';
import { renderIcons } from '../shared/icons.js';
import { setPref, syncAllPrefsFromLocalStorage } from '../shared/notif-prefs.js';
export const NOTIF_GROUPS = [
{
key: 'notif-news', icon: 'newspaper',
title: 'أخبار البلد', desc: 'نبّهني لو في خبر جديد',
},
{
key: 'notif-events', icon: 'calendar-heart',
title: 'المناسبات والبرامج', desc: 'ذكّرني بالمناسبات والفعاليات',
},
{
key: 'notif-community-life', icon: 'heart-handshake',
title: 'المناسبات الاجتماعية', desc: 'تهنئة وتعزية أهل البلد',
},
{
key: 'notif-community', icon: 'megaphone',
title: 'المجتمع', desc: 'إعلانات ونقاشات عامة',
},
{
key: 'notif-projects', icon: 'trending-up',
title: 'المشاريع والأفكار', desc: 'تحديثات المشاريع وصندوق الأفكار',
},
{
key: 'notif-worship', icon: 'moon-star',
title: 'العبادة', desc: 'تذكيرات وأحاديث وأذكار من قسم العبادة',
},
{
key: 'notif-interactions', icon: 'heart',
title: 'تفاعل الأهالي', desc: 'لو زول عجبو أو علّق أو رد على مناسبتك أو فكرتك — داخل التطبيق فقط، بدون تنبيه خارجي',
},
];
function isOn(key, def = true) {
const v = localStorage.getItem(key);
return v === null ? def : v === 'true';
}
function _permStatusCard() {
const supported = ('Notification' in window) && ('serviceWorker' in navigator) && ('PushManager' in window);
if (!supported) {
return `
      <div class="settings-item" id="push-permission-card">
        <div class="settings-icon"><span data-icon="bell-off"></span></div>
        <div class="settings-content">
          <h4>الإشعارات غير مدعومة</h4>
          <p>المتصفح دا لا يدعم إشعارات الويب.</p>
        </div>
      </div>
    `;
}
const perm = Notification.permission;
if (perm === 'granted') {
return `
      <div class="settings-item" id="push-permission-card">
        <div class="settings-icon"><span data-icon="bell-ring"></span></div>
        <div class="settings-content">
          <h4>الإشعارات مفعّلة</h4>
          <p>حتوصل ليك التنبيهات حتى لو التطبيق قافل.</p>
        </div>
      </div>
    `;
}
if (perm === 'denied') {
return `
      <div class="settings-item" id="push-permission-card">
        <div class="settings-icon"><span data-icon="bell-off"></span></div>
        <div class="settings-content">
          <h4>الإشعارات ممنوعة</h4>
          <p>لازم تسمح بيها يدوياً من إعدادات المتصفح/الجهاز لهذا الموقع.</p>
        </div>
      </div>
    `;
}
return `
    <div class="settings-item settings-item--action" id="push-permission-card">
      <div class="settings-icon"><span data-icon="bell"></span></div>
      <div class="settings-content">
        <h4>فعّل الإشعارات</h4>
        <p>اضغط هنا حتى توصل ليك التنبيهات حتى لو التطبيق قافل.</p>
      </div>
      <button type="button" class="btn btn--primary btn--sm" id="enable-push-btn">تفعيل</button>
    </div>
  `;
}
export function renderSettingsNotifications() {
return `
    <section class="page settings-notifications-page">

      <div class="contact-admin-intro">
        <p class="contact-admin-intro__sub">
          اختار أي نوع رسائل تحب توصل ليك تنبيه بيها. تقدر تفتح أو تقفل أي تصنيف براحتك في أي وقت.
        </p>
      </div>

      <section class="settings-list">
        ${_permStatusCard()}
      </section>

      <section class="settings-list">
        ${NOTIF_GROUPS.map(g => `
          <div class="settings-item" data-notif-toggle="${g.key}">
            <div class="settings-icon"><span data-icon="${g.icon}"></span></div>
            <div class="settings-content">
              <h4>${g.title}</h4>
              <p>${g.desc}</p>
            </div>
            <div class="toggle ${isOn(g.key) ? 'toggle--on' : ''}" id="toggle-${g.key}">
              <div class="toggle__track"></div>
              <div class="toggle__thumb"></div>
            </div>
          </div>
        `).join('')}
      </section>

      <p class="notif-note">
        <span data-icon="info" style="display:inline-block;width:14px;height:14px;vertical-align:middle;margin-left:4px"></span>
        لازم تسمح للتطبيق بالإشعارات من إعدادات جهازك. الرسائل العامة من إدارة التطبيق بتكون شغالة دايمًا.
      </p>

      <div class="notif-help">
        <h3 class="notif-help__question">الإشعارات ما بتوصلني لمن أقفل التطبيق — شنو أعمل؟</h3>
        <p class="notif-help__intro">
          بعض الموبايلات (تكنو، إنفنكس، شاومي، سامسونج وغيرها) بتوقّف التطبيقات في الخلفية لتوفير البطارية، فبتفوتك الإشعارات. جرّب الخطوات دي بالترتيب:
        </p>
        <ol class="notif-help__steps">
          <li class="notif-help__step">
            <h4>ثبّت التطبيق</h4>
            <p>من قائمة المتصفح اختار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</p>
          </li>
          <li class="notif-help__step">
            <h4>اسمح بالإشعارات</h4>
            <p>إعدادات التطبيق أو الموقع ← الإشعارات ← مسموح.</p>
          </li>
          <li class="notif-help__step">
            <h4>اجعل البطارية «غير مقيّدة»</h4>
            <p>إعدادات الهاتف ← التطبيقات ← (التطبيق أو Chrome) ← البطارية ← «غير مقيّد» (Unrestricted). في سامسونج: البطارية ← حدود الاستخدام في الخلفية ← «التطبيقات التي لا تنام أبدًا» وأضف التطبيق.</p>
          </li>
          <li class="notif-help__step">
            <h4>فعّل «التشغيل التلقائي»</h4>
            <p>Autostart للتطبيق لو لقيته (شاومي، تكنو، إنفنكس).</p>
          </li>
          <li class="notif-help__step">
            <h4>اقفل التطبيق في الذاكرة</h4>
            <p>افتح قائمة التطبيقات الأخيرة، اضغط على التطبيق مطوّلاً واختار «قفل» (Lock) عشان منظّف الذاكرة ما يقفله.</p>
          </li>
          <li class="notif-help__step">
            <h4>تجنّب الإيقاف الإجباري</h4>
            <p>ما تستخدم «إيقاف إجباري» (Force stop) للتطبيق، وتأكد إن وضع توفير البطارية أو توفير البيانات الشديد مقفول.</p>
          </li>
        </ol>
        <p class="notif-help__outro">الخطوات دي بتحل المشكلة في أغلب الأجهزة، لكن بعض الموبايلات ممكن تتأخر شوية في وصول الإشعار.</p>
      </div>

    </section>
  `;
}
let _notifHandler = null;
export function initSettingsNotifications() {
if (_notifHandler) {
document.removeEventListener('click', _notifHandler);
_notifHandler = null;
}
initPush().catch(() => {});
syncAllPrefsFromLocalStorage(NOTIF_GROUPS.map(g => g.key)).catch(() => {});
_notifHandler = async function (e) {
const enableBtn = e.target.closest('#enable-push-btn');
if (enableBtn) {
enableBtn.disabled = true;
enableBtn.textContent = 'جاري التفعيل...';
await requestPermission();
const card = document.getElementById('push-permission-card');
if (card) {
card.outerHTML = _permStatusCard();
renderIcons();
}
return;
}
const notifRow = e.target.closest('[data-notif-toggle]');
if (!notifRow) return;
const key = notifRow.dataset.notifToggle;
const t   = document.getElementById(`toggle-${key}`);
if (t) {
const next = !t.classList.contains('toggle--on');
t.classList.toggle('toggle--on', next);
localStorage.setItem(key, String(next));
setPref(key, next).catch(() => {});
}
};
document.addEventListener('click', _notifHandler);
}
