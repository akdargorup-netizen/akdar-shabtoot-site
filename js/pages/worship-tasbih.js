import { renderIcons } from '../shared/icons.js';
import { escapeHtml } from '../shared/sanitize.js';
const DHIKR_PRESETS = [
{ id: 'salawat',      text: 'اللهم صلِّ على نبينا محمد' },
{ id: 'subhanallah',  text: 'سبحان الله' },
{ id: 'alhamdulillah', text: 'الحمد لله' },
{ id: 'allahuakbar',  text: 'الله أكبر' },
{ id: 'lailaha',      text: 'لا إله إلا الله' },
{ id: 'astaghfirullah', text: 'أستغفر الله' },
{ id: 'hawqala',      text: 'لا حول ولا قوة إلا بالله' },
{ id: 'subhanwabihamdih', text: 'سبحان الله وبحمده' },
];
const STATE_KEY   = 'sbb:tasbih-state';
const VIBRATE_KEY = 'sbb:tasbih-vibrate';
const CYCLE       = 33;
function _defaultState() {
return { count: 0, dhikrId: DHIKR_PRESETS[0].id, totals: {}, updatedAt: null };
}
function _readState() {
try {
const raw = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
if (raw && typeof raw.count === 'number' && typeof raw.dhikrId === 'string') {
if (!DHIKR_PRESETS.some(d => d.id === raw.dhikrId)) raw.dhikrId = DHIKR_PRESETS[0].id;
const totals = (raw.totals && typeof raw.totals === 'object') ? raw.totals : null;
if (totals) return { ...raw, totals };
return { ...raw, totals: raw.count > 0 ? { [raw.dhikrId]: raw.count } : {} };
}
} catch (_) {   }
return _defaultState();
}
function _writeState(state) {
try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (_) {   }
}
function _readVibrateEnabled() {
try { return localStorage.getItem(VIBRATE_KEY) !== 'off'; } catch (_) { return true; }
}
function _writeVibrateEnabled(enabled) {
try { localStorage.setItem(VIBRATE_KEY, enabled ? 'on' : 'off'); } catch (_) {   }
}
function _formatUpdatedAt(iso) {
if (!iso) return 'لسع ما اتلمست';
try {
const d = new Date(iso);
const dateLabel = d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
const timeLabel = d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' });
return `آخر تحديث: ${dateLabel} — ${timeLabel}`;
} catch (_) {
return 'لسع ما اتلمست';
}
}
function _fmt(n) {
return Number(n || 0).toLocaleString('ar-EG');
}
function _grandTotal(totals) {
return Object.values(totals || {}).reduce((a, b) => a + (Number(b) || 0), 0);
}
export function renderWorshipTasbih() {
return `
    <section class="page worship-tasbih-page">

      <!-- الصف العلوي: العدّاد الإجمالي + زر الإنجازات -->
      <div class="tasbih-top">
        <div class="tasbih-total" aria-live="polite">
          <span class="tasbih-total__label">إجمالي تسبيحاتك</span>
          <span class="tasbih-total__num" id="tasbih-total">٠</span>
        </div>
        <button type="button" class="tasbih-achv-btn" id="tasbih-achv-open">
          <span data-icon="trophy"></span>
          <span>شوف إنجازاتك</span>
        </button>
      </div>

      <!-- اختيار الذكر: زر يفتح قائمة منسدلة -->
      <div class="tasbih-select-wrap" id="tasbih-select-wrap">
        <button type="button" class="tasbih-select" id="tasbih-select"
                aria-haspopup="listbox" aria-expanded="false">
          <span class="tasbih-select__text">
            <span class="tasbih-select__label">اختر نوع الذكر</span>
            <span class="tasbih-select__value" id="tasbih-select-value"></span>
          </span>
          <span class="tasbih-select__chev" data-icon="chevron-down"></span>
        </button>
        <ul class="tasbih-menu" id="tasbih-menu" role="listbox" aria-label="أنواع الأذكار" hidden>
          ${DHIKR_PRESETS.map(d => `
            <li role="option" class="tasbih-menu__item" data-dhikr="${d.id}" tabindex="0">
              <span class="tasbih-menu__text">${escapeHtml(d.text)}</span>
              <span class="tasbih-menu__check" data-icon="check"></span>
            </li>
          `).join('')}
        </ul>
      </div>

      <!-- العدّاد الحالي — حلقة تقدّم لكل ٣٣ تسبيحة -->
      <div class="tasbih-counter-wrap">
        <div class="tasbih-ring" id="tasbih-ring" style="--p:0">
          <button class="tasbih-counter-circle" id="tasbih-counter-circle" aria-label="اضغط للتسبيح">
            <span class="tasbih-counter-circle__count" id="tasbih-count">0</span>
            <span class="tasbih-counter-circle__label" id="tasbih-current-dhikr"></span>
          </button>
        </div>
      </div>

      <p class="tasbih-updated-at" id="tasbih-updated-at"></p>

      <div class="tasbih-actions">
        <button class="tasbih-action-btn" id="tasbih-vibrate-toggle" aria-pressed="true">
          <span data-icon="vibrate"></span>
          <span id="tasbih-vibrate-label">الاهتزاز: شغال</span>
        </button>
        <button class="tasbih-action-btn tasbih-action-btn--reset" id="tasbih-reset">
          <span data-icon="rotate-ccw"></span>
          <span>تصفير</span>
        </button>
      </div>

      <!-- غطاء ضبابي خلف القائمة المنسدلة -->
      <div class="tasbih-blur" id="tasbih-blur" hidden></div>

      <!-- نافذة الإنجازات -->
      <div class="tasbih-sheet-backdrop" id="tasbih-sheet" hidden>
        <div class="tasbih-sheet" role="dialog" aria-modal="true" aria-labelledby="tasbih-sheet-title">
          <div class="tasbih-sheet__grab" aria-hidden="true"></div>
          <div class="tasbih-sheet__head">
            <h3 class="tasbih-sheet__title" id="tasbih-sheet-title">إنجازاتك</h3>
            <button type="button" class="tasbih-sheet__close" id="tasbih-sheet-close" aria-label="إغلاق">
              <span data-icon="x"></span>
            </button>
          </div>
          <div class="tasbih-sheet__hero">
            <span class="tasbih-sheet__hero-label">المجموع الكلي</span>
            <span class="tasbih-sheet__hero-num" id="tasbih-sheet-total">٠</span>
          </div>
          <ul class="tasbih-achv-list" id="tasbih-achv-list"></ul>
          <button type="button" class="tasbih-sheet__clear" id="tasbih-achv-clear">
            <span data-icon="trash-2"></span>
            <span id="tasbih-achv-clear-label">مسح الإنجازات</span>
          </button>
        </div>
      </div>

    </section>
  `;
}
export function initWorshipTasbih() {
const root = document.querySelector('.worship-tasbih-page');
if (!root) return;
let state = _readState();
let vibrateEnabled = _readVibrateEnabled();
const $ = (id) => document.getElementById(id);
const elCircle     = $('tasbih-counter-circle');
const elCount      = $('tasbih-count');
const elRing       = $('tasbih-ring');
const elCurrent    = $('tasbih-current-dhikr');
const elUpdatedAt  = $('tasbih-updated-at');
const elTotal      = $('tasbih-total');
const elSelect     = $('tasbih-select');
const elSelectVal  = $('tasbih-select-value');
const elSelectWrap = $('tasbih-select-wrap');
const elMenu       = $('tasbih-menu');
const elBlur       = $('tasbih-blur');
const elVibrateBtn = $('tasbih-vibrate-toggle');
const elVibrateLbl = $('tasbih-vibrate-label');
const elReset      = $('tasbih-reset');
const elSheet      = $('tasbih-sheet');
const elAchvList   = $('tasbih-achv-list');
const elSheetTotal = $('tasbih-sheet-total');
const elClearBtn   = $('tasbih-achv-clear');
const elClearLbl   = $('tasbih-achv-clear-label');
let clearArmedTimer = 0;
function currentDhikrText() {
const found = DHIKR_PRESETS.find(d => d.id === state.dhikrId);
return found ? found.text : DHIKR_PRESETS[0].text;
}
function persist() {
state.updatedAt = new Date().toISOString();
_writeState(state);
}
function updateDisplay() {
const c = state.count;
const inCycle = c === 0 ? 0 : (c % CYCLE === 0 ? CYCLE : c % CYCLE);
elCount.textContent     = _fmt(c);
elCurrent.textContent   = currentDhikrText();
elSelectVal.textContent = currentDhikrText();
elUpdatedAt.textContent = _formatUpdatedAt(state.updatedAt);
elTotal.textContent     = _fmt(_grandTotal(state.totals));
elRing.style.setProperty('--p', String((inCycle / CYCLE) * 100));
elMenu.querySelectorAll('.tasbih-menu__item').forEach(li => {
const active = li.dataset.dhikr === state.dhikrId;
li.classList.toggle('is-active', active);
li.setAttribute('aria-selected', String(active));
});
}
function vibrateLightly(ms = 15) {
if (!vibrateEnabled) return;
try {
if (navigator.vibrate) navigator.vibrate(ms);
} catch (_) {   }
}
elCircle.addEventListener('click', () => {
state.count += 1;
state.totals[state.dhikrId] = (Number(state.totals[state.dhikrId]) || 0) + 1;
persist();
updateDisplay();
vibrateLightly(state.count % CYCLE === 0 ? 40 : 15);
elCircle.classList.remove('is-tick');
void elCircle.offsetWidth;
elCircle.classList.add('is-tick');
});
function openMenu() {
elMenu.hidden = false;
elBlur.hidden = false;
elSelectWrap.classList.add('is-open');
elSelect.setAttribute('aria-expanded', 'true');
const active = elMenu.querySelector('.is-active');
if (active) active.scrollIntoView({ block: 'nearest' });
}
function closeMenu() {
elMenu.hidden = true;
elBlur.hidden = true;
elSelectWrap.classList.remove('is-open');
elSelect.setAttribute('aria-expanded', 'false');
}
function toggleMenu() { elMenu.hidden ? openMenu() : closeMenu(); }
elSelect.addEventListener('click', toggleMenu);
elBlur.addEventListener('click', closeMenu);
function chooseDhikr(id) {
if (!id) return;
if (id !== state.dhikrId) {
state.dhikrId = id;
state.count = 0;
persist();
}
updateDisplay();
closeMenu();
}
elMenu.addEventListener('click', (e) => {
const li = e.target.closest('.tasbih-menu__item');
if (li) chooseDhikr(li.dataset.dhikr);
});
elMenu.addEventListener('keydown', (e) => {
if (e.key === 'Enter' || e.key === ' ') {
const li = e.target.closest('.tasbih-menu__item');
if (li) { e.preventDefault(); chooseDhikr(li.dataset.dhikr); }
}
});
function renderAchievements() {
const total = _grandTotal(state.totals);
elSheetTotal.textContent = _fmt(total);
const max = Math.max(1, ...DHIKR_PRESETS.map(d => Number(state.totals[d.id]) || 0));
elAchvList.innerHTML = DHIKR_PRESETS.map(d => {
const n = Number(state.totals[d.id]) || 0;
const w = n > 0 ? Math.max(4, Math.round((n / max) * 100)) : 0;
return `
        <li class="tasbih-achv-item${n === 0 ? ' is-empty' : ''}">
          <div class="tasbih-achv-item__row">
            <span class="tasbih-achv-item__name">${escapeHtml(d.text)}</span>
            <span class="tasbih-achv-item__num">${_fmt(n)}</span>
          </div>
          <div class="tasbih-achv-item__bar" aria-hidden="true"><i style="width:${w}%"></i></div>
        </li>
      `;
}).join('');
}
function disarmClear() {
clearTimeout(clearArmedTimer);
elClearBtn.classList.remove('is-armed');
elClearLbl.textContent = 'مسح الإنجازات';
}
function openSheet() {
closeMenu();
renderAchievements();
disarmClear();
elSheet.hidden = false;
renderIcons(elSheet);
}
function closeSheet() {
elSheet.hidden = true;
disarmClear();
}
$('tasbih-achv-open').addEventListener('click', openSheet);
$('tasbih-sheet-close').addEventListener('click', closeSheet);
elSheet.addEventListener('click', (e) => { if (e.target === elSheet) closeSheet(); });
elClearBtn.addEventListener('click', () => {
if (!elClearBtn.classList.contains('is-armed')) {
elClearBtn.classList.add('is-armed');
elClearLbl.textContent = 'اضغط تاني للتأكيد';
clearArmedTimer = setTimeout(disarmClear, 3500);
return;
}
state.totals = {};
persist();
updateDisplay();
renderAchievements();
disarmClear();
});
document.addEventListener('keydown', function onKey(e) {
if (!document.body.contains(root)) { document.removeEventListener('keydown', onKey); return; }
if (e.key === 'Escape') { closeMenu(); closeSheet(); }
});
function paintVibrate() {
elVibrateBtn.setAttribute('aria-pressed', String(vibrateEnabled));
elVibrateBtn.classList.toggle('tasbih-action-btn--off', !vibrateEnabled);
elVibrateLbl.textContent = vibrateEnabled ? 'الاهتزاز: شغال' : 'الاهتزاز: قافل';
}
elVibrateBtn.addEventListener('click', () => {
vibrateEnabled = !vibrateEnabled;
_writeVibrateEnabled(vibrateEnabled);
paintVibrate();
});
elReset.addEventListener('click', () => {
state.count = 0;
persist();
updateDisplay();
});
paintVibrate();
updateDisplay();
renderIcons(root);
}
