const VISIBLE_MS_MOTION   = 3400;
const VISIBLE_MS_REDUCED  = 2800;
const FADE_MS             = 800;
export function initAppSplash() {
const splash = document.getElementById('app-splash');
if (!splash) return;
let hidden = false;
const remove = () => splash.remove();
const hide = () => {
if (hidden) return;
hidden = true;
splash.classList.add('app-splash--hide');
splash.addEventListener('transitionend', e => { if (e.target === splash) remove(); });
setTimeout(remove, FADE_MS + 400);
};
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const skip = () => {
if (hidden) return;
hide();
const until = Date.now() + 600;
const swallow = e => {
if (Date.now() > until) { cleanup(); return; }
e.preventDefault();
e.stopPropagation();
};
const evts = ['click', 'touchend', 'mouseup', 'pointerup'];
const cleanup = () => evts.forEach(t => document.removeEventListener(t, swallow, true));
evts.forEach(t => document.addEventListener(t, swallow, true));
setTimeout(cleanup, 650);
};
splash.addEventListener('pointerdown', skip, { once: true });
if (reducedMotion) {
setTimeout(hide, VISIBLE_MS_REDUCED);
return;
}
setTimeout(hide, VISIBLE_MS_MOTION);
}
