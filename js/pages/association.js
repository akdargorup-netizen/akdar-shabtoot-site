export function renderAssociation() {
return `
    <section class="page association-page">

      <div class="page-intro">
        <p>رابطة طلاب شبتوت بحري بالجامعات والمعاهد العليا — المرجع المؤسسي للهوية والتاريخ.</p>
      </div>

      <div class="association-index">

        <div class="association-index-card" data-page="association-about">
          <div class="association-index-card__icon">
            <i data-lucide="info"></i>
          </div>
          <div class="association-index-card__body">
            <h3 class="association-index-card__title">نبذة عن الرابطة</h3>
            <p class="association-index-card__desc">التعريف والرؤية والرسالة والأهداف.</p>
          </div>
          <div class="association-index-card__arrow" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.4" opacity="0.35"/>
              <path d="M11 7L8 10L11 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>

        <div class="association-index-card" data-page="association-journey">
          <div class="association-index-card__icon">
            <i data-lucide="book-open"></i>
          </div>
          <div class="association-index-card__body">
            <h3 class="association-index-card__title">مسيرة الرابطة</h3>
            <p class="association-index-card__desc">الحكاية والإنجازات والسجل الذهبي.</p>
          </div>
          <div class="association-index-card__arrow" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.4" opacity="0.35"/>
              <path d="M11 7L8 10L11 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>

        <div class="association-index-card" data-page="association-regulations">
          <div class="association-index-card__icon">
            <i data-lucide="scale"></i>
          </div>
          <div class="association-index-card__body">
            <h3 class="association-index-card__title">الدستور واللوائح الداخلية</h3>
            <p class="association-index-card__desc">الدستور، ولائحة المكتب التنفيذي الداخلية.</p>
          </div>
          <div class="association-index-card__arrow" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.4" opacity="0.35"/>
              <path d="M11 7L8 10L11 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>

      </div>

      <!-- دعوة الانضمام — بطاقة بأخضر الهوية (متناسقة مع بقية الأقسام) -->
      <section class="association-join-card" aria-label="طلب انضمام إلى الرابطة">
        <span class="association-join-card__orn" aria-hidden="true"></span>
        <h3 class="association-join-card__title">كن جزءًا من الرابطة</h3>
        <button type="button" class="association-join-card__btn" data-action="join-association">
          <span>طلب انضمام</span>
        </button>
      </section>

    </section>
  `;
}
export function initAssociation() {}
