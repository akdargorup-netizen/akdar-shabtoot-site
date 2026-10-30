import { NUBIAN_LANGUAGE_CATEGORIES } from '../../data/nubian-language-data.js';
import { getNubianWords, getNubianWordCategories, getNubianPhraseCategories, getNubianPhrases } from '../../data/db.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { abadolHtml, abadolSay, reactionFor, roundResultSay, arNum, MATCH_HINT, GUIDE_STEPS, buddyHints } from '../../shared/abadol-mascot.js';
import { isSoundOn, setSoundOn, unlockAudio, playTap, playStart, playCorrect, playPair, playWrong, playResult, playAbadolVoice } from '../../shared/abadol-sound.js';
import { mapHtml, SKYLINE } from './nubian-game-map.js';
import {
MIN_ITEMS_TO_PLAY, MIX_KEY, REVIEW_KEY,
buildPools, mixPool, reviewPool, buildRound, starsFor,
applyResult, isKnown, masteryStats,
} from './nubian-game-engine.js';
const STORE_KEY   = 'andandi_game_v1';
const MASTERY_KEY = 'andandi_game_mastery_v1';
const GUIDE_KEY   = 'andandi_game_guide_v1';
const LESSON_MAX  = 6;
function loadProgress() {
try {
const p = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
return { stars: (p && typeof p.stars === 'object' && p.stars) || {} };
} catch { return { stars: {} }; }
}
function saveStars(key, stars) {
try {
const p = loadProgress();
if ((p.stars[key] || 0) >= stars) return;
p.stars[key] = stars;
localStorage.setItem(STORE_KEY, JSON.stringify(p));
} catch {   }
}
function loadMastery() {
try {
const m = JSON.parse(localStorage.getItem(MASTERY_KEY) || '{}');
return (m && typeof m === 'object') ? m : {};
} catch { return {}; }
}
function guideSeen() {
try { return localStorage.getItem(GUIDE_KEY) === '1'; } catch { return true; }
}
function markGuideSeen() {
try { localStorage.setItem(GUIDE_KEY, '1'); } catch {   }
}
function recordResult(id, ok) {
try {
const m = loadMastery();
m[id] = applyResult(m[id], ok, Date.now());
localStorage.setItem(MASTERY_KEY, JSON.stringify(m));
} catch {   }
}
export function renderNubianGame() {
return `
    <section class="page nlang-page ngame-page">
      <div id="ngame-root" aria-live="polite">
        <div class="nlang-search-card" aria-hidden="true">
          <div class="page-skeleton__line page-skeleton__line--sm" style="width:40%;"></div>
          <div class="page-skeleton__line page-skeleton__line--md" style="width:60%; margin-top: var(--space-3);"></div>
        </div>
      </div>
    </section>`;
}
export async function initNubianGame() {
const root = document.getElementById('ngame-root');
if (!root) return;
const { renderIcons } = await import('../../shared/icons.js');
let pools, mix, itemById;
try {
const [words, phraseCategories, phrases, wordCategories] = await Promise.all([
getNubianWords(), getNubianPhraseCategories(), getNubianPhrases(),
getNubianWordCategories().catch(() => NUBIAN_LANGUAGE_CATEGORIES),
]);
pools = buildPools({ wordCategories, words, phraseCategories, phrases });
mix = mixPool(pools);
itemById = new Map(pools.flatMap(p => p.items).map(it => [it.id, it]));
} catch (err) {
console.error('[NubianGame] فشل تحميل بيانات اللعبة:', err);
root.innerHTML = errorState({ subject: 'لعبة آنداندي' });
renderIcons(root);
bindErrorRetry(root, () => initNubianGame());
return;
}
const playable = (p) => p && p.items.length >= MIN_ITEMS_TO_PLAY;
const poolFor = (key, mastery) =>
key === MIX_KEY ? mix : key === REVIEW_KEY ? reviewPool(pools, mastery) : pools.find(p => p.key === key);
let game = null;
let hints = [], hintIdx = 0;
const paint = (html) => { root.innerHTML = html; renderIcons(root); };
const stars = (n) => [1, 2, 3].map(i =>
`<span class="ngame-star${i <= n ? ' ngame-star--on' : ''}" style="--i:${i - 1}" data-icon="star"></span>`).join('');
const beads = (results, total, current = -1, extra = '') => `
    <div class="ngame-beads${extra}" role="presentation" aria-hidden="true">
      ${Array.from({ length: total }, (_, i) => {
const r = results[i];
const cls = r === true ? ' ngame-bead--ok' : r === false ? ' ngame-bead--bad' : i === current ? ' ngame-bead--now' : '';
return `<span class="ngame-bead${cls}"></span>`;
}).join('')}
    </div>`;
const soundBtn = () => {
const on = isSoundOn();
return `<button type="button" class="ngame-sound" data-action="sound" aria-pressed="${on}" aria-label="${on ? 'إيقاف الأصوات' : 'تشغيل الأصوات'}">
      <span data-icon="${on ? 'volume-2' : 'volume-x'}"></span></button>`;
};
function showGuide(step = 0) {
game = null;
const i = Math.max(0, Math.min(step, GUIDE_STEPS.length - 1));
const st = GUIDE_STEPS[i];
const last = i === GUIDE_STEPS.length - 1;
paint(`
      <div class="ngame-guide">
        <div class="ngame-guide__sky" aria-hidden="true">${SKYLINE}</div>
        ${abadolHtml(st.mood, 150)}
        <p class="ngame-guide__bubble" role="status">${escapeHtml(st.text)}</p>
        <div class="ngame-guide__dots" aria-label="الخطوة ${arNum(i + 1)} من ${arNum(GUIDE_STEPS.length)}">
          ${GUIDE_STEPS.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}
        </div>
        <div class="ngame-guide__actions">
          <button type="button" class="ngame-next" data-action="guide-next" data-step="${i}">${last ? 'يلا نبدأ' : 'التالي'}</button>
          ${last ? '' : '<button type="button" class="ngame-next ngame-next--ghost" data-action="guide-skip">تخطّي الشرح</button>'}
        </div>
      </div>
    `);
setTimeout(() => playAbadolVoice(st.mood), 250);
}
function endGuide() { markGuideSeen(); showHub(); }
function showHub() {
game = null;
const progress = loadProgress().stars;
const mastery = loadMastery();
const review = reviewPool(pools, mastery);
const stops = pools.map(p => {
const ok = playable(p);
const st = masteryStats(p, mastery);
return { key: p.key, title: p.title, icon: p.icon, ok, known: st.known, total: st.total, stars: ok ? (progress[p.key] || 0) : 0 };
});
let cur = stops.findIndex(s => s.ok && !s.stars);
const allDone = cur < 0;
if (allDone) { for (let i = stops.length - 1; i >= 0; i--) if (stops[i].ok) { cur = i; break; } }
hints = cur >= 0 ? buddyHints({ curTitle: stops[cur].title, allDone, dueCount: playable(review) ? review.items.length : 0 }) : [];
hintIdx = 0;
const reviewCard = playable(review) ? `
      <button type="button" class="ngame-cat ngame-cat--mix ngame-cat--review" data-action="start" data-key="${REVIEW_KEY}">
        <span class="ngame-cat__icon" data-icon="rotate-ccw"></span>
        <span class="ngame-cat__body">
          <span class="ngame-cat__title">مراجعة كلماتي</span>
          <span class="ngame-cat__meta">${arNum(review.items.length)} كلمة حان وقت مراجعتها</span>
        </span>
      </button>` : '';
const mixCard = playable(mix) ? (() => {
const st = masteryStats(mix, mastery);
const pct = st.total ? Math.round((st.known / st.total) * 100) : 0;
const n = progress[MIX_KEY] || 0;
return `
      <button type="button" class="ngame-cat ngame-cat--mix" data-action="start" data-key="${MIX_KEY}">
        <span class="ngame-cat__icon" data-icon="${escapeHtml(mix.icon || 'shuffle')}"></span>
        <span class="ngame-cat__body">
          <span class="ngame-cat__title">${escapeHtml(mix.title)}</span>
          <span class="ngame-cat__meta">عرفت ${arNum(st.known)} من ${arNum(st.total)}</span>
          <span class="ngame-cat__bar" aria-hidden="true"><span style="width:${pct}%"></span></span>
        </span>
        <span class="ngame-cat__stars" aria-label="${arNum(n)} من ٣ نجوم">${stars(n)}</span>
      </button>`;
})() : '';
paint(`
      <div class="ngame-hubbar">
        <button type="button" class="ngame-help" data-action="guide"><span data-icon="info"></span> كيف ألعب؟</button>
        <span class="ngame-hubbar__label">الأصوات</span>${soundBtn()}
      </div>
      <div class="ngame-hero">
        <div class="ngame-cartouche">
          <span class="ngame-cartouche__eyebrow">مع آبادول</span>
          <h2 class="ngame-cartouche__title">لعبة آنداندي</h2>
          <span class="ngame-cartouche__tape" aria-hidden="true"></span>
        </div>
      </div>
      ${(reviewCard || mixCard) ? `<div class="ngame-list">${reviewCard}${mixCard}</div>` : ''}
      <h3 class="ngame-section">خريطة النيل</h3>
      ${mapHtml({ stops, cur, hint: hints[0] })}
    `);
if (cur > 1) {
const node = root.querySelectorAll('.ngame-stop')[cur];
if (node && node.scrollIntoView) setTimeout(() => node.scrollIntoView({ block: 'center' }), 60);
}
if (hints[0]) setTimeout(() => playAbadolVoice(hints[0].mood), 700);
}
function onBuddy() {
if (!hints.length) return;
hintIdx = (hintIdx + 1) % hints.length;
const h = hints[hintIdx];
const say = document.getElementById('ngame-buddy-say');
if (say) say.textContent = h.text;
const mas = root.querySelector('.ngame-buddy .ab-mascot');
if (mas) mas.outerHTML = abadolHtml(h.mood, 68);
playAbadolVoice(h.mood);
}
function startRound(key) {
const mastery = loadMastery();
const pool = poolFor(key, mastery);
if (!playable(pool)) { showHub(); return; }
const questions = buildRound(pool, pools, mastery);
if (!questions.length) { showHub(); return; }
game = { pool, questions, index: 0, correct: 0, combo: 0, answered: false, match: null, missed: new Set(), results: [] };
playStart();
const seen = new Set();
const lesson = [];
for (const q of questions) {
for (const id of q.itemIds) {
if (seen.has(id)) continue;
seen.add(id);
const rec = mastery[id];
if ((!rec || rec.b === 0) && itemById.get(id)) lesson.push(itemById.get(id));
}
}
if (lesson.length) showLesson(lesson.slice(0, LESSON_MAX)); else showQuestion();
}
function showLesson(items) {
const row = (it) => `
      <li class="ngame-lesson__row">
        <span class="ngame-lesson__ar">${escapeHtml(it.ar)}</span>
        <span class="ngame-lesson__nub">${escapeHtml(it.nub)}${it.translit ? `<small dir="ltr">${escapeHtml(it.translit)}</small>` : ''}</span>
      </li>`;
paint(`
      <div class="ngame-top">
        <button type="button" class="ngame-exit" data-action="hub" aria-label="الخروج للأقسام"><span data-icon="x"></span></button>
        <span class="ngame-count ngame-count--grow">كلمات الجولة</span>
        ${soundBtn()}
      </div>
      ${abadolSay('think', 'شوف الكلمات دي كويس وردّدها بصوتك، وبعدين نختبر بعض. لو عرفتها كلها خلّينا نبدأ.', 92)}
      <ul class="ngame-lesson">${items.map(row).join('')}</ul>
      <button type="button" class="ngame-next" data-action="begin">جاهز، اختبرني</button>
    `);
}
const header = () => {
const total = game.questions.length;
return `
      <div class="ngame-top">
        <button type="button" class="ngame-exit" data-action="hub" aria-label="الخروج للأقسام"><span data-icon="x"></span></button>
        <div role="progressbar" class="ngame-beads-wrap" style="flex:1;min-width:0" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${game.index}" aria-label="تقدّم الجولة">
          ${beads(game.results, total, game.index)}
        </div>
        <span class="ngame-count">${arNum(game.index + 1)} / ${arNum(total)}</span>
        ${soundBtn()}
      </div>`;
};
function showQuestion() {
const q = game.questions[game.index];
game.answered = false;
game.match = null;
if (q.type === 'match') return showMatch(q);
const long = q.options.some(o => o.text.length > 18);
paint(`
      ${header()}
      <div class="ngame-say" id="ngame-say" style="--ab:88px">${abadolHtml('think', 88)}</div>
      <div class="ngame-q">
        <p class="ngame-q__prompt">${escapeHtml(q.prompt)}</p>
        <p class="ngame-q__shown">${escapeHtml(q.shown)}</p>
        ${q.hint ? `<p class="ngame-q__hint">${escapeHtml(q.hint)}</p>` : ''}
      </div>
      <div class="ngame-options${long ? ' ngame-options--long' : ''}">
        ${q.options.map((o, i) => `
          <button type="button" class="ngame-opt" data-action="answer" data-i="${i}">${escapeHtml(o.text)}</button>`).join('')}
      </div>
      <div id="ngame-after"></div>
    `);
}
function showMatch(q) {
game.match = { ar: null, nub: null, done: new Set(), mistakes: 0, bad: new Set() };
const side = (field, order) => order.map(id => {
const p = q.pairs.find(x => x.id === id);
return `<button type="button" class="ngame-m" data-action="m-pick" data-side="${field}" data-id="${id}">${escapeHtml(p[field])}</button>`;
}).join('');
paint(`
      ${header()}
      <div class="ngame-say" id="ngame-say" style="--ab:88px">${abadolHtml(MATCH_HINT.mood, 88)}<p class="ngame-say__text">${escapeHtml(MATCH_HINT.text)}</p></div>
      <div class="ngame-q ngame-q--match"><p class="ngame-q__prompt">${escapeHtml(q.prompt)}</p></div>
      <div class="ngame-match">
        <div class="ngame-match__col">${side('nub', q.nubOrder)}</div>
        <div class="ngame-match__col">${side('ar', q.arOrder)}</div>
      </div>
      <div id="ngame-after"></div>
    `);
}
function afterAnswer(ok, extraHtml = '') {
game.answered = true;
game.results[game.index] = !!ok;
if (ok) { game.correct++; game.combo++; } else { game.combo = 0; }
const r = reactionFor({ ok, combo: game.combo });
const say = document.getElementById('ngame-say');
if (say) say.innerHTML = `${abadolHtml(r.mood, 88)}<p class="ngame-say__text">${escapeHtml(r.text)}</p>`;
const nowBead = root.querySelector('.ngame-bead--now');
if (nowBead) { nowBead.classList.remove('ngame-bead--now'); nowBead.classList.add(ok ? 'ngame-bead--ok' : 'ngame-bead--bad'); }
if (ok) root.querySelector('.ngame-q')?.classList.add('ngame-q--ok');
const last = game.index === game.questions.length - 1;
const after = document.getElementById('ngame-after');
if (after) {
after.innerHTML = `
        ${extraHtml ? `<div class="ngame-reveal${ok ? '' : ' ngame-reveal--bad'}">${extraHtml}</div>` : ''}
        <button type="button" class="ngame-next" data-action="next">${last ? 'شوف النتيجة' : 'التالي'}</button>`;
after.querySelector('.ngame-next')?.focus({ preventScroll: false });
}
}
function explain(q, chosen, ok) {
const e = escapeHtml;
const right = q.options.find(o => o.correct);
const tr = q.answerTranslit ? ` <bdi dir="ltr" class="ngame-reveal__tr">${e(q.answerTranslit)}</bdi>` : '';
if (ok) return q.answerTranslit ? `النطق:${tr}` : '';
const lines = [];
if (chosen && chosen.meaning) {
lines.push(q.type === 'ar2nub'
? `«${e(chosen.text)}» تعني «${e(chosen.meaning)}»`
: `«${e(chosen.text)}» بآنداندي هي «${e(chosen.meaning)}»`);
}
lines.push(`الصحيح: <strong>${e(right.text)}</strong>${tr}`);
return lines.join('<br>');
}
function onAnswer(i) {
if (game.answered) return;
const q = game.questions[game.index];
const btns = root.querySelectorAll('.ngame-opt');
const chosen = q.options[i];
const ok = !!chosen?.correct;
btns.forEach((b, idx) => {
b.disabled = true;
if (q.options[idx].correct) b.classList.add('ngame-opt--ok');
else if (idx === i) b.classList.add('ngame-opt--bad');
});
(ok ? playCorrect : playWrong)();
recordResult(q.itemIds[0], ok);
if (!ok) game.missed.add(q.itemIds[0]);
afterAnswer(ok, explain(q, chosen, ok));
}
function onMatchPick(btn) {
if (game.answered || btn.classList.contains('ngame-m--done')) return;
const m = game.match, side = btn.dataset.side;
root.querySelectorAll(`.ngame-m[data-side="${side}"]`).forEach(b => b.classList.remove('ngame-m--sel'));
btn.classList.add('ngame-m--sel');
m[side] = btn;
playTap();
if (!(m.ar && m.nub)) return;
const a = m.ar, n = m.nub;
m.ar = m.nub = null;
if (a.dataset.id === n.dataset.id) {
[a, n].forEach(b => { b.classList.remove('ngame-m--sel'); b.classList.add('ngame-m--done'); b.disabled = true; });
m.done.add(a.dataset.id);
const q = game.questions[game.index];
if (m.done.size === q.pairs.length) {
const ok = m.mistakes <= 1;
(ok ? playCorrect : playPair)();
q.pairs.forEach(p => {
const bad = m.bad.has(String(p.id));
recordResult(p.itemId, !bad);
if (bad) game.missed.add(p.itemId);
});
afterAnswer(ok, m.bad.size ? 'الكلمات التي تلخبطت فيها ستعود لك في المراجعة.' : '');
} else {
playPair();
}
} else {
m.mistakes++;
m.bad.add(a.dataset.id); m.bad.add(n.dataset.id);
playWrong();
[a, n].forEach(b => b.classList.add('ngame-m--bad'));
setTimeout(() => [a, n].forEach(b => b.classList.remove('ngame-m--bad', 'ngame-m--sel')), 450);
}
}
function showResult() {
const total = game.questions.length;
const s = starsFor(game.correct, total);
saveStars(game.pool.key, s);
playResult(s);
const say = roundResultSay({ stars: s });
const key = game.pool.key;
const missed = [...game.missed].map(id => itemById.get(id)).filter(Boolean).slice(0, 8);
const missedRow = (it) => `
      <li class="ngame-lesson__row">
        <span class="ngame-lesson__ar">${escapeHtml(it.ar)}</span>
        <span class="ngame-lesson__nub">${escapeHtml(it.nub)}${it.translit ? `<small dir="ltr">${escapeHtml(it.translit)}</small>` : ''}</span>
      </li>`;
paint(`
      <div class="ngame-result">
        <div class="ngame-result__stars" aria-label="${arNum(s)} من ٣ نجوم">${stars(s)}</div>
        <p class="ngame-result__score">أجبت صح على ${arNum(game.correct)} من ${arNum(total)}</p>
        ${beads(game.results, total, -1, ' ngame-beads--recap')}
        ${abadolSay(say.mood, say.text, 112)}
        ${missed.length ? `
          <div class="ngame-review">
            <h3 class="ngame-section">كلمات تستحق المراجعة</h3>
            <ul class="ngame-lesson">${missed.map(missedRow).join('')}</ul>
            <p class="ngame-review__note">ستعود هذه الكلمات في جولاتك القادمة وفي «مراجعة كلماتي».</p>
          </div>` : ''}
        <div class="ngame-result__actions">
          <button type="button" class="ngame-next" data-action="start" data-key="${escapeHtml(key)}">جولة جديدة</button>
          <button type="button" class="ngame-next ngame-next--ghost" data-action="hub">الأقسام</button>
        </div>
      </div>`);
}
root.addEventListener('click', (e) => {
const el = e.target.closest('[data-action]');
if (!el || !root.contains(el)) return;
unlockAudio();
switch (el.dataset.action) {
case 'sound': {
const on = !isSoundOn();
setSoundOn(on);
root.querySelectorAll('[data-action="sound"]').forEach(b => {
b.setAttribute('aria-pressed', String(on));
b.setAttribute('aria-label', on ? 'إيقاف الأصوات' : 'تشغيل الأصوات');
b.innerHTML = `<span data-icon="${on ? 'volume-2' : 'volume-x'}"></span>`;
});
renderIcons(root);
if (on) playTap();
break;
}
case 'guide':      showGuide(0); break;
case 'guide-next': {
const i = Number(el.dataset.step) || 0;
if (i >= GUIDE_STEPS.length - 1) endGuide(); else showGuide(i + 1);
break;
}
case 'guide-skip': endGuide(); break;
case 'abadol':     onBuddy(); break;
case 'start':  startRound(el.dataset.key); break;
case 'hub':    showHub(); break;
case 'begin':  if (game) showQuestion(); break;
case 'answer': onAnswer(Number(el.dataset.i)); break;
case 'm-pick': onMatchPick(el); break;
case 'next':
if (!game) break;
if (game.index >= game.questions.length - 1) showResult();
else { game.index++; showQuestion(); }
break;
}
});
if (guideSeen()) showHub(); else showGuide(0);
}
