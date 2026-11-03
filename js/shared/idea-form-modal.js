import { addIdea } from '../data/db.js';
import { getCurrentUser } from '../data/auth.js';
import { staffRoleField } from './staff-badge.js';
import { IDEA_CATEGORIES, IDEA_PROPOSED_ENTITIES } from '../data/idea-box-data.js';
import { showToast } from './toast.js';
import { isTransientFailure, BUSY_HINT } from './transient-error.js';
import { SubmissionGuardError } from './submission-guard.js';
let _cleanup = null;
export function openAddIdeaModal(onSuccess) {
closeAddIdeaModal();
const backdrop = document.createElement('div');
backdrop.className = 'overlay-backdrop';
backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="إضافة فكرة جديدة">
      <div class="modal__handle"></div>
      <div class="modal__header">
        <h3 class="modal__title">إضافة فكرة</h3>
      </div>
      <div class="modal__body">

        <div class="input-group">
          <label class="input-label input-label--required" for="idea-form-title">عنوان الفكرة</label>
          <input
            class="input"
            id="idea-form-title"
            type="text"
            maxlength="80"
            placeholder="مثلاً: زراعة أشجار الظل على طريق المدرسة"
          />
        </div>

        <div class="input-group">
          <label class="input-label input-label--required" for="idea-form-desc">وصف الفكرة</label>
          <textarea
            class="input"
            id="idea-form-desc"
            rows="3"
            maxlength="400"
            placeholder="اشرح الفكرة بإيجاز..."
          ></textarea>
        </div>

        <div class="input-group">
          <label class="input-label" for="idea-form-benefit">شنو الفائدة البترجع على البلد؟</label>
          <textarea
            class="input"
            id="idea-form-benefit"
            rows="2"
            maxlength="300"
            placeholder="اختياري..."
          ></textarea>
        </div>

        <div class="input-group">
          <label class="input-label input-label--required" for="idea-form-category">التصنيف</label>
          <select class="input" id="idea-form-category">
            ${IDEA_CATEGORIES.map(c => `<option value="${c.key}">${c.label}</option>`).join('')}
          </select>
        </div>

        <div class="input-group">
          <label class="input-label input-label--required" for="idea-form-entity">الجهة المقترحة للتنفيذ</label>
          <select class="input" id="idea-form-entity">
            ${IDEA_PROPOSED_ENTITIES.map(e => `<option value="${e.key}">${e.label}</option>`).join('')}
          </select>
        </div>

        <div class="input-group hidden" id="idea-form-entity-other-group">
          <label class="input-label" for="idea-form-entity-other">اسم الجهة</label>
          <input
            class="input"
            id="idea-form-entity-other"
            type="text"
            maxlength="80"
            placeholder="اكتب اسم الجهة المقترحة..."
          />
        </div>

        <p class="input-error-msg hidden" id="idea-form-error">لو سمحت كمّل عنوان ووصف وتصنيف الفكرة</p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--primary" id="idea-form-submit" type="button">نشر الفكرة</button>
        <button class="btn btn--ghost" id="idea-form-cancel" type="button">إلغاء</button>
      </div>
    </div>
  `;
document.body.appendChild(backdrop);
const titleEl    = backdrop.querySelector('#idea-form-title');
const descEl     = backdrop.querySelector('#idea-form-desc');
const benefitEl  = backdrop.querySelector('#idea-form-benefit');
const categoryEl = backdrop.querySelector('#idea-form-category');
const entityEl   = backdrop.querySelector('#idea-form-entity');
const otherGroup = backdrop.querySelector('#idea-form-entity-other-group');
const otherEl    = backdrop.querySelector('#idea-form-entity-other');
const errorEl    = backdrop.querySelector('#idea-form-error');
const submitBtn  = backdrop.querySelector('#idea-form-submit');
entityEl.addEventListener('change', () => {
otherGroup.classList.toggle('hidden', entityEl.value !== 'other');
});
const close = () => closeAddIdeaModal();
const submit = async () => {
const title = titleEl.value.trim();
const description = descEl.value.trim();
const categoryKey = categoryEl.value;
if (!title || !description || !categoryKey) {
errorEl.textContent = 'لو سمحت كمّل عنوان ووصف وتصنيف الفكرة';
errorEl.classList.remove('hidden');
return;
}
errorEl.classList.add('hidden');
const entityDef = IDEA_PROPOSED_ENTITIES.find(e => e.key === entityEl.value);
let proposedEntity = entityDef?.label || '';
if (entityEl.value === 'other') {
const otherText = otherEl.value.trim();
proposedEntity = otherText ? `جهة أخرى: ${otherText}` : 'جهة أخرى';
}
const user = getCurrentUser();
submitBtn.disabled = true;
submitBtn.textContent = 'قاعدين ننشر...';
try {
const idea = await addIdea({
title,
description,
benefit: benefitEl.value.trim(),
category: categoryKey,
proposedEntity,
authorUid: user?.uid,
authorName: user?.displayName || 'مستخدم',
...staffRoleField(),
});
close();
if (idea?.moderation !== 'pending') showToast('فكرتك اتنشرت تمام', 'success');
onSuccess?.(idea);
} catch (err) {
submitBtn.disabled = false;
submitBtn.textContent = 'نشر الفكرة';
errorEl.textContent = err instanceof SubmissionGuardError ? err.message : (isTransientFailure(err) ? BUSY_HINT : 'الفكرة لسع ما اتنشرت — جرّب تاني بعد لحظات');
errorEl.classList.remove('hidden');
}
};
backdrop.querySelector('#idea-form-cancel').addEventListener('click', close);
backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
submitBtn.addEventListener('click', submit);
_cleanup = () => backdrop.remove();
}
export function closeAddIdeaModal() {
if (_cleanup) {
_cleanup();
_cleanup = null;
}
}
