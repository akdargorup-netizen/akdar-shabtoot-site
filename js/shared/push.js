import { saveNotification }  from '../data/db.js';
import { refreshNotifBadge } from './notif-badge.js';
import { getDeviceId }       from './device-id.js';
import { RUNTIME_CONFIG }     from '../data/runtime-config.js';
const VAPID_PUBLIC_KEY = 'BLn2CTxKGtebUDGwDvO-2AB5wgorUQ7e0-xmQLGZWI9R9NlfwG5inZJ_NexXSvpqc5EcPUIxtQWDHXuMhIwGT3c';
const STORAGE_KEY = 'push_subscription';
const UPLOADED_KEY = 'push_subscription_uploaded_v2';
const UPLOADED_AT_KEY = 'push_subscription_uploaded_at_v2';
const UPLOADED_ENDPOINT_KEY = 'push_subscription_uploaded_endpoint_v2';
const UPLOAD_REFRESH_MS = 3 * 24 * 3600 * 1000;
function _uploadIsFresh(subscription) {
try {
const at = Number(localStorage.getItem(UPLOADED_AT_KEY) || 0);
return Boolean(subscription?.endpoint)
&& localStorage.getItem(UPLOADED_ENDPOINT_KEY) === subscription.endpoint
&& at > 0 && Date.now() - at < UPLOAD_REFRESH_MS;
} catch { return false; }
}
const RESYNC_AFTER_MS = 3 * 24 * 60 * 60 * 1000;
export async function initPush() {
if (!RUNTIME_CONFIG.enableRealPush) {
console.info('[Push] معطّل في وضع التطوير');
return { supported: false, disabled: true };
}
if (!('Notification' in window)) {
console.info('[Push] المتصفح لا يدعم الإشعارات');
return { supported: false };
}
if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
console.info('[Push] Push API غير متاح على هذا المتصفح');
return { supported: false };
}
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
|| window.navigator.standalone === true;
if (isIOS && !isStandalone) {
return { supported: true, permission: Notification.permission, requiresInstallOnIOS: true };
}
return { supported: true, permission: Notification.permission };
}
export async function requestPermission() {
if (!('Notification' in window)) return 'denied';
let result;
try {
result = await Notification.requestPermission();
} catch (_) {
result = Notification.permission;
}
if (result === 'granted') {
ensureSubscribed();
}
return result;
}
let _subscribing = null;
export function ensureSubscribed() {
if (!RUNTIME_CONFIG.enableRealPush) return Promise.resolve(null);
if (_subscribing) return _subscribing;
_subscribing = _subscribe()
.catch(() => null)
.finally(() => { _subscribing = null; });
return _subscribing;
}
export function syncPushSubscription() {
if (!RUNTIME_CONFIG.enableRealPush) return;
try {
if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
if (Notification.permission !== 'granted') return;
if (_syncedThisSession) return;
_syncedThisSession = true;
ensureSubscribed();
} catch (_) {   }
}
let _syncedThisSession = false;
function _withTimeout(promise, ms, label) {
let timer;
const timeout = new Promise((_, reject) => {
timer = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
});
return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
async function _subscribe() {
if (!VAPID_PUBLIC_KEY) {
console.warn('[Push] VAPID_PUBLIC_KEY فارغ — لم يتم الاشتراك بعد');
return null;
}
try {
const registration = await _withTimeout(navigator.serviceWorker.ready, 15000, 'sw-ready');
let subscription = await registration.pushManager.getSubscription();
const existed = Boolean(subscription);
if (!subscription) {
subscription = await _withTimeout(registration.pushManager.subscribe({
userVisibleOnly: true,
applicationServerKey: _urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
}), 30000, 'push-subscribe');
}
localStorage.setItem(STORAGE_KEY, JSON.stringify(subscription));
console.info('[Push] تم الاشتراك بنجاح');
if (existed && _uploadIsFresh(subscription)) return subscription;
_uploadSubscription(subscription).catch(async (err) => {
console.error('[Push] فشل رفع الاشتراك لـ Supabase (الاشتراك المحلي سليم):', err);
try {
const { showToast } = await import('./toast.js');
showToast('تسجيل جهازك للإشعارات فشل: ' + (err?.message || err?.code || 'خطأ غير معروف'), 'error', 10000);
} catch (_) {   }
});
return subscription;
} catch (err) {
console.error('[Push] فشل الاشتراك:', err);
try {
const { showToast } = await import('./toast.js');
showToast('فشل اشتراك الإشعارات: ' + (err?.message || err?.name || 'خطأ غير معروف'), 'error', 10000);
} catch (_) {   }
return null;
}
}
async function _uploadSubscription(subscription) {
const { ensureSession, getCurrentUser } = await import('../data/auth.js');
await ensureSession();
if (!getCurrentUser()?.uid) throw new Error('push-owner-unavailable');
const { getSupabase } = await import('../data/supabase-client.js');
const sb = await getSupabase();
const { error } = await sb.rpc('register_push_subscription', {
p_device_id: getDeviceId(),
p_subscription: subscription.toJSON(),
});
if (error) throw error;
try {
localStorage.setItem(UPLOADED_KEY, '1');
localStorage.setItem(UPLOADED_AT_KEY, String(Date.now()));
localStorage.setItem(UPLOADED_ENDPOINT_KEY, String(subscription.endpoint || ''));
} catch (_) {   }
console.info('[Push] تم رفع الاشتراك لـ Supabase');
}
function _urlBase64ToUint8Array(base64String) {
const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
const rawData = window.atob(base64);
return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
export function listenForMessages() {
navigator.serviceWorker?.addEventListener('message', async (event) => {
if (event.data?.type === 'PUSH_RECEIVED') {
await _handleIncoming(event.data.payload);
}
if (event.data?.type === 'NOTIFICATION_CLICKED') {
const { navigateTo, hasPage } = await import('../core/router.js');
const page = event.data.page;
navigateTo(hasPage(page) ? page : 'notifications', true);
}
});
}
async function _handleIncoming({ title, body, page } = {}) {
await saveNotification({ title, body, page });
try {
const { showToast } = await import('./toast.js');
showToast(`🔔 ${title}`, 'info', 5000);
} catch (_) {   }
refreshNotifBadge({ fresh: true });
}
const NOTIFY_ENDPOINT = 'https://rtgrkugcokqxseedzunr.supabase.co/functions/v1/send-notification';
export async function sendPush(payload, pushKey) {
if (!RUNTIME_CONFIG.enableRealPush) {
console.info('[Push] لم يتم إرسال Push: الميزة معطّلة في وضع التطوير');
return { sent: false, reason: 'disabled-in-development' };
}
try {
const headers = { 'Content-Type': 'application/json' };
const { getIdToken } = await import('../data/auth.js');
const idToken = await getIdToken();
if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
if (pushKey) headers['X-Push-Key'] = pushKey;
const res = await fetch(NOTIFY_ENDPOINT, {
method: 'POST',
headers,
body: JSON.stringify(payload),
});
const data = await res.json().catch(() => ({}));
if (!res.ok) {
console.error('[Push] فشل تشغيل المرسل الفعلي (الحفظ المحلي سليم):', data);
return { sent: false, reason: data.reason || data.error || 'server-error', status: data.status ?? res.status };
}
return { sent: true };
} catch (err) {
console.error('[Push] فشل تشغيل المرسل الفعلي (الحفظ المحلي سليم):', err);
return { sent: false, reason: 'network-error' };
}
}
export async function unsubscribe() {
try {
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.getSubscription();
if (subscription) await subscription.unsubscribe();
} catch (err) {
console.error('[Push] خطأ أثناء إلغاء الاشتراك:', err);
}
localStorage.removeItem(STORAGE_KEY);
console.info('[Push] تم إلغاء الاشتراك');
try {
const { waitForAuthReady } = await import('../data/auth.js');
await waitForAuthReady();
const { getSupabase } = await import('../data/supabase-client.js');
const sb = await getSupabase();
const { error } = await sb.rpc('unregister_push_subscription', { p_device_id: getDeviceId() });
if (error) throw error;
} catch (err) {
console.error('[Push] فشل حذف الاشتراك من Supabase:', err);
}
}
