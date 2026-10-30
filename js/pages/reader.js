import { navigateTo } from '../core/router.js';
import { escapeHtml } from '../shared/sanitize.js';
import { parseBlock } from '../shared/article-markup.js';
import { emptyState } from '../shared/empty-state.js';
import { thumb, ytLink } from '../core/youtube.js';
import { isPolicyArticle, fetchPolicyArticle } from '../shared/editorial-policy.js';
import { renderIcons } from '../shared/icons.js';
import { showToast } from '../shared/toast.js';
export let readerData = {};
export async function openReader(data) {
if (data?.type === 'news' && data.eventId && !data.linkedEvent) {
try {
const { getEvents } = await import('../data/db.js');
const ev = (await getEvents()).find(e => String(e.id) === String(data.eventId));
if (ev) data = { ...data, linkedEvent: ev };
} catch {   }
}
readerData = data;
window.__readerModule = { readerData };
navigateTo('reader');
}
const TYPE_CONFIG = {
news: {
label:       'خبر',
icon:        'newspaper',
accentColor: 'var(--reader-news-text)',
badgeBg:     'var(--reader-news-bg)',
badgeBorder: 'var(--reader-news-border)',
},
history: {
label:       '',
icon:        'landmark',
accentColor: 'var(--reader-history-text)',
badgeBg:     'var(--reader-history-bg)',
badgeBorder: 'var(--reader-history-border)',
},
memory: {
label:       'ذاكرة شبتوت',
icon:        'book-open',
accentColor: 'var(--reader-memory-text)',
badgeBg:     'var(--reader-memory-bg)',
badgeBorder: 'var(--reader-memory-border)',
},
complaint: {
label:       'شكوى',
icon:        'message-square-warning',
accentColor: 'var(--reader-complaint-text)',
badgeBg:     'var(--reader-complaint-bg)',
badgeBorder: 'var(--reader-complaint-border)',
},
service: {
label:       'خدمة',
icon:        'briefcase',
accentColor: 'var(--reader-service-text)',
badgeBg:     'var(--reader-service-bg)',
badgeBorder: 'var(--reader-service-border)',
},
association: {
label:       'مسيرة الرابطة',
icon:        'scroll-text',
accentColor: 'var(--reader-association-text)',
badgeBg:     'var(--reader-association-bg)',
badgeBorder: 'var(--reader-association-border)',
},
};
function renderMediaBlock(data) {
if (!data.image && !data.audio) return '';
if (data.audio) {
return `
      <div class="reader-audio-block">
        <div class="reader-audio-cover">
          ${data.image ? `<img src="${escapeHtml(data.image)}" alt="غلاف"  loading="lazy"/>` : '<span data-icon="mic-2" class="reader-audio-icon"></span>'}
        </div>
        <a class="reader-audio-btn" href="${escapeHtml(data.audio)}" target="_blank" rel="noopener">
          <span data-icon="play-circle"></span>
          اسمع التسجيل
        </a>
      </div>
    `;
}
return `
    <div class="reader-image">
      <img src="${escapeHtml(data.image)}" alt="${escapeHtml(data.title || '')}"  loading="lazy"/>
    </div>
  `;
}
function renderStatusBlock(data) {
if (data.type !== 'complaint') return '';
const statusMap = {
open:     { label: 'مفتوحة',   color: 'var(--status-warning-text)',  bg: 'var(--status-warning-bg)',  border: 'var(--status-warning-border)' },
progress: { label: 'قيد المعالجة', color: 'var(--status-info-text)', bg: 'var(--status-info-bg)', border: 'var(--status-info-border)' },
closed:   { label: 'مُغلقة',   color: 'var(--status-success-text)', bg: 'var(--status-success-bg)', border: 'var(--status-success-border)' },
};
const s = statusMap[data.status] || statusMap.open;
return `
    <div class="reader-status" style="color:${s.color}; background:${s.bg}; border-color:${s.border};">
      <span data-icon="circle-dot"></span>
      ${s.label}
    </div>
  `;
}
function renderContactBlock(data) {
if (data.type !== 'service' || !data.contacts?.length) return '';
return `
    <div class="reader-contacts">
      <h3 class="reader-contacts-title">جهات الاتصال</h3>
      ${data.contacts.map(c => `
        <a class="reader-contact-row" href="tel:${escapeHtml(c.number)}">
          <span data-icon="phone"></span>
          <span class="reader-contact-name">${escapeHtml(c.name)}</span>
          <span class="reader-contact-number">${escapeHtml(c.number)}</span>
        </a>
      `).join('')}
    </div>
  `;
}
function renderLinkedEventBlock(data) {
const ev = data.linkedEvent;
if (!ev?.youtubeId) return '';
const title = escapeHtml(ev.title || 'الفعالية');
return `
    <a class="reader-linked-event" href="${escapeHtml(ytLink(ev.youtubeId))}" target="_blank" rel="noopener">
      <span class="reader-linked-event__thumb">
        <img src="${escapeHtml(thumb(ev.youtubeId))}" alt="" loading="lazy" />
        <span class="reader-linked-event__play" data-icon="play"></span>
      </span>
      <span class="reader-linked-event__body">
        <span class="reader-linked-event__label">
          <span data-icon="calendar-heart"></span>
          فعالية مرتبطة بالخبر
        </span>
        <span class="reader-linked-event__title">${title}</span>
        <span class="reader-linked-event__cta">شاهد الفعالية</span>
      </span>
    </a>
  `;
}
function renderBodyBlock(data) {
if (!data.body?.length) return '<p class="reader-empty">ما في محتوى لسع.</p>';
const blocks = data.body.map(parseBlock).filter(b => b.text);
const hasExplicitIntro = blocks.some(b => b.kind === 'intro');
let html = '';
let leadUsed = false;
for (let k = 0; k < blocks.length; k++) {
const b = blocks[k];
const text = escapeHtml(b.text);
if (b.kind === 'heading') {
html += `<h2 class="reader-subheading"><span class="reader-subheading__text">${text}</span></h2>`;
} else if (b.kind === 'intro') {
html += `<p class="reader-intro">${text}</p>`;
} else if (b.kind === 'summary') {
const lines = [text];
while (k + 1 < blocks.length && blocks[k + 1].kind === 'summary') {
k++;
lines.push(escapeHtml(blocks[k].text));
}
html += `
        <aside class="reader-summary" aria-label="الخلاصة">
          <span class="reader-summary__label"><span data-icon="lightbulb" aria-hidden="true"></span>الخلاصة</span>
          ${lines.map(l => `<p class="reader-summary__text">${l}</p>`).join('')}
        </aside>`;
} else if (b.kind === 'key') {
html += `<p class="reader-key">${text}</p>`;
} else if (b.kind === 'item') {
const toEastern = (n) => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const rows = [];
let n = 0;
for (;;) {
const cur = blocks[k];
n = cur.num ? parseInt(String(cur.num).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), 10) : n + 1;
rows.push(`<li class="reader-list__item"><span class="reader-list__num" aria-hidden="true">${toEastern(n)}</span><span class="reader-list__text">${escapeHtml(cur.text)}</span></li>`);
if (k + 1 < blocks.length && blocks[k + 1].kind === 'item') k++; else break;
}
html += `<ul class="reader-list">${rows.join('')}</ul>`;
} else {
const lead = !hasExplicitIntro && !leadUsed && k === 0;
leadUsed = true;
html += `<p class="reader-paragraph${lead ? ' reader-paragraph--lead' : ''}">${text}</p>`;
}
}
return data.bodyPartial
? `${html}<p class="reader-empty">دي بداية الخبر بس — النص الكامل ما اتحمّل. افتحه تاني لمن يرجع الاتصال.</p>`
: html;
}
function renderPolicyLinkBlock(data) {
if (data.type !== 'history' || isPolicyArticle(data)) return '';
return `
    <button type="button" class="reader-policy-link" id="reader-policy-link">
      <span class="reader-policy-link__icon" aria-hidden="true"><span data-icon="scroll-text"></span></span>
      <span class="reader-policy-link__text">كيف نكتب مقالاتنا؟ <strong>اقرأ سياسة التحرير</strong></span>
      <span class="reader-policy-link__arrow" aria-hidden="true"><span data-icon="chevron-left"></span></span>
    </button>
  `;
}
export function initReader() {
const btn = document.getElementById('reader-policy-link');
if (!btn) return;
renderIcons(btn.closest('.reader-page') || document);
btn.addEventListener('click', async () => {
if (btn.dataset.loading) return;
btn.dataset.loading = '1';
try {
const policy = await fetchPolicyArticle();
if (policy) openReader(policy);
else showToast('سياسة التحرير غير متاحة الآن — جرّب لاحقاً', 'error');
} finally {
delete btn.dataset.loading;
}
});
}
export function renderReader() {
const data   = readerData;
if (!data || (!data.title && !data.body?.length)) {
return `
      <article class="page reader-page">
        ${emptyState({
icon: 'book-open',
title: 'ما في مقال مفتوح',
desc: 'ارجع واختار مقال أو خبر عشان تقراه.',
})}
      </article>
    `;
}
const config = TYPE_CONFIG[data.type] || TYPE_CONFIG.news;
const sub = data.category ? escapeHtml(data.category) : '';
const badgeText = config.label
? `${config.label}${sub ? `<span class="reader-badge-sub"> · ${sub}</span>` : ''}`
: sub;
const badge = badgeText ? `
    <span class="reader-badge" style="
      color: ${config.accentColor};
      background-color: ${config.badgeBg};
      border-color: ${config.badgeBorder};
    ">
      <span data-icon="${config.icon}" class="reader-badge-icon"></span>
      ${badgeText}
    </span>
  ` : '';
const dateLine = data.date ? escapeHtml(data.date) : '';
const sourceLine = data.source
? `<p class="reader-source"><span class="reader-source__icon" data-icon="library" aria-hidden="true"></span><span class="reader-source__body"><span class="reader-source__label">المصدر</span><span class="reader-source__value">${escapeHtml(data.source)}</span></span></p>`
: '';
return `
    <article class="page reader-page">

      ${renderMediaBlock(data)}

      <header class="reader-header">

        <div class="reader-meta">
          ${badge}
          ${renderStatusBlock(data)}
          ${dateLine ? `<span class="reader-dateline">${dateLine}</span>` : ''}
        </div>

        <h1 class="reader-title">${escapeHtml(data.title) || 'بدون عنوان'}</h1>

        ${sourceLine}

        <div class="reader-divider"></div>

      </header>

      <div class="reader-body">
        ${renderBodyBlock(data)}
        ${renderLinkedEventBlock(data)}
        ${renderContactBlock(data)}
      </div>

      ${renderPolicyLinkBlock(data)}

      <div class="reader-end" aria-hidden="true"><span></span><span></span><span></span></div>

      <footer class="reader-footer">
        <button class="reader-share-btn" data-action="share-article">
          <span data-icon="share-2"></span>
          مشاركة
        </button>
      </footer>

    </article>
  `;
}
