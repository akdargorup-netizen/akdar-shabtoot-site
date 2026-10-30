import { navigateTo } from '../core/router.js';
import { PROJECT_STATUSES, PROJECT_STATUS_ICON } from '../data/projects-data.js';
import { emptyState } from '../shared/empty-state.js';
import { escapeHtml } from '../shared/sanitize.js';
import { showToast } from '../shared/toast.js';
let _currentProject = null;
export function openProjectDetail(project) {
_currentProject = project;
window.__projectDetailModule = { project };
navigateTo('project-detail');
}
function statusLabel(key) {
return PROJECT_STATUSES.find(s => s.key === key)?.label || key;
}
function formatAmount(n, currency) {
return `${n.toLocaleString('ar-EG')} ${escapeHtml(currency)}`;
}
function renderFinanceSection(finance) {
if (!finance) {
return emptyState({
icon:  'wallet',
title: 'لسع ما بدأ جمع التبرعات للمشروع دا',
desc:  'حنعرض التفاصيل المالية أول ما يبدأ جمع التبرعات فعليًا.',
});
}
const percent   = finance.goalAmount > 0
? Math.min(100, Math.round((finance.raisedAmount / finance.goalAmount) * 100))
: 0;
const remaining = Math.max(0, finance.goalAmount - finance.raisedAmount);
return `
    <div class="project-finance">
      <p class="project-finance__notice">
        <i data-lucide="info"></i>
        <span>
          الأرقام دي كما وصلتنا من <strong>${escapeHtml(finance.sourceLabel)}</strong> —
          أخضر شبتوت بحري ينقلها بس، ما جهة تنفيذ أو تدقيق مالي.
        </span>
      </p>

      <div class="project-finance__amounts">
        <div class="project-finance__amount">
          <span class="project-finance__amount-label">اتجمع</span>
          <span class="project-finance__amount-value">${formatAmount(finance.raisedAmount, finance.currency)}</span>
        </div>
        <div class="project-finance__amount project-finance__amount--goal">
          <span class="project-finance__amount-label">المطلوب</span>
          <span class="project-finance__amount-value">${formatAmount(finance.goalAmount, finance.currency)}</span>
        </div>
      </div>

      <div class="progress-bar project-finance__bar">
        <div class="progress-fill" style="width: ${percent}%;"></div>
      </div>
      <p class="project-finance__remaining">متبقي ${formatAmount(remaining, finance.currency)}</p>

      ${renderExpensesSection(finance)}
      ${renderNeededMaterialsSection(finance.neededMaterials)}

      <div class="project-finance__meta">
        <span class="project-finance__updated">
          <i data-lucide="calendar"></i>
          آخر تحديث: ${escapeHtml(finance.lastUpdated)}
        </span>
        <button class="project-finance__report" data-action="report-error">
          <i data-lucide="flag"></i>
          في رقم غلط؟ بلّغنا
        </button>
      </div>
    </div>
  `;
}
function renderExpensesSection(finance) {
if (!finance.expenses?.length) return '';
const total = finance.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
return `
    <div class="project-finance__expenses">
      <h3 class="project-finance__subheading">
        <i data-lucide="receipt"></i>
        ماذا صرفنا؟
      </h3>
      <ul class="project-finance__expenses-list">
        ${finance.expenses.map(e => `
          <li class="project-finance__expense-row">
            <span class="project-finance__expense-desc">${escapeHtml(e.description)}</span>
            ${e.amount > 0 ? `<span class="project-finance__expense-amount">${formatAmount(e.amount, finance.currency)}</span>` : ''}
          </li>
        `).join('')}
      </ul>
      ${total > 0 ? `<p class="project-finance__expenses-total">إجمالي المصروفات: ${formatAmount(total, finance.currency)}</p>` : ''}
    </div>
  `;
}
function renderNeededMaterialsSection(neededMaterials) {
if (!neededMaterials?.length) return '';
return `
    <div class="project-finance__needed">
      <h3 class="project-finance__subheading">
        <i data-lucide="package-plus"></i>
        محتاجين كمان
      </h3>
      <ul class="project-finance__needed-list">
        ${neededMaterials.map(item => `
          <li class="project-finance__needed-item">
            <span class="project-finance__needed-bullet" aria-hidden="true"></span>
            <span>${escapeHtml(item)}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}
