export function renderNotFound(pageName = '') {
return `
    <section class="page not-found-page">
      <div class="not-found-inner">
        <div class="not-found-code">٤٠٤</div>
        <h2 class="not-found-title">ما لقينا الصفحة دي</h2>
        <p class="not-found-desc">
          ${pageName
? `ما لقينا "${pageName}".`
: 'الرابط دا ما متاح هسّع.'}
        </p>
        <button class="btn btn--primary" data-action="go-back">
          ارجع للخلف
        </button>
      </div>
    </section>
  `;
}
