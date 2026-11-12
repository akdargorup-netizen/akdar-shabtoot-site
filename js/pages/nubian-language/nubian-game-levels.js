import { escapeHtml } from '../../shared/sanitize.js';
import { arNum } from '../../shared/abadol-mascot.js';
export const LEVELS_PER_PAGE = 6;
export const SKYLINE = `<svg viewBox="0 0 400 190" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="ngs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9824a"/><stop offset=".55" stop-color="#f3b866"/><stop offset="1" stop-color="#f8dc9c"/></linearGradient>
    <radialGradient id="ngs-sun"><stop offset="0" stop-color="#fff3c4"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="400" height="190" fill="url(#ngs-sky)"/>
  <circle cx="86" cy="92" r="46" fill="url(#ngs-sun)"/><circle cx="86" cy="92" r="19" fill="#fff0b8"/>
  <path d="M262 34 L168 168 H262Z" fill="#d7a257"/><path d="M262 34 L356 168 H262Z" fill="#b9823d"/>
  <path d="M136 84 L82 168 H136Z" fill="#e4b565"/><path d="M136 84 L190 168 H136Z" fill="#c28d46"/>
  <path d="M352 118 L316 168 H352Z" fill="#e8bd70"/><path d="M352 118 L388 168 H352Z" fill="#c9944c"/>
  <path d="M0 190 V158 C70 142 130 172 210 160 C290 148 340 168 400 154 V190Z" fill="#e6c88c"/>
  <path d="M0 190 V176 C80 164 150 184 230 174 C300 165 360 180 400 172 V190Z" fill="#d6b074"/>
</svg>`;
export const SCENE = `<svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="ngl-sun"><stop offset="0" stop-color="#fff0b8"/><stop offset=".3" stop-color="#f7c25a" stop-opacity=".8"/><stop offset="1" stop-color="#e8873a" stop-opacity="0"/></radialGradient>
    <linearGradient id="ngl-nile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d93a6"/><stop offset="1" stop-color="#14606c"/></linearGradient>
  </defs>
  <circle cx="300" cy="300" r="120" fill="url(#ngl-sun)"/><circle cx="300" cy="306" r="22" fill="#fff0b8"/>
  <path d="M96 232 L10 400 H96Z" fill="#6b3a17"/><path d="M96 232 L182 400 H96Z" fill="#3e2610"/>
  <path d="M222 292 L154 400 H222Z" fill="#7a431b"/><path d="M222 292 L290 400 H222Z" fill="#4a2c12"/>
  <path d="M356 332 L318 400 H356Z" fill="#6b3a17"/><path d="M356 332 L394 400 H356Z" fill="#3e2610"/>
  <path d="M0 520 V388 C70 372 130 398 210 386 C290 374 340 394 400 380 V520Z" fill="#2b1a0a"/>
  <path d="M168 392 C150 430 236 450 214 490 C204 508 196 516 190 520 H262 C262 500 292 476 270 446 C250 418 262 400 252 390 C226 384 196 386 168 392Z" fill="url(#ngl-nile)"/>
  <path d="M184 404 C200 410 226 410 244 404 M178 452 C200 460 226 456 248 446 M210 492 C224 488 240 484 252 476" fill="none" stroke="#bfe9ee" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>
  <path d="M0 520 V470 C60 458 120 480 170 470 L190 520Z" fill="#1d1106"/>
  <path d="M400 520 V462 C350 452 300 476 262 468 L252 520Z" fill="#1d1106"/>
  <g transform="translate(34 408)"><path d="M12 98 C10 78 14 58 11 36" fill="none" stroke="#140b03" stroke-width="5" stroke-linecap="round"/><path d="M11 36 C-2 30 -8 38 -10 46 C0 40 6 40 11 36Z M11 36 C24 30 32 38 34 46 C24 40 18 40 11 36Z M11 36 C2 20 -6 18 -10 24 C0 24 6 28 11 36Z M11 36 C20 20 28 18 32 24 C22 24 16 28 11 36Z" fill="#140b03"/></g>
  <g transform="translate(346 420) scale(.85)"><path d="M12 98 C10 78 14 58 11 36" fill="none" stroke="#140b03" stroke-width="5" stroke-linecap="round"/><path d="M11 36 C-2 30 -8 38 -10 46 C0 40 6 40 11 36Z M11 36 C24 30 32 38 34 46 C24 40 18 40 11 36Z M11 36 C2 20 -6 18 -10 24 C0 24 6 28 11 36Z M11 36 C20 20 28 18 32 24 C22 24 16 28 11 36Z" fill="#140b03"/></g>
  <g transform="translate(222 440)"><path d="M10 0 V26 H-2Z" fill="#fdfaf0"/><path d="M12 8 V26 H24Z" fill="#f2c964"/><path d="M-4 27 H26 L21 33 H1Z" fill="#7a4a21"/></g>
</svg>`;
export const pageCount = (n) => Math.max(1, Math.ceil(n / LEVELS_PER_PAGE));
export const pageOfIndex = (i) => (i < 0 ? 0 : Math.floor(i / LEVELS_PER_PAGE));
function tileHtml(l) {
const e = escapeHtml;
if (l.state === 'locked' || l.state === 'soon') {
const sub = l.state === 'soon' ? 'قريبًا' : 'قافل';
return `
      <button type="button" class="ngame-lv is-locked" data-action="locked" data-i="${l.index}" aria-label="المستوى ${arNum(l.num)} — ${sub}">
        <span class="ngame-lv__num" aria-hidden="true">${arNum(l.num)}</span>
        <span class="ngame-lv__plate"><span data-icon="lock"></span></span>
        <span class="ngame-lv__name">المستوى ${arNum(l.num)}</span>
        <span class="ngame-lv__sub">${sub}</span>
      </button>`;
}
const cur = l.state === 'current';
const tail = cur
? '<span class="ngame-lv__sub ngame-lv__sub--go">مستواك، ابدأ</span>'
: `<span class="ngame-lv__stars" aria-hidden="true">${[1, 2, 3].map(k => `<i class="${k <= l.stars ? 'on' : ''}">★</i>`).join('')}</span>`;
const label = `المستوى ${arNum(l.num)}: ${l.title}${cur ? ' — مستواك الحالي' : ` — ${arNum(l.stars)} من ٣ نجوم`}`;
return `
      <button type="button" class="ngame-lv ${cur ? 'is-current' : 'is-done'}" data-action="start" data-key="${e(l.key)}" aria-label="${e(label)}">
        <span class="ngame-lv__num" aria-hidden="true">${arNum(l.num)}</span>
        <span class="ngame-lv__plate"><span data-icon="${e(l.icon || 'languages')}"></span></span>
        <span class="ngame-lv__name">${e(l.title)}</span>
        ${tail}
      </button>`;
}
export function levelsGridHtml(levels, page) {
const from = page * LEVELS_PER_PAGE;
return levels.slice(from, from + LEVELS_PER_PAGE).map(tileHtml).join('');
}