function renderExecutorsSection(executors) {
if (!executors || !executors.length) {
return emptyState({ icon: 'building-2', title: 'لسع ما تحددت الجهة المنفذة' });
}
return `
    <ul class="project-people-list">
      ${executors.map(name => `
        <li class="project-people-list__item">
          <span class="project-people-list__icon" aria-hidden="true"><i data-lucide="building-2"></i></span>
          <span>${escapeHtml(name)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}
function renderContributorsSection(contributors) {
if (!contributors || !contributors.length) {
return emptyState({
icon:  'users',
title: 'لسع ما حد اتسجل كمساهم في المشروع دا',
desc:  'كن أول داعم ليه.',
});
}
return `
    <ul class="project-people-list">
      ${contributors.map(name => {
const initial = (name || '؟').trim().charAt(0);
return `
          <li class="project-people-list__item">
            <span class="avatar avatar--xs" aria-hidden="true">${escapeHtml(initial)}</span>
            <span>${escapeHtml(name)}</span>
          </li>
        `;
}).join('')}
    </ul>
  `;
}
function renderContributionMethods(methods) {
if (!methods?.length) return '';
return `
    <div class="project-methods">
      ${methods.map(m => `
        <div class="project-method">
          <div class="project-method__text">
            <h3 class="project-method__name">${escapeHtml(m.name)}</h3>
            ${m.account ? `<p class="project-method__account" dir="auto">${escapeHtml(m.account)}</p>` : ''}
          </div>
          ${m.account ? `
          <button type="button" class="btn btn--secondary btn--sm project-method__copy" data-copy="${escapeHtml(m.account)}" aria-label="نسخ الحساب">
            <i data-lucide="copy"></i> نسخ
          </button>` : ''}
        </div>
      `).join('')}
      <p class="project-methods__note">
        <i data-lucide="shield-alert"></i>
        تأكد من الاسم والحساب مع الجهة المنفذة قبل أي تحويل، وأي خطأ بلّغنا عنه.
      </p>
    </div>
  `;
}
export function renderProjectDetail() {
const p = _currentProject;
if (!p) {
return `
      <section class="page project-detail-page">
        <p class="error-state">المشروع دا مش موجود هسّع — ممكن يكون اتحذف</p>
      </section>
    `;
}
const title = escapeHtml(p.title);
const icon  = PROJECT_STATUS_ICON[p.status] || 'flag';
const breathe = p.status === 'active' ? ' animate-breathe' : '';
return `
    <section class="page project-detail-page">

      <article class="project-detail-hero animate-fade-up" data-status="${p.status}">
        ${p.image
? `<img src="${escapeHtml(p.image)}" alt="${title}" class="project-detail-hero__img" loading="lazy" />`
: `<div class="project-detail-hero__img project-detail-hero__img--empty" aria-hidden="true"></div>`
}
        <div class="project-detail-hero__scrim" aria-hidden="true"></div>
        <span class="project-status ${p.status}${breathe}">
          <i data-lucide="${icon}"></i>
          ${escapeHtml(statusLabel(p.status))}
        </span>
      </article>

      <div class="project-detail-body">
        <h1 class="project-detail-title animate-fade-up animate-stagger-1">${title}</h1>

        <div class="project-progress project-detail-progress animate-fade-up animate-stagger-1">
          <div class="progress-info">
            <span class="progress-label">وصلنا</span>
            <span class="progress-value">${p.progress}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${p.progress}%;"></div>
          </div>
        </div>

        ${p.description ? `<p class="project-detail-desc animate-fade-up animate-stagger-2">${escapeHtml(p.description)}</p>` : ''}

        <section class="project-detail-section project-detail-section--contribute animate-fade-up animate-stagger-2">
          <h2 class="project-detail-section__title">
            <span class="project-detail-section__icon"><i data-lucide="heart-handshake"></i></span>
            ربط بطرق المساهمة
          </h2>
          <p class="project-detail-section__lead">
            أخضر شبتوت بحري تطبيق يسهّل عليك بس، ويربطك بطرق المساهمة في المشروع —
            ما جهة منفذة، وما مسؤول عن جمع الأموال أو صرفها. أي مساهمة مالية أو عينية تتم مباشرة مع الجهة المنفذة الموضحة تحت.
          </p>
          ${renderContributionMethods(p.contributionMethods)}
          <button class="cta-button cta-button--full project-detail-cta" data-action="contribute-project">
            <i data-lucide="phone"></i>
            ${p.contributionMethods?.length ? 'تواصل مع الجهة المنفذة' : 'تواصل واعرف طرق المساهمة'}
          </button>
        </section>

        <section class="project-detail-section animate-fade-up animate-stagger-3">
          <h2 class="project-detail-section__title">
            <span class="project-detail-section__icon"><i data-lucide="wallet"></i></span>
            التفاصيل المالية
          </h2>
          ${renderFinanceSection(p.finance)}
        </section>

        <section class="project-detail-section animate-fade-up animate-stagger-4">
          <h2 class="project-detail-section__title">
            <span class="project-detail-section__icon"><i data-lucide="building-2"></i></span>
            الجهة المنفذة
          </h2>
          ${renderExecutorsSection(p.executors)}
        </section>

        <section class="project-detail-section animate-fade-up animate-stagger-5">
          <h2 class="project-detail-section__title">
            <span class="project-detail-section__icon"><i data-lucide="users"></i></span>
            المساهمون
          </h2>
          ${renderContributorsSection(p.contributors)}
        </section>
      </div>

    </section>
  `;
}
export function initProjectDetail() {
document.querySelectorAll('.project-method__copy').forEach(btn => {
btn.addEventListener('click', async () => {
const text = btn.dataset.copy || '';
try {
if (navigator.clipboard) await navigator.clipboard.writeText(text);
else throw new Error('no-clipboard');
} catch {
const ta = document.createElement('textarea');
ta.value = text;
ta.style.cssText = 'position:fixed;opacity:0;';
document.body.appendChild(ta);
ta.select();
document.execCommand('copy');
document.body.removeChild(ta);
}
showToast('الحساب اتنسخ ✓', 'success');
});
});
}
