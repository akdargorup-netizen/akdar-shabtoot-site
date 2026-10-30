import { bindSecretTap } from '../shared/secret-trigger.js';
export function renderAboutApp() {
return `
    <section class="page privacy-page about-app-page">

      <!-- مقدمة -->
      <div class="privacy-hero privacy-hero--about">
        <div class="privacy-hero__icon privacy-hero__icon--logo privacy-hero__icon--logo-lg">
          <span class="about-logo-mark" role="img" aria-label="شعار أخضر شبتوت بحري"></span>
        </div>
      </div>

      <!-- الفكرة والرعاية — بديل البطاقة: عناصر قصة رأسية بفاصل خفيف بدل الصندوق المحاط بحدود -->
      <div class="appearance-section-label">الفكرة والرعاية</div>
      <div class="about-story-list">

        <div class="about-story-item">
          <div class="about-story-item__icon"><span data-icon="lightbulb"></span></div>
          <div class="about-story-item__content">
            <h4>فكرة التطبيق</h4>
            <p>عثمان عبدالله عبدون — الأمين الإعلامي برابطة طلاب شبتوت بحري بالجامعات والمعاهد العليا</p>
          </div>
        </div>

        <div class="about-story-item">
          <div class="about-story-item__icon"><span data-icon="shield-check"></span></div>
          <div class="about-story-item__content">
            <h4>برعاية وملكية</h4>
            <p>رابطة طلاب شبتوت بحري بالجامعات والمعاهد العليا</p>
          </div>
        </div>

        <div class="about-story-item">
          <div class="about-story-item__icon"><span data-icon="code-2"></span></div>
          <div class="about-story-item__content">
            <h4>التطوير والتنفيذ</h4>
            <p>أكرم محمود الخال — عضو الأمانة الإعلامية برابطة طلاب شبتوت بحري بالجامعات والمعاهد العليا</p>
          </div>
        </div>

        <div class="about-story-item">
          <div class="about-story-item__icon"><span data-icon="flag"></span></div>
          <div class="about-story-item__content">
            <h4>دورة الإطلاق</h4>
            <p>دورة "سواعد البناء" 2026–2027، برئاسة الأخ أسامة جمال سعيد</p>
          </div>
        </div>

      </div>

      <!-- ملاحظة ختامية -->
      <div class="privacy-note-card">
        <span data-icon="info" class="privacy-note-card__icon"></span>
        <p>
          الرابطة تسعى دائماً لتقديم الخدمة لأهل شبتوت بحري، وأخضر شبتوت بحري أحد تجليات هذا السعي —
          تطبيق مجتمعي غير ربحي يهدف لخدمة أهل البلد وتوثيق ذاكرتها.
        </p>
      </div>

      <!-- التوقيع -->
      <section class="settings-footer">
        <p class="about-footer__copy">مجموعة أخضر للتنمية والاستثمار</p>
      </section>

    </section>
  `;
}
let _unbindSecretTap = null;
export function initAboutApp() {
if (_unbindSecretTap) { _unbindSecretTap(); _unbindSecretTap = null; }
const icon = document.querySelector('.about-app-page .privacy-hero__icon');
_unbindSecretTap = bindSecretTap(icon, {
taps: 7,
windowMs: 2000,
onUnlock: async () => {
const { navigateTo } = await import('../core/router.js');
navigateTo('admin');
},
});
}
