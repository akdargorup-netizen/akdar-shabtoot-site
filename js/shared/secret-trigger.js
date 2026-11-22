export function bindSecretTap(el, { taps = 7, windowMs = 2000, onUnlock }) {
if (!el || typeof onUnlock !== 'function') return () => {};
let count = 0;
let timer = null;
const reset = () => { count = 0; timer = null; };
const handler = () => {
count += 1;
if (timer) clearTimeout(timer);
timer = setTimeout(reset, windowMs);
if (count >= taps) {
reset();
onUnlock();
}
};
el.addEventListener('click', handler);
return () => {
el.removeEventListener('click', handler);
if (timer) clearTimeout(timer);
};
}
