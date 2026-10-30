import { findNubianCategory } from '../../data/nubian-language-data.js';
import { getNubianWords }     from '../../data/db.js';
import { renderIcons }        from '../../shared/icons.js';
import { emptyState }         from '../../shared/empty-state.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { renderWordGrid }     from './nubian-word-render.js';
import { bindClipButtons }    from '../../shared/audio-clips.js';
let _activeKey = null;
export function renderNubianSub(key) {
const cat = findNubianCategory(key);
if (!cat) {
return `<section class="page nlang-sub-page"><p>التصنيف ما اتلقى</p></section>`;
}
return `
    <section class="page nlang-sub-page">

      <div class="nlang-sub-header">
        <div class="nlang-sub-header__icon" data-icon="${cat.icon}"></div>
        <p class="nlang-sub-header__intro">${cat.subtitle}</p>
      </div>

      <div id="nword-list-area">
        <div class="nword-grid" aria-hidden="true">
          <div class="nword-tile" style="align-items: stretch;">
            <span class="page-skeleton__line page-skeleton__line--sm" style="width:60%; margin-inline:auto;"></span>
            <span class="page-skeleton__line page-skeleton__line--md" style="width:80%; margin-inline:auto; margin-top: var(--space-2);"></span>
          </div>
          <div class="nword-tile" style="align-items: stretch;">
            <span class="page-skeleton__line page-skeleton__line--sm" style="width:60%; margin-inline:auto;"></span>
            <span class="page-skeleton__line page-skeleton__line--md" style="width:80%; margin-inline:auto; margin-top: var(--space-2);"></span>
          </div>
        </div>
      </div>

    </section>
  `;
}
export async function initNubianSub(key) {
_activeKey = key;
const cat  = findNubianCategory(key);
const area = document.getElementById('nword-list-area');
if (!cat || !area) return;
try {
const words = await getNubianWords(key);
if (!words.length) {
area.innerHTML = emptyState({
icon: 'languages',
title: 'لسع الكلمات ما اتضافت',
desc: `قسم "${cat.title}" جاهز — والكلمات حتتضاف قريب.`,
});
renderIcons(area);
return;
}
area.innerHTML = renderWordGrid(words);
bindClipButtons(area);
renderIcons(area);
} catch (err) {
console.error('[NubianSub] فشل تحميل كلمات التصنيف:', err);
area.innerHTML = errorState({ subject: 'الكلمات' });
renderIcons(area);
bindErrorRetry(area, () => initNubianSub(key));
}
}
