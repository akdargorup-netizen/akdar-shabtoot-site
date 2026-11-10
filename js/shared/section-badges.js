import { getRecentContentIds } from '../data/db.js';
import { countNewIds, seedIfFirstVisit, SEEN_EVENT } from './content-freshness.js';
const SECTIONS   = ['news', 'occasions', 'events', 'ideas'];
const CACHE_KEY  = 'akdar_recent_ids';
const TTL_MS     = 10 * 60 * 1000;
const WINDOW_MAX = 10;
const CARD_TARGETS = {
news:      '.home-card--news .home-card__icon',
occasions: '.home-card--community .home-card__icon',
events:    '.home-card[data-page="events"] .home-card__icon',
ideas:     '.service-card[data-page="idea-box"] .service-card__icon',
};
let _ids = null;
let _inflight = null;
function _readCache() {
try {
const raw = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
if (raw && raw.ids && typeof raw.t === 'number') return raw;
} catch {   }
return null;
}
function _writeCache(ids) {
try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), ids })); } catch {   }
}
export function refreshSectionBadges({ force = false } = {}) {
const cached = _readCache();
if (!_ids && cached) _ids = cached.ids;
if (!force && cached && Date.now() - cached.t < TTL_MS) {
applySectionBadges();
return Promise.resolve();
}
if (_inflight) return _inflight;
_inflight = (async () => {
const next = { ...(_ids || {}) };
await Promise.all(SECTIONS.map(async section => {
try {
next[section] = (await getRecentContentIds(section)).map(String);
seedIfFirstVisit(section, next[section]);
} catch (err) {
console.warn(`[SectionBadges] تعذّر جلب "${section}":`, err);
}
}));
_ids = next;
_writeCache(next);
applySectionBadges();
})().finally(() => { _inflight = null; });
return _inflight;
}
function _label(n) {
return n >= WINDOW_MAX ? `${WINDOW_MAX}+` : String(n);
}
function _setCardBadge(section, n) {
const icon = document.querySelector(CARD_TARGETS[section]);
const card = icon?.closest('.home-card, .service-card');
if (!icon || !card) return;
let badge = card.querySelector(':scope > .section-badge');
if (n <= 0) { badge?.remove(); return; }
const text = _label(n);
if (!badge) {
badge = document.createElement('span');
badge.className = 'section-badge';
badge.setAttribute('aria-hidden', 'true');
card.appendChild(badge);
} else if (badge.textContent === text) {
return;
}
badge.textContent = text;
}
function _setNavBadge(n) {
const el = document.getElementById('services-badge-count');
if (!el) return;
if (n <= 0) {
el.classList.remove('is-visible');
el.textContent = '';
return;
}
el.textContent = n > 99 ? '99+' : String(n);
el.classList.add('is-visible');
}
export function applySectionBadges() {
if (!_ids) {
const cached = _readCache();
if (!cached) return;
_ids = cached.ids;
}
const counts = {};
for (const section of SECTIONS) {
counts[section] = _ids[section] ? countNewIds(section, _ids[section]) : 0;
_setCardBadge(section, counts[section]);
}
_setNavBadge(counts.ideas);
}
export function initSectionBadges() {
window.addEventListener(SEEN_EVENT, applySectionBadges);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshSectionBadges(); });
refreshSectionBadges();
}
