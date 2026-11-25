import { showToast } from '../../shared/toast.js';
import { renderIcons } from '../../shared/icons.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { GATEABLE_SECTIONS, isSectionClosed } from '../../shared/gate-state.js';
function _row(s) {
const open = !isSectionClosed(s.key);
return `
    <div class="settings-item" style="cursor:default" data-gate-row="${escapeHtml(s.key)}">
      <div class="settings-content">
        <h4>${escapeHtml(s.title)}</h4>
        <p class="gate-row__state">${open ? 'مفتوح للجميع' : 'مقفول — «قريبًا · جاري الإعداد»'}</p>
      </div>
      <div class="toggle ${open ? 'toggle--on' : ''}" role="switch" tabindex="0" aria-checked="${open}" aria-label="${escapeHtml(s.title)}" data-gate-key="${escapeHtml(s.key)}">
        <div class="toggle__track"></div>
        <div class="toggle__thumb"></div>
      </div>
    </div>`;
}
function _groupsHtml() {
const groups = [...new Set(GATEABLE_SECTIONS.map(s => s.group))];
return groups.map(g => `
    <div class="admin-group">
      <div class="admin-group__label-row"><span class="admin-group__label">${escapeHtml(g)}</span></div>
      <div class="settings-list">${GATEABLE_SECTIONS.filter(s => s.group === g).map(_row).join('')}</div>
    </div>`).join('');
}
export function renderAdminSections() {
return `
    <section class="page admin-sections-page">
      <p class="admin-section-note">
        سويتش لكل قسم: لو قسم فيه مشكلة أو يحتاج تطوير، اقفله فتظهر بطاقته باهتة بعبارة «قريبًا · جاري الإعداد»
        ولا يقدر المستخدمون يفتحونه، وأنت (من لوحة الإدارة) تقدر تدخله وتجرّبه. افتحه متى ما جهز.
        التغيير يصل الأجهزة خلال دقائق من فتح التطبيق.
      </p>
      <div id="admin-sections-groups">${_groupsHtml()}</div>
    </section>`;
}
export async function initAdminSections() {
const page = document.querySelector('.admin-sections-page');
if (!page) return;
renderIcons(page);
try {
const { loadSectionStatesForAdmin } = await import('../../data/section-gates.js');
await loadSectionStatesForAdmin();
const box = page.querySelector('#admin-sections-groups');
if (box?.isConnected) box.innerHTML = _groupsHtml();
} catch {   }
const busy = new Set();
const flip = async (tg) => {
const key = tg.dataset.gateKey;
if (!key || busy.has(key)) return;
busy.add(key);
const wasOpen = tg.classList.contains('toggle--on');
const row = tg.closest('[data-gate-row]');
const setUi = (open) => {
tg.classList.toggle('toggle--on', open);
tg.setAttribute('aria-checked', String(open));
const st = row?.querySelector('.gate-row__state');
if (st) st.textContent = open ? 'مفتوح للجميع' : 'مقفول — «قريبًا · جاري الإعداد»';
};
setUi(!wasOpen);
try {
const { setSectionClosed } = await import('../../data/section-gates.js');
await setSectionClosed(key, wasOpen);
const title = GATEABLE_SECTIONS.find(s => s.key === key)?.title || key;
logAdminAction(wasOpen ? 'قفل قسم' : 'فتح قسم', title);
showToast(wasOpen ? `اتقفل «${title}» — يظهر «قريبًا»` : `اتفتح «${title}»`, 'success');
} catch (err) {
console.error('[AdminSections]', err);
setUi(wasOpen);
showToast('ما اتحفظ التغيير — تأكد من النت وجرّب تاني', 'error');
} finally {
busy.delete(key);
}
};
page.addEventListener('click', (e) => {
const tg = e.target.closest('[data-gate-key]');
if (tg) flip(tg);
});
page.addEventListener('keydown', (e) => {
if (e.key !== 'Enter' && e.key !== ' ') return;
const tg = e.target.closest?.('[data-gate-key]');
if (tg) { e.preventDefault(); flip(tg); }
});
}
