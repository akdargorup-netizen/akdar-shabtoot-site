import { navigateTo, hasPage }   from './js/core/router.js';
import { initAuth }              from './js/data/auth.js';
import { refreshNotifBadge }     from './js/shared/notif-badge.js';
import { initSectionBadges }     from './js/shared/section-badges.js';
import { initIOSInstallPrompt }  from './js/shared/ios-install-prompt.js';
import { initPermissionOnboarding } from './js/shared/permission-onboarding.js';
import { listenForMessages, syncPushSubscription } from './js/shared/push.js';
import { initKeyboardScroll }    from './js/shared/keyboard-scroll.js';
import { initAppSplash }         from './js/shared/app-splash.js';
import { initTheme }             from './js/shared/theme.js';
import { initHostFailover }      from './js/data/hosts.js';
initAppSplash();
initAuth();
initHostFailover();
(function applyStoredSettings() {
const textSize = localStorage.getItem('app-text-size');
const vision   = localStorage.getItem('vision-enhanced') === 'true';
initTheme();
const normalizedTextSize = (textSize === 'large' || textSize === 'xlarge') ? 'large' : 'normal';
document.documentElement.setAttribute('data-text-size', normalizedTextSize);
if (vision) document.documentElement.setAttribute('data-vision', 'enhanced');
})();
const _onReady = (fn) => (document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn());
_onReady(() => {
const hash      = location.hash.replace('#', '').trim();
const startPage = (hash && hasPage(hash)) ? hash : 'home';
navigateTo(startPage, false);
initKeyboardScroll();
const runSecondaryInit = () => {
window.__akdarReady = true;
refreshNotifBadge();
initSectionBadges();
initPermissionOnboarding();
initIOSInstallPrompt();
listenForMessages();
syncPushSubscription();
try {
const q = localStorage.getItem('sbb:admin-batch-queue');
if (q && q.length > 2) import('./js/shared/admin-batch.js').catch(() => {});
} catch {   }
try {
const pending = ['akdar_occasion_comment_outbox', 'akdar_idea_comment_outbox'].some((k) => (localStorage.getItem(k) || '{}').length > 2);
if (pending) import('./js/shared/comment-outbox.js').catch(() => {});
} catch {   }
try {
if ((localStorage.getItem('akdar_reaction_outbox') || '{}').length > 2) import('./js/shared/reaction-outbox.js').catch(() => {});
} catch {   }
};
setTimeout(() => {
if ('requestIdleCallback' in window) requestIdleCallback(runSecondaryInit, { timeout: 1500 });
else runSecondaryInit();
}, 1000);
scheduleOfflineWarmup();
requestPersistentStorage();
});
function _warmDue() {
try {
const today = new Date().toLocaleDateString('en-CA');
let first = localStorage.getItem('akdar:first-day');
if (!first) {
first = localStorage.getItem('akdar:sessions') ? '0000-00-00' : today;
localStorage.setItem('akdar:first-day', first);
}
return first !== today;
} catch { return false; }
}
function requestPersistentStorage() {
try {
if (!navigator.storage || !navigator.storage.persist) return;
const ask = async () => {
window.removeEventListener('pointerdown', ask, true);
try { if (!(await navigator.storage.persisted())) await navigator.storage.persist(); } catch {   }
};
window.addEventListener('pointerdown', ask, { once: true, capture: true, passive: true });
} catch {   }
}
function scheduleOfflineWarmup() {
const fullWarm = _warmDue();
if (!fullWarm) return;
if (!('serviceWorker' in navigator)) return;
const conn = navigator.connection;
if (conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''))) return;
const send = (type) => navigator.serviceWorker.ready
.then(reg => { if (reg.active) reg.active.postMessage(type === 'WARM_CACHE' ? { type, full: fullWarm } : { type }); })
.catch(() => {   });
let started = false;
let paused = false;
let resumeTimer = null;
const onActivity = () => {
if (!started) return;
if (!paused) { paused = true; send('WARM_PAUSE'); }
clearTimeout(resumeTimer);
resumeTimer = setTimeout(() => { paused = false; send('WARM_RESUME'); }, 6000);
};
['pointerdown', 'touchstart', 'keydown', 'scroll'].forEach(ev =>
window.addEventListener(ev, onActivity, { passive: true, capture: true }));
const go = () => { started = true; send('WARM_CACHE'); };
setTimeout(() => {
if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 5000 });
else go();
}, 8000);
}
