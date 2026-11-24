import { NUBIAN_LANGUAGE_CATEGORIES } from '../../data/nubian-language-data.js';
import { getNubianPhraseCategories, getNubianWordCategories } from '../../data/db.js';
import { loadStats, loadPage } from '../../data/nubian-admin-data.js';
import { openRecordMode } from './admin-nubian-record.js';
import { renderIcons } from '../../shared/icons.js';
import { emptyState } from '../../shared/empty-state.js';
const INTENT_KEY = 'admin_nubian_intent';
const BATCH = 40;
function _takeIntent() {
try {
const raw = sessionStorage.getItem(INTENT_KEY);
if (!raw) return {};
sessionStorage.removeItem(INTENT_KEY);
const o = JSON.parse(raw);
return o && typeof o === 'object' ? o : {};
} catch { return {}; }
}
async function _back() {
const { goBack } = await import('../../core/router.js');
goBack();
}
export function renderAdminNubianRecord() {
return `
    <section class="page admin-nubian-page nadm-rec-page">
      <div class="nadm-add__head" id="nadm-rec-status">
        <h2 class="nadm-add__title">وضع التسجيل</h2>
        <p class="nadm-add__sub">نجهّز ما ينتظر صوتك...</p>
      </div>
    </section>`;
}
export async function initAdminNubianRecord() {
const page = document.querySelector('.nadm-rec-page');
if (!page) return;
const intent = _takeIntent();
const kind = intent.kind === 'phrases' ? 'phrases' : 'words';
const category = typeof intent.category === 'string' ? intent.category : '';
const noun = kind === 'phrases' ? { all: 'الجمل', one: 'جملة' } : { all: 'الكلمات', one: 'كلمة' };
const status = page.querySelector('#nadm-rec-status');
const empty = (title, desc) => {
status.outerHTML = emptyState({ icon: 'check', title, desc })
+ '<button type="button" class="btn btn--primary nadm-lock" data-nrec-back>رجوع</button>';
page.querySelector('[data-nrec-back]')?.addEventListener('click', _back);
renderIcons(page);
};
try {
const [stats, first, cats] = await Promise.all([
loadStats(kind),
loadPage(kind, { category, filter: 'no-audio', offset: 0, limit: BATCH }),
kind === 'phrases' ? getNubianPhraseCategories().catch(() => []) : getNubianWordCategories().catch(() => NUBIAN_LANGUAGE_CATEGORIES),
]);
const titleOf = (key) => cats.find(c => c.key === key)?.title || key;
const total = category
? (stats.find(r => r.category === category)?.noAudio || 0)
: stats.reduce((n, r) => n + (r.noAudio || 0), 0);
if (!first.items.length) { empty(`كل ${noun.all} ليها صوت 👏`, `ما في ${noun.one} تنتظر تسجيل.`); return; }
openRecordMode({
kind,
words: first.items,
total: Math.max(total, first.total),
fetchMore: async (offset) => (await loadPage(kind, { category, filter: 'no-audio', offset, limit: BATCH })).items,
titleOf,
scopeTitle: category ? titleOf(category) : 'كل التصنيفات',
onClose: () => _back(),
});
status.querySelector('.nadm-add__sub').textContent = 'وضع التسجيل مفتوح.';
} catch (err) {
console.error('[AdminNubian/record] تعذّر التجهيز:', err);
status.querySelector('.nadm-add__sub').textContent = `تعذّر تحميل ${noun.all} — تأكد من النت وارجع للمحاولة.`;
}
}
