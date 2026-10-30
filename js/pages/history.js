export function renderHistory() {
return `
    <section class="page history-page">

      <div class="history-index">

        <div class="history-index-grid">

          <div class="history-index-card" data-page="history-articles">
            <div class="history-index-card__icon">
              <i data-lucide="library"></i>
            </div>
            <div class="history-index-card__body">
              <h3 class="history-index-card__title">مقالاتنا</h3>
              <p class="history-index-card__desc">البدايات، الرِجالات، العادات والتقاليد، الأحداث، وإنجازات أبناء البلد — كل المقالات في مكان واحد.</p>
            </div>
            <div class="history-index-card__arrow" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.4" opacity="0.35"/>
                <path d="M11 7L8 10L11 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>

          <div class="history-index-card" data-page="memory-gallery">
            <div class="history-index-card__icon">
              <i data-lucide="images"></i>
            </div>
            <div class="history-index-card__body">
              <h3 class="history-index-card__title">صورنا</h3>
              <p class="history-index-card__desc">لقطات من حياة البلد قديماً وحديثاً — أرشيف بصري لذاكرتنا المشتركة.</p>
            </div>
            <div class="history-index-card__arrow" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.4" opacity="0.35"/>
                <path d="M11 7L8 10L11 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>

        </div>

      </div>

    </section>
  `;
}
export function initHistory() {
}
