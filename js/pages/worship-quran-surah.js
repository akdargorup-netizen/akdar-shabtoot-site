import { navigateTo } from '../core/router.js';
import { renderIcons } from '../shared/icons.js';
import { QURAN_SURAHS } from '../data/quran-index.js';
import { loadSurahAyahs } from '../data/quran-loader.js';
import { showToast } from '../shared/toast.js';
import { escapeHtml } from '../shared/sanitize.js';
import { toArabicDigits } from '../shared/arabic-digits.js';
import { getLastRead, saveLastRead } from '../shared/quran-progress.js';
let currentSurah = null;
let _pendingAyah = 0;
let _ayahHtml = [];
const LEGACY_MODE_KEY = 'sbb:quran-read-mode';
let _opening = false;
export async function openWorshipQuranSurah(index, opts = {}) {
const meta = QURAN_SURAHS.find((s) => s.index === index);
if (!meta || _opening) return false;
_opening = true;
try {
const ayahs = await loadSurahAyahs(index);
const surah = { ...meta, ayahs };
currentSurah = surah;
_pendingAyah = Number.isInteger(opts.ayah) && opts.ayah > 1 ? opts.ayah : 0;
window.__worshipQuranSurahModule = { surah };
navigateTo('worship-quran-surah', !opts.replace);
return true;
} catch (err) {
const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
showToast(
offline ? 'ما في نت، والسورة دي ما اتحمّلت قبل كده — جرّب لمن يرجع الاتصال'
: 'ما قدرنا نحمّل السورة — الشبكة ضعيفة، جرّب تاني',
'error', 4500);
return false;
} finally {
_opening = false;
}
}
function _splitBasmalah(firstAyahText) {
const tokens = firstAyahText.split(' ');
return {
basmalah: tokens.slice(0, 4).join(' '),
remainder: tokens.slice(4).join(' '),
};
}
function _joinWaqfMarks(text) {
return text.replace(/ (?=[\u06D6-\u06DC\u06DE\u06E9])/g, '\u00A0');
}
function renderAyah(text, ayahNumber) {
return `
    <span class="quran-ayah-text" data-ayah="${ayahNumber}">${escapeHtml(_joinWaqfMarks(text))}</span>
    <span class="quran-ayah-number" aria-hidden="true"><span class="quran-ayah-number__frame"></span><span class="quran-ayah-number__digit">${toArabicDigits(ayahNumber)}</span></span>
  `;
}
function renderNavCard(target, dir) {
if (!target) return '';
const isPrev = dir === 'prev';
const arrow = isPrev
? '<path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
: '<path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
const svg = `<svg class="quran-nav-card__arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">${arrow}</svg>`;
return `
    <button type="button" class="quran-nav-card quran-nav-card--${dir}" data-goto="${target.index}">
      ${isPrev ? svg : ''}
      <span class="quran-nav-card__text">
        <span class="quran-nav-card__label">${isPrev ? 'السورة السابقة' : 'السورة التالية'}</span>
        <span class="quran-nav-card__name">${escapeHtml(target.name)}</span>
      </span>
      ${isPrev ? '' : svg}
    </button>
  `;
}
function renderIntro(surah) {
const typeLabel = surah.type === 'meccan' ? 'مكية' : 'مدنية';
return `
    <header class="quran-intro">
      <div class="quran-intro__banner">
        <span class="quran-intro__no" role="img" aria-label="ترتيبها ${toArabicDigits(surah.index)}">
          <span class="quran-intro__no-frame" aria-hidden="true"></span>
          <span class="quran-intro__no-digit" aria-hidden="true">${toArabicDigits(surah.index)}</span>
        </span>
        <h2 class="quran-intro__title">
          <span class="quran-intro__kicker">سورة</span>
          <span class="quran-intro__name">${escapeHtml(surah.name)}</span>
          <span class="quran-intro__type">${typeLabel}</span>
        </h2>
        <span class="quran-intro__count">
          <span class="quran-intro__count-num">${toArabicDigits(surah.ayahCount)}</span>
          <span class="quran-intro__count-label">آية</span>
        </span>
      </div>
    </header>
  `;
}
function renderResumeStrip(surah) {
if (_pendingAyah) return '';
const last = getLastRead();
if (!last || last.done || last.surah !== surah.index || last.ayah < 3) return '';
return `
    <button type="button" class="quran-resume-strip" id="quran-resume-strip" data-ayah="${last.ayah}">
      <svg class="quran-resume-strip__icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3.6L6 20V5a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
      <span class="quran-resume-strip__text">تابع من الآية ${toArabicDigits(last.ayah)}</span>
      <svg class="quran-resume-strip__go" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 5l-7 7 7 7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `;
}
export function renderWorshipQuranSurah() {
const surah = currentSurah || window.__worshipQuranSurahModule?.surah;
if (!surah) {
return `
      <section class="page worship-quran-surah-page">
        <p class="quran-surah-error">السورة لسع ما اتحمّلت. ارجع للفهرس وجرّب تاني.</p>
      </section>
    `;
}
const showBasmalah = surah.index !== 1 && surah.index !== 9;
let displayAyahs = surah.ayahs;
let basmalahText = '';
if (showBasmalah) {
const { basmalah, remainder } = _splitBasmalah(surah.ayahs[0]);
basmalahText = basmalah;
displayAyahs = [remainder, ...surah.ayahs.slice(1)];
}
_ayahHtml = displayAyahs.map((text, i) => renderAyah(text, i + 1));
return `
    <section class="page worship-quran-surah-page">

      <!-- مؤشر تقدّم القراءة — الشريط الوحيد في أعلى الصفحة (ثابت أثناء التمرير) -->
      <div class="quran-reader-bar" id="quran-reader-bar" role="progressbar" aria-label="تقدّم القراءة" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="quran-reader-bar__track" aria-hidden="true">
          <div class="quran-reader-bar__fill" id="quran-progress"></div>
        </div>
      </div>

      ${renderIntro(surah)}
      ${renderResumeStrip(surah)}

      <!-- لوحة القراءة — البسملة ثم الآيات -->
      <div class="quran-surah-panel" id="quran-panel">

        ${showBasmalah ? `
          <p class="quran-basmalah" id="quran-basmalah">
            <span class="quran-basmalah__rule" aria-hidden="true"></span>
            <span class="quran-basmalah__text">${escapeHtml(basmalahText)}</span>
            <span class="quran-basmalah__rule" aria-hidden="true"></span>
          </p>
        ` : ''}

        <div class="quran-ayahs-block" id="quran-ayahs" dir="rtl">
          ${_ayahHtml.join(' ')}
        </div>

        <!-- خاتمة السورة — تأطير بصري لنهاية القراءة -->
        <div class="quran-surah-end-ornament" aria-hidden="true">
          <svg viewBox="0 0 120 16" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 8 H48" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
            <path d="M116 8 H72" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
            <path d="M60 2 L66 8 L60 14 L54 8 Z" fill="currentColor"/>
          </svg>
        </div>

      </div>

      <nav class="quran-nav" id="quran-nav" aria-label="التنقل بين السور">
        ${renderNavCard(QURAN_SURAHS.find((x) => x.index === surah.index + 1), 'next')}
        ${renderNavCard(QURAN_SURAHS.find((x) => x.index === surah.index - 1), 'prev')}
      </nav>

    </section>
  `;
}
let _teardown = null;
export function initWorshipQuranSurah() {
if (_teardown) { _teardown(); _teardown = null; }
const surah    = currentSurah || window.__worshipQuranSurahModule?.surah;
const page     = document.querySelector('.worship-quran-surah-page');
const scroller = document.getElementById('app-content');
const bar      = document.getElementById('quran-reader-bar');
if (!surah || !page || !scroller || !bar) return;
try { localStorage.removeItem(LEGACY_MODE_KEY); } catch (_) {   }
const fillEl = document.getElementById('quran-progress');
const block  = document.getElementById('quran-ayahs');
const strip  = document.getElementById('quran-resume-strip');
const total  = _ayahHtml.length;
const pending = _pendingAyah;
_pendingAyah = 0;
let rafId = 0;
let saveTimer = 0;
let dwellTimer = 0;
let flashTimer = 0;
let userMoved = false;
function updateProgress() {
const max = scroller.scrollHeight - scroller.clientHeight;
const pct = max > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / max)) : 0;
if (fillEl) fillEl.style.transform = `scaleX(${pct})`;
bar.setAttribute('aria-valuenow', String(Math.round(pct * 100)));
}
function currentAyah() {
const top = scroller.getBoundingClientRect().top + bar.offsetHeight + 8;
const nodes = block.querySelectorAll('.quran-ayah-text[data-ayah]');
for (const el of nodes) {
if (el.getBoundingClientRect().bottom > top) return parseInt(el.dataset.ayah, 10);
}
return total;
}
function lastAyahVisible() {
const last = block.querySelector(`.quran-ayah-text[data-ayah="${total}"]`);
if (!last) return false;
return last.getBoundingClientRect().bottom <= scroller.getBoundingClientRect().bottom - 8;
}
let dwelled = false;
function persist() {
if (!document.body.contains(bar)) return;
if (lastAyahVisible()) {
if (scroller.scrollTop > 0 || dwelled) saveLastRead(surah.index, total, true);
return;
}
if (scroller.scrollTop < 120) return;
saveLastRead(surah.index, currentAyah(), false);
}
function schedulePersist() {
clearTimeout(saveTimer);
saveTimer = setTimeout(persist, 350);
}
function onScroll() {
if (!document.body.contains(bar)) { teardown(); return; }
schedulePersist();
if (rafId) return;
rafId = requestAnimationFrame(() => {
rafId = 0;
updateProgress();
});
}
scroller.addEventListener('scroll', onScroll, { passive: true });
function onHidden() { if (document.visibilityState === 'hidden') persist(); }
document.addEventListener('visibilitychange', onHidden);
function markMoved() { userMoved = true; }
scroller.addEventListener('touchstart', markMoved, { passive: true });
scroller.addEventListener('wheel', markMoved, { passive: true });
scroller.addEventListener('keydown', markMoved);
function jumpToAyah(n, withFlash) {
const el = block.querySelector(`.quran-ayah-text[data-ayah="${n}"]`);
if (!el) return;
const y = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top
+ scroller.scrollTop - bar.offsetHeight - 16;
scroller.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
updateProgress();
if (withFlash) {
clearTimeout(flashTimer);
block.querySelectorAll('.is-resume-target').forEach((x) => x.classList.remove('is-resume-target'));
el.classList.add('is-resume-target');
flashTimer = setTimeout(() => el.classList.remove('is-resume-target'), 2800);
}
}
if (strip) {
strip.addEventListener('click', () => {
const n = parseInt(strip.dataset.ayah, 10);
strip.hidden = true;
jumpToAyah(n, true);
});
}
function teardown() {
cancelAnimationFrame(rafId);
clearTimeout(saveTimer);
clearTimeout(dwellTimer);
clearTimeout(flashTimer);
scroller.removeEventListener('scroll', onScroll);
scroller.removeEventListener('touchstart', markMoved);
scroller.removeEventListener('wheel', markMoved);
scroller.removeEventListener('keydown', markMoved);
document.removeEventListener('visibilitychange', onHidden);
_teardown = null;
}
_teardown = teardown;
function gotoSurah(idx, btn) {
if (!Number.isInteger(idx) || btn.classList.contains('is-loading')) return;
persist();
btn.classList.add('is-loading');
btn.setAttribute('aria-busy', 'true');
openWorshipQuranSurah(idx, { replace: true }).then((ok) => {
if (ok) return;
btn.classList.remove('is-loading');
btn.removeAttribute('aria-busy');
});
}
page.querySelectorAll('[data-goto]').forEach((btn) => {
btn.addEventListener('click', () => gotoSurah(parseInt(btn.dataset.goto, 10), btn));
});
renderIcons(page);
updateProgress();
if (pending > 1) {
requestAnimationFrame(() => {
if (!document.body.contains(bar)) return;
jumpToAyah(pending, true);
if (document.fonts && document.fonts.ready) {
document.fonts.ready.then(() => {
if (!userMoved && document.body.contains(bar)) jumpToAyah(pending, false);
});
}
});
}
requestAnimationFrame(() => {
if (!document.body.contains(bar)) return;
if (scroller.scrollHeight - scroller.clientHeight < 80) {
dwellTimer = setTimeout(() => {
dwelled = true;
persist();
}, 3500);
}
});
}
