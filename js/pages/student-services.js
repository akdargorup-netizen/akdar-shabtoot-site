import { renderCourseRequestBox, initCourseRequestBox } from './student-course-request.js';
import { getTodayTip } from '../data/student-tips-data.js';
import { renderIcons } from '../shared/icons.js';
import { escapeHtml } from '../shared/sanitize.js';
const ARROW_SVG = `
  <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 6L7 10L11 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;
const CARDS = [
{
icon: 'clapperboard', title: 'حصص الشهادة المتوسطة',
desc: 'حصص مصوّرة لطلاب الشهادة المتوسطة.',
page: 'student-videos-intermediate',
},
{
icon: 'clapperboard', title: 'حصص الشهادة السودانية',
desc: 'حصص مصوّرة لطلاب الشهادة السودانية.',
page: 'student-videos-secondary',
},
];
export function renderStudentServices() {
return `
    <section class="page student-services-page">

      <div class="page-intro">
        <p>خدمات لطلاب البلد في مرحلتين: الشهادة المتوسطة والشهادة السودانية.</p>
      </div>

      <div class="services-sections">
        ${CARDS.map(c => `
          <article class="service-card" data-page="${c.page}">
            <div class="service-card__icon" data-icon="${c.icon}"></div>
            <div class="service-card__body">
              <div class="service-card__top"><span class="service-card__title">${c.title}</span></div>
              <p class="service-card__desc">${c.desc}</p>
            </div>
            <div class="service-card__arrow" aria-hidden="true">${ARROW_SVG}</div>
          </article>
        `).join('')}
      </div>

      ${renderCourseRequestBox()}

      <!-- حاوية نصيحة اليوم — تُملأ في initStudentServices -->
      <div id="student-tip-area"></div>

    </section>
  `;
}
function initTipWidget() {
const area = document.getElementById('student-tip-area');
const tip = getTodayTip();
if (!area || !tip) return;
area.innerHTML = `
    <div class="student-tip-card" role="note">
      <div class="student-tip-card__top">
        <span class="student-tip-card__icon" data-icon="lightbulb"></span>
        <span class="student-tip-card__label">نصيحة اليوم</span>
      </div>
      <h3 class="student-tip-card__title">${escapeHtml(tip.title)}</h3>
      <p class="student-tip-card__text">${escapeHtml(tip.text)}</p>
    </div>
  `;
renderIcons(area);
}
export function initStudentServices() {
initCourseRequestBox();
initTipWidget();
renderIcons();
}
