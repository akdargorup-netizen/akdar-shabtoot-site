import { getProjects }                     from '../data/db.js';
import { PROJECT_STATUSES, PROJECT_STATUS_ICON } from '../data/projects-data.js';
import { emptyState, syncFilterEmpty }     from '../shared/empty-state.js';
import { errorState, bindErrorRetry }      from '../shared/error-state.js';
import { escapeHtml }                      from '../shared/sanitize.js';
import { thumbImgAttrs }                   from '../shared/image-thumb.js';
import { renderIcons } from '../shared/icons.js';
let _projects = [];
function statusLabel(key) {
return PROJECT_STATUSES.find(s => s.key === key)?.label || key;
}
const STATUS_ICON = PROJECT_STATUS_ICON;
function renderProjectCard(p, index) {
const title    = escapeHtml(p.title);
const icon     = STATUS_ICON[p.status] || 'flag';
const stagger  = Math.min(index + 1, 5);
const breathe  = p.status === 'active' ? ' animate-breathe' : '';
const statusBadge = `
    <span class="project-status ${p.status}${breathe}">
      <i data-lucide="${icon}"></i>
      ${escapeHtml(statusLabel(p.status))}
    </span>
  `;
return `
    <article class="project-card animate-fade-up animate-stagger-${stagger}" data-status="${p.status}" data-project-id="${p.id}">
      ${p.image ? `
        <div class="project-image">
          <img ${thumbImgAttrs(p.image)} alt="${title}" loading="lazy" />
          ${statusBadge}
        </div>
      ` : `
        <div class="project-image project-image--empty">
          <i class="project-image__placeholder-icon" data-lucide="image" aria-hidden="true"></i>
          ${statusBadge}
        </div>
      `}
      <div class="project-content">
        <h3 class="project-title">${title}</h3>
        <div class="project-progress">
          <div class="progress-info">
            <span class="progress-label">وصلنا</span>
            <span class="progress-value">${p.progress}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${p.progress}%;"></div>
          </div>
        </div>
        <button class="project-card__cta" data-project-id="${p.id}">
          قراءة التفاصيل
          <i data-lucide="arrow-left" aria-hidden="true"></i>
        </button>
      </div>
    </article>
  `;
}
function renderFilters() {
const chips = [
`<button class="filter-btn active" data-filter="all">الكل</button>`,
...PROJECT_STATUSES.map(s => `
      <button class="filter-btn" data-filter="${s.key}">${escapeHtml(s.label)}</button>
    `),
];
return `<section class="project-filters">${chips.join('')}</section>`;
}
export function renderDevelopmentProjects() {
return `
    <section class="page development-projects-page">

      <!-- Intro -->
      <div class="page-intro">
        <p>
          تابع مشاريع البلد والمبادرات العاملة على تطوير شبتوت وتحسين حياة أهلها.
        </p>
      </div>

      <!-- دعوة "اقتراح أفكار ومشاريع" — شريط رفيع، مش بطاقة تنقّل كاملة
           (راجع تعليق project-idea-banner في projects.css للسبب) -->
      <div class="project-idea-banner" data-page="idea-box">
        <span class="project-idea-banner__icon" aria-hidden="true"><i data-lucide="lightbulb"></i></span>
        <p class="project-idea-banner__text">عندك فكرة تفيد البلد؟ <strong>شاركنا بيها</strong></p>
        <span class="project-idea-banner__arrow" aria-hidden="true"><i data-lucide="chevron-left"></i></span>
      </div>

      <!-- Projects Feed (تُملأ بعد التحميل — راجع _loadProjects) -->
      <section class="projects-feed" id="projects-feed">
        <div class="project-card project-card--skeleton"><div class="skeleton-line skeleton-line--lg"></div><div class="skeleton-line"></div></div>
        <div class="project-card project-card--skeleton"><div class="skeleton-line skeleton-line--lg"></div><div class="skeleton-line"></div></div>
      </section>

      <!-- إخلاء مسؤولية عام — نسخة مختصرة هنا، والنسخة التفصيلية عند
           أي مبلغ مالي فعلي داخل صفحة تفاصيل المشروع نفسها. كانت هذي
           الفقرة في فهرس "مشاريعنا" (projects.js) قبل ما يتشال، فنقلناها
           هنا لأنها أقرب مكان لمحتوى المشاريع الفعلي. -->
      <p class="projects-disclaimer">
        <i data-lucide="info"></i>
        أخضر شبتوت بحري يسهّل عليك المتابعة والمساهمة، وينقل المعلومة كما وصلته من الجهة المسؤولة — ما جهة تنفيذ أو تدقيق مالي.
      </p>

    </section>
  `;
}
export async function initDevelopmentProjects() {
const page = document.querySelector('.development-projects-page');
if (!page) return;
await _loadProjects(page);
}
async function _loadProjects(page) {
const feed = page.querySelector('#projects-feed');
if (!feed) return;
try {
_projects = await getProjects();
const hasItems = _projects.length > 0;
const filtersEl = page.querySelector('.project-filters');
filtersEl?.remove();
if (hasItems) {
feed.insertAdjacentHTML('beforebegin', renderFilters());
}
feed.innerHTML = hasItems
? _projects.map((p, i) => renderProjectCard(p, i)).join('')
: emptyState({
icon:  'hammer',
title: 'لسع ما في مشاريع',
desc:  'أول ما تتضاف مشاريع حتظهر هنا.',
});
renderIcons(page);
_bindCards(feed);
_bindFilters(page, feed);
} catch (err) {
console.error('[DevelopmentProjects] فشل تحميل المشاريع:', err);
feed.innerHTML = errorState({ subject: 'المشاريع' });
renderIcons(feed);
bindErrorRetry(feed, () => _loadProjects(page));
}
}
function _bindCards(feed) {
feed.querySelectorAll('.project-card[data-project-id]').forEach(card => {
card.addEventListener('click', async () => {
const project = _projects.find(p => String(p.id) === card.dataset.projectId);
if (!project) return;
const { openProjectDetail } = await import('./project-detail.js');
openProjectDetail(project);
});
});
}
function _bindFilters(page, feed) {
const btns = page.querySelectorAll('.filter-btn[data-filter]');
if (!btns.length) return;
btns.forEach(btn => {
btn.addEventListener('click', () => {
btns.forEach(b => b.classList.remove('active'));
btn.classList.add('active');
const filter = btn.dataset.filter;
feed.querySelectorAll('.project-card[data-status]').forEach(card => {
card.style.display = (filter === 'all' || card.dataset.status === filter) ? '' : 'none';
});
if (syncFilterEmpty(feed, '.project-card[data-status]', {
icon: 'hammer',
title: 'ما في مشاريع بالحالة دي',
desc: 'جرّب حالة تانية أو اختر "الكل".',
})) renderIcons();
});
});
}
