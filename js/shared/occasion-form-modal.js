import { addOccasion } from '../data/db.js';
import { getCurrentUser } from '../data/auth.js';
import { staffRoleField } from './staff-badge.js';
import { OCCASION_CATEGORIES, getOccasionCategory } from '../data/occasion-categories.js';
import { showToast } from './toast.js';
import { isTransientFailure, BUSY_HINT } from './transient-error.js';
import { SubmissionGuardError } from './submission-guard.js';
let _cleanup = null;
export function openAddOccasionModal(onSuccess) {
closeAddOccasionModal();
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="ضيف مناسبتك">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">ضيف مناسبتك</h3>
      </div>
      <div class="modal__body">

        <div class="input-group">
          <label class="input-label input-label--required" for="occasion-form-category">تصنيف المناسبة</label>
          <select class="input" id="occasion-form-category">
            ${OCCASION_CATEGORIES.map(c => `<option value="${c.key}">${c.label}</option>`).join('')}
          </select>
        </div>

        <div class="input-group">
          <label class="input-label input-label--required" for="occasion-form-title">عنوان المناسبة</label>
          <input
            class="input"
            id="occasion-form-title"
            type="text"
            maxlength="100"
            placeholder="مثلاً: عقد قران محمد على فاطمة"
          />
        </div>

        <div class="input-group">
          <label class="input-label input-label--required" id="occasion-form-owner-label" for="occasion-form-owner">اسم صاحب المناسبة</label>
          <input
            class="input"
            id="occasion-form-owner"
            type="text"
            maxlength="60"
            placeholder="مثلاً: أسرة آدم"
          />
        </div>

        <div class="input-group">
          <label class="input-label" id="occasion-form-date-label" for="occasion-form-date">الزمان</label>
          <input
            class="input"
            id="occasion-form-date"
            type="text"
            maxlength="60"
            placeholder="مثلاً: الجمعة القادمة بعد صلاة العصر"
          />
        </div>

        <div class="input-group" id="occasion-form-location-group">
          <label class="input-label" id="occasion-form-location-label" for="occasion-form-location">المكان</label>
          <input
            class="input"
            id="occasion-form-location"
            type="text"
            maxlength="80"
            placeholder="مثلاً: منزل الأسرة، حي كذا"
          />
        </div>

        <div class="input-group">
          <label class="input-label" for="occasion-form-text">نص قصير</label>
          <textarea
            class="input"
            id="occasion-form-text"
            rows="3"
            maxlength="300"
            placeholder="اختياري..."
          ></textarea>
        </div>

        <p class="input-error-msg hidden" id="occasion-form-error">لو سمحت كمّل التصنيف والعنوان واسم صاحب المناسبة</p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--primary" id="occasion-form-submit" type="button">نشر المناسبة</button>
        <button class="btn btn--ghost" id="occasion-form-cancel" type="button">إلغاء</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
const categoryEl    = backdrop.querySelector('#occasion-form-category');
const titleEl       = backdrop.querySelector('#occasion-form-title');
const ownerEl        = backdrop.querySelector('#occasion-form-owner');
const ownerLabelEl   = backdrop.querySelector('#occasion-form-owner-label');
const dateEl            = backdrop.querySelector('#occasion-form-date');
const dateLabelEl       = backdrop.querySelector('#occasion-form-date-label');
const locationGroupEl      = backdrop.querySelector('#occasion-form-location-group');
const locationEl           = backdrop.querySelector('#occasion-form-location');
const locationLabelEl      = backdrop.querySelector('#occasion-form-location-label');
const textEl        = backdrop.querySelector('#occasion-form-text');
const errorEl       = backdrop.querySelector('#occasion-form-error');
const submitBtn     = backdrop.querySelector('#occasion-form-submit');
function _applyCategoryFields(key) {
const cat = getOccasionCategory(key);
ownerLabelEl.textContent = cat.ownerLabel;
ownerEl.placeholder      = cat.ownerPlaceholder;
dateLabelEl.textContent = cat.dateLabel;
dateEl.placeholder      = cat.datePlaceholder;
if (cat.showLocation) {
locationGroupEl.classList.remove('hidden');
locationLabelEl.textContent = cat.locationLabel;
locationEl.placeholder      = cat.locationPlaceholder;
} else {
locationGroupEl.classList.add('hidden');
locationEl.value = '';
}
}
categoryEl.addEventListener('change', () => _applyCategoryFields(categoryEl.value));
_applyCategoryFields(categoryEl.value);
const close = () => closeAddOccasionModal();
const submit = async () => {
const category = categoryEl.value;
const title = titleEl.value.trim();
const ownerName = ownerEl.value.trim();
if (!category || !title || !ownerName) {
errorEl.textContent = `لو سمحت كمّل التصنيف والعنوان و${getOccasionCategory(category).ownerLabel}`;
errorEl.classList.remove('hidden');
return;
}
errorEl.classList.add('hidden');
const user = getCurrentUser();
submitBtn.disabled = true;
submitBtn.textContent = 'قاعدين ننشر...';
try {
const occasion = await addOccasion({
title,
ownerName,
category,
eventDate: dateEl.value.trim(),
eventLocation: locationEl.value.trim(),
text: textEl.value.trim(),
authorUid: user?.uid,
authorName: user?.displayName || 'مستخدم',
...staffRoleField(),
});
close();
if (occasion?.moderation !== 'pending') showToast('مناسبتك اتنشرت تمام', 'success');
onSuccess?.(occasion);
} catch (err) {
submitBtn.disabled = false;
submitBtn.textContent = 'نشر المناسبة';
errorEl.textContent = err instanceof SubmissionGuardError ? err.message : (isTransientFailure(err) ? BUSY_HINT : 'المناسبة لسع ما اتنشرت — جرّب تاني بعد لحظات');
errorEl.classList.remove('hidden');
}
};
backdrop.querySelector('#occasion-form-cancel').addEventListener('click', close);
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
submitBtn.addEventListener('click', submit);
_cleanup = () => backdrop.remove();
}
export function closeAddOccasionModal() {
if (_cleanup) {
_cleanup();
_cleanup = null;
}
}
