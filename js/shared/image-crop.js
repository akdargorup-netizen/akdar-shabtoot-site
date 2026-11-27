import { setBackInterceptor } from '../core/router.js';
const MIN_SIDE = 0.05;
const MAX_ZOOM = 4;
const PRESETS = [
{ key: 'orig', label: 'الأصلية' },
{ key: '16:9', label: '16:9', r: 16 / 9 },
{ key: '3:2',  label: '3:2',  r: 3 / 2 },
{ key: '4:3',  label: '4:3',  r: 4 / 3 },
{ key: '1:1',  label: '1:1',  r: 1 },
{ key: '3:4',  label: '3:4',  r: 3 / 4 },
];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
export function normalizeCrop(c) {
if (!c || typeof c !== 'object') return null;
const { x, y, w, h, ratio } = c;
if (![x, y, w, h, ratio].every(isNum)) return null;
if (w < MIN_SIDE || h < MIN_SIDE || w > 1.0001 || h > 1.0001) return null;
if (x < -0.0001 || y < -0.0001 || x + w > 1.0001 || y + h > 1.0001) return null;
if (ratio < 0.2 || ratio > 6) return null;
return { x, y, w, h, ratio };
}
export function applyImageCrop(wrap, img, crop) {
const c = normalizeCrop(crop);
if (!wrap || !img) return false;
if (!c) {
wrap.classList.remove('is-cropped');
wrap.style.aspectRatio = '';
for (const p of ['width', 'height', 'left', 'top']) img.style[p] = '';
return false;
}
wrap.classList.add('is-cropped');
wrap.style.aspectRatio = String(c.ratio);
img.style.width  = `${100 / c.w}%`;
img.style.height = `${100 / c.h}%`;
img.style.left   = `${(-c.x / c.w) * 100}%`;
img.style.top    = `${(-c.y / c.h) * 100}%`;
return true;
}
export function computeCropRect(W, H, ratio, zoom, cx, cy) {
const imgAR = W / H;
let bw; let bh;
if (ratio >= imgAR) { bw = 1; bh = imgAR / ratio; } else { bh = 1; bw = ratio / imgAR; }
const w = bw / zoom;
const h = bh / zoom;
return {
x: clamp(cx - w / 2, 0, 1 - w),
y: clamp(cy - h / 2, 0, 1 - h),
w, h, ratio,
};
}
function loadImage(src) {
return new Promise((resolve, reject) => {
const im = new Image();
im.decoding = 'async';
im.onload = () => (im.naturalWidth && im.naturalHeight ? resolve(im) : reject(new Error('empty')));
im.onerror = () => reject(new Error('load'));
im.src = src;
});
}
function el(tag, cls, text) {
const n = document.createElement(tag);
if (cls) n.className = cls;
if (text != null) n.textContent = text;
return n;
}
export async function openCropEditor({ src, crop, onSave }) {
if (document.querySelector('.crop-editor')) return;
let natural;
try { natural = await loadImage(src); } catch { throw new Error('تعذّر تحميل الصورة للقصّ'); }
const W = natural.naturalWidth;
const H = natural.naturalHeight;
const imgAR = W / H;
const ORIG = clamp(imgAR, 0.25, 5.5);
const saved = normalizeCrop(crop);
let ratio = saved ? saved.ratio : ORIG;
let zoom = 1;
let cx = 0.5;
let cy = 0.5;
if (saved) {
const base = computeCropRect(W, H, saved.ratio, 1, 0.5, 0.5);
zoom = clamp(base.w / saved.w, 1, MAX_ZOOM);
cx = saved.x + saved.w / 2;
cy = saved.y + saved.h / 2;
}
const box = el('div', 'crop-editor');
box.setAttribute('role', 'dialog');
box.setAttribute('aria-modal', 'true');
box.setAttribute('aria-label', 'قصّ الصورة');
const sheet = el('div', 'crop-editor__sheet');
const title = el('h3', 'crop-editor__title', 'قصّ الصورة للمقال');
const note = el('p', 'crop-editor__note', 'القصّ للعرض في المقال فقط — الصورة الأصلية ما بتتغيّر. اسحب الصورة لتحريكها.');
const stage = el('div', 'crop-editor__stage');
const frame = el('div', 'crop-editor__frame');
const img = document.createElement('img');
img.className = 'crop-editor__img';
img.alt = '';
img.draggable = false;
img.src = src;
frame.appendChild(img);
stage.appendChild(frame);
const ratios = el('div', 'crop-editor__ratios');
ratios.setAttribute('role', 'group');
ratios.setAttribute('aria-label', 'شكل الإطار');
const chipFor = new Map();
for (const p of PRESETS) {
const b = el('button', 'crop-editor__chip', p.label);
b.type = 'button';
b.addEventListener('click', () => { ratio = p.r || ORIG; refresh(); });
chipFor.set(p.key, b);
ratios.appendChild(b);
}
const zoomRow = el('label', 'crop-editor__zoom');
const zoomLabel = el('span', 'crop-editor__zoom-label', 'التكبير');
const slider = document.createElement('input');
slider.type = 'range';
slider.min = '100';
slider.max = String(MAX_ZOOM * 100);
slider.step = '1';
slider.className = 'crop-editor__slider';
slider.addEventListener('input', () => { zoom = clamp(Number(slider.value) / 100, 1, MAX_ZOOM); refresh(); });
zoomRow.append(zoomLabel, slider);
const err = el('p', 'crop-editor__error');
err.hidden = true;
const actions = el('div', 'crop-editor__actions');
const saveBtn = el('button', 'btn btn--primary btn--full', 'حفظ القصّ');
const resetBtn = el('button', 'btn btn--ghost btn--full', 'رجوع للصورة الأصلية بلا قصّ');
const cancelBtn = el('button', 'btn btn--ghost btn--full', 'إلغاء');
for (const b of [saveBtn, resetBtn, cancelBtn]) b.type = 'button';
actions.append(saveBtn, resetBtn, cancelBtn);
sheet.append(title, note, stage, ratios, zoomRow, err, actions);
box.appendChild(sheet);
const current = () => computeCropRect(W, H, ratio, zoom, cx, cy);
function refresh() {
const r = current();
cx = r.x + r.w / 2;
cy = r.y + r.h / 2;
applyImageCrop(frame, img, r);
slider.value = String(Math.round(zoom * 100));
let active = null;
for (const p of PRESETS) {
const pr = p.r || ORIG;
if (Math.abs(pr - ratio) < 0.001) { active = p.key; break; }
}
for (const [k, b] of chipFor) b.classList.toggle('is-active', k === active);
}
let drag = null;
frame.addEventListener('pointerdown', (e) => {
drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
try { frame.setPointerCapture(e.pointerId); } catch {   }
});
frame.addEventListener('pointermove', (e) => {
if (!drag || e.pointerId !== drag.id) return;
const fw = frame.clientWidth || 1;
const fh = frame.clientHeight || 1;
const r = current();
cx -= ((e.clientX - drag.x) / fw) * r.w;
cy -= ((e.clientY - drag.y) / fh) * r.h;
drag.x = e.clientX;
drag.y = e.clientY;
refresh();
});
const endDrag = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
frame.addEventListener('pointerup', endDrag);
frame.addEventListener('pointercancel', endDrag);
const close = () => {
box.remove();
document.removeEventListener('keydown', onKey);
setBackInterceptor(null);
};
const onKey = (e) => { if (e.key === 'Escape') close(); };
document.addEventListener('keydown', onKey);
setBackInterceptor(() => {
if (box.isConnected) { close(); return true; }
setBackInterceptor(null);
return false;
});
cancelBtn.addEventListener('click', close);
let busy = false;
const commit = async (value, btn) => {
if (busy) return;
busy = true;
err.hidden = true;
const label = btn.textContent;
for (const b of [saveBtn, resetBtn, cancelBtn]) b.disabled = true;
btn.textContent = 'جارٍ الحفظ…';
try {
await onSave(value);
close();
} catch (e) {
err.textContent = (e && e.message) || 'ما اتحفظ القصّ — جرّب تاني';
err.hidden = false;
btn.textContent = label;
for (const b of [saveBtn, resetBtn, cancelBtn]) b.disabled = false;
} finally {
busy = false;
}
};
saveBtn.addEventListener('click', () => commit(normalizeCrop(current()), saveBtn));
resetBtn.addEventListener('click', () => commit(null, resetBtn));
document.body.appendChild(box);
refresh();
}
