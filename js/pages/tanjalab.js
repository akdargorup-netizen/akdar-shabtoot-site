import { buildTanjalabLevels, getAllTanjalabQuestions } from '../data/tanjalab-questions-data.js';
import { renderIcons } from '../shared/icons.js';
import { setBackInterceptor } from '../core/router.js';
import { showToast } from '../shared/toast.js';
import { requestPersist, mirrorSet, mirrorGet, whatsappUrl } from '../shared/tj-backup.js';
import { mascotHtml, sayHtml, reactionFor, levelResultSay, dailyResultSay, GUIDE_STEPS } from '../shared/tj-mascot.js';
const STORE_KEY = 'tanjalab:v1';
const QUESTION_SECONDS = 20;
const MIN_QUESTION_SECONDS = 14;
const EXTRA_SECONDS = 10;
const DAILY_COUNT = 5;
const LETTERS = ['أ', 'ب', 'ج'];
const OPTION_COUNT = 3;
const BACKUP_PREFIX = 'TJ1:';
const _E = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const ar = n => String(n).replace(/[0-9]/g, d => _E[Number(d)]);
const esc = s => String(s).replace(/[&<>"']/g, c => (
{ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function defaults() {
return { levels: {}, name: '', muted: false, guideSeen: false, backupRounds: 0, daily: null, streak: { count: 0, last: '' }, stats: { answered: 0, correct: 0, bestCombo: 0, rounds: 0 } };
}
function loadProgress() {
try {
const p = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
return {
...defaults(), ...p,
levels: p.levels || {},
streak: p.streak || { count: 0, last: '' },
stats: { ...defaults().stats, ...(p.stats || {}) },
};
} catch { return defaults(); }
}
function saveProgress() {
const raw = JSON.stringify(progress);
try { localStorage.setItem(STORE_KEY, raw); } catch {   }
mirrorSet(STORE_KEY, raw);
}
function shuffle(arr, rnd = Math.random) {
const a = [...arr];
for (let i = a.length - 1; i > 0; i--) {
const j = Math.floor(rnd() * (i + 1));
[a[i], a[j]] = [a[j], a[i]];
}
return a;
}
function dateKey(d = new Date()) {
const m = String(d.getMonth() + 1).padStart(2, '0');
const day = String(d.getDate()).padStart(2, '0');
return `${d.getFullYear()}-${m}-${day}`;
}
function yesterdayKey() { const d = new Date(); d.setDate(d.getDate() - 1); return dateKey(d); }
function seeded(str) {
let h = 1779033703 ^ str.length;
for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
let a = h >>> 0;
return () => {
a |= 0; a = (a + 0x6D2B79F5) | 0;
let t = Math.imul(a ^ (a >>> 15), 1 | a);
t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
}
let _ctx = null;
let _busyUntil = 0;
const _live = new Set();
function stopSounds() {
_live.forEach(o => { try { o.stop(); } catch {   } });
_live.clear();
_busyUntil = 0;
}
function tone(seq, vol = 0.18, type = 'sine', opt = {}) {
if (progress.muted) return;
try {
const C = window.AudioContext || window.webkitAudioContext;
if (!C) return;
_ctx = _ctx || new C();
if (_ctx.state === 'suspended') _ctx.resume();
const now = _ctx.currentTime;
if (opt.skipIfBusy && _busyUntil > now + 0.02) return;
let t = Math.max(now, _busyUntil);
if (t - now > 1.6) return;
const total = seq.reduce((s, x) => s + x[1], 0);
_busyUntil = t + total + 0.07;
const cancellable = total >= 0.2;
seq.forEach(([f, d, f2]) => {
if (f > 0) {
const o = _ctx.createOscillator(); const g = _ctx.createGain();
o.type = type;
o.frequency.setValueAtTime(f, t);
if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
g.gain.setValueAtTime(0.0001, t);
g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.02, d / 3));
g.gain.exponentialRampToValueAtTime(0.0001, t + d);
let out = g;
if (opt.lp) {
const flt = _ctx.createBiquadFilter();
flt.type = 'lowpass'; flt.frequency.value = opt.lp;
g.connect(flt); out = flt;
}
o.connect(g); out.connect(_ctx.destination);
if (opt.vibrato) {
const lfo = _ctx.createOscillator(); const lg = _ctx.createGain();
lfo.frequency.value = opt.vibrato; lg.gain.value = f * 0.04;
lfo.connect(lg); lg.connect(o.frequency);
lfo.start(t); lfo.stop(t + d + 0.02);
}
o.start(t); o.stop(t + d + 0.02);
if (cancellable) { _live.add(o); o.onended = () => _live.delete(o); }
}
t += d;
});
} catch {   }
}
const sndOk   = (c = 1) => { const k = Math.min(c, 6); tone([[640 + k * 30, 0.09], [860 + k * 40, 0.14]]); };
const sndBad  = () => {
tone([[392, 0.17, 330], [0, 0.03], [311, 0.34, 196]], 0.3, 'sawtooth', { lp: 1500 });
try { navigator.vibrate && navigator.vibrate(90); } catch {   }
};
const sndWin  = () => tone([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.22]]);
const sndTap  = () => tone([[520, 0.05]], 0.08, 'triangle', { skipIfBusy: true });
const sndStart  = () => tone([[440, 0.06], [587, 0.06], [740, 0.12]], 0.14);
const sndUnlock = () => tone([[784, 0.08], [988, 0.08], [1175, 0.08], [1568, 0.28]], 0.16, 'triangle');
const sndStarNote = n => tone([[[659, 784, 1047][n - 1] || 1047, 0.2]], 0.2, 'triangle');
const BALHA_VOICE = {
hi:    () => tone([[520, 0.09, 780], [0, 0.04], [700, 0.15, 1000]], 0.2, 'triangle', { vibrato: 9 }),
happy: () => tone([[600, 0.07, 900], [0, 0.03], [700, 0.07, 1050], [0, 0.03], [820, 0.13, 1250]], 0.2, 'triangle', { vibrato: 12 }),
cheer: () => tone([[500, 0.07, 800], [650, 0.07, 1000], [800, 0.07, 1200], [0, 0.04], [900, 0.22, 1600]], 0.22, 'triangle', { vibrato: 14 }),
win:   () => tone([[560, 0.08, 840], [700, 0.08, 1050], [840, 0.08, 1260], [0, 0.04], [1000, 0.1, 1500], [1250, 0.26, 1900]], 0.22, 'triangle', { vibrato: 13 }),
sad:   () => tone([[640, 0.24, 430], [0, 0.05], [500, 0.4, 290]], 0.2, 'sine', { vibrato: 6 }),
time:  () => tone([[720, 0.1, 560], [0, 0.04], [580, 0.1, 450], [0, 0.04], [430, 0.22, 300]], 0.2, 'triangle', { vibrato: 16 }),
think: () => tone([[430, 0.13, 580], [0, 0.05], [580, 0.18, 500]], 0.18, 'sine', { vibrato: 5 }),
smirk: () => tone([[420, 0.12, 380], [0, 0.05], [360, 0.22, 450]], 0.18, 'sine', { vibrato: 4 }),
laugh: () => tone([[700, 0.06, 820], [0, 0.03], [720, 0.06, 840], [0, 0.03], [740, 0.06, 860], [0, 0.03], [760, 0.06, 880], [0, 0.03], [780, 0.12, 900]], 0.2, 'triangle', { vibrato: 18 }),
sheepish: () => tone([[600, 0.08, 520], [0, 0.05], [520, 0.14, 440]], 0.17, 'triangle', { vibrato: 8 }),
grin:  () => tone([[640, 0.07, 940], [0, 0.03], [760, 0.07, 1100], [0, 0.03], [900, 0.14, 1350]], 0.2, 'triangle', { vibrato: 12 }),
};
const sndBalha = mood => (BALHA_VOICE[mood] || BALHA_VOICE.hi)();
function chainSay(root, re) {
if (!re || !re.then || !root) return;
const nx = re.then;
sfxAt(nx.delay || 1800, () => {
const mas = root.querySelector('.tj-say .tj-mascot');
const bub = root.querySelector('.tj-say .tj-say__bubble');
if (!mas || !bub || !mas.isConnected) return;
const size = parseInt(mas.style.getPropertyValue('--ms'), 10) || 64;
mas.outerHTML = mascotHtml(nx.mood, size);
bub.textContent = nx.text;
sndBalha(nx.mood);
});
}
let _sfxTimers = [];
function sfxAt(ms, fn) { _sfxTimers.push(setTimeout(fn, ms)); }
function clearSfx() { _sfxTimers.forEach(clearTimeout); _sfxTimers = []; stopSounds(); }
const TITLES = [
{ min: 0.8, name: 'بطل التنجلاب' },
{ min: 0.5, name: 'فارس التنجلاب' },
{ min: 0.25, name: 'ابن التنجلاب النجيب' },
{ min: 0, name: 'ضيف التنجلاب' },
];
function titleInfo(stars, maxStars) {
const ratio = maxStars ? stars / maxStars : 0;
const cur = TITLES.find(t => ratio >= t.min);
const higher = [...TITLES].reverse().find(t => t.min > cur.min);
const need = higher ? Math.ceil(higher.min * maxStars) - stars : 0;
return { name: cur.name, next: higher ? higher.name : '', need: Math.max(need, 0) };
}
let LEVELS = [];
let progress = defaults();
let game = null;
let timerId = null;
let introTimer = null;
function secondsFor(g) {
if (!g || g.mode === 'daily' || g.level < 3) return QUESTION_SECONDS;
return Math.max(MIN_QUESTION_SECONDS, QUESTION_SECONDS - Math.floor(g.level / 3));
}
function stopTimer() {
if (timerId) { clearInterval(timerId); timerId = null; }
if (introTimer) { clearTimeout(introTimer); introTimer = null; }
}
let _visBound = false;
function bindVisibility() {
if (_visBound) return;
_visBound = true;
document.addEventListener('visibilitychange', () => {
if (!game || game.locked || !document.getElementById('tj-time')) return;
if (document.hidden) {
if (timerId) { clearInterval(timerId); timerId = null; }
} else if (!timerId) {
startTick();
}
});
}
const root = () => document.getElementById('tj-root');
function toTop() {
const go = () => {
const sc = document.getElementById('app-content');
if (!sc) return;
const prev = sc.style.scrollBehavior;
sc.style.scrollBehavior = 'auto';
sc.scrollTop = 0;
sc.style.scrollBehavior = prev;
};
go();
setTimeout(go, 60);
}
const starsOf = i => (progress.levels[i] && progress.levels[i].stars) || 0;
const isUnlocked = i => i === 0 || starsOf(i - 1) >= 1;
export function renderTanjalab() {
return `<section class="page tanjalab-page"><div class="tj-root" id="tj-root"></div></section>`;
}
function handleBack() {
const el = root();
const page = document.getElementById('app-content')?.dataset.currentPage;
if (!el || !el.isConnected || page !== 'tanjalab') { setBackInterceptor(null); return false; }
if (el.querySelector('.tj-map')) return false;
if (el.querySelector('.tj-guide')) { endGuide(); return true; }
stopTimer();
showMap();
return true;
}
export function initTanjalab() {
stopTimer();
bindVisibility();
setBackInterceptor(handleBack);
LEVELS = buildTanjalabLevels();
const hadLocal = (() => { try { return !!localStorage.getItem(STORE_KEY); } catch { return true; } })();
progress = loadProgress();
if (progress.guideSeen) showMap(); else showGuide(0);
requestPersist();
if (!hadLocal) {
mirrorGet(STORE_KEY).then(raw => {
if (!raw || localStorage.getItem(STORE_KEY)) return;
try {
JSON.parse(raw);
localStorage.setItem(STORE_KEY, raw);
progress = loadProgress();
if (root() && !game) { showMap(); showToast('تم استرجاع تقدّمك المحفوظ ✓', 'success'); }
} catch {   }
});
}
const el = root();
if (el && !el.dataset.bound) {
el.dataset.bound = '1';
el.addEventListener('click', onClick);
el.addEventListener('change', onChange);
}
}
const MAP_ROW = 124;
const MAP_TOP = 170;
const MAP_BOT = 120;
const MAP_XS = [50, 80, 50, 20];
const mapPos = (i, n) => ({ x: MAP_XS[i % MAP_XS.length], y: MAP_TOP + (n - 1 - i) * MAP_ROW });
function mapGeometry(n) {
const h = MAP_TOP + MAP_BOT + (n - 1) * MAP_ROW;
let done = '', todo = '';
for (let i = 0; i < n - 1; i++) {
const a = mapPos(i, n), b = mapPos(i + 1, n), my = (a.y + b.y) / 2;
const seg = `M${a.x} ${a.y} C${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y} `;
if (isUnlocked(i + 1)) done += seg; else todo += seg;
}
let river = 'M18 0';
const boats = [];
const K = Math.max(2, Math.round(h / 420));
for (let k = 1; k <= K; k++) {
const y0 = (k - 1) * h / K, y1 = k * h / K, ym = (y0 + y1) / 2;
const odd = k % 2 === 1;
const x = odd ? 84 : 14;
const px = k === 1 ? 18 : (odd ? 14 : 84);
const c1 = odd ? 18 : 84;
river += ` C${c1} ${ym} ${x} ${ym} ${x} ${y1}`;
if (ym > MAP_TOP - 20 && ym < h - MAP_BOT) {
boats.push({ x: (px + 3 * c1 + 3 * x + x) / 8, y: ym, flip: !odd });
}
}
return { h, done, todo, river, boats };
}
function villageSvg() {
const H = 120;
const house = (x, w, h, dome) => {
const y = H - h;
const top = dome
? `<path d="M${x} ${y} a${w / 2} ${w / 2.3} 0 0 1 ${w} 0z" fill="#146069"/>`
: `<rect x="${x - 2}" y="${y - 4}" width="${w + 4}" height="5" rx="1.5" fill="#146069"/>`;
const dw = Math.min(11, w * 0.32), dx = x + (w - dw) / 2;
const dh = (dw * 1.05).toFixed(1);
return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0d434b"/>${top}` +
`<rect x="${x}" y="${y + 8}" width="${w}" height="3" fill="#e8b53f" opacity=".85"/>` +
`<path d="M${dx} ${H} v-${dh} a${dw / 2} ${dw / 2} 0 0 1 ${dw} 0 v${dh}z" fill="#f2c964"/>` +
(w > 30 ? `<rect x="${x + 5}" y="${y + 18}" width="5" height="7" rx="2.5" fill="#f2c964" opacity=".8"/>` : '');
};
const palm = (x, sc) => `<g transform="translate(${x} ${H}) scale(${sc})"><path d="M0 0 C-2 -22 2 -40 0 -58" stroke="#0a3239" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M0 -58 C-14 -62 -24 -54 -28 -44 C-16 -52 -8 -54 0 -58Z M0 -58 C14 -62 24 -54 28 -44 C16 -52 8 -54 0 -58Z M0 -58 C-10 -74 -22 -76 -27 -70 C-16 -70 -8 -66 0 -58Z M0 -58 C10 -74 22 -76 27 -70 C16 -70 8 -66 0 -58Z M0 -58 C-2 -70 0 -78 1 -84 C5 -76 4 -66 0 -58Z" fill="#0a3239"/></g>`;
const houses = [[8, 34, 44, 1], [46, 26, 32, 0], [78, 42, 60, 1], [126, 30, 38, 0], [160, 36, 48, 1],
[236, 40, 54, 0], [280, 32, 40, 1], [318, 38, 62, 1], [362, 30, 36, 0]];
return `<svg viewBox="0 0 400 ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
    <defs><mask id="tj-moon"><rect width="400" height="${H}" fill="#fff"/><circle cx="349" cy="36" r="12" fill="#000"/></mask></defs>
    <circle cx="341" cy="40" r="15" fill="#fbe9b4" mask="url(#tj-moon)"/>
    ${palm(214, 0.95)}${palm(226, 0.7)}${palm(60, 0.6)}
    ${houses.map(h => house(...h)).join('')}
    <rect y="${H - 4}" width="400" height="4" fill="#0d434b"/>
  </svg>`;
}
const VILLAGE = villageSvg();
const PALM = `<svg viewBox="0 0 60 100" aria-hidden="true" focusable="false">
  <path d="M30 98 C27 78 33 58 29 36" fill="none" stroke="#7a5230" stroke-width="6" stroke-linecap="round"/>
  <path d="M29 36 C14 28 6 36 2 46 C14 38 22 38 29 36 Z" fill="#1f7a5c"/>
  <path d="M29 36 C44 28 54 36 58 46 C46 38 36 38 29 36 Z" fill="#1f7a5c"/>
  <path d="M29 36 C18 16 8 14 3 20 C14 20 22 26 29 36 Z" fill="#2f9a74"/>
  <path d="M29 36 C40 16 50 14 55 20 C44 20 36 26 29 36 Z" fill="#2f9a74"/>
  <path d="M29 36 C27 20 30 10 30 4 C34 12 33 24 29 36 Z" fill="#43b78c"/>
  <circle cx="26" cy="40" r="3" fill="#e8b53f"/><circle cx="33" cy="41" r="3" fill="#d49a2c"/>
</svg>`;
const HOUSE = `<svg viewBox="0 0 50 62" aria-hidden="true" focusable="false">
  <rect x="5" y="22" width="40" height="38" rx="2" fill="#e9d3a2"/>
  <path d="M5 22 a20 17 0 0 1 40 0z" fill="#d8bd86"/>
  <rect x="5" y="30" width="40" height="5" fill="#17909c"/>
  <rect x="5" y="36" width="40" height="3" fill="#e8b53f"/>
  <path d="M19 60 v-14 a6 6 0 0 1 12 0 v14z" fill="#0d434b"/>
  <rect x="9" y="42" width="6" height="8" rx="3" fill="#0d434b"/><rect x="35" y="42" width="6" height="8" rx="3" fill="#0d434b"/>
</svg>`;
const BOAT = `<svg viewBox="0 0 50 44" aria-hidden="true" focusable="false">
  <path d="M25 3 L25 33 L5 33Z" fill="#fdfaf0"/><path d="M27 12 L27 33 L43 33Z" fill="#f2c964"/>
  <path d="M3 34 L47 34 L40 42 L10 42Z" fill="#7a4a21"/><rect x="3" y="34" width="44" height="3" fill="#e8b53f"/>
</svg>`;
const DUNES = `<svg viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <path d="M0 70 V38 C60 14 120 50 190 30 C260 10 320 44 400 22 V70Z" fill="#1c5a60"/>
  <path d="M0 70 V52 C70 34 140 62 210 48 C280 34 340 58 400 44 V70Z" fill="#14464c"/>
</svg>`;
function mapDecor(n, h, boats) {
let out = `<div class="tj-village" aria-hidden="true">${VILLAGE}</div>`;
for (let k = 0, y = MAP_TOP + 30; y < h - MAP_BOT - 40; k++, y += 190) {
const side = k % 2 ? 'right' : 'left';
if (k % 3 === 1) {
out += `<span class="tj-house" style="${side}:2px;top:${y}px">${HOUSE}</span>`;
} else {
const w = 38 + (k % 3) * 6;
out += `<span class="tj-palm" style="${side}:-2px;top:${y}px;width:${w}px">${PALM}</span>`;
}
}
out += boats.map(b =>
`<span class="tj-boat${b.flip ? ' is-flip' : ''}" style="left:${b.x.toFixed(1)}%;top:${Math.round(b.y)}px">${BOAT}</span>`).join('');
return out +
`<div class="tj-dunes" aria-hidden="true">${DUNES}</div>` +
`<span class="tj-map__sign tj-map__sign--end"><i data-icon="map-pin"></i> قرية شبتوت</span>` +
`<span class="tj-map__sign tj-map__sign--start">البداية</span>`;
}
function showMap() {
stopTimer();
clearSfx();
game = null;
const el = root(); if (!el) return;
if (!LEVELS.length && !getAllTanjalabQuestions().length) {
el.innerHTML = `
      <div class="tj-hero animate-fade-up">
        <div class="tj-crown tj-crown--mascot">${mascotHtml('hi', 76)}</div>
        <h2 class="tj-hero__title">تحدي التنجلاب</h2>
        <p class="tj-hero__sub">الأسئلة قيد التجديد</p>
        <p class="tj-note">نُجهّز أسئلة جديدة عن شبتوت — تابعونا قريبًا.</p>
      </div>`;
return;
}
const n = LEVELS.length;
const total = LEVELS.reduce((s, _, i) => s + starsOf(i), 0);
const maxStars = n * 3;
const info = titleInfo(total, maxStars);
const pct = maxStars ? Math.round((total / maxStars) * 100) : 0;
const doneLevels = LEVELS.filter((_, i) => starsOf(i) >= 1).length;
const acc = progress.stats.answered ? Math.round((progress.stats.correct / progress.stats.answered) * 100) : 0;
const today = dateKey();
const dailyDone = progress.daily && progress.daily.date === today;
const streak = progress.streak.last === today || progress.streak.last === yesterdayKey()
? progress.streak.count : 0;
let cur = 0;
LEVELS.forEach((_, i) => { if (isUnlocked(i)) cur = i; });
const g = mapGeometry(n);
const nodes = LEVELS.map((_, i) => {
const unlocked = isUnlocked(i);
const st = starsOf(i);
const { x, y } = mapPos(i, n);
const state = unlocked ? (st ? 'is-done' : 'is-open') : 'is-locked';
const ms = (i + 1) % 5 === 0;
const stars = unlocked && st
? `<span class="tj-node__stars" aria-hidden="true">${[1, 2, 3].map(s => `<i class="${s <= st ? 'on' : ''}">★</i>`).join('')}</span>` : '';
const here = i === cur;
const flag = (here && !st) ? `<span class="tj-node__flag">ابدأ</span>` : '';
const buddy = here ? `<span class="tj-node__buddy">${mascotHtml(st ? 'happy' : 'hi', 62)}</span>` : '';
return `
      <button class="tj-node ${state} ${ms ? 'is-milestone' : ''}" style="left:${x}%;top:${y}px"
              data-level="${i}" ${unlocked ? '' : 'disabled aria-disabled="true"'}
              aria-label="المستوى ${ar(i + 1)}${st ? ` — ${ar(st)} نجوم` : ''}">
        ${buddy}${flag}
        <span class="tj-node__face"><span class="tj-node__num">${unlocked ? ar(i + 1) : '<i data-icon="lock"></i>'}</span></span>
        ${ms ? '<span class="tj-node__ms"><i data-icon="trophy"></i></span>' : ''}
        ${stars}
      </button>`;
}).join('');
el.innerHTML = `
    <div class="tj-hero animate-fade-up">
      <div class="tj-crown tj-crown--mascot">${mascotHtml('hi', 76)}</div>
      <h2 class="tj-hero__title">تحدي التنجلاب</h2>
      <p class="tj-hero__sub">${progress.name ? `${esc(progress.name)} · ` : ''}<span class="tj-rank"><i data-icon="crown"></i>${info.name}</span></p>
      <div class="tj-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${maxStars}" aria-valuenow="${total}">
        <div class="tj-prog__fill" style="width:${pct}%"></div>
        <span class="tj-prog__txt">★ ${ar(total)} / ${ar(maxStars)}</span>
      </div>
      <p class="tj-hero__line" aria-label="إحصائياتك">
        <span>${ar(doneLevels)} من ${ar(n)} مستوى</span>
        <span>${ar(acc)}٪ صحيحة</span>
        <span>أطول متتالية ${ar(progress.stats.bestCombo)}</span>
      </p>
      <div class="tj-name">
        <input class="input tj-name__input" id="tj-name" maxlength="20"
               placeholder="اكتب اسمك يا بطل" value="${esc(progress.name)}" aria-label="اسم اللاعب">
        <button class="tj-icon-btn" data-act="mute" aria-label="${progress.muted ? 'تشغيل الصوت' : 'كتم الصوت'}">
          <i data-icon="${progress.muted ? 'volume-x' : 'volume-2'}"></i>
        </button>
      </div>
      <button class="tj-help" data-act="guide"><i data-icon="info"></i> كيف ألعب؟</button>
    </div>

    ${backupReminderHtml()}
    <button class="tj-daily ${dailyDone ? 'is-done' : ''}" data-act="daily" ${dailyDone ? 'disabled' : ''}>
      <span class="tj-daily__icon"><i data-icon="${dailyDone ? 'check-circle' : 'calendar-check'}"></i></span>
      <span class="tj-daily__body">
        <strong>تحدّي اليوم</strong>
        <small>${dailyDone
? `أنهيتَه اليوم — نتيجتك ${ar(progress.daily.score)} · عُد غدًا`
: `${ar(DAILY_COUNT)} أسئلة جديدة كل يوم`}</small>
      </span>
      <span class="tj-daily__streak" title="أيام متتالية">${streak ? `<i data-icon="flame"></i> ${ar(streak)}` : ''}</span>
    </button>

    <div class="tj-world">
      <div class="tj-map" style="height:${g.h}px">
        <svg class="tj-map__svg" viewBox="0 0 100 ${g.h}" preserveAspectRatio="none" aria-hidden="true">
          <path class="tj-bank" d="${g.river}"/>
          <path class="tj-river" d="${g.river}"/>
          <path class="tj-flow" d="${g.river}"/>
          <path class="tj-trail" d="${g.todo}"/>
          <path class="tj-trail is-done" d="${g.done}"/>
        </svg>
        ${mapDecor(n, g.h, g.boats)}
        ${nodes}
      </div>

      <div class="tj-ground">
        <section class="tj-save" aria-label="حفظ التقدّم">
          <h3 class="tj-save__title"><i data-icon="shield-check"></i> احفظ تقدّمك</h3>
          <p class="tj-save__note">تقدّمك محفوظ على هذا الجهاز. أرسل نسخة لنفسك قبل تغيير الهاتف أو مسح بيانات التطبيق.</p>
          <div class="tj-save__row">
            <button class="tj-save__btn tj-save__btn--main" data-act="wa"><i data-icon="send"></i><span>واتساب</span></button>
            <button class="tj-save__btn" data-act="export"><i data-icon="copy"></i><span>نسخ الكود</span></button>
            <button class="tj-save__btn" data-act="import"><i data-icon="download"></i><span>استرجاع</span></button>
          </div>
          <button class="tj-save__reset" data-act="reset"><i data-icon="rotate-ccw"></i> إعادة التقدّم من الصفر</button>
        </section>
      </div>
    </div>`;
renderIcons(el);
if (cur > 1) {
const node = el.querySelector(`[data-level="${cur}"]`);
if (node && node.scrollIntoView) setTimeout(() => node.scrollIntoView({ block: 'center' }), 60);
} else {
toTop();
}
}
function resetProgress() {
const ok = window.confirm('ستبدأ اللعبة من الصفر، وستختفي كل نجومك ونقاطك وأيامك المتتالية. تأكّد أنك نسخت تقدّمك إن أردت الاحتفاظ به. هل أنت متأكد؟');
if (!ok) return;
const keepMuted = progress.muted;
progress = defaults();
progress.muted = keepMuted;
saveProgress();
showToast('عادت اللعبة من الصفر', 'success');
showGuide(0);
}
const REMIND_EVERY = 5;
function backupReminderHtml() {
const due = progress.stats.rounds - (progress.backupRounds || 0) >= REMIND_EVERY;
if (!due) return '';
return `
    <div class="tj-remind animate-fade-up">
      ${sayHtml('think', 'احفظ تقدّمك يا غالي! أرسل نسخة لنفسك على واتساب كي لا يضيع إن غيّرت هاتفك.', 72)}
      <div class="tj-remind__actions">
        <button class="btn btn--primary" data-act="wa">أرسلها لي</button>
        <button class="btn btn--secondary" data-act="remind-later">لاحقًا</button>
      </div>
    </div>`;
}
function markBackedUp() {
progress.backupRounds = progress.stats.rounds;
saveProgress();
}
function sendWhatsapp() {
markBackedUp();
const w = window.open(whatsappUrl(encodeBackup()), '_blank', 'noopener');
if (!w) exportProgress();
else showMap();
}
function showGuide(step = 0) {
stopTimer();
clearSfx();
const el = root(); if (!el) return;
const i = Math.max(0, Math.min(step, GUIDE_STEPS.length - 1));
const st = GUIDE_STEPS[i];
const last = i === GUIDE_STEPS.length - 1;
el.innerHTML = `
    <div class="tj-guide animate-fade-up">
      <div class="tj-rays tj-rays--intro" aria-hidden="true"></div>
      <div class="tj-skyline" aria-hidden="true">${VILLAGE}</div>
      ${mascotHtml(st.mood, 150)}
      <p class="tj-guide__bubble" role="status">${esc(st.text)}</p>
      <div class="tj-guide__dots" aria-label="الخطوة ${ar(i + 1)} من ${ar(GUIDE_STEPS.length)}">
        ${GUIDE_STEPS.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}
      </div>
      <div class="tj-guide__actions">
        <button class="btn btn--primary" data-act="guide-next" data-step="${i}">${last ? 'يلا نبدأ' : 'التالي'}</button>
        ${last ? '' : '<button class="tj-guide__skip" data-act="guide-skip"><i data-icon="skip-forward"></i> تخطّي الشرح</button>'}
      </div>
    </div>`;
renderIcons(el);
toTop();
sfxAt(250, () => sndBalha(st.mood));
}
function endGuide() {
progress.guideSeen = true;
saveProgress();
showMap();
}
function prepare(qs) {
return qs.map(q => {
const [right, ...wrongs] = q.a;
const picked = shuffle(wrongs).slice(0, OPTION_COUNT - 1);
return {
q: q.q, fact: q.fact || '',
opts: shuffle([{ t: right, ok: true }, ...picked.map(t => ({ t, ok: false }))]),
};
});
}
function startLevel(i) {
game = { mode: 'level', level: i, qs: prepare(shuffle(LEVELS[i])) };
resetRun();
showIntro();
}
function startDaily() {
const rnd = seeded('tanjalab-' + dateKey());
const picked = shuffle(getAllTanjalabQuestions(), rnd).slice(0, DAILY_COUNT);
game = { mode: 'daily', level: -1, qs: prepare(picked) };
resetRun();
showIntro();
}
function resetRun() {
Object.assign(game, {
idx: 0, correct: 0, score: 0, combo: 0, bestCombo: 0,
startedAt: Date.now(), lifeFifty: false, lifeTime: false, misses: [],
});
}
const INTRO_TIPS = [
'اقرأ السؤال جيدًا قبل أن تختار، فبعض الإجابات مفخّخة.',
'«حذف إجابة» تنفع عند الحيرة، ومرة واحدة فقط في المستوى.',
'كلما أجبت أسرع زادت نقاطك.',
'الإجابات المتتالية تشعل النار!',
'إن أخطأت فلا تحزن، ستتعلم معلومة جديدة.',
];
function showIntro() {
stopTimer();
clearSfx();
const el = root(); if (!el || !game) return;
const daily = game.mode === 'daily';
const label = daily ? 'تحدّي اليوم' : `المستوى ${ar(game.level + 1)}`;
const tip = INTRO_TIPS[Math.floor(Math.random() * INTRO_TIPS.length)];
el.innerHTML = `
    <div class="tj-intro" data-act="skipintro">
      <div class="tj-rays tj-rays--intro" aria-hidden="true"></div>
      <div class="tj-skyline" aria-hidden="true">${VILLAGE}</div>
      <span class="tj-intro__brand">تحدي التنجلاب</span>
      <div class="tj-intro__mascot">${mascotHtml('hi', 120)}</div>
      <p class="tj-intro__ready">جاهز؟</p>
      <h2 class="tj-intro__title">${label}</h2>
      <div class="tj-intro__chips" aria-label="تفاصيل ${label}">
        <span><i data-icon="list-checks"></i>${ar(game.qs.length)} أسئلة</span>
        <span><i data-icon="timer"></i>${ar(secondsFor(game))} ثانية</span>
        <span><i data-icon="star"></i>${daily ? 'نفس أسئلة اليوم للجميع' : 'حتى ٣ نجوم'}</span>
      </div>
      <p class="tj-intro__tip">${esc(tip)}</p>
      <div class="tj-intro__count" id="tj-count" aria-live="polite">٣</div>
      <small class="tj-intro__skip">المس الشاشة للبدء فورًا</small>
    </div>`;
renderIcons(el);
toTop();
sndStart();
sfxAt(380, () => sndBalha('hi'));
const steps = [2, 1];
const tick = () => {
const n = steps.shift();
if (n === undefined) { introTimer = null; showQuestion(); return; }
const c = document.getElementById('tj-count');
if (!c) { introTimer = null; return; }
c.textContent = ar(n);
c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
sndTap();
introTimer = setTimeout(tick, 650);
};
introTimer = setTimeout(tick, 650);
}
const RING_C = 150.8;
function paintTimer() {
const t = document.getElementById('tj-time');
if (!t) return false;
const left = Math.max(game.left, 0);
t.textContent = ar(left);
const ring = document.getElementById('tj-ring');
if (ring) ring.style.strokeDashoffset = String(RING_C * (1 - left / game.cap));
const wrap = document.getElementById('tj-timer');
if (wrap) wrap.classList.toggle('is-low', game.left <= 5);
const card = document.getElementById('tj-card');
if (card && !game.locked) {
const next = Math.max(left - 1, 0);
card.style.setProperty('--tj-p', `${(360 * next / game.cap).toFixed(1)}deg`);
const low = left <= 5;
card.classList.toggle('is-low', low);
card.classList.toggle('is-warn', !low && left / game.cap <= 0.5);
}
return true;
}
function showQuestion() {
stopTimer();
clearSfx();
const el = root(); if (!el || !game) return;
const q = game.qs[game.idx];
game.left = secondsFor(game);
game.cap = game.left;
game.locked = false;
const label = game.mode === 'daily' ? 'تحدّي اليوم' : `المستوى ${ar(game.level + 1)}`;
const pips = game.qs.map((_, i) =>
`<i class="tj-pip ${i < game.idx ? 'is-done' : i === game.idx ? 'is-now' : ''}"></i>`).join('');
el.innerHTML = `
    <div class="tj-q">
      <div class="tj-rays" aria-hidden="true"></div>
      <div class="tj-skyline" aria-hidden="true">${VILLAGE}</div>
      <div class="tj-q__top">
        <button class="tj-icon-btn" data-act="quit" aria-label="رجوع للخريطة"><i data-icon="arrow-right"></i></button>
        <div class="tj-q__title">
          <span class="tj-q__label">${label}</span>
          <span class="tj-pips" aria-label="سؤال ${ar(game.idx + 1)} من ${ar(game.qs.length)}">${pips}</span>
        </div>
        <div class="tj-timer" id="tj-timer" aria-label="الوقت المتبقي">
          <svg viewBox="0 0 56 56" aria-hidden="true">
            <circle class="tj-timer__bg" cx="28" cy="28" r="24"/>
            <circle class="tj-timer__ring" id="tj-ring" cx="28" cy="28" r="24" stroke-dasharray="${RING_C}" stroke-dashoffset="0"/>
          </svg>
          <span class="tj-timer__num" id="tj-time">${ar(game.left)}</span>
        </div>
      </div>
      <div class="tj-q__meta">
        <span class="tj-score"><i data-icon="star"></i> <b>${ar(game.score)}</b></span>
        <span class="tj-combo ${game.combo >= 2 ? 'is-on' : ''}"><i data-icon="flame"></i> ×${ar(game.combo)}</span>
      </div>
      <div class="tj-q__card" id="tj-card"><span class="tj-q__num">${ar(game.idx + 1)}</span>${esc(q.q)}</div>
      <div class="tj-q__opts">
        ${q.opts.map((o, k) => `
          <button class="tj-opt" data-opt="${k}">
            <span class="tj-opt__l">${LETTERS[k]}</span>
            <span class="tj-opt__t">${esc(o.t)}</span>
          </button>`).join('')}
      </div>
      <div class="tj-life">
        <button class="tj-life__btn" data-act="fifty" aria-label="حذف إجابة خاطئة" ${game.lifeFifty ? 'disabled' : ''}>حذف إجابة</button>
        <button class="tj-life__btn" data-act="time" aria-label="زيادة الوقت ${ar(EXTRA_SECONDS)} ثوانٍ" ${game.lifeTime ? 'disabled' : ''}>زيادة الوقت</button>
      </div>
    </div>`;
renderIcons(el);
toTop();
startTick();
setTimeout(() => { if (game && !game.locked && document.getElementById('tj-time')) paintTimer(); }, 70);
}
function startTick() {
if (timerId) clearInterval(timerId);
timerId = setInterval(() => {
if (!document.getElementById('tj-time')) { stopTimer(); return; }
game.left -= 1;
paintTimer();
if (game.left <= 0) answer(-1);
}, 1000);
}
function useFifty() {
if (!game || game.locked || game.lifeFifty) return;
game.lifeFifty = true;
const q = game.qs[game.idx];
const wrong = shuffle(q.opts.map((o, k) => k).filter(k => !q.opts[k].ok)).slice(0, 1);
document.querySelectorAll('.tj-opt').forEach((b, k) => {
if (wrong.includes(k)) { b.disabled = true; b.classList.add('is-hidden'); }
});
const b = document.querySelector('[data-act="fifty"]'); if (b) b.disabled = true;
}
function useTime() {
if (!game || game.locked || game.lifeTime) return;
game.lifeTime = true;
game.left += EXTRA_SECONDS;
game.cap = Math.max(game.cap, game.left);
paintTimer();
const b = document.querySelector('[data-act="time"]'); if (b) b.disabled = true;
}
function answer(k) {
if (!game || game.locked) return;
game.locked = true;
stopTimer();
const q = game.qs[game.idx];
const ok = k >= 0 && q.opts[k].ok;
progress.stats.answered += 1;
if (ok) progress.stats.correct += 1;
else {
game.misses.push({
q: q.q, fact: q.fact,
right: (q.opts.find(o => o.ok) || {}).t || '',
picked: k >= 0 ? q.opts[k].t : '',
});
}
const stage = document.querySelector('.tj-q');
const card = document.getElementById('tj-card');
const re = reactionFor({ ok, timedOut: k < 0, combo: ok ? game.combo + 1 : 0 });
freezeRing(card);
if (ok) {
game.correct += 1;
game.combo += 1;
game.bestCombo = Math.max(game.bestCombo, game.combo);
progress.stats.bestCombo = Math.max(progress.stats.bestCombo, game.combo);
const gain = 100 + Math.max(game.left, 0) * 5 + Math.min(game.combo - 1, 4) * 20;
game.score += gain;
sndOk(game.combo);
sfxAt(300, () => sndBalha(re.mood));
floatScore(card, `+${ar(gain)}`);
if (game.combo >= 3) confetti(14);
} else {
game.combo = 0;
sndBad();
sfxAt(560, () => sndBalha(re.mood));
}
if (stage) {
stage.classList.remove('fx-ok', 'fx-bad');
stage.classList.add(ok ? 'fx-ok' : 'fx-bad');
}
document.querySelectorAll('.tj-opt').forEach((b, idx) => {
b.disabled = true;
if (q.opts[idx].ok) b.classList.add('is-correct');
else if (idx === k) b.classList.add('is-wrong');
});
document.querySelectorAll('.tj-life__btn').forEach(b => { b.disabled = true; });
if (q.fact) {
const box = document.querySelector('.tj-q');
if (box) {
const note = document.createElement('div');
note.className = 'tj-fact animate-fade-up';
note.innerHTML = `
        ${sayHtml(re.mood, re.text, 64, 'tj-say--inline')}
        <span class="tj-fact__label">كنت عارف دي؟</span>
        <p class="tj-fact__text"></p>
        <button class="btn btn--primary" data-act="advance">${game.idx + 1 >= game.qs.length ? 'شوف النتيجة' : 'السؤال التالي'}</button>`;
note.querySelector('.tj-fact__text').textContent = q.fact;
box.appendChild(note);
chainSay(note, re);
note.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
return;
}
const box = document.querySelector('.tj-q');
if (box) {
const r = document.createElement('div');
r.className = 'tj-react animate-fade-up';
r.innerHTML = sayHtml(re.mood, re.text, 64);
box.appendChild(r);
chainSay(r, re);
r.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
setTimeout(advance, re.then ? 3600 : 1400);
}
function freezeRing(card) {
if (!card) return;
try {
const v = getComputedStyle(card).getPropertyValue('--tj-p').trim();
card.classList.add('is-frozen');
if (v) card.style.setProperty('--tj-p', v);
} catch {   }
}
function advance() {
if (!game) return;
game.idx += 1;
if (game.idx >= game.qs.length) showResult(); else showQuestion();
}
const raf = cb => (window.requestAnimationFrame ? window.requestAnimationFrame(cb) : setTimeout(() => cb(Date.now()), 16));
function confetti(count = 36) {
try {
const wrap = document.createElement('div');
wrap.className = 'tj-confetti';
wrap.setAttribute('aria-hidden', 'true');
for (let i = 0; i < count; i++) {
const p = document.createElement('i');
p.className = `tj-cf c${i % 6}`;
p.style.cssText =
`--x:${(Math.random() * 100).toFixed(1)}%;--sx:${Math.round(Math.random() * 180 - 90)}px;` +
`--r:${Math.round(Math.random() * 720 - 360)}deg;--d:${(Math.random() * 0.5).toFixed(2)}s;` +
`--t:${(1.5 + Math.random() * 1.2).toFixed(2)}s`;
wrap.appendChild(p);
}
document.body.appendChild(wrap);
setTimeout(() => wrap.remove(), 3400);
} catch {   }
}
function floatScore(host, text) {
if (!host) return;
const s = document.createElement('span');
s.className = 'tj-float';
s.textContent = text;
host.appendChild(s);
setTimeout(() => s.remove(), 1100);
}
function countUp(id, to, ms = 900) {
const el = document.getElementById(id);
if (!el) return;
const t0 = Date.now();
const step = () => {
if (document.getElementById(id) !== el) return;
const k = Math.min((Date.now() - t0) / ms, 1);
el.textContent = ar(Math.round(to * (1 - Math.pow(1 - k, 3))));
if (k < 1) raf(step);
};
raf(step);
}
function reviewHtml() {
if (!game || !game.misses || !game.misses.length) return '';
const items = game.misses.map(m => `
    <li class="tj-rev__item">
      <p class="tj-rev__q">${esc(m.q)}</p>
      <p class="tj-rev__a is-right"><i data-icon="check"></i> ${esc(m.right)}</p>
      <p class="tj-rev__a is-wrong"><i data-icon="${m.picked ? 'x' : 'clock'}"></i> ${m.picked ? esc(m.picked) : 'انتهى الوقت'}</p>
      ${m.fact ? `<p class="tj-rev__fact">${esc(m.fact)}</p>` : ''}
    </li>`).join('');
return `
    <details class="tj-rev">
      <summary><i data-icon="book-open"></i> راجع أخطاءك <b>${ar(game.misses.length)}</b></summary>
      <ul class="tj-rev__list">${items}</ul>
    </details>`;
}
function showResult() {
stopTimer();
const el = root(); if (!el || !game) return;
const n = game.qs.length;
const pct = Math.round((game.correct / n) * 100);
const secs = Math.round((Date.now() - game.startedAt) / 1000);
const mm = String(Math.floor(secs / 60)).padStart(2, '0');
const ss = String(secs % 60).padStart(2, '0');
if (game.mode === 'daily') { finishDaily(pct, mm, ss); return; }
const stars = pct >= 100 ? 3 : pct >= 80 ? 2 : pct >= 60 ? 1 : 0;
const maxStars = LEVELS.length * 3;
const totalBefore = LEVELS.reduce((s, _, i) => s + starsOf(i), 0);
const prev = progress.levels[game.level] || { stars: 0, best: 0 };
const isBest = game.score > prev.best;
progress.levels[game.level] = {
stars: Math.max(prev.stars, stars),
best: Math.max(prev.best, game.score),
};
progress.stats.rounds += 1;
saveProgress();
const totalAfter = LEVELS.reduce((s, _, i) => s + starsOf(i), 0);
const newTitle = titleInfo(totalBefore, maxStars).name !== titleInfo(totalAfter, maxStars).name
? titleInfo(totalAfter, maxStars).name : '';
const hasNext = game.level + 1 < LEVELS.length;
const unlockedNext = hasNext && stars >= 1 && prev.stars === 0;
clearSfx();
sfxAt(300, () => countUp('tj-score', game.score, 1000));
if (stars >= 1) {
for (let s = 1; s <= stars; s++) sfxAt(450 + (s - 1) * 350, () => sndStarNote(s));
const afterStars = 450 + stars * 350 + 80;
sfxAt(afterStars, () => { sndWin(); confetti(10 + stars * 14); });
let nextAt = afterStars + 750;
if (unlockedNext) { sfxAt(nextAt, sndUnlock); nextAt += 750; }
if (newTitle) sfxAt(nextAt, () => { sndUnlock(); confetti(30); });
} else {
sfxAt(300, sndBad);
}
const passed = stars >= 1;
const finishedAll = passed && !hasNext;
const say = levelResultSay({ stars, finishedAll, hasNext });
if (stars >= 1) sfxAt(450 + stars * 350 + 330, () => sndBalha(say.mood));
else sfxAt(900, () => sndBalha(say.mood));
el.innerHTML = `
    <div class="tj-res animate-fade-up">
      <div class="tj-skyline" aria-hidden="true">${VILLAGE}</div>
      <div class="tj-res__say tj-res__say--top">${sayHtml(say.mood, say.text, 108)}</div>
      <p class="tj-res__lvl">المستوى ${ar(game.level + 1)}</p>
      <h2 class="tj-res__title">${finishedAll ? 'خلّصت كل المستويات!' : passed ? 'أحسنت!' : 'حاول مرة أخرى'}</h2>
      <div class="tj-res__stars" aria-label="${ar(stars)} من ٣ نجوم">
        ${[1, 2, 3].map(s => `<span class="${s <= stars ? 'on' : ''}" style="--i:${s}">★</span>`).join('')}
      </div>
      ${newTitle ? `<p class="tj-newtitle"><i data-icon="crown"></i> لقب جديد: ${newTitle}</p>` : ''}
      <div class="tj-res__actions tj-res__actions--top">
        ${passed && hasNext ? `<button class="btn btn--primary" data-act="next">المستوى التالي</button>` : ''}
        <button class="btn ${passed && hasNext ? 'btn--secondary' : 'btn--primary'}" data-act="retry">إعادة المستوى</button>
        <button class="btn btn--secondary" data-act="map">الخريطة</button>
      </div>
      <div class="tj-res__card">
        <div class="tj-res__score"><small>النتيجة${isBest ? ' — رقم قياسي جديد' : ''}</small><strong id="tj-score">٠</strong></div>
        <div class="tj-res__row"><span>إجابات صحيحة</span><b>${ar(game.correct)} من ${ar(n)}</b></div>
        <div class="tj-res__row"><span>أطول متتالية</span><b>${ar(game.bestCombo)}</b></div>
        <div class="tj-res__row"><span>زمن المستوى</span><b>${ar(mm)}:${ar(ss)}</b></div>
        <div class="tj-res__row"><span>أفضل نتيجة لك</span><b>${ar(progress.levels[game.level].best)}</b></div>
      </div>
      ${reviewHtml()}
      ${unlockedNext ? `<p class="tj-unlock">فُتح المستوى ${ar(game.level + 2)}</p>` : ''}
      ${passed ? '' : `<p class="tj-note">تحتاج ${ar(3)} إجابات صحيحة من ${ar(n)} على الأقل لتفتح المستوى التالي.</p>`}
    </div>`;
renderIcons(el);
chainSay(el, say);
toTop();
}
function finishDaily(pct, mm, ss) {
const el = root();
const today = dateKey();
progress.daily = { date: today, score: game.score, correct: game.correct };
if (progress.streak.last === yesterdayKey()) progress.streak.count += 1;
else if (progress.streak.last !== today) progress.streak.count = 1;
progress.streak.last = today;
progress.stats.rounds += 1;
saveProgress();
clearSfx();
sfxAt(300, () => countUp('tj-score', game.score, 1000));
sfxAt(350, () => { sndWin(); confetti(pct >= 80 ? 44 : 22); });
sfxAt(1000, () => sndBalha(dailyResultSay(pct).mood));
el.innerHTML = `
    <div class="tj-res animate-fade-up">
      <div class="tj-skyline" aria-hidden="true">${VILLAGE}</div>
      <div class="tj-res__say tj-res__say--top">${(() => { const r = dailyResultSay(pct); return sayHtml(r.mood, r.text, 108); })()}</div>
      <p class="tj-res__lvl">تحدّي اليوم</p>
      <h2 class="tj-res__title">${pct >= 80 ? 'يا بطل!' : 'عاش يا غالي'}</h2>
      <p class="tj-newtitle"><i data-icon="flame"></i> ${ar(progress.streak.count)} ${progress.streak.count > 2 ? 'أيام' : progress.streak.count === 2 ? 'يومان' : 'يوم'} متتالية</p>
      <div class="tj-res__actions tj-res__actions--top">
        <button class="btn btn--primary" data-act="map">الخريطة</button>
      </div>
      <div class="tj-res__card">
        <div class="tj-res__score"><small>النتيجة</small><strong id="tj-score">٠</strong></div>
        <div class="tj-res__row"><span>إجابات صحيحة</span><b>${ar(game.correct)} من ${ar(game.qs.length)}</b></div>
        <div class="tj-res__row"><span>أطول متتالية</span><b>${ar(game.bestCombo)}</b></div>
        <div class="tj-res__row"><span>الزمن</span><b>${ar(mm)}:${ar(ss)}</b></div>
      </div>
      ${reviewHtml()}
      <p class="tj-note">أسئلة جديدة غدًا، وكل أبناء التنجلاب يلعبون أسئلة اليوم نفسها.</p>
    </div>`;
renderIcons(el);
toTop();
}
async function copyText(text) {
try {
if (navigator.clipboard) { await navigator.clipboard.writeText(text); return true; }
} catch {   }
try {
const ta = document.createElement('textarea');
ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;';
document.body.appendChild(ta); ta.select();
const ok = document.execCommand('copy'); ta.remove(); return ok;
} catch { return false; }
}
function encodeBackup() {
const data = { v: 1, levels: progress.levels, name: progress.name, streak: progress.streak, daily: progress.daily, stats: progress.stats };
return BACKUP_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}
async function exportProgress() {
const code = encodeBackup();
markBackedUp();
const ok = await copyText(code);
if (ok) showToast('تم نسخ كود تقدّمك — احفظه في مكان آمن', 'success', 4000);
else window.prompt('انسخ هذا الكود واحفظه:', code);
}
function importProgress() {
const raw = (window.prompt('الصق كود التقدّم هنا:') || '').trim();
if (!raw) return;
try {
if (!raw.startsWith(BACKUP_PREFIX)) throw new Error('bad prefix');
const data = JSON.parse(decodeURIComponent(escape(atob(raw.slice(BACKUP_PREFIX.length)))));
if (!data || typeof data.levels !== 'object') throw new Error('bad data');
Object.entries(data.levels).forEach(([k, v]) => {
const stars = Math.min(3, Math.max(0, Number(v && v.stars) || 0));
const best = Math.max(0, Number(v && v.best) || 0);
const cur = progress.levels[k] || { stars: 0, best: 0 };
progress.levels[k] = { stars: Math.max(cur.stars, stars), best: Math.max(cur.best, best) };
});
if (data.name && !progress.name) progress.name = String(data.name).slice(0, 20);
if (data.streak && data.streak.count > progress.streak.count) progress.streak = data.streak;
if (data.stats && typeof data.stats === 'object') {
['answered', 'correct', 'bestCombo', 'rounds'].forEach(k => {
progress.stats[k] = Math.max(Number(progress.stats[k]) || 0, Number(data.stats[k]) || 0);
});
}
progress.guideSeen = true;
saveProgress();
showToast('تم استرجاع تقدّمك ✓', 'success');
showMap();
} catch {
showToast('هذا الكود غير صحيح', 'error');
}
}
function onChange(e) {
if (e.target && e.target.id === 'tj-name') {
progress.name = e.target.value.trim().slice(0, 20);
saveProgress();
const sub = document.querySelector('.tj-hero__sub');
if (sub) {
const total = LEVELS.reduce((s, _, i) => s + starsOf(i), 0);
const info = titleInfo(total, LEVELS.length * 3);
sub.textContent = `${progress.name ? `يا ${progress.name} — ` : ''}${info.name}`;
}
}
}
function onClick(e) {
const mas = e.target.closest('.tj-mascot');
if (mas && !mas.closest('[data-act="skipintro"]')) {
const mood = ((mas.className || '').match(/tj-mascot--(\w+)/) || [])[1] || 'hi';
sndBalha(mood);
const sv = mas.querySelector('svg');
if (sv) { sv.classList.remove('is-poked'); void sv.getBoundingClientRect(); sv.classList.add('is-poked'); }
return;
}
const lvl = e.target.closest('[data-level]');
if (lvl && !lvl.disabled) { startLevel(Number(lvl.dataset.level)); return; }
const opt = e.target.closest('[data-opt]');
if (opt && !opt.disabled) { answer(Number(opt.dataset.opt)); return; }
const act = e.target.closest('[data-act]');
if (!act || act.disabled) return;
if (!['daily', 'mute', 'next', 'retry', 'skipintro'].includes(act.dataset.act)) sndTap();
switch (act.dataset.act) {
case 'guide':      showGuide(0); break;
case 'guide-next': {
const nx = Number(act.dataset.step) + 1;
if (nx >= GUIDE_STEPS.length) endGuide(); else showGuide(nx);
break;
}
case 'guide-skip': endGuide(); break;
case 'daily':  startDaily(); break;
case 'advance': advance(); break;
case 'skipintro': if (introTimer) { clearTimeout(introTimer); introTimer = null; showQuestion(); } break;
case 'quit':   stopTimer(); showMap(); break;
case 'fifty':  useFifty(); break;
case 'time':   useTime(); break;
case 'next':   if (game) startLevel(game.level + 1); break;
case 'retry':  if (game) { game.mode === 'daily' ? startDaily() : startLevel(game.level); } break;
case 'map':    showMap(); break;
case 'export': exportProgress(); break;
case 'wa':     sendWhatsapp(); break;
case 'reset':  resetProgress(); break;
case 'remind-later': markBackedUp(); showMap(); break;
case 'import': importProgress(); break;
case 'mute':
progress.muted = !progress.muted; saveProgress(); showMap(); sndOk(); break;
}
}
