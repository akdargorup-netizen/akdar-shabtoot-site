import { applyTheme as applyResolvedTheme } from '../shared/theme.js';
export function renderAppearance() {
const savedTheme    = localStorage.getItem('app-theme') === 'light' ? 'light' : 'system';
const rawTextSize   = localStorage.getItem('app-text-size');
const savedTextSize = (rawTextSize === 'large' || rawTextSize === 'xlarge') ? 'large' : 'normal';
const savedVision   = localStorage.getItem('vision-enhanced') === 'true';
return `
    <section class="page appearance-page">

      <!-- الثيم -->
      <div class="appearance-section-label">الثيم</div>
      <div class="appearance-list">

        <div class="appearance-option ${savedTheme === 'light' ? 'appearance-option--active' : ''}"
             data-appearance="theme" data-value="light">
          <div class="appearance-option__preview appearance-preview--light">
            <span class="preview-dot"></span>
            <span class="preview-dot"></span>
            <span class="preview-dot"></span>
          </div>
          <span class="appearance-option__label">فاتح</span>
          <span class="appearance-check" data-icon="check"></span>
        </div>

        <div class="appearance-option ${savedTheme === 'system' ? 'appearance-option--active' : ''}"
             data-appearance="theme" data-value="system">
          <div class="appearance-option__preview appearance-preview--system">
            <span class="preview-dot"></span>
            <span class="preview-dot"></span>
            <span class="preview-dot"></span>
          </div>
          <span class="appearance-option__label">تلقائي</span>
          <span class="appearance-check" data-icon="check"></span>
        </div>

      </div>

      <!-- حجم الخط -->
      <div class="appearance-section-label">حجم الخط</div>
      <div class="settings-list">

        <div class="settings-item" data-appearance="text-size" data-value="normal">
          <div class="settings-icon"><span data-icon="case-sensitive"></span></div>
          <div class="settings-content">
            <h4>عادي</h4>
            <p>الحجم الافتراضي — مريح للقراءة</p>
          </div>
          <span class="appearance-tick ${savedTextSize === 'normal' ? 'appearance-tick--on' : ''}" data-icon="check-circle-2"></span>
        </div>

        <div class="settings-item" data-appearance="text-size" data-value="large">
          <div class="settings-icon"><span data-icon="zoom-in"></span></div>
          <div class="settings-content">
            <h4>كبير</h4>
            <p>أكبر قليلًا — أوسع للقراءة</p>
          </div>
          <span class="appearance-tick ${savedTextSize === 'large' ? 'appearance-tick--on' : ''}" data-icon="check-circle-2"></span>
        </div>

      </div>

      <!-- الرؤية المحسّنة -->
      <div class="appearance-section-label">إتاحة</div>
      <div class="settings-list">

        <div class="settings-item" data-appearance-toggle="vision-enhanced">
          <div class="settings-icon"><span data-icon="eye"></span></div>
          <div class="settings-content">
            <h4>الرؤية المحسّنة</h4>
            <p>تباين أقوى وحدود أوضح لسعولة القراءة</p>
          </div>
          <div class="toggle ${savedVision ? 'toggle--on' : ''}" id="toggle-vision-enhanced">
            <div class="toggle__track"></div>
            <div class="toggle__thumb"></div>
          </div>
        </div>

      </div>

    </section>
  `;
}
let _appearanceHandler = null;
export function initAppearance() {
if (_appearanceHandler) {
document.removeEventListener('click', _appearanceHandler);
_appearanceHandler = null;
}
_appearanceHandler = function (e) {
const themeEl = e.target.closest('[data-appearance="theme"]');
if (themeEl) {
const val = themeEl.dataset.value;
localStorage.setItem('app-theme', val);
document.querySelectorAll('[data-appearance="theme"]').forEach(el => {
el.classList.toggle('appearance-option--active', el.dataset.value === val);
});
applyTheme(val);
return;
}
const sizeEl = e.target.closest('[data-appearance="text-size"]');
if (sizeEl) {
const val = sizeEl.dataset.value;
localStorage.setItem('app-text-size', val);
document.querySelectorAll('[data-appearance="text-size"] .appearance-tick').forEach(t => {
t.classList.remove('appearance-tick--on');
});
sizeEl.querySelector('.appearance-tick')?.classList.add('appearance-tick--on');
applyTextSize(val);
return;
}
const visionEl = e.target.closest('[data-appearance-toggle="vision-enhanced"]');
if (visionEl) {
const t = document.getElementById('toggle-vision-enhanced');
const next = !t.classList.contains('toggle--on');
t.classList.toggle('toggle--on', next);
localStorage.setItem('vision-enhanced', String(next));
applyVision(next);
return;
}
};
document.addEventListener('click', _appearanceHandler);
applyTheme(localStorage.getItem('app-theme') === 'light' ? 'light' : 'system', false);
applyTextSize(localStorage.getItem('app-text-size'));
applyVision(localStorage.getItem('vision-enhanced') === 'true');
}
function applyTheme(val, animate = true) {
applyResolvedTheme(val, animate);
}
function applyVision(on) {
if (on) {
document.documentElement.setAttribute('data-vision', 'enhanced');
} else {
document.documentElement.removeAttribute('data-vision');
}
}
function applyTextSize(val) {
const normalized = (val === 'large' || val === 'xlarge') ? 'large' : 'normal';
document.documentElement.setAttribute('data-text-size', normalized);
}
