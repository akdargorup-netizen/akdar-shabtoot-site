import { escapeHtml } from './sanitize.js';
export function renderSuggestBox({ text, btnText, action, btnIcon = 'plus-circle', variant = '' }) {
const cls = variant ? ` suggest-box--${escapeHtml(variant)}` : '';
return `
    <div class="suggest-box${cls}">
      <p>${escapeHtml(text)}</p>
      <button type="button" class="suggest-box__btn" data-action="${escapeHtml(action)}">
        <span data-icon="${escapeHtml(btnIcon)}"></span>
        ${escapeHtml(btnText)}
      </button>
    </div>
  `;
}
