import { renderIcons } from '../shared/icons.js';
import { askAkdarStream, aiErrorMessage, aiDiagCode, warmAskFunction, sendAiFeedback } from '../shared/ai-ask.js';
import { pickSuggestions } from '../shared/ai-suggest.js';
import { prewarmAiPool } from '../shared/ai-sources.js';
const MIN_CHARS   = 3;
const MAX_CHARS   = 300;
const COOLDOWN_MS = 2500;
const HISTORY_MAX = 20;
const NO_RETRY    = ['too-many-requests', 'daily-limit-user', 'daily-limit-site'];
const TYPE_MIN_CPS   = 55;
const TYPE_CATCHUP_S = 1.2;
const SLOW_NOTICE_MS = 6000;
const reduceMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
let _history = [];
let _pending = false;
let _epoch   = 0;
let _lastQ   = '';
let _lastAt  = 0;
let _live    = null;
const SUGGESTIONS = [];
let _ui      = null;
const $ = (id) => document.getElementById(id);
const isCoarse = () => !!window.matchMedia?.('(pointer: coarse)').matches;
export function renderAi() {
return `
    <section class="page ai-page">

      <div class="ai-hero" id="ai-hero">
        <div class="ai-hero__orb" aria-hidden="true">
          <span class="ai-hero__ring ai-hero__ring--outer"></span>
          <span class="ai-hero__ring ai-hero__ring--inner"></span>
          <span class="ai-hero__badge"><span data-icon="sparkles"></span></span>
        </div>
        <h2 class="ai-hero__title">اسأل عن شبتوت بحري</h2>
        <p class="ai-hero__sub">اكتب سؤالك بأي صيغة، وبيجاوبك من محتوى التطبيق ومعلومات البلد.</p>
        <div class="ai-hero__chips" id="ai-hero-chips" role="group" aria-label="أسئلة مقترحة" hidden>
          ${SUGGESTIONS.map((q) => `<button type="button" class="ai-chip" data-q="${q}">${q}</button>`).join('')}
        </div>
      </div>

      <div class="ai-thread" id="ai-thread" hidden></div>

      <div class="ai-composer">
        <div class="ai-composer__bar">
          <textarea
            id="ai-input"
            class="ai-composer__input"
            rows="1"
            maxlength="${MAX_CHARS}"
            placeholder="اسأل أي شي عن شبتوت…"
            enterkeyhint="send"
            autocomplete="off"
            aria-label="سؤالك"
          ></textarea>
          <button type="button" class="ai-composer__send" id="ai-send" aria-label="إرسال السؤال" disabled>
            <span data-icon="arrow-up"></span>
          </button>
        </div>
        <div class="ai-composer__meta">
          <span class="ai-composer__note">ممكن يغلط — تأكد من المصدر.</span>
          <span class="ai-composer__count" id="ai-count" aria-hidden="true" hidden></span>
        </div>
      </div>

      <p class="ai-live" id="ai-live" aria-live="polite"></p>
    </section>
  `;
}
export function initAi() {
const hero   = $('ai-hero');
const thread = $('ai-thread');
const input  = $('ai-input');
const send   = $('ai-send');
const live   = $('ai-live');
const count  = $('ai-count');
if (!hero || !thread || !input || !send) return;
_ui = { hero, thread, input, send, live, count };
const warmAll = () => { prewarmAiPool(); warmAskFunction(); };
if ('requestIdleCallback' in window) requestIdleCallback(warmAll, { timeout: 2000 });
else setTimeout(warmAll, 800);
input.addEventListener('input', () => { autoGrow(); syncSend(); });
input.addEventListener('keydown', (e) => {
if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
e.preventDefault();
ask(input.value);
}
});
send.addEventListener('click', () => ask(input.value));
thread.addEventListener('click', (e) => {
const chip = e.target.closest?.('.ai-chip');
if (chip) ask(chip.dataset.q);
});
hero.addEventListener('click', (e) => {
const chip = e.target.closest?.('.ai-chip');
if (chip) ask(chip.dataset.q);
});
paint();
fillHeroChips();
if (_history.length) scrollToEnd();
if (!isCoarse()) setTimeout(() => input.focus(), 100);
}
async function fillHeroChips() {
const box = $('ai-hero-chips');
if (!box) return;
const list = await pickSuggestions({ n: 2 });
if (!box.isConnected) return;
box.replaceChildren();
list.forEach((q) => { const b = el('button', 'ai-chip', q); b.type = 'button'; b.dataset.q = q; box.append(b); });
box.hidden = !list.length;
}
async function ask(raw, { force = false } = {}) {
const q = String(raw || '').trim().slice(0, MAX_CHARS);
if (q.length < MIN_CHARS || _pending || !_ui) return;
const now = Date.now();
if (!force && q === _lastQ && now - _lastAt < COOLDOWN_MS) return;
_lastQ = q;
_lastAt = now;
const my = _epoch;
pushMsg({ role: 'user', text: q });
_pending = true;
clearInput();
if (isCoarse()) _ui.input.blur();
paint();
scrollToEnd();
say('لحظة، نجهّز الإجابة');
_live = null;
const slow = setTimeout(() => {
if (!_pending || _live || my !== _epoch) return;
const label = _ui?.thread.querySelector('.ai-typing__label');
if (label) label.textContent = 'ما زلنا نجهّز الإجابة، لحظات…';
}, SLOW_NOTICE_MS);
try {
const { answer, sources } = await askAkdarStream(q, {
onText: (t) => { if (my === _epoch) showLive(t); },
});
if (my !== _epoch) return;
await finishLive(answer);
if (my !== _epoch) return;
_live = null;
_pending = false;
pushMsg({ role: 'bot', text: answer, sources, q });
say('وصلت الإجابة');
paint({ animateLast: false });
return;
} catch (err) {
if (my !== _epoch) return;
_live = null;
_pending = false;
pushMsg({ role: 'error', code: err?.message || 'unavailable', detail: err?.detail || '', q, items: err?.items || [] });
say('الإجابة لسع ما وصلت');
} finally {
clearTimeout(slow);
}
paint();
scrollToLastAnswer();
}
function retry(errMsg) {
if (_pending || _history[_history.length - 1] !== errMsg) return;
_history.pop();
if (_history[_history.length - 1]?.role === 'user') _history.pop();
ask(errMsg.q, { force: true });
}
function resetConversation() {
_epoch++;
if (_live?.raf) cancelAnimationFrame(_live.raf);
_live?.resolve?.();
_live = null;
_history = [];
_pending = false;
_lastQ = '';
paint();
fillHeroChips();
if (!isCoarse()) _ui?.input.focus();
}
function pushMsg(m) {
_history.push(m);
while (_history.length > HISTORY_MAX) _history.shift();
}
function paint({ animateLast = true } = {}) {
const ui = _ui;
if (!ui || !ui.thread.isConnected) return;
const active = _history.length > 0 || _pending;
ui.hero.hidden   = active;
ui.thread.hidden = !active;
const nodes = [];
if (active) nodes.push(barNode());
_history.forEach((m, i) => {
if (m.role === 'user')       nodes.push(userNode(m));
else if (m.role === 'error') nodes.push(errorNode(m, i === _history.length - 1));
else                         nodes.push(botNode(m));
});
if (_pending) nodes.push(_live ? liveNode() : loadingNode());
else { const f = followNode(); if (f) nodes.push(f); }
const lastIdx = nodes.length - 1;
nodes.forEach((n, i) => { if (!animateLast || i < lastIdx) n.classList.add('ai-msg--still'); });
ui.thread.replaceChildren(...nodes);
renderIcons(ui.thread);
syncSend();
}
function el(tag, className, text) {
const node = document.createElement(tag);
if (className) node.className = className;
if (text != null) node.textContent = text;
return node;
}
function iconEl(name) {
const s = el('span');
s.setAttribute('data-icon', name);
return s;
}
function barNode() {
const bar = el('div', 'ai-thread__bar');
const btn = el('button', 'ai-reset');
btn.type = 'button';
btn.append(iconEl('rotate-ccw'), el('span', '', 'محادثة جديدة'));
btn.addEventListener('click', resetConversation);
bar.append(btn);
return bar;
}
function userNode(m) {
const row = el('div', 'ai-msg ai-msg--user');
row.append(el('div', 'ai-msg__bubble', m.text));
return row;
}
function botShell(extraClass) {
const row = el('div', 'ai-msg ai-msg--bot' + (extraClass ? ' ' + extraClass : ''));
const avatar = el('span', 'ai-msg__avatar');
avatar.setAttribute('aria-hidden', 'true');
avatar.append(iconEl('sparkles'));
const bubble = el('div', 'ai-msg__bubble');
row.append(avatar, bubble);
return { row, bubble };
}
function answerLines(text) {
return String(text || '').replace(/[*#`]+/g, '').trim().slice(0, 1500)
.split(/\n+/).map((l) => l.trim()).filter(Boolean);
}
function fillLive() {
const L = _live;
if (!L?.bubble) return;
const paras = answerLines(L.target.slice(0, L.shown)).map((l) => el('p', '', l));
if (!paras.length) paras.push(el('p'));
paras[paras.length - 1].append(el('span', 'ai-caret'));
L.bubble.replaceChildren(...paras);
}
function liveNode() {
const { row, bubble } = botShell();
_live.row = row;
_live.bubble = bubble;
fillLive();
return row;
}
function liveTick(ts) {
const L = _live;
if (!L) return;
L.raf = 0;
const backlog = L.target.length - L.shown;
if (backlog > 0) {
const dt = L.last ? Math.min(ts - L.last, 100) : 16;
L.last = ts;
const cps = Math.max(TYPE_MIN_CPS, backlog / TYPE_CATCHUP_S);
L.carry += (cps * dt) / 1000;
let n = Math.floor(L.carry);
if (n > 0) {
L.carry -= n;
let next = Math.min(L.target.length, L.shown + n);
const c = L.target.charCodeAt(next - 1);
if (c >= 0xD800 && c <= 0xDBFF && next < L.target.length) next += 1;
L.shown = next;
fillLive();
}
}
if (L.shown < L.target.length) {
L.raf = requestAnimationFrame(liveTick);
} else {
L.last = 0;
if (L.done && L.resolve) { fillLiveDone(); L.resolve(); }
}
}
function fillLiveDone() {
_live?.bubble?.querySelector('.ai-caret')?.remove();
}
function startLive() {
_live = { target: '', shown: 0, done: false, carry: 0, last: 0, row: null, bubble: null, raf: 0, resolve: null };
paint({ animateLast: true });
scrollToLastAnswer();
}
function pumpLive() {
if (!_live) return;
if (reduceMotion()) {
_live.shown = _live.target.length;
fillLive();
return;
}
if (!_live.raf) _live.raf = requestAnimationFrame(liveTick);
}
function showLive(text) {
if (!_pending) return;
if (!_live) startLive();
if (!_live) return;
_live.target = text;
pumpLive();
}
function finishLive(answer) {
if (!_pending) return Promise.resolve();
if (!_live) startLive();
if (!_live) return Promise.resolve();
const L = _live;
let i = 0;
const max = Math.min(L.shown, answer.length, L.target.length);
while (i < max && answer[i] === L.target[i]) i += 1;
L.shown = Math.min(L.shown, i);
L.target = answer;
L.done = true;
return new Promise((resolve) => {
L.resolve = resolve;
if (reduceMotion() || L.shown >= L.target.length) {
L.shown = L.target.length;
fillLive();
fillLiveDone();
resolve();
} else if (!L.raf) {
L.raf = requestAnimationFrame(liveTick);
}
});
}
function botNode(m) {
const { row, bubble } = botShell();
const lines = answerLines(m.text);
if (lines.length) lines.forEach((l) => bubble.append(el('p', '', l)));
else bubble.append(el('p', '', 'لا توجد معلومة عن هذا حاليًا، لكن فريق الرابطة يعمل على التطوير باستمرار وستتوفر معلومات عنه قريبًا.'));
const titles = [...new Set((m.sources || []).filter(Boolean))].slice(0, 2);
if (titles.length) {
const src = el('div', 'ai-msg__sources');
src.append(el('span', 'ai-msg__sources-label', 'المصدر:'));
titles.forEach((t) => src.append(el('span', 'ai-msg__source', t)));
bubble.append(src);
}
if (lines.length) {
const actions = el('div', 'ai-msg__actions');
const copy = el('button', 'ai-msg__action');
copy.type = 'button';
copy.setAttribute('aria-label', 'نسخ الإجابة');
copy.append(iconEl('copy'), el('span', '', 'نسخ'));
copy.addEventListener('click', () => copyAnswer(copy, lines.join('\n')));
actions.append(copy);
actions.append(...feedbackButtons(m, lines.join('\n')));
bubble.append(actions);
}
return row;
}
function followNode() {
const last = _history[_history.length - 1];
if (!last || last.role !== 'bot') return null;
if (last.follow === undefined) {
last.follow = null;
const asked = _history.filter((m) => m.role === 'user').map((m) => m.text);
pickSuggestions({ exclude: asked, seed: `${last.q || ''} ${last.text || ''}`, n: 2 })
.then((list) => {
last.follow = list;
if (_history[_history.length - 1] === last && !_pending) paint({ animateLast: false });
})
.catch(() => { last.follow = []; });
return null;
}
if (!last.follow || !last.follow.length) return null;
const box = el('div', 'ai-follow ai-msg--still');
box.setAttribute('role', 'group');
box.setAttribute('aria-label', 'أسئلة مقترحة');
box.append(el('p', 'ai-follow__label', 'أسئلة جاهزة إجاباتها:'));
const chips = el('div', 'ai-follow__chips');
last.follow.forEach((q) => { const b = el('button', 'ai-chip', q); b.type = 'button'; b.dataset.q = q; chips.append(b); });
box.append(chips);
return box;
}
function feedbackButtons(m, plain) {
const mk = (kind, icon, label) => {
const b = el('button', 'ai-msg__action ai-msg__action--vote');
b.type = 'button';
b.setAttribute('aria-label', label);
b.append(iconEl(icon));
b.dataset.vote = kind;
if (m.vote) { b.disabled = true; if (m.vote === kind) b.classList.add('is-done'); }
b.addEventListener('click', () => {
if (m.vote) return;
m.vote = kind;
sendAiFeedback(m.q || '', plain, kind);
say(kind === 'up' ? 'شكرًا على تقييمك' : 'شكرًا، سنحسّن الإجابة');
paint({ animateLast: false });
});
return b;
};
const out = [mk('up', 'thumbs-up', 'الإجابة مفيدة'), mk('down', 'thumbs-down', 'الإجابة غير مفيدة')];
if (m.vote) out.push(el('span', 'ai-msg__thanks', m.vote === 'up' ? 'شكرًا!' : 'شكرًا، سنحسّن الإجابة'));
return out;
}
async function copyAnswer(btn, text) {
let ok = false;
try {
await navigator.clipboard.writeText(text);
ok = true;
} catch {
try {
const ta = document.createElement('textarea');
ta.value = text;
ta.setAttribute('readonly', '');
ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
document.body.append(ta);
ta.select();
ok = document.execCommand('copy');
ta.remove();
} catch {   }
}
const label = btn.querySelector('span:last-child');
if (label) label.textContent = ok ? 'تم النسخ' : 'النسخ ما تم';
btn.classList.toggle('is-done', ok);
say(ok ? 'تم نسخ الإجابة' : 'نسخ الإجابة ما تم');
setTimeout(() => {
if (!btn.isConnected) return;
if (label) label.textContent = 'نسخ';
btn.classList.remove('is-done');
}, 1800);
}
function errorNode(m, isLast) {
const offline = m.code === 'network';
const { row, bubble } = botShell(offline ? 'ai-msg--offline' : 'ai-msg--error');
if (offline) {
bubble.append(el('p', 'ai-msg__offline-title', 'لا يوجد اتصال بالإنترنت'));
bubble.append(el('p', 'ai-msg__offline-text', 'المساعد يحتاج إنترنت ليجيب. أسئلتك التي أجاب عنها من قبل تعمل بدون إنترنت.'));
} else {
bubble.append(el('p', 'ai-msg__error', aiErrorMessage(m.code, m.detail)));
const diag = aiDiagCode(m.code, m.detail);
if (diag) bubble.append(el('p', 'ai-msg__diag', `رمز العطل: ${diag}`));
}
if (isLast && !NO_RETRY.includes(m.code)) {
const btn = el('button', 'ai-msg__retry', offline ? 'حاول بعد عودة الاتصال' : 'حاول تاني');
btn.type = 'button';
btn.addEventListener('click', () => retry(m));
bubble.append(btn);
}
return row;
}
function loadingNode() {
const { row, bubble } = botShell('ai-msg--loading');
const dots = el('span', 'ai-typing');
dots.setAttribute('aria-hidden', 'true');
dots.append(el('span'), el('span'), el('span'));
bubble.append(dots, el('span', 'ai-typing__label', 'لحظة، نجهّز الإجابة…'));
return row;
}
function autoGrow() {
const i = _ui?.input;
if (!i) return;
i.style.height = 'auto';
i.style.height = Math.min(i.scrollHeight, 120) + 'px';
}
function syncSend() {
if (!_ui) return;
const len = _ui.input.value.length;
_ui.send.disabled = _pending || _ui.input.value.trim().length < MIN_CHARS;
const c = _ui.count;
if (c) {
const near = len >= MAX_CHARS - 60;
c.hidden = !near;
if (near) c.textContent = `${len} / ${MAX_CHARS}`;
}
}
function clearInput() {
if (!_ui) return;
_ui.input.value = '';
autoGrow();
syncSend();
}
function say(text) {
if (_ui?.live) _ui.live.textContent = text;
}
function scrollToEnd() {
const sc = document.querySelector('#app-content');
if (sc) sc.scrollTop = sc.scrollHeight;
}
function scrollToLastAnswer() {
const last = _ui?.thread.querySelector('.ai-msg--bot:last-child');
last?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
}
