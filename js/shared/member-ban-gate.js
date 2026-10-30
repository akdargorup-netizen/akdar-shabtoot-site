import { getCurrentUser } from '../data/auth.js';
import { getMemberModeration } from '../data/db.js';
import { escapeHtml } from './sanitize.js';
const WHATSAPP_NUMBER = '249114436404';
const BAN_KEY = 'akdar_ban_status_v1';
const BAN_TTL_MS = 2 * 60 * 1000;
const RETRY_AFTER_FAIL_MS = 60 * 1000;
const FIRST_CHECK_WAIT_MS = 800;
let _refreshing = null;
let _lastFailAt = 0;
function _readBan() {
try {
const raw = JSON.parse(localStorage.getItem(BAN_KEY) || 'null');
if (raw && raw.uid && typeof raw.at === 'number') return raw;
} catch {   }
return null;
}
function _writeBan(rec) {
try { localStorage.setItem(BAN_KEY, JSON.stringify(rec)); } catch {   }
}
function _refreshBan(uid) {
if (_refreshing) return _refreshing;
if (navigator.onLine === false) return Promise.resolve(null);
if (Date.now() - _lastFailAt < RETRY_AFTER_FAIL_MS) return Promise.resolve(null);
_refreshing = (async () => {
const before = _readBan();
try {
const mod = await getMemberModeration(uid);
const rec = { uid, status: mod?.status ?? 'active', reason: mod?.reason ?? '', at: Date.now() };
_writeBan(rec);
const wasBanned = before?.uid === uid && before.status === 'banned-full';
const isBanned = rec.status === 'banned-full';
if (wasBanned !== isBanned) {
try { window.dispatchEvent(new CustomEvent('akdar:member-ban-changed', { detail: { banned: isBanned } })); }
catch {   }
}
return rec;
} catch (err) {
_lastFailAt = Date.now();
console.warn('[MemberBanGate] تعذّر تجديد حالة الحظر (نكمل بالمحفوظ):', err?.message || err);
return null;
}
})().finally(() => { _refreshing = null; });
return _refreshing;
}
export async function checkFullBan() {
const user = getCurrentUser();
if (!user?.uid) return null;
const saved = _readBan();
const mine = saved && saved.uid === user.uid ? saved : null;
if (mine) {
if (Date.now() - mine.at >= BAN_TTL_MS) _refreshBan(user.uid);
return mine.status === 'banned-full' ? mine : null;
}
const first = await Promise.race([
_refreshBan(user.uid),
new Promise((resolve) => setTimeout(() => resolve(null), FIRST_CHECK_WAIT_MS)),
]);
return first?.status === 'banned-full' ? first : null;
}
const PARTICIPATION_FRESH_MS = 30 * 1000;
const PARTICIPATION_WAIT_MS = 1200;
export async function checkParticipationBan() {
const user = getCurrentUser();
if (!user?.uid || user.isAnonymous) return null;
const saved = _readBan();
const mine = saved && saved.uid === user.uid ? saved : null;
let rec = mine;
if (!mine || Date.now() - mine.at >= PARTICIPATION_FRESH_MS) {
const fresh = await Promise.race([
_refreshBan(user.uid),
new Promise((resolve) => setTimeout(() => resolve(null), PARTICIPATION_WAIT_MS)),
]);
rec = fresh || _readBan();
if (rec && rec.uid !== user.uid) rec = null;
}
return rec && (rec.status === 'banned-full' || rec.status === 'banned-partial') ? rec : null;
}
export function banMessage(ban) {
const full = ban?.status === 'banned-full';
const reason = (ban?.reason || '').trim();
const base = full
? 'أنت محظور من استخدام التطبيق'
: 'أنت محظور من المشاركة (التعليق والتصويت والنشر)';
return `${base}${reason ? ` — السبب: ${reason}` : ''}`;
}
let _banModalCleanup = null;
export function showBanNotice(ban) {
_banModalCleanup?.();
const full = ban?.status === 'banned-full';
const reason = (ban?.reason || '').trim();
const waText = encodeURIComponent('السلام عليكم، حسابي محظور من تطبيق أكدار وحابب أستفسر عن السبب.');
const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`;
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop overlay-backdrop--center';
backdrop.innerHTML = `
    <div class="modal modal--center login-prompt-modal" role="alertdialog" aria-modal="true" aria-label="أنت محظور">
      <div class="modal__handle"></div>
      <div class="modal__body login-prompt-modal__body">
        <div class="login-prompt-modal__icon"><i data-icon="shield-x"></i></div>
        <h3 class="modal__title login-prompt-modal__title">أنت محظور</h3>
        <p class="login-prompt-modal__desc">
          ${full ? 'تم إيقاف حسابك من قبل الإدارة.' : 'تم منعك من التعليق والتصويت والنشر من قبل الإدارة.'}
          ${reason ? `<br><strong>السبب:</strong> ${escapeHtml(reason)}` : ''}
        </p>
      </div>
      <div class="modal__footer">
        <a class="btn btn--primary btn--full" href="${waLink}" target="_blank" rel="noopener">تواصل مع الإدارة</a>
        <button class="btn btn--ghost btn--full" type="button" data-ban-close>حسنًا</button>
      </div>
    </div>`;
document.body.appendChild(backdrop);
import('./icons.js').then(({ renderIcons }) => renderIcons(backdrop)).catch(() => {});
const close = () => { backdrop.remove(); _banModalCleanup = null; };
_banModalCleanup = close;
backdrop.querySelector('[data-ban-close]')?.addEventListener('click', close);
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
}
export async function requireNotBanned() {
const ban = await checkParticipationBan();
if (!ban) return true;
showBanNotice(ban);
return false;
}
export function renderBannedScreen(ban) {
const reason = (ban?.reason || '').trim();
const waText = encodeURIComponent('السلام عليكم، حسابي محظور من تطبيق أخضر شبتوت بحري وحابب أستفسر عن السبب.');
const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`;
return `
    <section class="page not-found-page banned-page">
      <div class="not-found-inner">
        <div class="banned-page__icon"><i data-icon="shield-x"></i></div>
        <h2 class="not-found-title">أنت محظور</h2>
        <p class="not-found-desc">
          تم إيقاف وصولك للتطبيق من قبل الإدارة.
          ${reason ? `<br><strong>السبب:</strong> ${escapeHtml(reason)}` : ''}
        </p>
        <a class="btn btn--primary" href="${waLink}" target="_blank" rel="noopener">
          <i data-icon="message-circle"></i>
          تواصل مع الإدارة
        </a>
      </div>
    </section>
  `;
}
