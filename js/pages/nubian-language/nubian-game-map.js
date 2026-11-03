import { escapeHtml } from '../../shared/sanitize.js';
import { abadolHtml, arNum } from '../../shared/abadol-mascot.js';
const ROW = 140;
const TOP = 240;
const BOT = 140;
const SIDE_X = [22, 78];
const riverX = (y) => +(50 + 5 * Math.sin(y / 190)).toFixed(2);
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
const PYRAMID = `<svg viewBox="0 0 60 48" aria-hidden="true" focusable="false">
  <path d="M30 3 L3 45 H30Z" fill="#ecc477"/><path d="M30 3 L57 45 H30Z" fill="#c8944a"/>
  <path d="M3 45 H57" stroke="#a9772f" stroke-width="2" stroke-linecap="round"/>
  <path d="M30 45 v-9 a3 3 0 0 1 6 0 v9z" fill="#7a4a21" opacity=".75"/>
</svg>`;
const PALM = `<svg viewBox="0 0 60 100" aria-hidden="true" focusable="false">
  <path d="M30 98 C27 78 33 58 29 36" fill="none" stroke="#7a5230" stroke-width="6" stroke-linecap="round"/>
  <path d="M29 36 C14 28 6 36 2 46 C14 38 22 38 29 36 Z" fill="#2f7d3c"/><path d="M29 36 C44 28 54 36 58 46 C46 38 36 38 29 36 Z" fill="#2f7d3c"/>
  <path d="M29 36 C18 16 8 14 3 20 C14 20 22 26 29 36 Z" fill="#3f9a4c"/><path d="M29 36 C40 16 50 14 55 20 C44 20 36 26 29 36 Z" fill="#3f9a4c"/>
  <path d="M29 36 C27 20 30 10 30 4 C34 12 33 24 29 36 Z" fill="#58b562"/>
  <circle cx="26" cy="40" r="3" fill="#e8b53f"/><circle cx="33" cy="41" r="3" fill="#d49a2c"/>
</svg>`;
const CROC = `<svg viewBox="0 0 72 30" aria-hidden="true" focusable="false">
  <g class="ngame-croc__tail"><path d="M52 12 C60 9 66 12 71 6 C69 15 62 20 52 19 Z" fill="#3f8a3a"/></g>
  <path d="M22 20 l-3 7 h6 z M44 20 l-3 7 h6 z" fill="#37762f"/>
  <path d="M14 10 C20 6 40 6 54 9 L54 20 C40 22 20 22 14 19 Z" fill="#4aa044"/>
  <path d="M14 10 L2 12.5 C1 13.5 1 16 2 17 L14 19 Z" fill="#58b04f"/>
  <path d="M20 7 l3 -3.5 l3 3.5 M30 6.5 l3 -3.5 l3 3.5 M40 7 l3 -3.5 l3 3.5" fill="#2f6e2b" stroke="#2f6e2b" stroke-width="1" stroke-linejoin="round"/>
  <path d="M2 15.4 H14" stroke="#1d4a1a" stroke-width="1.3" stroke-linecap="round"/>
  <path d="M3.5 15.6 l1.6 2.4 l1.6 -2.4 M8 15.6 l1.6 2.4 l1.6 -2.4" fill="#fff" stroke="#fff" stroke-width=".6" stroke-linejoin="round"/>
  <circle cx="12" cy="10.8" r="2.4" fill="#f4e8a6"/><circle class="ngame-croc__eye" cx="12.4" cy="10.9" r="1.1" fill="#2a1508"/>
</svg>`;
const BOAT = `<svg viewBox="0 0 50 44" aria-hidden="true" focusable="false">
  <path d="M25 3 L25 33 L5 33Z" fill="#fdfaf0"/><path d="M27 12 L27 33 L43 33Z" fill="#f2c964"/>
  <path d="M3 34 L47 34 L40 42 L10 42Z" fill="#7a4a21"/><rect x="3" y="34" width="44" height="3" fill="#e8b53f"/>
</svg>`;
export function mapHtml({ stops, cur, hint }) {
const n = stops.length;
if (!n) return '';
const h = TOP + BOT + (n - 1) * ROW;
const yOf = (i) => TOP + (n - 1 - i) * ROW;
const sideOf = (i) => (i % 2 === 0 ? 0 : 1);
const xOf = (i) => SIDE_X[sideOf(i)];
let river = `M${riverX(176)} 176`;
for (let y = 190; y < h; y += 14) river += ` L${riverX(y)} ${y}`;
river += ` L${riverX(h)} ${h}`;
let done = '', todo = '';
for (let i = 0; i < n - 1; i++) {
const my = (yOf(i) + yOf(i + 1)) / 2;
const seg = `M${xOf(i)} ${yOf(i)} C${xOf(i)} ${my} ${xOf(i + 1)} ${my} ${xOf(i + 1)} ${yOf(i + 1)} `;
if (stops[i].stars > 0) done += seg; else todo += seg;
}
let decor = '';
for (let i = 0; i < n - 1; i++) {
const y = yOf(i), side = sideOf(i), dy = y - 92, R = riverX(dy);
decor += `<span class="ngame-croc${side === 0 ? ' is-flip' : ''}" style="left:calc(${R}% ${side === 0 ? '- 112px' : '+ 40px'});top:${dy - 14}px">${CROC}</span>`;
const edge = side === 0 ? 'left:6px' : 'right:6px';
decor += i % 2 === 0
? `<span class="ngame-pyr" style="${edge};top:${y - 122}px">${PYRAMID}</span>`
: `<span class="ngame-palm" style="${edge};top:${y - 126}px">${PALM}</span>`;
if (i % 3 === 1) {
const by = y - 62;
decor += `<span class="ngame-boat${i % 2 ? ' is-flip' : ''}" style="left:calc(${riverX(by)}% - 18px);top:${by}px">${BOAT}</span>`;
}
}
const nodes = stops.map((s, i) => {
const state = !s.ok ? 'is-off' : i === cur && !s.stars ? 'is-open' : s.stars ? 'is-done' : '';
const stars = s.ok
? `<span class="ngame-stop__stars" aria-hidden="true">${[1, 2, 3].map(k => `<i class="${k <= s.stars ? 'on' : ''}">★</i>`).join('')}</span>` : '';
const meta = s.ok ? `عرفت ${arNum(s.known)} من ${arNum(s.total)}` : 'قريبًا';
const label = `${s.title} — ${meta}${s.ok ? ` — ${arNum(s.stars)} من ٣ نجوم` : ''}`;
return `
      <button type="button" class="ngame-stop ${state}" style="left:${xOf(i)}%;top:${yOf(i)}px"
              data-action="start" data-key="${escapeHtml(s.key)}" ${s.ok ? '' : 'disabled'} aria-label="${escapeHtml(label)}">
        <span class="ngame-stop__disc"><span data-icon="${escapeHtml(s.icon || 'languages')}"></span></span>
        ${stars}
        <span class="ngame-stop__label">${escapeHtml(s.title)}<small>${meta}</small></span>
      </button>`;
}).join('');
let buddy = '';
if (cur >= 0 && hint) {
const side = sideOf(cur);
buddy = `
      <button type="button" class="ngame-buddy ngame-buddy--${side ? 'r' : 'l'}" data-action="abadol"
              style="top:${yOf(cur) - 54}px;${side ? 'right' : 'left'}:calc(${SIDE_X[0]}% + 50px)" aria-label="آبادول يرشدك، المسه ليحدّثك">
        <span class="ngame-buddy__bubble" id="ngame-buddy-say" role="status">${escapeHtml(hint.text)}</span>
        ${abadolHtml(hint.mood, 68)}
      </button>`;
}
return `
    <div class="ngame-map" style="height:${h}px">
      <svg class="ngame-map__svg" viewBox="0 0 100 ${h}" preserveAspectRatio="none" aria-hidden="true">
        <path class="ngame-sand" d="${river}"/>
        <path class="ngame-green" d="${river}"/>
        <path class="ngame-water" d="${river}"/>
        <path class="ngame-flow" d="${river}"/>
        <path class="ngame-trail" d="${todo}"/>
        <path class="ngame-trail is-done" d="${done}"/>
      </svg>
      <div class="ngame-map__sky" aria-hidden="true">${SKYLINE}</div>
      <span class="ngame-map__sign ngame-map__sign--end">الأهرامات</span>
      <span class="ngame-map__sign ngame-map__sign--start">البداية</span>
      ${decor}${nodes}${buddy}
    </div>`;
}
