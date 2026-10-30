import { RUNTIME_CONFIG } from './runtime-config.js';
import { getSupabase } from './supabase-client.js';
const REAL_AUTH_KEY = 'auth_local_real_profile';
const SNAPSHOT_KEY = 'sbb:last-user';
const CLAIMS_KEY = 'sbb:claims:';
const DISPLAY_NAME_MAX_LENGTH = 40;
let _currentUser = null;
let _sb = null;
let _session = null;
const _listeners = new Set();
function _notify() {
_listeners.forEach(cb => cb(_currentUser));
}
let _resolveAuthReady;
const _authReadyPromise = new Promise((resolve) => { _resolveAuthReady = resolve; });
function _getSavedRealProfile() {
try {
const raw = localStorage.getItem(REAL_AUTH_KEY);
return raw ? JSON.parse(raw) : null;
} catch {
return null;
}
}
function _saveDisplayName(uid, name) {
try {
localStorage.setItem(REAL_AUTH_KEY, JSON.stringify({ uid, displayName: name }));
} catch {   }
}
function _loadSavedDisplayName(uid) {
const saved = _getSavedRealProfile();
return (saved && saved.uid === uid) ? saved.displayName : null;
}
function _isDebugMode() {
try {
const inSearch = new URLSearchParams(location.search).get('debug') === '1';
const inHash = /[?&]debug=1(?:&|$)/.test(location.hash || '');
return inSearch || inHash;
} catch {
return false;
}
}
function _saveSnapshot(user) {
try {
if (user) localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(user));
else localStorage.removeItem(SNAPSHOT_KEY);
} catch {   }
}
function _loadSnapshot() {
try {
const s = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || 'null');
return s && typeof s.uid === 'string' ? s : null;
} catch {
return null;
}
}
function _cachedClaims(uid) {
try { return JSON.parse(localStorage.getItem(CLAIMS_KEY + uid) || '{}') || {}; } catch { return {}; }
}
function _saveClaims(uid, claims) {
try { localStorage.setItem(CLAIMS_KEY + uid, JSON.stringify(claims || {})); } catch {   }
}
async function _toast(msg, kind, ms) {
const { showToast } = await import('../shared/toast.js').catch(() => ({}));
showToast?.(msg, kind, ms);
}
async function _loadClaims(user) {
if (!user || user.is_anonymous || !_sb) return {};
try {
const { data, error } = await _sb
.from('user_roles')
.select('is_owner, is_admin, is_nubian')
.eq('user_id', user.id)
.maybeSingle();
if (error) return null;
if (!data) return {};
return {
owner: data.is_owner === true,
admin: data.is_admin === true || data.is_owner === true,
nubian: data.is_nubian === true,
};
} catch {
return null;
}
}
let _applySeq = 0;
let _namePromise = null;
async function _applySession(session, { awaitClaims = false, event = '' } = {}) {
const seq = ++_applySeq;
_session = session || null;
const u = session?.user;
if (!u) {
if (event !== 'SIGNED_OUT' && typeof navigator !== 'undefined' && navigator.onLine === false) return;
_currentUser = null;
_saveSnapshot(null);
_notify();
return;
}
const meta = u.user_metadata || {};
const anon = !!u.is_anonymous;
let claims = anon ? {} : _cachedClaims(u.id);
if (!anon && awaitClaims) {
const fresh = await _loadClaims(u);
if (seq !== _applySeq) return;
if (fresh) { claims = fresh; _saveClaims(u.id, fresh); }
}
const savedName = _loadSavedDisplayName(u.id);
_currentUser = {
uid: u.id,
isAnonymous: anon,
displayName: savedName || meta.full_name || meta.name || null,
photoURL: meta.avatar_url || meta.picture || null,
claims,
};
_saveSnapshot(_currentUser);
_notify();
_resolveAuthReady();
if (!anon && !awaitClaims) {
_loadClaims(u).then((fresh) => {
if (!fresh || seq !== _applySeq || !_currentUser || _currentUser.uid !== u.id) return;
_saveClaims(u.id, fresh);
if (JSON.stringify(fresh) !== JSON.stringify(_currentUser.claims)) {
_currentUser = { ..._currentUser, claims: fresh };
_saveSnapshot(_currentUser);
_notify();
}
});
}
if (!anon && !savedName) _ensureDisplayName(meta);
}
function _ensureDisplayName(meta) {
if (_namePromise) return _namePromise;
_namePromise = (async () => {
try {
const { promptRequiredName } = await import('../shared/name-required-modal.js');
const name = await promptRequiredName(meta.full_name || meta.name || '', DISPLAY_NAME_MAX_LENGTH);
if (!_currentUser || _currentUser.isAnonymous) return;
_saveDisplayName(_currentUser.uid, name);
_currentUser = { ..._currentUser, displayName: name };
_notify();
_toast(`تم تسجيل الدخول باسم ${name}`, 'success', 3000);
} catch (err) {
console.error('[Auth] فشل طلب الاسم الظاهر:', err);
}
})().finally(() => { _namePromise = null; });
return _namePromise;
}
export async function initAuth() {
if (RUNTIME_CONFIG.useLocalDemoUser) {
_currentUser = {
uid: 'local-dev-user',
isAnonymous: false,
displayName: 'مستخدم تجريبي',
photoURL: null,
claims: {},
};
_notify();
_resolveAuthReady();
return _currentUser;
}
const snapshot = _loadSnapshot();
if (snapshot && !_currentUser) {
_currentUser = snapshot;
_notify();
}
try {
_sb = await getSupabase();
} catch (err) {
console.error('[Auth] تعذّر تحميل مكتبة Supabase (الشبكة؟):', err);
_resolveAuthReady();
return null;
}
_sb.auth.onAuthStateChange((event, session) => {
setTimeout(() => { _applySession(session, { event }); }, 0);
});
let session = null;
try {
({ data: { session } } = await _sb.auth.getSession());
} catch {   }
if (session) await _applySession(session);
if (!session && !_session) {
if (_currentUser && !(typeof navigator !== 'undefined' && navigator.onLine === false)) {
_currentUser = null;
_saveSnapshot(null);
_notify();
}
_resolveAuthReady();
}
return _currentUser;
}
let _ensurePromise = null;
const _ENSURE_RETRY_MS = [1500, 4000];
export function ensureSession() {
if (_session || RUNTIME_CONFIG.useLocalDemoUser) return Promise.resolve(true);
if (_ensurePromise) return _ensurePromise;
_ensurePromise = (async () => {
try {
if (!_sb) _sb = await getSupabase();
for (let i = 0; i <= _ENSURE_RETRY_MS.length; i++) {
if (_session) return true;
if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
try {
const { data: { session: existing } } = await _sb.auth.getSession();
if (existing) { await _applySession(existing); return true; }
const { data, error } = await _sb.auth.signInAnonymously();
if (error) throw error;
if (data?.session) await _applySession(data.session);
return true;
} catch (err) {
if (i === _ENSURE_RETRY_MS.length) {
console.error('[Auth] فشل إنشاء الجلسة المجهولة (راجع تفعيل Allow anonymous sign-ins):', err);
return false;
}
await new Promise((r) => setTimeout(r, _ENSURE_RETRY_MS[i] * (0.7 + Math.random() * 0.6)));
}
}
return false;
} catch (err) {
console.error('[Auth] تعذّر تهيئة الجلسة:', err);
return false;
} finally {
_ensurePromise = null;
}
})();
return _ensurePromise;
}
export function waitForAuthReady() {
return _authReadyPromise;
}
let _fbReady = null;
let _fbPromise = null;
export function preloadGoogleSignIn() {
if (_fbReady) return Promise.resolve(_fbReady);
if (_fbPromise) return _fbPromise;
_fbPromise = Promise.all([
import('./firebase-init.js'),
import('https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js'),
]).then(([{ app }, fb]) => (_fbReady = { app, fb }))
.catch((err) => { _fbPromise = null; throw err; });
_fbPromise.catch(() => {});
return _fbPromise;
}
export async function signInWithGoogle() {
let fbAuth = null;
try {
if (!_sb) _sb = await getSupabase();
const { app, fb } = _fbReady || await preloadGoogleSignIn();
const { getAuth, GoogleAuthProvider, signInWithPopup, signOut: fbSignOut } = fb;
fbAuth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
const result = await signInWithPopup(fbAuth, provider);
const idToken = GoogleAuthProvider.credentialFromResult(result)?.idToken;
try { await fbSignOut(fbAuth); } catch {   }
if (!idToken) throw new Error('no_google_id_token');
const { data, error } = await _sb.auth.signInWithIdToken({ provider: 'google', token: idToken });
if (error) throw error;
await _applySession(data.session, { awaitClaims: true });
if (_namePromise) await _namePromise;
return _currentUser;
} catch (err) {
if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
return null;
}
console.error('[Auth] فشل تسجيل الدخول بجوجل:', err);
const debugSuffix = _isDebugMode() ? ` [${err?.code || err?.message || 'بدون-كود'}]` : '';
_toast(`الدخول بحساب جوجل ما اكتمل — جرّب تاني.${debugSuffix}`, 'error', 6000);
return null;
}
}
export async function updateDisplayName(newName) {
const trimmed = (newName || '').trim().slice(0, DISPLAY_NAME_MAX_LENGTH);
if (!trimmed || !_currentUser || _currentUser.isAnonymous) return false;
_currentUser = { ..._currentUser, displayName: trimmed };
_saveDisplayName(_currentUser.uid, trimmed);
_notify();
return true;
}
export async function signOut() {
if (RUNTIME_CONFIG.useLocalDemoUser) {
_currentUser = {
uid: 'local-dev-user',
isAnonymous: false,
displayName: 'مستخدم تجريبي',
photoURL: null,
claims: {},
};
_notify();
return _currentUser;
}
try { localStorage.removeItem(REAL_AUTH_KEY); } catch {   }
try {
if (!_sb) _sb = await getSupabase();
await _sb.auth.signOut({ scope: 'local' });
} catch (err) {
console.error('[Auth] فشل تسجيل الخروج:', err);
}
}
export async function requireRealAuth() {
if (!(_currentUser && !_currentUser.isAnonymous)) {
const { openLoginPrompt } = await import('../shared/login-prompt-modal.js').catch(() => ({}));
if (!openLoginPrompt) return false;
const signedIn = await openLoginPrompt();
if (!signedIn) return false;
}
try {
const { requireNotBanned } = await import('../shared/member-ban-gate.js');
return await requireNotBanned();
} catch {
return true;
}
}
export async function getIdToken() {
try {
if (!_sb) return null;
const { data: { session } } = await _sb.auth.getSession();
if (!session || session.user?.is_anonymous) return null;
return session.access_token || null;
} catch {
return null;
}
}
export function isAdmin() {
return _currentUser?.claims?.admin === true;
}
export function isOwner() {
return _currentUser?.claims?.owner === true;
}
export async function refreshClaims() {
const u = _session?.user;
if (!u || !_currentUser) return _currentUser;
try {
const claims = await _loadClaims(u);
if (claims) {
_saveClaims(u.id, claims);
_currentUser = { ..._currentUser, claims };
_saveSnapshot(_currentUser);
_notify();
}
} catch (err) {
console.warn('[Auth] تعذّر تحديث الصلاحيات:', err);
}
return _currentUser;
}
export function getCurrentUser() {
return _currentUser;
}
export function onAuthChange(callback) {
_listeners.add(callback);
callback(_currentUser);
return () => _listeners.delete(callback);
}
