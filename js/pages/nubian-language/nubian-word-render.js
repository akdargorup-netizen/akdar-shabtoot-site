import { escapeHtml } from '../../shared/sanitize.js';
import { buildKey } from '../../shared/arabic-search.js';
import { clipButtonHtml, clipOffHtml } from '../../shared/audio-clips.js';
function wordSearchKey(w) {
return buildKey(w.ar, w.nub, w.translit, w.note);
}
function renderTile(w) {
const isMissing  = !w.nub && !w.translit;
const searchKey  = escapeHtml(wordSearchKey(w));
if (isMissing) {
return `
      <div class="nword-tile nword-tile--empty" data-search="${searchKey}">
        <span class="nword-tile__ar">${escapeHtml(w.ar)}</span>
        <span class="nword-tile__note">${escapeHtml(w.note || 'لسع ما اتسجلت')}</span>
      </div>`;
}
return `
    <div class="nword-tile nword-tile--stack" data-search="${searchKey}">
      <div class="nword-tile__main">
        <span class="nword-tile__ar">${escapeHtml(w.ar)}</span>
        <span class="nword-tile__script">${escapeHtml(w.nub)}</span>
      </div>
      <div class="nword-tile__foot">
        <span class="nword-tile__translit">${escapeHtml(w.translit || '')}</span>
        <div class="nword-tile__audio">${clipButtonHtml(w.audio) || clipOffHtml()}</div>
      </div>
    </div>`;
}
export function renderWordGrid(words) {
if (!words.length) {
return `
      <div class="nword-grid">
        <div class="nword-tile nword-tile--empty nword-tile--wide" data-search="">
          <span class="nword-tile__note">الكلمات لسع ما اتضافت</span>
        </div>
      </div>`;
}
let lastGroup = null;
const tiles = words.map(w => {
const groupHeader = (w.group && w.group !== lastGroup)
? `<div class="nword-group-header">${escapeHtml(w.group)}</div>`
: '';
lastGroup = w.group || lastGroup;
return groupHeader + renderTile(w);
}).join('');
return `<div class="nword-grid">${tiles}</div>`;
}
