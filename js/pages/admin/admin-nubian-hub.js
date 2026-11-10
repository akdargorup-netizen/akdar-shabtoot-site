import { loadStats } from '../../data/nubian-admin-data.js';
import { renderIcons } from '../../shared/icons.js';
const INTENT_KEY = 'admin_nubian_intent';
const CARDS = [
{ id: 'words',   icon: 'book-open',      title: 'الكلمات', desc: 'إضافة وتعديل الكلمات وتسجيل صوتها.', page: 'admin-nubian-words' },
{ id: 'phrases', icon: 'message-square', title: 'الجمل',   desc: 'إضافة وتعديل الجمل وتسجيل صوتها.',   page: 'admin-nubian-phrases' },
];
const HELP = [
'اختار «الكلمات» أو «الجمل»، ثم افتح التصنيف اللي داير تشتغل فيه.',
'زر «إضافة» فوق لإضافة جديد، وزر «تعديل» جنب أي عنصر لتعديله.',
'زر «سجّل الصوت» جنب العنصر لتسجيل نطقه. أو اضغط «ابدأ التسجيل» هنا فتسجّل الناقص كله واحد ورا التاني.',
'شارة «بدون ترجمة» معناها العنصر ناقص ترجمة (ولازم تكملها قبل تسجيل الصوت). و«بلا صوت» معناها ينتظر تسجيل.',
];
let _memo = null;
export function renderNubianHub({ withTitle = false } = {}) {
return `
    <div class="nadm-hero">
      <div class="nadm-hero__icon"><i data-lucide="languages"></i></div>
      ${withTitle ? '<h2 class="nadm-hero__title">إدارة آنداندي</h2>' : ''}
      <p class="nadm-hero__sub">اختر العمل.</p>
    </div>
    <div class="nadm-todo" data-nadm-todo hidden>
      <div class="nadm-todo__head"><i data-lucide="mic"></i><span>ما ينتظرك</span></div>
      <button type="button" class="nadm-todo__row" data-nadm-record="words" hidden>
        <span class="nadm-todo__text" data-nadm-todo-text="words"></span>
        <span class="nadm-todo__go">ابدأ التسجيل</span>
      </button>
      <button type="button" class="nadm-todo__row" data-nadm-record="phrases" hidden>
        <span class="nadm-todo__text" data-nadm-todo-text="phrases"></span>
        <span class="nadm-todo__go">ابدأ التسجيل</span>
      </button>
    </div>
    <div class="nadm-tiles nadm-hub">
      ${CARDS.map(c => `
        <button type="button" class="nadm-tile" data-page="${c.page}" data-nadm-card="${c.id}">
          <span class="nadm-tile__icon"><i data-lucide="${c.icon}"></i></span>
          <span class="nadm-tile__text">
            <span class="nadm-tile__title">${c.title}</span>
            <span class="nadm-tile__desc">${c.desc}</span>
            <span class="nadm-tile__sub" data-nadm-meta="${c.id}"></span>
          </span>
          <span class="nadm-tile__arrow"><i data-lucide="chevron-left"></i></span>
        </button>`).join('')}
    </div>
    <details class="nadm-help">
      <summary>كيف أستخدم هذه الصفحة؟</summary>
      <ol class="nadm-help__list">${HELP.map(t => `<li>${t}</li>`).join('')}</ol>
    </details>`;
}
function _paint(root, m) {
if (!m) return;
const set = (id, text) => { const el = root.querySelector(`[data-nadm-meta="${id}"]`); if (el) el.textContent = text; };
const line = (n, unit, pending) => !n ? `لسع ما في ${unit === 'كلمة' ? 'كلمات' : 'جمل'}` : `${n} ${unit}${pending ? ` · ${pending} بلا صوت` : ''}`;
set('words',   line(m.words,   'كلمة', m.pendingWords));
set('phrases', line(m.phrases, 'جملة', m.pendingPhrases));
const todo = root.querySelector('[data-nadm-todo]');
if (!todo) return;
const rows = { words: [m.pendingWords, 'كلمة'], phrases: [m.pendingPhrases, 'جملة'] };
let any = false;
for (const [kind, [n, unit]] of Object.entries(rows)) {
const row = todo.querySelector(`[data-nadm-record="${kind}"]`);
if (!row) continue;
row.hidden = !n;
if (n) { any = true; row.querySelector('[data-nadm-todo-text]').textContent = `${n} ${unit} تنتظر صوتك`; }
}
todo.hidden = !any;
}
async function _startRecord(kind) {
try { sessionStorage.setItem(INTENT_KEY, JSON.stringify({ kind, category: '' })); } catch {   }
const { navigateTo } = await import('../../core/router.js');
navigateTo('admin-nubian-record');
}
export async function initNubianHub(root) {
if (!root) return;
renderIcons(root);
if (!root._nadmBound) {
root._nadmBound = true;
root.addEventListener('click', (e) => {
const b = e.target.closest('[data-nadm-record]');
if (b && root.contains(b)) _startRecord(b.dataset.nadmRecord);
});
}
_paint(root, _memo);
try {
const [w, p] = await Promise.all([loadStats('words'), loadStats('phrases')]);
const sum = (rows, f) => rows.reduce((n, r) => n + (r[f] || 0), 0);
_memo = {
words: sum(w, 'total'), phrases: sum(p, 'total'),
pendingWords: sum(w, 'noAudio'), pendingPhrases: sum(p, 'noAudio'),
};
if (root.isConnected) _paint(root, _memo);
} catch {   }
}
export const renderAdminNubianHub = () => `<section class="page admin-panel-page nadm-home">${renderNubianHub()}</section>`;
export const initAdminNubianHub   = () => initNubianHub(document.querySelector('.nadm-home'));
