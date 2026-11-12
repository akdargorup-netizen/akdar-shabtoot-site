import { showToast }    from '../shared/toast.js';
import { MIRROR_HOSTS } from '../data/hosts.js';
const APP_TITLE = 'أخضر شبتوت بحري';
function getLinks() {
const norm = (b) => (b.endsWith('/') ? b : b + '/');
const bases = [...new Set(
MIRROR_HOSTS.filter((b) => !/firebaseapp\.com/i.test(b)).map(norm)
)];
const urls = bases.map((b) => b + 'install.html');
return { main: urls[0] || (location.origin + '/install.html'), alts: urls.slice(1) };
}
function buildMessage() {
const { main, alts } = getLinks();
let msg = 'ثبّت تطبيق أخضر شبتوت بحري على تلفونك:\n' + main;
if (alts.length) msg += '\n\nلو الرابط ما فتح جرّب:\n' + alts.join('\n');
return msg;
}
const _esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function renderShareApp() {
const { main } = getLinks();
const msg = buildMessage();
const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
return `
    <section class="page share-page">

      <div class="page-intro contact-admin-intro">
        <p>شارك الرابط عبر واتساب أو أي برنامج، أو خلّي أي زول يمسح الرمز.</p>
      </div>

      <div class="share-rows">
        ${canNativeShare ? `
        <button type="button" class="share-row" data-share="native">
          <span class="share-row__icon"><span data-icon="share-2"></span></span>
          <span class="share-row__body">
            <span class="share-row__title">مشاركة مباشرة</span>
            <span class="share-row__sub">اختار أي برنامج من تلفونك</span>
          </span>
          <span class="share-row__chev" data-icon="chevron-left"></span>
        </button>
` : ''}

        <button type="button" class="share-row" data-share="whatsapp">
          <span class="share-row__icon"><span data-icon="message-circle"></span></span>
          <span class="share-row__body">
            <span class="share-row__title">إرسال عبر واتساب</span>
            <span class="share-row__sub">يفتح واتساب والرسالة جاهزة</span>
          </span>
          <span class="share-row__chev" data-icon="chevron-left"></span>
        </button>

        <button type="button" class="share-row" data-share="copy">
          <span class="share-row__icon"><span data-icon="copy"></span></span>
          <span class="share-row__body">
            <span class="share-row__title">نسخ الرابط</span>
            <span class="share-row__sub">الصقه في أي مكان</span>
          </span>
          <span class="share-row__chev" data-icon="chevron-left"></span>
        </button>
      </div>

      <div class="share-link-card">
        <span class="share-link-card__label">رابط التثبيت</span>
        <div class="share-link" dir="ltr" data-share="copy" role="button" tabindex="0" aria-label="انسخ الرابط">${_esc(main)}</div>
        <details class="share-msg">
          <summary>الرسالة اللي بتتشارك</summary>
          <pre class="share-msg__text" dir="rtl">${_esc(msg)}</pre>
          <button type="button" class="share-msg__copy" data-share="copy-msg">نسخ الرسالة كاملة</button>
        </details>
      </div>

      <div class="share-qr-card" id="share-qr-card" hidden>
        <div class="share-qr" id="share-qr" aria-live="polite"></div>
        <p class="share-qr__hint">امسح الرمز بكاميرا الجوال للوصول المباشر — مفيد للطباعة أو المشاركة بدون كتابة الرابط</p>
      </div>

    </section>
  `;
}
async function copyText(text) {
try {
if (navigator.clipboard && window.isSecureContext) {
await navigator.clipboard.writeText(text);
return true;
}
} catch {   }
try {
const ta = document.createElement('textarea');
ta.value = text;
ta.setAttribute('readonly', '');
ta.style.cssText = 'position:fixed;top:0;opacity:0;';
document.body.appendChild(ta);
ta.select();
ta.setSelectionRange(0, text.length);
const ok = document.execCommand('copy');
document.body.removeChild(ta);
return !!ok;
} catch { return false; }
}
async function doNativeShare() {
const msg = buildMessage();
if (navigator.share) {
try {
await navigator.share({ title: APP_TITLE, text: msg });
return;
} catch (err) {
if (err && err.name === 'AbortError') return;
}
}
if (await copyText(msg)) showToast('اتنسخت الرسالة — الصقها وين ما تريد ✓', 'success');
else showToast('تعذّر النسخ، استخدم زر واتساب أو انسخ الرابط يدويًا', 'error');
}
let _shareHandler = null;
export function initShareApp() {
if (_shareHandler) {
document.removeEventListener('click', _shareHandler);
document.removeEventListener('keydown', _shareHandler);
_shareHandler = null;
}
_shareHandler = async function (e) {
if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
const item = e.target.closest && e.target.closest('[data-share]');
if (!item || !document.querySelector('.share-page')) return;
if (e.type === 'keydown') e.preventDefault();
switch (item.dataset.share) {
case 'native':
await doNativeShare();
break;
case 'whatsapp':
window.open('https://wa.me/?text=' + encodeURIComponent(buildMessage()), '_blank', 'noopener');
break;
case 'copy':
if (await copyText(getLinks().main)) showToast('الرابط اتنسخ ✓', 'success');
else showToast('تعذّر النسخ — اضغط مطوّلًا على الرابط لنسخه', 'error');
break;
case 'copy-msg':
if (await copyText(buildMessage())) showToast('الرسالة اتنسخت ✓', 'success');
else showToast('تعذّر النسخ', 'error');
break;
}
};
document.addEventListener('click', _shareHandler);
document.addEventListener('keydown', _shareHandler);
buildQr();
}
function loadQrLib() {
if (window.QRCode) return Promise.resolve(true);
return new Promise((resolve) => {
const s = document.createElement('script');
s.src = new URL('../../assets/vendor/qrcode.js', import.meta.url).href;
s.onload  = () => resolve(!!window.QRCode);
s.onerror = () => resolve(false);
document.head.appendChild(s);
});
}
async function buildQr() {
const card = document.getElementById('share-qr-card');
const box  = document.getElementById('share-qr');
if (!card || !box) return;
if (!(await loadQrLib())) return;
try {
const q = new window.QRCode(-1, 2);
q.addData(getLinks().main);
q.make();
const n = q.getModuleCount(), m = 3, s = n + m * 2;
let d = '';
for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
box.innerHTML =
`<svg role="img" aria-label="رمز QR لرابط تثبيت التطبيق" viewBox="0 0 ${s} ${s}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">` +
`<rect width="${s}" height="${s}" fill="#f5f5e8"/><path fill="#0f1712" d="${d}"/></svg>`;
card.hidden = false;
} catch {   }
}
