import { getNubianPhraseCategories, getNubianWordCategories } from '../../data/db.js';
import { NUBIAN_LANGUAGE_CATEGORIES } from '../../data/nubian-language-data.js';
import { loadStats, loadPage, matchesView, statDelta } from '../../data/nubian-admin-data.js';
import { emptyState }             from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { showToast }              from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { applyPending, setBatchRefresh, stageDelete, stagedMsg } from '../../shared/admin-batch.js';
import { renderIcons } from '../../shared/icons.js';
import { setBackInterceptor } from '../../core/router.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { openWordComposeModal } from './admin-nubian-word-modal.js';
import { openPhraseComposeModal, openCategoryManagerModal } from './admin-nubian-phrase-modal.js';
import { openWordCategoryManagerModal } from './admin-nubian-word-cat-modal.js';
import { openAudioModal } from './admin-nubian-audio-modal.js';
import { closeComposeModal } from './admin-nubian-modals.js';
import { canHardDelete, confirmDelete, enhanceAdminPage, rowTitle } from '../../shared/admin-ui.js';
const PAGE_SIZE = 30;
const LAST_KEY = 'admin_nubian_last_v1';
export const NUBIAN_INTENT_KEY = 'admin_nubian_intent';
const KIND = {
words: {
route: 'admin-nubian', section: 'nubian-word',
searchPh: 'ابحث في كل الكلمات...', addLabel: 'إضافة كلمة جديدة', unit: 'كلمة', noun: 'الكلمة',
emptyTitle: 'لسع ما في كلمات مُضافة', emptyDesc: 'اضغط «إضافة كلمة جديدة» وابدأ بأول كلمة.',
editAction: 'edit-nubian', delAction: 'delete-nubian', delLog: 'حذف كلمة نوبية',
plural: 'الكلمات', icon: 'languages', listPage: 'الكلمات',
},
phrases: {
route: 'admin-nubian-phrases', section: 'nubian-phrase',
searchPh: 'ابحث في كل الجمل...', addLabel: 'إضافة جملة جديدة', unit: 'جملة', noun: 'الجملة',
emptyTitle: 'لسع ما في جمل مضافة', emptyDesc: 'ابدأ وحط أول جملة في «تعلم الكلام».',
editAction: 'edit-nubian-phrase', delAction: 'delete-nubian-phrase', delLog: 'حذف جملة نوبية',
plural: 'الجمل', icon: 'message-square', listPage: 'الجمل',
},
};
const FILTERS = {
text:  [{ key: 'all', label: 'الكل' }, { key: 'no-translation', label: 'بلا ترجمة' }, { key: 'no-audio', label: 'بلا صوت' }],
audio: [{ key: 'no-audio', label: 'بلا صوت' }, { key: 'all', label: 'الكل' }],
};
const _lastId = () => `${S.kind}:${S.view}`;
function _lastGet() {
try { return String(JSON.parse(localStorage.getItem(LAST_KEY) || '{}')?.[_lastId()] || ''); } catch { return ''; }
}
function _lastSet(cat) {
if (!cat) return;
try {
const o = JSON.parse(localStorage.getItem(LAST_KEY) || '{}') || {};
o[_lastId()] = cat;
localStorage.setItem(LAST_KEY, JSON.stringify(o));
} catch {   }
}
const _hasTranslation = (w) => Boolean(w.nub || w.translit);
const _hasAudio = (w) => Boolean(w.audio);
const _isTmp = (it) => it?._tmp === true;
let S = null;
let _GEN = 0;
const _statsMemo = { words: null, phrases: null };
function _freshState(kind, view) {
return {
kind, view, cat: null, filter: FILTERS[view][0].key, query: '',
raw: [],
total: 0,
stats: _statsMemo[kind] || null,
phraseCats: [],
wordCats: NUBIAN_LANGUAGE_CATEGORIES,
gen: ++_GEN,
page: null,
};
}
function _categoryLabel(key) {
if (S.kind === 'phrases') return S.phraseCats.find(c => c.key === key)?.title || key;
return S.wordCats.find(c => c.key === key)?.title || key;
}
const _view = () => ({ category: S.cat || '', filter: S.filter, query: S.query });
function _render(kind, view) {
const k = KIND[kind];
const isAudio = view === 'audio';
return `
    <section class="page admin-nubian-page" data-nubian-kind="${kind}" data-nubian-view="${view}">

      <div class="admin-content-toolbar nadm-toolbar">
        <div class="search-bar nadm-search hidden" id="admin-nubian-search-wrap">
          <span class="search-bar__icon" data-icon="search"></span>
          <input type="search" class="search-bar__input" id="admin-nubian-search" placeholder="${k.searchPh}" aria-label="بحث" autocomplete="off">
        </div>

        <div class="nadm-actions" id="admin-nubian-toolbar-actions">
          ${isAudio ? '' : `<button class="cta-button nadm-actions__main" data-action="compose-nubian">
                 <i data-lucide="plus"></i><span>${k.addLabel}</span>
               </button>
               <button class="btn btn--secondary nadm-actions__cats" data-action="manage-nubian-categories"><i data-lucide="settings-2"></i><span>إضافة أو تعديل تصنيف</span></button>`}
          <button class="${isAudio ? 'cta-button nadm-actions__main' : 'btn btn--secondary nadm-actions__cats'} nadm-record-btn hidden" id="admin-nubian-record" data-action="nubian-record-mode"><i data-lucide="mic"></i><span id="admin-nubian-record-label">سجّل الصوت</span></button>
        </div>

        <div class="nadm-filters hidden" id="admin-nubian-filters" role="group" aria-label="تصفية">
          ${FILTERS[view].map((f, i) => `
            <button type="button" class="filter-chip ${i === 0 ? 'active' : ''}" data-filter="${f.key}">
              ${f.label} <span class="nadm-filters__count" data-count="${f.key}"></span>
            </button>`).join('')}
        </div>

        <div class="nadm-nav hidden" id="admin-nubian-nav"></div>
      </div>

      <div class="admin-content-list" id="admin-content-list">
        ${_skeletonRows(3)}
      </div>

    </section>
  `;
}
const _skeletonRows = (n) => Array.from({ length: n }, () => '<div class="admin-content-preview" style="height:74px;"></div>').join('');
export const renderAdminNubianWords   = () => _render('words', 'text');
export const renderAdminNubianPhrases = () => _render('phrases', 'text');
export const renderAdminNubianAudio   = () => _render('words', 'audio');
export const renderAdminNubianAudioPhrases = () => _render('phrases', 'audio');
async function _init(kind, view) {
const page = document.querySelector('.admin-nubian-page');
if (!page) return;
closeComposeModal();
S = _freshState(kind, view);
S.page = page;
setBatchRefresh(page, () => _reload());
enhanceAdminPage(page, { search: false });
renderIcons(page.querySelector('.nadm-search'));
page.querySelectorAll('#admin-nubian-filters [data-filter]').forEach(btn => {
btn.addEventListener('click', () => _setFilter(btn.dataset.filter));
});
page.querySelector('[data-action="compose-nubian"]')?.addEventListener('click', () => {
if (S.kind === 'words') openWordComposeModal(null, _onSaved, { category: S.cat || undefined, categories: S.wordCats });
else openPhraseComposeModal(null, _onSaved, S.phraseCats, S.cat || undefined);
});
page.querySelector('[data-action="manage-nubian-categories"]')?.addEventListener('click', () => {
if (S.kind === 'words') openWordCategoryManagerModal(async () => { await _loadWordCats(); _reload(); });
else openCategoryManagerModal(async () => { await _loadPhraseCats(); _reload(); });
});
page.querySelector('#admin-nubian-record')?.addEventListener('click', () => _startRecord(S.cat || ''));
let timer = null;
page.querySelector('#admin-nubian-search')?.addEventListener('input', (e) => {
clearTimeout(timer);
const v = e.target.value.trim();
timer = setTimeout(() => { if (v === S.query) return; S.query = v; _loadView(); }, 300);
});
setBackInterceptor(() => {
if (!S || S.page !== page || !page.isConnected) { setBackInterceptor(null); return false; }
if (!S.cat && !S.query) return false;
_backToCategories();
return true;
});
_bindListActions(page.querySelector('#admin-content-list'));
if (S.stats) _paintChrome();
if (kind === 'phrases') await _loadPhraseCats();
else await _loadWordCats();
await _loadView();
}
async function _startRecord(cat) {
_lastSet(cat);
try { sessionStorage.setItem(NUBIAN_INTENT_KEY, JSON.stringify({ kind: S.kind, category: cat || '' })); } catch {   }
const { navigateTo } = await import('../../core/router.js');
navigateTo('admin-nubian-record');
}
export const initAdminNubianWords   = () => _init('words', 'text');
export const initAdminNubianPhrases = () => _init('phrases', 'text');
export const initAdminNubianAudio   = () => _init('words', 'audio');
export const initAdminNubianAudioPhrases = () => _init('phrases', 'audio');
async function _loadWordCats() {
try { S.wordCats = await getNubianWordCategories(); } catch {   }
}
async function _loadPhraseCats() {
try { S.phraseCats = await getNubianPhraseCategories(); } catch { S.phraseCats = S.phraseCats || []; }
}
const _list = () => S?.page?.querySelector('#admin-content-list');
function _scrollToTop() {
S?.page?.querySelector('.admin-content-toolbar')?.scrollIntoView({ block: 'start' });
}
async function _loadView() {
const my = S.gen = ++_GEN;
const list = _list();
if (!list) return;
S.raw = []; S.total = 0;
_syncChrome();
try {
if (!S.query && !S.cat) {
_setNav({});
if (S.stats) _paintCategories(list); else list.innerHTML = _skeletonRows(4);
const stats = await loadStats(S.kind);
if (my !== S.gen) return;
S.stats = _statsMemo[S.kind] = stats;
_paintChrome();
_paintCategories(list);
return;
}
list.innerHTML = _skeletonRows(3);
_setNav(S.query
? { title: 'نتائج البحث…' }
: { title: `${_categoryLabel(S.cat)}` });
const res = await loadPage(S.kind, { ..._view(), offset: 0, limit: PAGE_SIZE });
if (my !== S.gen) return;
S.raw = res.items; S.total = res.total;
_paintItems();
_refreshStatsQuietly(my);
} catch (err) {
if (my !== S.gen) return;
console.error('[AdminNubian] فشل التحميل:', err);
list.innerHTML = errorState({ subject: S.kind === 'words' ? 'الكلمات' : 'الجمل' });
renderIcons(list);
bindErrorRetry(list, () => _loadView());
}
}
async function _reload() {
if (!S) return;
const my = S.gen = ++_GEN;
try {
const stats = await loadStats(S.kind);
if (my !== S.gen) return;
S.stats = _statsMemo[S.kind] = stats;
_paintChrome();
if (!S.query && !S.cat) { _paintCategories(_list()); return; }
const keep = Math.max(S.raw.filter(x => !_isTmp(x)).length, PAGE_SIZE);
const res = await loadPage(S.kind, { ..._view(), offset: 0, limit: Math.min(keep, 200) });
if (my !== S.gen) return;
S.raw = res.items; S.total = res.total;
_paintItems();
} catch (err) {
console.warn('[AdminNubian] تعذّر التحديث الصامت:', err);
}
}
async function _refreshStatsQuietly(gen) {
try {
const stats = await loadStats(S.kind);
if (!S || gen !== S.gen) return;
S.stats = _statsMemo[S.kind] = stats;
_paintChrome();
} catch {   }
}
let _syncTimer = null;
function _syncStatsSoon() {
clearTimeout(_syncTimer);
const s = S;
_syncTimer = setTimeout(async () => {
try {
const stats = await loadStats(s.kind);
if (S !== s) return;
S.stats = _statsMemo[S.kind] = stats;
_paintChrome();
if (!S.query && !S.cat) _paintCategories(_list());
} catch {   }
}, 2500);
}
function _backToCategories() {
S.cat = null;
S.query = '';
S.filter = FILTERS[S.view][0].key;
const box = S.page.querySelector('#admin-nubian-search');
if (box) box.value = '';
S.page.querySelectorAll('#admin-nubian-filters [data-filter]').forEach(b => b.classList.toggle('active', b.dataset.filter === S.filter));
_loadView();
_scrollToTop();
}
function _openCategory(cat) {
_lastSet(cat);
S.cat = cat;
S.query = '';
S.filter = FILTERS[S.view][0].key;
const box = S.page.querySelector('#admin-nubian-search');
if (box) box.value = '';
S.page.querySelectorAll('#admin-nubian-filters [data-filter]').forEach(b => b.classList.toggle('active', b.dataset.filter === S.filter));
_loadView();
_scrollToTop();
}
function _setFilter(key) {
if (S.filter === key) return;
S.filter = key;
S.page.querySelectorAll('#admin-nubian-filters [data-filter]').forEach(b => b.classList.toggle('active', b.dataset.filter === key));
_loadView();
}
function _setNav({ title = '' } = {}) {
const nav = S.page.querySelector('#admin-nubian-nav');
if (!nav) return;
if (!title) { nav.classList.add('hidden'); nav.innerHTML = ''; return; }
nav.classList.remove('hidden');
nav.innerHTML = `
    <span class="nadm-nav__title" id="admin-nubian-nav-title">${escapeHtml(title)}</span>`;
renderIcons(nav);
}
function _syncChrome() {
const inside = Boolean(S?.cat);
S?.page?.querySelector('#admin-nubian-search-wrap')?.classList.toggle('hidden', !inside);
S?.page?.querySelector('#admin-nubian-filters')?.classList.toggle('hidden', !inside);
}
const _setNavTitle = (t) => { const el = S.page.querySelector('#admin-nubian-nav-title'); if (el) el.textContent = t; };
function _paintChrome() {
if (!S?.stats) return;
const sum = (f) => S.stats.reduce((n, r) => n + (r[f] || 0), 0);
const counts = { all: sum('total'), 'no-audio': sum('noAudio'), 'no-translation': sum('noTranslation') };
S.page.querySelectorAll('#admin-nubian-filters [data-count]').forEach(el => {
el.textContent = `(${counts[el.dataset.count] ?? 0})`;
});
const btn = S.page.querySelector('#admin-nubian-record');
if (btn) {
const n = S.cat ? (S.stats.find(r => r.category === S.cat)?.noAudio || 0) : counts['no-audio'];
btn.classList.toggle('hidden', n === 0 || Boolean(S.query));
const label = S.page.querySelector('#admin-nubian-record-label');
if (label) label.textContent = `سجّل الصوت (${n})`;
}
}
function _catCardHtml({ key, icon, title, count, unit, badge, progress, complete, rec }) {
const k = escapeHtml(key);
const bar = progress
? `<progress class="nadm-cat__progress" max="${progress.of}" value="${progress.done}" aria-label="${escapeHtml(progress.text)}"></progress>
       <span class="nadm-cat__progress-text">${escapeHtml(progress.text)}</span>`
: '';
return `
    <div class="nadm-cat-row${complete ? ' nadm-cat-row--done' : ''}">
      <button type="button" class="nadm-cat" data-action="open-nubian-cat" data-cat="${k}">
        <span class="nadm-cat__icon"><i data-lucide="${escapeHtml(icon)}"></i></span>
        <span class="nadm-cat__body">
          <span class="nadm-cat__title">${escapeHtml(title)}</span>
          <span class="nadm-cat__meta">${count} ${unit}${badge ? `<span class="nadm-cat__badge">${escapeHtml(badge)}</span>` : ''}</span>
          ${bar}
        </span>
        <i class="nadm-cat__chev" data-lucide="chevron-left"></i>
      </button>
      ${rec ? `<button type="button" class="nadm-cat__rec" data-action="record-nubian-cat" data-cat="${k}" aria-label="سجّل صوت «${escapeHtml(title)}» — ${rec} تنتظر">
        <i data-lucide="mic"></i><span>${rec}</span>
      </button>` : ''}
    </div>`;
}
function _continueHtml({ d, pending }, audio) {
const meta = pending ? `${pending} ${audio ? 'بلا صوت' : 'بلا ترجمة'}` : '';
return `
    <button type="button" class="nadm-continue" data-action="open-nubian-cat" data-cat="${escapeHtml(d.key)}">
      <span class="nadm-continue__icon"><i data-lucide="folder"></i></span>
      <span class="nadm-continue__text">
        <span class="nadm-continue__label">متابعة من حيث توقفت</span>
        <span class="nadm-continue__title">${escapeHtml(d.title)}${meta ? ` · ${escapeHtml(meta)}` : ''}</span>
      </span>
      <i class="nadm-cat__chev" data-lucide="chevron-left"></i>
    </button>`;
}
function _paintCategories(list) {
if (!list || !S.stats) return;
const by = new Map(S.stats.map(r => [r.category, r]));
const k = KIND[S.kind];
const audio = S.view === 'audio';
let defs;
if (S.kind === 'phrases') {
defs = S.phraseCats.map(c => ({ key: c.key, title: c.title, icon: c.icon || 'message-square' }));
for (const key of by.keys()) if (!defs.some(d => d.key === key)) defs.push({ key, title: key, icon: 'folder' });
} else {
defs = S.wordCats.map(c => ({ key: c.key, title: c.title, icon: c.icon || 'folder' }));
for (const key of by.keys()) if (!defs.some(d => d.key === key)) defs.push({ key, title: key, icon: 'folder' });
}
if (S.kind === 'phrases' && !S.phraseCats.length) {
list.innerHTML = emptyState({ icon: 'message-square', title: 'لسع ما في تصنيفات', desc: audio ? 'أضف التصنيفات والجمل أولًا من صفحة «الجمل».' : 'ابدأ بإضافة تصنيف من زر «التصنيفات» قبل إضافة الجمل.' });
renderIcons();
return;
}
if (!S.stats.length || S.stats.every(r => !r.total)) {
list.innerHTML = audio
? emptyState({ icon: 'mic', title: `ما في ${k.plural} للتسجيل`, desc: `أضف ${k.plural} أولًا من صفحة «${k.listPage}» ثم ارجع هنا لتسجّل صوتها.` })
: emptyState({ icon: k.icon, title: k.emptyTitle, desc: k.emptyDesc });
renderIcons();
return;
}
const entries = defs.map((d, i) => {
const g = by.get(d.key) || {};
const total = g.total || 0;
const pending = audio ? (g.noAudio || 0) : (g.noTranslation || 0);
const of = audio ? total - (g.noTranslation || 0) : total;
return {
d, i, total, pending, of, done: Math.max(0, of - pending),
noAudio: g.noAudio || 0,
complete: total > 0 && pending === 0 && (audio || !(g.noAudio || 0)),
rank: (pending > 0 || (!audio && (g.noAudio || 0) > 0)) ? 0 : (total === 0 ? 1 : 2),
};
});
entries.sort((a, b) => a.rank - b.rank || a.i - b.i);
const pendingLabel = audio ? 'بلا صوت' : 'بلا ترجمة';
const cards = entries.map(e => _catCardHtml({
...e.d, count: e.total, unit: k.unit,
badge: e.complete ? '✓ مكتمل'
: audio ? (e.pending ? `${e.pending} ${pendingLabel}` : '')
: [e.pending ? `${e.pending} ${pendingLabel}` : '', e.noAudio ? `${e.noAudio} بلا صوت` : ''].filter(Boolean).join(' · '),
complete: e.complete,
progress: e.of > 0 && (audio || e.pending > 0)
? { of: e.of, done: e.done, text: `${e.done} من ${e.of} ${audio ? 'بصوت' : 'مترجمة'}` }
: null,
rec: e.noAudio,
}));
const lastKey = _lastGet();
const last = lastKey ? entries.find(e => e.d.key === lastKey) : null;
const cont = last && (!audio || last.pending > 0) ? _continueHtml(last, audio) : '';
list.innerHTML = cont + cards.join('');
renderIcons(list);
}
function _viewItems() {
const k = KIND[S.kind];
const merged = applyPending(k.section, S.raw);
return merged.filter(it => {
const pendingAdd = it._pending && String(it.id).startsWith('tmp_');
return !pendingAdd || matchesView(it, _view());
});
}
function _paintItems() {
const list = _list();
if (!list) return;
const k = KIND[S.kind];
const items = _viewItems();
const serverCount = S.raw.filter(x => !_isTmp(x)).length;
const left = Math.max(0, S.total - serverCount);
_setNavTitle(S.query ? `نتائج البحث (${S.total})` : `${_categoryLabel(S.cat)} (${S.total})`);
if (!items.length) {
list.innerHTML = S.query
? emptyState({ icon: 'search', title: 'ما في نتائج مطابقة', desc: 'جرّب كلمة تانية أو غيّر التصفية.' })
: emptyState({
icon: S.filter === 'no-audio' ? 'mic' : 'check',
title: S.filter === 'no-audio' ? 'كلها ليها صوت 👏' : `ما في ${k.plural} هنا`,
desc: S.filter === 'no-audio' ? 'ما في شيء ينتظر تسجيل.' : S.view === 'audio' ? 'جرّب فلتر «الكل».' : `جرّب فلتر «الكل» أو أضف ${k.unit}.`,
});
renderIcons();
return;
}
const catMap = new Map((S.kind === 'phrases' ? S.phraseCats : S.wordCats).map(c => [c.key, c.title]));
const rowFn = S.view === 'audio'
? (it) => _renderAudioRow(it, catMap)
: S.kind === 'words' ? _renderWordRow : (it) => _renderPhraseRow(it, catMap);
list.innerHTML = items.map(rowFn).join('') + (left > 0
? `<button type="button" class="btn btn--secondary nadm-show-more" data-action="nubian-more">عرض المزيد (${left})</button>` : '');
renderIcons(list);
}
async function _showMore(btn) {
const my = S.gen;
btn.disabled = true;
btn.textContent = 'قاعدين نحمّل...';
try {
const offset = S.raw.filter(x => !_isTmp(x)).length;
const res = await loadPage(S.kind, { ..._view(), offset, limit: PAGE_SIZE });
if (my !== S.gen) return;
const have = new Set(S.raw.map(x => String(x.id)));
S.raw = S.raw.concat(res.items.filter(x => !have.has(String(x.id))));
S.total = res.total;
_paintItems();
} catch (err) {
console.error('[AdminNubian] فشل عرض المزيد:', err);
btn.disabled = false;
btn.textContent = 'تعذّر التحميل — اضغط للمحاولة مرة أخرى';
}
}
function _applyStatDelta(oldItem, newItem) {
if (!S.stats) return;
for (const d of statDelta(oldItem, newItem)) {
let row = S.stats.find(r => r.category === d.category);
if (!row) { row = { category: d.category, total: 0, noAudio: 0, noTranslation: 0 }; S.stats.push(row); }
row.total += d.total; row.noAudio += d.noAudio; row.noTranslation += d.noTranslation;
}
_statsMemo[S.kind] = S.stats;
_paintChrome();
}
function _onSaved(info) {
if (!S || !info) { _reload(); return; }
const { op, item, staged } = info;
if (op === 'edit') {
const i = S.raw.findIndex(x => String(x.id) === String(info.id));
const old = i >= 0 ? S.raw[i] : null;
if (!staged) _applyStatDelta(old, item);
if (i >= 0) {
if (matchesView(item, _view())) S.raw[i] = item;
else { S.raw.splice(i, 1); S.total = Math.max(0, S.total - 1); }
}
if (!S.query && !S.cat) _paintCategories(_list()); else _paintItems();
if (!staged) _syncStatsSoon();
return;
}
if (!staged) {
_applyStatDelta(null, item);
if (matchesView(item, _view()) && (S.cat || S.query)) {
S.raw.unshift({ ...item, _tmp: true });
S.total++;
_paintItems();
} else if (!S.cat && !S.query) {
_paintCategories(_list());
}
} else if (S.cat || S.query) {
_paintItems();
}
_reload();
}
function _bindListActions(list) {
if (!list) return;
list.onclick = async (e) => {
const btn = e.target.closest('[data-action]');
if (!btn || !list.contains(btn) || !S) return;
const action = btn.dataset.action;
const k = KIND[S.kind];
if (action === 'open-nubian-cat') { _openCategory(btn.dataset.cat); return; }
if (action === 'record-nubian-cat') { _startRecord(btn.dataset.cat); return; }
if (action === 'nubian-more') { _showMore(btn); return; }
if (action === 'audio-nubian') {
const item = S.raw.find(x => String(x.id) === btn.dataset.id);
if (!item || _isTmp(item)) return;
openAudioModal(item, S.kind, _onSaved);
return;
}
if (action === k.editAction) {
const item = S.raw.find(x => String(x.id) === btn.dataset.id);
if (!item || _isTmp(item)) return;
if (S.kind === 'words') openWordComposeModal(item, _onSaved, { categories: S.wordCats });
else openPhraseComposeModal(item, _onSaved, S.phraseCats);
return;
}
if (action === k.delAction) {
if (!await confirmDelete({ what: k.noun, name: rowTitle(btn) })) return;
const id = btn.dataset.id;
const old = S.raw.find(x => String(x.id) === String(id)) || null;
const stagedDel = await stageDelete(k.section, id, { label: btn.dataset.title || String(id) });
showToast(stagedDel ? stagedMsg('delete') : `اتمسحت ${k.noun}`, 'success');
if (!stagedDel) {
logAdminAction(k.delLog, btn.dataset.title || String(id));
_applyStatDelta(old, null);
S.raw = S.raw.filter(x => String(x.id) !== String(id));
S.total = Math.max(0, S.total - 1);
_syncStatsSoon();
}
_paintItems();
}
};
}
function _audioBits(item) {
const hasTr = _hasTranslation(item);
const hasAu = _hasAudio(item);
const id = escapeHtml(String(item.id));
return {
badge: !hasTr ? '<span class="badge badge--default">بدون ترجمة</span>'
: hasAu ? '<span class="badge badge--brand">🔊 بصوت</span>'
: '<span class="badge badge--warning">بلا صوت</span>',
btn: hasTr
? `<button class="btn btn--sm ${hasAu ? 'btn--ghost' : 'btn--primary'} admin-action-btn" data-action="audio-nubian" data-id="${id}">
          <i data-lucide="${hasAu ? 'refresh-cw' : 'mic'}"></i><span>${hasAu ? 'تغيير الصوت' : 'سجّل الصوت'}</span>
        </button>`
: '',
};
}
function _renderWordRow(item) {
const tmp = _isTmp(item);
const au = _audioBits(item);
const status = tmp ? '<span class="badge badge--default">جارٍ الحفظ…</span>' : au.badge;
return `
    <div class="admin-content-row">
      <div class="admin-content-preview">
        <div class="admin-content-preview__thumb">
          <i data-lucide="languages"></i>
        </div>
        <div class="admin-content-preview__body">
          <div class="admin-content-preview__head">
            <h4 class="admin-content-preview__title">${escapeHtml(item.ar || 'كلمة')}</h4>
            ${status}
          </div>
          <span class="admin-content-preview__meta">${escapeHtml(_categoryLabel(item.category))}${item.nub ? ' · ' + escapeHtml(item.nub) : ''}</span>
        </div>
      </div>
      ${tmp ? '' : `<div class="admin-content-row__actions">
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="edit-nubian" data-id="${escapeHtml(String(item.id))}">
          <i data-lucide="pencil"></i><span>تعديل</span>
        </button>
        ${au.btn}
        ${canHardDelete() ? `<button class="btn btn--sm btn--danger admin-action-btn" data-action="delete-nubian" data-id="${escapeHtml(String(item.id))}" data-title="${escapeHtml(item.ar || '')}">
          <i data-lucide="trash-2"></i><span>حذف</span>
        </button>` : ''}
      </div>`}
    </div>
  `;
}
function _renderAudioRow(item, catMap) {
const hasTr = _hasTranslation(item);
const hasAu = _hasAudio(item);
const tmp = _isTmp(item);
const status = tmp
? '<span class="badge badge--default">جارٍ الحفظ…</span>'
: !hasTr
? '<span class="badge badge--default">بدون ترجمة</span>'
: hasAu
? '<span class="badge badge--brand">🔊 بصوت</span>'
: '<span class="badge badge--warning">بلا صوت</span>';
const id = escapeHtml(String(item.id));
const action = !tmp && hasTr
? `<div class="admin-content-row__actions">
        <button class="btn btn--sm ${hasAu ? 'btn--ghost' : 'btn--primary'} admin-action-btn" data-action="audio-nubian" data-id="${id}">
          <i data-lucide="${hasAu ? 'refresh-cw' : 'mic'}"></i><span>${hasAu ? 'تغيير الصوت' : 'سجّل الصوت'}</span>
        </button>
      </div>`
: '';
const label = escapeHtml(catMap.get(item.category) || item.category);
return `
    <div class="admin-content-row">
      <div class="admin-content-preview">
        <div class="admin-content-preview__thumb">
          <i data-lucide="${hasAu ? 'volume-2' : 'mic'}"></i>
        </div>
        <div class="admin-content-preview__body">
          <div class="admin-content-preview__head">
            <h4 class="admin-content-preview__title">${escapeHtml(item.ar || '')}</h4>
            ${status}
          </div>
          <span class="admin-content-preview__meta">${label}${item.nub ? ' · ' + escapeHtml(item.nub) : ''}</span>
        </div>
      </div>
      ${action}
    </div>
  `;
}
function _renderPhraseRow(item, catMap) {
const tmp = _isTmp(item);
const au = _audioBits(item);
return `
    <div class="admin-content-row">
      <div class="admin-content-preview">
        <div class="admin-content-preview__thumb">
          <i data-lucide="message-square"></i>
        </div>
        <div class="admin-content-preview__body">
          <div class="admin-content-preview__head">
            <h4 class="admin-content-preview__title">${escapeHtml(item.ar || 'جملة')}</h4>
            ${tmp ? '<span class="badge badge--default">جارٍ الحفظ…</span>' : au.badge}
          </div>
          <span class="admin-content-preview__meta">${escapeHtml(catMap.get(item.category) || item.category)}${item.nub ? ' · ' + escapeHtml(item.nub) : ''}</span>
        </div>
      </div>
      ${tmp ? '' : `<div class="admin-content-row__actions">
        <button class="btn btn--sm btn--ghost admin-action-btn" data-action="edit-nubian-phrase" data-id="${escapeHtml(String(item.id))}">
          <i data-lucide="pencil"></i><span>تعديل</span>
        </button>
        ${au.btn}
        ${canHardDelete() ? `<button class="btn btn--sm btn--danger admin-action-btn" data-action="delete-nubian-phrase" data-id="${escapeHtml(String(item.id))}" data-title="${escapeHtml(item.ar || '')}">
          <i data-lucide="trash-2"></i><span>حذف</span>
        </button>` : ''}
      </div>`}
    </div>
  `;
}
export { closeComposeModal };
