import { DID_YOU_KNOW_GROUPS } from '../data/did-you-know-data.js';
const _EASTERN_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function _toEasternDigits(n) {
return String(n).replace(/[0-9]/g, d => _EASTERN_DIGITS[Number(d)]);
}
function _refNumber(n) {
return _toEasternDigits(String(n).padStart(3, '0'));
}
export function renderDidYouKnow() {
const total = DID_YOU_KNOW_GROUPS.reduce((sum, g) => sum + g.items.length, 0);
if (!total) {
return `
      <section class="page dyk-page">
        <div class="page-intro">
          <p>معلومات من تاريخ وتراث شبتوت بحري.</p>
        </div>
        <div class="dyk-empty">لسع ما في معلومات مضافة هنا — تابعونا قريبًا.</div>
      </section>
    `;
}
let counter = 0;
const groupsHtml = DID_YOU_KNOW_GROUPS.map(group => {
const html = _renderGroup(group, counter);
counter += group.items.length;
return html;
}).join('');
return `
    <section class="page dyk-page">

      <div class="page-intro">
        <p>كل ما نعرفه عن تاريخ شبتوت بحري وتراثها — ${_toEasternDigits(total)} معلومة.</p>
      </div>

      <p class="dyk-source-notice">
        <i data-icon="info"></i>
        <span>مثل بقية مقالات هذا التوثيق، المعلومات هنا مبنية على روايات شفهية متناقلة، وقد تختلف الروايات أحيانًا عن بعضها — فلا تمثّل بالضرورة حقيقة تاريخية نهائية قاطعة. لو لاحظت خطأ، وفّرنا داخل التطبيق ميزة "الإبلاغ عن خطأ" تقدر تبلّغنا بيها.</span>
      </p>

      <!-- ربط ذكي: كل المعلومات هنا مستخلصة أصلًا من مقالات "تاريخنا"
           الكاملة — بدل ما تفضل معلومة مقتضبة بلا مرجع، بنوجّه لمصدرها
           الكامل مباشرة (نفس نمط "project-idea-banner" في متابعة المشاريع).
           v154: نقلناه من أسفل السجل الطويل لهنا، تحت التنبيه مباشرة —
           عشان يبان أول حاجة بعد المقدمة، مش بعد ما المستخدم يفوت كل
           المعلومات (اللي غالبًا كانت بتخليه ما يشوفه أصلًا لو ما نزلش
           لآخر الصفحة). -->
      <div class="project-idea-banner" data-page="history-articles">
        <span class="project-idea-banner__icon" aria-hidden="true"><i data-lucide="library"></i></span>
        <p class="project-idea-banner__text">داير التفاصيل كاملة؟ <strong>شوف مقالاتنا</strong></p>
        <span class="project-idea-banner__arrow" aria-hidden="true"><i data-lucide="chevron-left"></i></span>
      </div>

      <div class="dyk-ledger">
        ${groupsHtml}
      </div>

    </section>
  `;
}
function _renderGroup(group, startIndex) {
const itemsHtml = group.items
.map((item, i) => _renderItem(item, startIndex + i + 1))
.join('');
const sourceHtml = group.source
? `<p class="dyk-group__source">المصدر: ${group.source}</p>`
: '';
return `
    <div class="dyk-group">
      <div class="dyk-group__header">
        <span class="dyk-group__title">${group.category}</span>
        <span class="dyk-group__rule"></span>
      </div>
      ${sourceHtml}
      <div class="dyk-group__items">
        ${itemsHtml}
      </div>
    </div>
  `;
}
function _renderItem(item, num) {
return `
    <div class="dyk-item">
      <span class="dyk-item__num">${_refNumber(num)}</span>
      <div class="dyk-item__body">
        <p class="dyk-item__text">${item.text}</p>
      </div>
    </div>
  `;
}
export function initDidYouKnow() {
}
