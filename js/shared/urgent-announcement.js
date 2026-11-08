import { getActiveUrgentAnnouncement } from '../data/db.js';
import { escapeHtml } from './sanitize.js';
import { renderIcons } from './icons.js';
const DISMISS_KEY = 'urgent-dismissed';
function _keyOf(a) {
return String(a.id || a.publishedAt || `${a.title}|${a.expiresAt || ''}`);
}
function _isDismissed(a) {
try { return localStorage.getItem(DISMISS_KEY) === _keyOf(a); } catch { return false; }
}
function _dismiss(a) {
try { localStorage.setItem(DISMISS_KEY, _keyOf(a)); } catch {   }
}
let _current = null;
const TYPE_META = {
blood_donor:      { icon: 'droplet',    label: 'نداء تبرع بالدم' },
medical_donation: { icon: 'hand-coins', label: 'نداء تبرع عاجل' },
};
export async function fetchUrgentAnnouncement() {
try {
return await getActiveUrgentAnnouncement();
} catch {
return null;
}
}
export function renderUrgentBanner(a, variant) {
const meta = TYPE_META[a.type] || { icon: 'siren', label: 'نداء عاجل' };
_current = a;
if (_isDismissed(a)) return '';
return `
    <div class="urgent-banner-wrap">
    <button type="button" class="urgent-banner urgent-banner--${variant}" data-urgent-open aria-haspopup="dialog" aria-label="عرض تفاصيل ${escapeHtml(a.title)}">
      <span class="urgent-banner__badge">
        <i data-icon="siren"></i>
        نداء إنساني عاجل · مؤقت
      </span>
      <div class="urgent-banner__row">
        <span class="urgent-banner__icon"><i data-icon="${meta.icon}"></i></span>
        <div class="urgent-banner__body">
          <h3 class="urgent-banner__title">${escapeHtml(a.title)}</h3>
          <p class="urgent-banner__text">${escapeHtml(a.body)}</p>
        </div>
        <i class="urgent-banner__arrow" data-icon="chevron-left"></i>
      </div>
    </button>
    <button type="button" class="urgent-banner__dismiss" data-urgent-dismiss aria-label="إخفاء النداء"><i data-icon="x"></i></button>
    </div>
  `;
}
function _openDetails(a) {
document.querySelector('.urgent-details-backdrop')?.remove();
const meta  = TYPE_META[a.type] || { icon: 'siren', label: 'نداء عاجل' };
const phone = String(a.contactPhone || '').trim();
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop urgent-details-backdrop';
backdrop.innerHTML = `
    <div class="modal urgent-details" role="dialog" aria-modal="true" aria-label="${escapeHtml(a.title)}">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">${escapeHtml(a.title)}</h3>
      </div>
      <div class="modal__body">
        <p class="urgent-details__text">${escapeHtml(a.body)}</p>
        ${phone ? `
          <a class="cta-button cta-button--full urgent-details__call" href="tel:${escapeHtml(phone)}">
            <i data-icon="phone"></i> اتصال بأهل الحالة
          </a>` : ''}
      </div>
      <div class="modal__footer">
        <button type="button" class="btn btn--ghost" data-urgent-close>إغلاق</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
renderIcons(backdrop);
const close = () => { backdrop.remove(); document.removeEventListener('keydown', onKey); };
const onKey = e => { if (e.key === 'Escape') close(); };
document.addEventListener('keydown', onKey);
backdrop.addEventListener('click', e => {
if (e.target === backdrop || e.target.closest('[data-urgent-close]')) close();
});
}
document.addEventListener('click', e => {
const x = e.target.closest('[data-urgent-dismiss]');
if (x) {
if (_current) _dismiss(_current);
x.closest('.urgent-banner-wrap')?.remove();
document.dispatchEvent(new CustomEvent('urgent-dismissed'));
return;
}
if (!e.target.closest('[data-urgent-open]')) return;
if (_current) _openDetails(_current);
});
