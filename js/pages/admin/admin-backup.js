import { exportAllData, importAllData, previewBackupImport, getBackupSummary } from '../../data/db.js';
import { showToast } from '../../shared/toast.js';
import { logAdminAction } from '../../shared/admin-activity.js';
import { errorState, bindErrorRetry } from '../../shared/error-state.js';
import { renderIcons } from '../../shared/icons.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { confirmAction } from '../../shared/admin-ui.js';
const MAX_IMPORT_BYTES = 50 * 1024 * 1024;
const OFF_BY_DEFAULT = new Set(['ideas', 'idea_comments', 'occasions', 'occasion_comments', 'settings']);
export function renderAdminBackup() {
return `
    <section class="page admin-backup-page">

      <div class="admin-content-toolbar">
        <p>
          صدّر نسخة كاملة من محتوى التطبيق في ملف JSON واحد واحتفظ بها (واتساب، ملفاتك...). لو توقّفت الخدمة يومًا
          استورد الملف في قاعدة جديدة وانشر، فيظهر المحتوى للناس من جديد. الصور والصوت ما بتدخل الملف — روابطها بس
          (انسخها بـ backup-images.mjs).
        </p>
      </div>

      <div class="admin-group">
        <div class="admin-group__label-row">
          <span class="admin-group__label">محتوى التطبيق الحالي</span>
        </div>
        <div class="settings-list" id="admin-backup-summary" aria-live="polite">
          <div class="settings-item"><div class="settings-content"><h4>قاعدين نحسب...</h4></div></div>
        </div>
      </div>

      <div class="admin-group">
        <div class="admin-group__label-row">
          <span class="admin-group__label">تصدير</span>
        </div>
        <div style="padding: 0 var(--spacing-page-x); display:flex; flex-direction:column; gap: var(--space-3);">
          <button class="btn btn--primary btn--full" id="admin-backup-export">
            <i data-lucide="download"></i>
            تنزيل نسخة احتياطية
          </button>
          <button class="btn btn--secondary btn--full hidden" id="admin-backup-share">
            <i data-lucide="share-2"></i>
            مشاركة النسخة (واتساب، ملفات...)
          </button>
        </div>
      </div>

      <div class="admin-group">
        <div class="admin-group__label-row">
          <span class="admin-group__label">استيراد</span>
        </div>
        <p class="admin-section-note">
          الاستيراد <strong>لا يحذف شيئًا أبدًا</strong>: يضيف ما ليس موجودًا، أو (لو اخترت) يحدّث الموجود بنفس الرقم.
          تشاهد معاينة بما سيحدث قبل أن يبدأ، وتقريرًا بعده.
        </p>
        <div style="padding: 0 var(--spacing-page-x);">
          <input type="file" id="admin-backup-file" accept="application/json,.json" hidden>
          <button class="btn btn--secondary btn--full" id="admin-backup-import">
            <i data-lucide="upload"></i>
            اختيار ملف نسخة احتياطية
          </button>
        </div>
        <div id="admin-backup-import-panel" style="padding: var(--space-3) var(--spacing-page-x) 0;" aria-live="polite"></div>
      </div>

    </section>
  `;
}
export async function initAdminBackup() {
const page = document.querySelector('.admin-backup-page');
if (!page) return;
const exportBtn = page.querySelector('#admin-backup-export');
const shareBtn  = page.querySelector('#admin-backup-share');
const importBtn = page.querySelector('#admin-backup-import');
const fileInput = page.querySelector('#admin-backup-file');
const probe = new File(['{}'], 'probe.json', { type: 'application/json' });
if (navigator.canShare?.({ files: [probe] })) shareBtn.classList.remove('hidden');
_loadSummary(page);
exportBtn.addEventListener('click', () => _export(exportBtn, 'download'));
shareBtn.addEventListener('click',  () => _export(shareBtn, 'share'));
importBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
const file = fileInput.files?.[0];
fileInput.value = '';
if (file) await _import(file, importBtn, page);
});
}
async function _loadSummary(page) {
const box = page.querySelector('#admin-backup-summary');
if (!box) return;
try {
const summary = await getBackupSummary();
box.innerHTML = summary.map(s => `
      <div class="settings-item" style="cursor:default">
        <div class="settings-content"><h4>${escapeHtml(s.label)}</h4></div>
        <span class="badge badge--default">${s.count == null ? '—' : s.count}</span>
      </div>
    `).join('');
} catch (err) {
console.error('[AdminBackup] فشل تحميل الملخص:', err);
box.innerHTML = errorState({ subject: 'ملخص البيانات' });
renderIcons();
bindErrorRetry(box, () => _loadSummary(page));
}
}
function _fileName() {
const d = new Date();
const pad = n => String(n).padStart(2, '0');
return `akdar-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.json`;
}
async function _export(btn, mode) {
const originalHtml = btn.innerHTML;
btn.disabled = true;
btn.textContent = 'قاعدين نجهّز...';
try {
const snapshot = await exportAllData();
const json = JSON.stringify(snapshot);
const name = _fileName();
const file = new File([json], name, { type: 'application/json' });
if (mode === 'share') {
try {
await navigator.share({ files: [file], title: name });
} catch (err) {
if (err?.name === 'AbortError') return;
throw err;
}
} else {
const url = URL.createObjectURL(file);
const a = document.createElement('a');
a.href = url;
a.download = name;
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(url), 10000);
}
showToast('النسخة الاحتياطية جاهزة', 'success');
logAdminAction('تصدير نسخة احتياطية', name);
} catch (err) {
console.error('[AdminBackup] فشل التصدير:', err);
showToast('النسخة لسع ما جهزت — جرّب تاني', 'error');
} finally {
btn.disabled = false;
btn.innerHTML = originalHtml;
renderIcons();
}
}
const _MODES = [
{ key: 'new',    label: 'الجديد فقط (الأكثر أمانًا)', hint: 'يضيف ما رقمه غير موجود، ويتجاهل الموجود كما هو.' },
{ key: 'update', label: 'تحديث الموجود أيضًا',        hint: 'يدمج بالرقم: ما كان موجودًا يُستبدل بنسخة الملف.' },
];
let _pending = null;
async function _import(file, btn, page) {
const panel = page.querySelector('#admin-backup-import-panel');
if (!panel) return;
if (file.size > MAX_IMPORT_BYTES) { showToast('الملف كبير زيادة عن اللزوم', 'error'); return; }
let snapshot;
try {
snapshot = JSON.parse(await file.text());
} catch {
showToast('الملف تالف أو ما JSON', 'error');
return;
}
const originalHtml = btn.innerHTML;
btn.disabled = true;
btn.textContent = 'قاعدين نعاين الملف...';
panel.innerHTML = '';
try {
const preview = await previewBackupImport(snapshot);
_pending = { snapshot, file, preview };
_renderPreview(panel, page);
} catch (err) {
console.error('[AdminBackup] فشلت المعاينة:', err);
showToast(err?.message || 'الملف دا ما نسخة احتياطية صحيحة', 'error');
} finally {
btn.disabled = false;
btn.innerHTML = originalHtml;
renderIcons();
}
}
function _renderPreview(panel, page) {
const { snapshot, file, preview } = _pending;
const when = snapshot.exportedAt ? new Date(snapshot.exportedAt).toLocaleString('ar') : 'غير معروف';
const rows = preview.map((p) => {
const bad = p.error ? ` <small style="color:var(--status-error-text,#e57373)">(${escapeHtml(p.error)})</small>` : '';
const nums = p.error ? '' : `<small style="color:var(--text-muted)">في الملف ${p.inFile} • جديد ${p.fresh} • موجود ${p.existing}</small>`;
return `
      <label class="settings-item" style="cursor:pointer;align-items:center;gap:var(--space-3)">
        <input type="checkbox" data-bk-table="${escapeHtml(p.key)}" ${OFF_BY_DEFAULT.has(p.key) || p.error ? '' : 'checked'} ${p.error ? 'disabled' : ''}>
        <div class="settings-content"><h4>${escapeHtml(p.label)}${bad}</h4>${nums}</div>
      </label>`;
}).join('');
const modes = _MODES.map((m, i) => `
    <label style="display:flex;gap:var(--space-2);align-items:flex-start;margin-top:var(--space-2)">
      <input type="radio" name="admin-backup-mode" value="${m.key}" ${i === 0 ? 'checked' : ''}>
      <span><strong>${escapeHtml(m.label)}</strong><br><small style="color:var(--text-muted)">${escapeHtml(m.hint)}</small></span>
    </label>`).join('');
panel.innerHTML = `
    <div class="admin-section-note" style="padding:0">ملف «${escapeHtml(file.name)}» — نسخة بتاريخ ${escapeHtml(when)}</div>
    <div class="settings-list" style="margin-top:var(--space-2)">${rows}</div>
    <small style="display:block;margin-top:var(--space-2);color:var(--text-muted)">
      الأفكار والتعليقات والمناسبات والإعدادات غير محدّدة افتراضيًا: قد ترفضها سياسات الحماية على حساب المشرف،
      واستعادتها الكاملة بسكربت restore-backup.mjs (بمفتاح الخدمة).
    </small>
    <div style="margin-top:var(--space-3)">${modes}</div>
    <div style="display:flex;gap:var(--space-2);margin-top:var(--space-4)">
      <button class="btn btn--primary" id="admin-backup-go" style="flex:1">ابدأ الاستيراد</button>
      <button class="btn btn--secondary" id="admin-backup-cancel">إلغاء</button>
    </div>
    <div id="admin-backup-progress" style="margin-top:var(--space-3)"></div>`;
panel.querySelector('#admin-backup-cancel').addEventListener('click', () => { _pending = null; panel.innerHTML = ''; });
panel.querySelector('#admin-backup-go').addEventListener('click', () => _runImport(panel, page));
}
async function _runImport(panel, page) {
if (!_pending) return;
const { snapshot, file } = _pending;
const tables = [...panel.querySelectorAll('input[data-bk-table]:checked')].map((i) => i.dataset.bkTable);
const mode = panel.querySelector('input[name="admin-backup-mode"]:checked')?.value || 'new';
if (!tables.length) { showToast('اختر قسمًا واحدًا على الأقل', 'error'); return; }
const ok = await confirmAction({
title: 'بدء الاستيراد؟',
message: `${tables.length} قسمًا — الوضع: ${_MODES.find((m) => m.key === mode)?.label}.\nلن يُحذف أي شيء من البيانات الحالية.`,
confirmLabel: 'ابدأ',
icon: 'upload',
});
if (!ok) return;
const goBtn = panel.querySelector('#admin-backup-go');
const cancelBtn = panel.querySelector('#admin-backup-cancel');
const prog = panel.querySelector('#admin-backup-progress');
goBtn.disabled = true; cancelBtn.disabled = true;
panel.querySelectorAll('input').forEach((i) => { i.disabled = true; });
try {
const report = await importAllData(snapshot, {
tables, mode,
onProgress: ({ label, done, total }) => { prog.textContent = `قاعدين نستورد «${label}»: ${done} من ${total}`; },
});
_pending = null;
const failed = report.filter((r) => !r.ok);
const lines = report.map((r) => `
      <div class="settings-item" style="cursor:default">
        <div class="settings-content">
          <h4>${escapeHtml(r.label)}</h4>
          <small style="color:${r.ok ? 'var(--text-muted)' : 'var(--status-error-text,#e57373)'}">
            ${r.ok ? `أُرسل ${r.sent} صفًا` : `تعثّر بعد ${r.sent}: ${escapeHtml(r.error || '')}`}
            ${r.droppedColumns?.length ? ` — تجاوز أعمدة غير متوافقة: ${escapeHtml(r.droppedColumns.join('، '))}` : ''}
          </small>
        </div>
        <span class="badge ${r.ok ? 'badge--default' : 'badge--error'}">${r.ok ? '✓' : '✗'}</span>
      </div>`).join('');
panel.innerHTML = `<div class="settings-list">${lines || '<div class="settings-item"><div class="settings-content"><h4>لا شيء لاستيراده</h4></div></div>'}</div>
      <p class="admin-section-note" style="padding:0;margin-top:var(--space-3)">${failed.length
? `تعثّر ${failed.length} قسم؛ الباقي تم. التعثّر الشائع في الأفكار والتعليقات: سياسات الحماية (استعمل restore-backup.mjs).`
: 'تم الاستيراد. التغييرات تظهر للمستخدمين تلقائيًا (أختام التحديث).'}</p>`;
showToast(failed.length ? 'تم الاستيراد مع أخطاء — راجع التقرير' : 'تم الاستيراد', failed.length ? 'error' : 'success');
logAdminAction('استيراد نسخة احتياطية', file.name);
_loadSummary(page);
} catch (err) {
console.error('[AdminBackup] فشل الاستيراد:', err);
showToast(`ما اتستورد: ${err?.message || 'خطأ غير متوقع'}`, 'error');
goBtn.disabled = false; cancelBtn.disabled = false;
panel.querySelectorAll('input').forEach((i) => { i.disabled = false; });
}
}
