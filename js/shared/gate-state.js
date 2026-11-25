const LS_KEY = 'akdar:section-gates:v1';
const NUBIAN_CATS = [
'nubian-greetings', 'nubian-pronouns', 'nubian-family', 'nubian-time', 'nubian-numbers', 'nubian-body',
'nubian-verbs', 'nubian-adjectives', 'nubian-home', 'nubian-farming', 'nubian-animals', 'nubian-place',
'nubian-directions', 'nubian-demonstratives', 'nubian-colors', 'nubian-weather', 'nubian-diseases',
];
export const GATEABLE_SECTIONS = [
{ key: 'nubian-words',   group: 'آنداندي', title: 'قاموس الكلمات', pages: ['nubian-words', ...NUBIAN_CATS] },
{ key: 'nubian-phrases', group: 'آنداندي', title: 'تعلم الكلام',   pages: ['nubian-phrases'], defaultClosed: true },
{ key: 'nubian-game',    group: 'آنداندي', title: 'لعبة آنداندي',  pages: ['nubian-game'] },
{ key: 'history-articles', group: 'التاريخ والذاكرة', title: 'مقالاتنا',      pages: ['history-articles'] },
{ key: 'memory-gallery',   group: 'التاريخ والذاكرة', title: 'هنا صورنا',     pages: ['memory-gallery'] },
{ key: 'did-you-know',     group: 'التاريخ والذاكرة', title: 'كنت عارف دي؟',  pages: ['did-you-know'] },
{ key: 'news',                group: 'المجتمع', title: 'الأخبار',        pages: ['news'] },
{ key: 'events',              group: 'المجتمع', title: 'الفعاليات',      pages: ['events'] },
{ key: 'community-occasions', group: 'المجتمع', title: 'بيت المناسبات',  pages: ['community-occasions', 'occasion-detail'] },
{ key: 'idea-box',            group: 'المجتمع', title: 'مصنع الأفكار',   pages: ['idea-box', 'idea-box-detail'] },
{ key: 'green-generation',    group: 'المجتمع', title: 'الجيل الأخضر',   pages: ['green-generation'] },
{ key: 'development-projects', group: 'الخدمات', title: 'متابعة المشاريع', pages: ['development-projects', 'project-detail'] },
{ key: 'contact-directory',    group: 'الخدمات', title: 'دليل البلد',       pages: ['contact-directory', 'contact-category'] },
{ key: 'emergency-health',     group: 'الخدمات', title: 'الطوارئ الصحية',   pages: ['emergency-health'] },
{ key: 'student-services',     group: 'الخدمات', title: 'خدمات الطلاب',     pages: ['student-services', 'student-videos-intermediate', 'student-videos-secondary'] },
{ key: 'worship-quran',    group: 'العبادة', title: 'القرآن الكريم',     pages: ['worship-quran', 'worship-quran-surah'] },
{ key: 'worship-tasbih',   group: 'العبادة', title: 'المسبحة',           pages: ['worship-tasbih'] },
{ key: 'worship-hisn',     group: 'العبادة', title: 'حصن المسلم',        pages: ['worship-hisn'] },
{ key: 'worship-hadith',   group: 'العبادة', title: 'الحديث الشريف',     pages: ['worship-hadith'] },
{ key: 'worship-lectures', group: 'العبادة', title: 'المحاضرات الدينية', pages: ['worship-lectures'] },
{ key: 'association-about',       group: 'الرابطة', title: 'عن الرابطة',    pages: ['association-about'] },
{ key: 'association-journey',     group: 'الرابطة', title: 'مسيرة الرابطة', pages: ['association-journey'] },
{ key: 'association-regulations', group: 'الرابطة', title: 'الدستور واللوائح', pages: ['association-regulations'] },
{ key: 'association-join',        group: 'الرابطة', title: 'الانضمام للرابطة', pages: ['association-join'] },
{ key: 'tanjalab', group: 'الألعاب والمساعد', title: 'تحدي التنجلاب',  pages: ['tanjalab'] },
{ key: 'ai',       group: 'الألعاب والمساعد', title: 'المساعد الذكي', pages: ['ai'] },
];
const _byPage = new Map();
for (const s of GATEABLE_SECTIONS) for (const p of s.pages) _byPage.set(p, s);
let _states = {};
try {
const raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
if (raw && typeof raw === 'object' && raw.states && typeof raw.states === 'object') _states = raw.states;
} catch {   }
export function isSectionClosed(key) {
const s = GATEABLE_SECTIONS.find(x => x.key === key);
if (!s) return false;
const v = _states[key];
return v === 'closed' ? true : v === 'open' ? false : Boolean(s.defaultClosed);
}
export function isPageClosed(page) {
const s = _byPage.get(page);
return s ? isSectionClosed(s.key) : false;
}
export function applyGateStates(states) {
_states = states && typeof states === 'object' ? { ...states } : {};
try { localStorage.setItem(LS_KEY, JSON.stringify({ states: _states, at: Date.now() })); } catch {   }
try { markClosedCards(document); } catch {   }
}
export function getGateStates() { return { ..._states }; }
const TAG_TEXT = 'قريبًا · جاري الإعداد';
const TAG_HTML = `<span class="gate-soon">${TAG_TEXT}</span>`;
export function markClosedCards(root = document) {
if (!root?.querySelectorAll) return;
root.querySelectorAll('[data-page]').forEach(el => {
if (el.closest('.admin-panel-page, .admin-page')) return;
const closed = isPageClosed(el.dataset.page);
const marked = el.classList.contains('is-gated');
if (closed && !marked) {
el.classList.add('is-gated');
el.setAttribute('aria-disabled', 'true');
if (!el.closest('#app-bottom-nav')) {
const host = el.querySelector('[class*="__body"]');
const desc = host?.querySelector('[class*="__desc"]');
if (desc) {
if (!el.dataset.gateDesc) el.dataset.gateDesc = desc.textContent;
desc.textContent = TAG_TEXT;
desc.classList.add('gate-soon-desc');
} else if (host && !host.querySelector('.gate-soon')) {
host.insertAdjacentHTML('beforeend', TAG_HTML);
}
}
} else if (!closed && marked) {
el.classList.remove('is-gated');
el.removeAttribute('aria-disabled');
el.querySelectorAll('.gate-soon').forEach(n => n.remove());
const d = el.querySelector('.gate-soon-desc');
if (d) { d.textContent = el.dataset.gateDesc || ''; d.classList.remove('gate-soon-desc'); }
delete el.dataset.gateDesc;
}
});
}
export function renderClosedSection(page) {
const s = _byPage.get(page);
const title = s ? s.title : 'هذا القسم';
return `
    <section class="page uc-page">
      <div class="uc-card" role="status">
        <div class="uc-card__icon" data-icon="hammer"></div>
        <h2 class="uc-card__title">${title}</h2>
        <p class="uc-card__desc">قريبًا — جاري الإعداد. نشتغل عليه ونرجّعه ليكم بإذن الله.</p>
        <span class="uc-card__tag"><i data-icon="hammer"></i> جاري الإعداد</span>
      </div>
    </section>
  `;
}
