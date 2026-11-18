const THEME_KEY = 'app-theme';
const CHROME_COLOR = { light: '#f2f2e6', dark: '#1b1c14' };
const mql = typeof window !== 'undefined' && window.matchMedia
? window.matchMedia('(prefers-color-scheme: dark)')
: null;
function _prefersColorSchemeSupported() {
try {
if (!mql || mql.media === 'not all') return false;
return mql.matches || window.matchMedia('(prefers-color-scheme: light)').matches;
} catch { return false; }
}
function _nightNow() {
const h = new Date().getHours();
return h >= 19 || h < 5;
}
export function resolveScheme(theme) {
if (theme === 'light') return 'light';
if (_prefersColorSchemeSupported()) return mql.matches ? 'dark' : 'light';
return _nightNow() ? 'dark' : 'light';
}
export function getStoredTheme() {
try { return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'system'; }
catch { return 'system'; }
}
function paint(theme) {
const root   = document.documentElement;
theme = theme === 'light' ? 'light' : 'system';
const scheme = resolveScheme(theme);
root.setAttribute('data-theme', theme);
root.setAttribute('data-scheme', scheme);
const meta = document.querySelector('meta[name="theme-color"]');
if (meta) meta.setAttribute('content', CHROME_COLOR[scheme]);
return scheme;
}
export function applyTheme(theme, withTransition = false) {
const root = document.documentElement;
const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
if (withTransition && !reduce) {
root.setAttribute('data-theme-changing', '');
clearTimeout(applyTheme._t);
applyTheme._t = setTimeout(() => root.removeAttribute('data-theme-changing'), 450);
}
return paint(theme);
}
let _inited = false;
export function initTheme() {
paint(getStoredTheme());
if (_inited) return;
_inited = true;
const onChange = () => {
if (getStoredTheme() === 'system') applyTheme('system', true);
};
if (mql) {
if (mql.addEventListener) mql.addEventListener('change', onChange);
else if (mql.addListener)  mql.addListener(onChange);
}
document.addEventListener('visibilitychange', () => {
if (document.visibilityState === 'visible' && getStoredTheme() === 'system' && !_prefersColorSchemeSupported()) {
applyTheme('system');
}
});
}
