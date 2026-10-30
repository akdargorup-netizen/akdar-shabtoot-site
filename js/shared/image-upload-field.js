import { uploadImage, getGalleryItems } from '../data/db.js';
import { renderIcons } from './icons.js';
import { savePendingImage, isPendingToken, previewUrlFor, tokenForPreview } from './pending-images.js';
import { escapeHtml } from './sanitize.js';
const MAX_DIMENSION    = 1200;
const WEBP_QUALITY     = 0.78;
const JPEG_QUALITY     = 0.80;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const THUMB_DIMENSION  = 480;
const THUMB_WEBP_Q     = 0.72;
const THUMB_JPEG_Q     = 0.75;
let _seq = 0;
export function createImageUploadField({ pathPrefix = 'uploads', existingUrl = '', label = 'الصورة', allowGalleryPick = false } = {}) {
const uid = `img-upload-${++_seq}`;
let currentUrl = tokenForPreview(existingUrl || '');
const _shown = (u) => (isPendingToken(u) ? previewUrlFor(u) : u);
const html = `
    <div class="input-group image-upload-field" id="${uid}">
      <label class="input-label">${label}</label>

      <div class="image-upload-drop" data-role="drop" tabindex="0" role="button" aria-label="رفع صورة من المعرض">
        <div class="image-upload-preview" data-role="preview" ${currentUrl ? '' : 'style="display:none;"'}>
          ${currentUrl ? `<img src="${escapeHtml(_shown(currentUrl))}" alt="">` : ''}
        </div>
        <div class="image-upload-placeholder" data-role="placeholder" ${currentUrl ? 'style="display:none;"' : ''}>
          <i data-lucide="image-plus"></i>
          <span>اضغط لاختيار صورة من المعرض</span>
        </div>
        <div class="image-upload-progress" data-role="progress" style="display:none;">
          <div class="image-upload-progress__track">
            <div class="image-upload-progress__bar" data-role="progress-bar"></div>
          </div>
          <span class="image-upload-progress__label" data-role="progress-label">قاعدين نرفع...</span>
        </div>
      </div>

      <input type="file" accept="image/*" data-role="file-input" style="display:none;">

      <div class="image-upload-actions" data-role="actions" ${currentUrl ? '' : 'style="display:none;"'}>
        <button type="button" class="btn btn--ghost btn--sm" data-role="replace-btn">
          <i data-lucide="refresh-cw"></i> تغيير الصورة
        </button>
        <button type="button" class="btn btn--ghost btn--sm image-upload-remove-btn" data-role="remove-btn">
          <i data-lucide="trash-2"></i> إزالة
        </button>
      </div>

      ${allowGalleryPick ? `
      <div class="image-upload-actions">
        <button type="button" class="btn btn--secondary btn--sm" data-role="gallery-pick-btn">
          <i data-lucide="images"></i> اختر من صور البلد
        </button>
      </div>` : ''}

      <p class="input-error-msg hidden" data-role="error"></p>
    </div>
  `;
function mount(container) {
const root = container.querySelector(`#${uid}`);
if (!root) return;
const drop          = root.querySelector('[data-role="drop"]');
const preview        = root.querySelector('[data-role="preview"]');
const placeholder    = root.querySelector('[data-role="placeholder"]');
const progress        = root.querySelector('[data-role="progress"]');
const progressBar      = root.querySelector('[data-role="progress-bar"]');
const progressLabel     = root.querySelector('[data-role="progress-label"]');
const fileInput          = root.querySelector('[data-role="file-input"]');
const actions             = root.querySelector('[data-role="actions"]');
const replaceBtn           = root.querySelector('[data-role="replace-btn"]');
const removeBtn              = root.querySelector('[data-role="remove-btn"]');
const errorEl                 = root.querySelector('[data-role="error"]');
const openPicker = () => fileInput.click();
function _applyUrl(url) {
currentUrl = url;
preview.innerHTML = `<img src="${escapeHtml(_shown(url))}" alt="">`;
placeholder.style.display = 'none';
progress.style.display = 'none';
preview.style.display = '';
actions.style.display = '';
_clearError();
renderIcons(root);
}
root.querySelector('[data-role="gallery-pick-btn"]')?.addEventListener('click', async () => {
let items = [];
try {
items = (await getGalleryItems()).filter(g => g.image);
} catch (err) {
console.error('[ImageUploadField] فشل جلب صور المعرض:', err);
_showError('صور البلد لسع ما ظهرت — جرّب تاني بعد لحظات');
return;
}
const picker = document.createElement('div');
picker.className = 'overlay-backdrop';
picker.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-label="اختيار صورة من صور البلد">
          <div class="modal__handle"></div>
          <div class="modal__header"><h3 class="modal__title">اختر من صور البلد</h3></div>
          <div class="modal__body">
            ${items.length ? `
            <div class="image-pick-grid">
              ${items.map(g => `
                <button type="button" class="image-pick-tile" data-url="${escapeHtml(g.image)}">
                  <img src="${escapeHtml(g.image)}" alt="" loading="lazy">
                  <span>${escapeHtml(g.title || '')}</span>
                </button>`).join('')}
            </div>` : '<p class="input-hint">ما في صور في المعرض لسع — ارفع صورة من \"صور البلد\" أولًا.</p>'}
            <button type="button" class="btn btn--ghost btn--full" data-role="pick-cancel">إلغاء</button>
          </div>
        </div>`;
document.body.appendChild(picker);
const closePicker = () => picker.remove();
picker.addEventListener('click', (e) => { if (e.target === picker) closePicker(); });
picker.querySelector('[data-role="pick-cancel"]')?.addEventListener('click', closePicker);
picker.querySelectorAll('.image-pick-tile').forEach(tile => {
tile.addEventListener('click', () => { _applyUrl(tile.dataset.url); closePicker(); });
});
});
drop.addEventListener('click', () => { if (!currentUrl) openPicker(); });
drop.addEventListener('keydown', (e) => {
if ((e.key === 'Enter' || e.key === ' ') && !currentUrl) {
e.preventDefault();
openPicker();
}
});
replaceBtn?.addEventListener('click', openPicker);
removeBtn?.addEventListener('click', () => {
currentUrl = '';
preview.style.display = 'none';
preview.innerHTML = '';
placeholder.style.display = '';
actions.style.display = 'none';
fileInput.value = '';
_clearError();
});
fileInput.addEventListener('change', async () => {
const file = fileInput.files?.[0];
fileInput.value = '';
if (!file) return;
_clearError();
if (!file.type.startsWith('image/')) {
_showError('الملف المختار مو صورة');
return;
}
if (file.size > MAX_SOURCE_BYTES) {
_showError('الصورة كبيرة جداً — اختر صورة أصغر من 15 ميجا');
return;
}
const hadPreviousImage = Boolean(currentUrl);
try {
placeholder.style.display = 'none';
preview.style.display = 'none';
progress.style.display = 'flex';
_setProgress(4, 'قاعدين نجهّز الصورة...');
const blob = await _resizeImage(file);
if (navigator.onLine === false) {
await _deferImage(blob);
return;
}
_setProgress(15, 'قاعدين نرفع...');
let result;
try {
result = await uploadImage(blob, {
pathPrefix,
onProgress: (pct) => _setProgress(15 + Math.round(pct * 0.85), 'قاعدين نرفع...'),
});
} catch (upErr) {
if (navigator.onLine === false || /failed to fetch|network|timeout|timed out|aborted|load failed/i.test(String(upErr?.message || upErr))) {
await _deferImage(blob);
return;
}
throw upErr;
}
if (result.path) {
_setProgress(96, 'قاعدين نجهّز النسخة المصغّرة...');
try {
const thumbBlob = await _resizeImage(file, THUMB_DIMENSION, THUMB_WEBP_Q, THUMB_JPEG_Q);
await uploadImage(thumbBlob, { pathPrefix, exactPath: result.path.replace(/(\.[a-z]+)$/, '_t$1') });
} catch (thumbErr) {
console.warn('[ImageUploadField] تعذّر رفع النسخة المصغّرة (غير حرج):', thumbErr);
}
}
currentUrl = result.url;
preview.innerHTML = `<img src="${escapeHtml(currentUrl)}" alt="">`;
progress.style.display = 'none';
preview.style.display = '';
actions.style.display = '';
renderIcons(root);
} catch (err) {
console.error('[ImageUploadField] فشل رفع الصورة:', err);
progress.style.display = 'none';
if (hadPreviousImage) {
preview.style.display = '';
} else {
placeholder.style.display = '';
}
_showError(err?.code === 'cloudinary-not-configured' || err?.code === 'image-host-not-configured'
? 'رفع الصور لسع ما اتفعّلش (إعداد استضافة الصور ناقص)'
: 'الصورة لسع ما اترفعت — جرّب تاني لما الشبكة تستقر');
}
});
async function _deferImage(blob) {
let thumb = null;
try {
const f2 = new File([blob], 'img', { type: blob.type });
thumb = await _resizeImage(f2, THUMB_DIMENSION, THUMB_WEBP_Q, THUMB_JPEG_Q);
} catch {   }
const token = await savePendingImage({ blob, thumb, pathPrefix });
currentUrl = token;
preview.innerHTML = `<img src="${escapeHtml(previewUrlFor(token))}" alt="">`;
progress.style.display = 'none';
preview.style.display = '';
actions.style.display = '';
renderIcons(root);
_showError('ما في نت — الصورة محفوظة على جهازك وحتترفع لوحدها لما النت يرجع. كمّل الحفظ عادي.');
errorEl.classList.remove('input-error-msg');
errorEl.classList.add('input-hint');
}
function _setProgress(pct, msg) {
const clamped = Math.min(100, Math.max(0, pct));
progressBar.style.width = `${clamped}%`;
progressLabel.textContent = msg;
}
function _showError(msg) { errorEl.textContent = msg; errorEl.classList.remove('hidden', 'input-hint'); errorEl.classList.add('input-error-msg'); }
function _clearError()   { errorEl.classList.add('hidden'); }
}
return {
html,
mount,
getValue: () => tokenForPreview(currentUrl),
};
}
function _resizeImage(file, maxDim = MAX_DIMENSION, webpQ = WEBP_QUALITY, jpegQ = JPEG_QUALITY) {
return new Promise((resolve, reject) => {
const img = new Image();
const objectUrl = URL.createObjectURL(file);
img.onload = () => {
URL.revokeObjectURL(objectUrl);
let { width, height } = img;
if (width > maxDim || height > maxDim) {
const scale = maxDim / Math.max(width, height);
width  = Math.round(width * scale);
height = Math.round(height * scale);
}
const canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height;
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0, width, height);
canvas.toBlob(
(webp) => {
if (webp && webp.type === 'image/webp') return resolve(webp);
canvas.toBlob(
(jpeg) => (jpeg ? resolve(jpeg) : reject(new Error('فشل تحويل الصورة'))),
'image/jpeg',
jpegQ
);
},
'image/webp',
webpQ
);
};
img.onerror = () => {
URL.revokeObjectURL(objectUrl);
reject(new Error('الصورة دي ما انفتحت — جرّب صورة تانية'));
};
img.src = objectUrl;
});
}
