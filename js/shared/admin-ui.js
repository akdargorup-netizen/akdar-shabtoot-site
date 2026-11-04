import { getAdminRole } from '../data/admin-auth.js';
import { openConfirm } from './confirm-modal.js';
import { escapeHtml } from './sanitize.js';
import { renderIcons } from './icons.js';
export function canHardDelete() {
return getAdminRole() === 'developer';
}
export function rowTitle(el) {
const row = el?.closest?.('.admin-content-row, .settings-item, .admin-gallery-tile');
const title = row?.querySelector('h4, [class*="__title"]')?.textContent?.trim();
return title || '';
}
export function confirmDelete({ what, name = '', note = '' } = {}) {
const target = name ? `${escapeHtml(what)} «${escapeHtml(name)}»` : escapeHtml(what);
return openConfirm({
title: `حذف ${escapeHtml(what)} نهائياً؟`,
message: `${target} حيتحذف ولا يمكن استرجاعه.${note ? ' ' + escapeHtml(note) : ''}`,
confirmLabel: 'احذف نهائياً',
cancelLabel: 'تراجع',
danger: true,
icon: 'trash-2',
});
}
export function confirmPurge({ what } = {}) {
return openConfirm({
title: `حذف ${escapeHtml(what)} نهائياً؟`,
message: `كل ${escapeHtml(what)} حتتحذف وما بتقدر ترجّعها.`,
confirmLabel: 'امسح الكل نهائياً',
cancelLabel: 'تراجع',
danger: true,
icon: 'trash-2',
});
}
export function confirmAction({ title, message, confirmLabel = 'موافق', danger = false, icon } = {}) {
return openConfirm({
title: escapeHtml(title),
message: escapeHtml(message).replace(/\n/g, '<br>'),
confirmLabel,
cancelLabel: 'تراجع',
danger,
icon: icon || (danger ? 'alert-triangle' : 'help-circle'),
});
}
const SEARCH_MIN_ROWS = 6;
const HELP_CLAMP_CHARS = 130;
function _norm(text) {
return String(text || '')
.toLowerCase()
.replace(/[\u064B-\u065F\u0670\u0640]/g, '')
.replace(/[أإآٱ]/g, 'ا')
.replace(/ى/g, 'ي')
.replace(/ة/g, 'ه')
.replace(/\s+/g, ' ')
.trim();
}
function _clampHelp(page) {
const p = page.querySelector('.admin-content-toolbar > p');
if (!p || p.textContent.trim().length <= HELP_CLAMP_CHARS) return;
p.classList.add('admin-help-clamped');
const toggle = document.createElement('button');
toggle.type = 'button';
toggle.className = 'admin-help-toggle';
toggle.textContent = 'اقرأ المزيد';
toggle.setAttribute('aria-expanded', 'false');
toggle.addEventListener('click', () => {
const open = p.classList.toggle('admin-help-clamped') === false;
toggle.textContent = open ? 'إخفاء' : 'اقرأ المزيد';
toggle.setAttribute('aria-expanded', String(open));
});
p.after(toggle);
}
function _attachSearch(page) {
const list = page.querySelector('.admin-content-list');
if (!list || page.querySelector('.admin-list-search')) return;
const wrap = document.createElement('div');
wrap.className = 'admin-list-search hidden';
wrap.innerHTML = `
    <div class="search-bar">
      <span class="search-bar__icon" data-icon="search"></span>
      <input type="search" class="search-bar__input" placeholder="ابحث في القائمة..." aria-label="ابحث في القائمة" autocomplete="off">
    </div>
    <p class="admin-list-search__empty hidden">ما في نتائج مطابقة.</p>
  `;
list.before(wrap);
renderIcons(wrap);
const input = wrap.querySelector('input');
const empty = wrap.querySelector('.admin-list-search__empty');
const rowsOf = () => [...list.querySelectorAll(':scope > .admin-content-row')];
const apply = () => {
const q = _norm(input.value);
const rows = rowsOf();
wrap.classList.toggle('hidden', rows.length < SEARCH_MIN_ROWS && !q);
let shown = 0;
for (const row of rows) {
const match = !q || _norm(row.textContent).includes(q);
row.classList.toggle('admin-row-filtered', !match);
if (match) shown++;
}
empty.classList.toggle('hidden', !(q && rows.length && shown === 0));
};
input.addEventListener('input', apply);
new MutationObserver(apply).observe(list, { childList: true });
apply();
}
export function enhanceAdminPage(page, { search = true } = {}) {
if (!page) return;
_clampHelp(page);
if (search) _attachSearch(page);
}
