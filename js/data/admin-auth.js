import { getCurrentUser, waitForAuthReady } from './auth.js';
import { IS_DEVELOPMENT } from './runtime-config.js';
export const ADMIN_AUTH_MODE = 'claims';
const RECOVERY_PASSWORD_HASH = IS_DEVELOPMENT &&
['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
? '84998ac03625b20558ccbf98fd27f7a36767be620676806b1635262ceafb8924'
: '';
const SESSION_KEY       = 'admin_gate_unlocked';
const SESSION_ROLE_KEY  = 'admin_gate_role';
const SESSION_ACCOUNT_KEY = 'admin_gate_account_id';
const ACCOUNTS_KEY = 'admin_accounts';
async function _sha256Hex(text) {
const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function _genId() {
return crypto?.randomUUID?.() || `acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
const _isClaimsMode = () => ADMIN_AUTH_MODE === 'claims';
let _softLockedUid = null;
function _claimsRole() {
const u = getCurrentUser();
if (!u || u.isAnonymous) return null;
const c = u.claims || {};
if (c.owner === true) return 'developer';
if (c.nubian === true) return 'nubian';
return null;
}
function _activeClaimsRole() {
const u = getCurrentUser();
if (u && _softLockedUid && u.uid === _softLockedUid) return null;
return _claimsRole();
}
export async function whenAdminAuthReady(timeoutMs = 8000) {
if (!_isClaimsMode()) return;
await Promise.race([
waitForAuthReady(),
new Promise(resolve => setTimeout(resolve, timeoutMs)),
]);
}
export async function enterAdminWithClaims() {
if (!_isClaimsMode()) return false;
_softLockedUid = null;
return _claimsRole() || false;
}
export function getAdminActorName() {
if (!_isClaimsMode()) return null;
return getCurrentUser()?.displayName || 'حساب بدون اسم';
}
function _readAccounts() {
try {
const raw = localStorage.getItem(ACCOUNTS_KEY);
const list = raw ? JSON.parse(raw) : [];
return Array.isArray(list) ? list : [];
} catch {
return [];
}
}
function _writeAccounts(list) {
localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
}
export function getAdminAccounts() {
return _readAccounts()
.map(({ id, name, role, createdAt }) => ({ id, name, role, createdAt }))
.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export async function addAdminAccount({ name, password, role }) {
if (_isClaimsMode()) throw new Error('الحسابات المحلية معطّلة — الصلاحيات من جدول user_roles في Supabase');
const trimmedName = (name || '').trim();
if (!trimmedName) throw new Error('الاسم مطلوب');
if (!password || password.length < 4) throw new Error('كلمة السر لازم ٤ حروف/أرقام على الأقل');
if (!['developer', 'admin', 'nubian'].includes(role)) throw new Error('الدور ما معروف');
const accounts = _readAccounts();
const passwordHash = await _sha256Hex(password);
const account = {
id: _genId(),
name: trimmedName,
role,
passwordHash,
createdAt: new Date().toISOString(),
};
accounts.push(account);
_writeAccounts(accounts);
const { id, name: n, role: r, createdAt } = account;
return { id, name: n, role: r, createdAt };
}
export function removeAdminAccount(id) {
if (_isClaimsMode()) return;
const accounts = _readAccounts().filter(a => a.id !== id);
_writeAccounts(accounts);
if (sessionStorage.getItem(SESSION_ACCOUNT_KEY) === id) {
lockAdminSession();
}
}
export async function resetAdminAccountPassword(id, newPassword) {
if (_isClaimsMode()) throw new Error('الحسابات المحلية متعطلة — الصلاحيات بتجي من جدول user_roles في Supabase');
if (!newPassword || newPassword.length < 4) throw new Error('كلمة السر لازم ٤ حروف/أرقام على الأقل');
const accounts = _readAccounts();
const account = accounts.find(a => a.id === id);
if (!account) throw new Error('الحساب ما موجود');
account.passwordHash = await _sha256Hex(newPassword);
_writeAccounts(accounts);
}
export async function unlockAdminSession(password) {
if (_isClaimsMode()) return false;
if (!password) return false;
const hash = await _sha256Hex(password);
if (RECOVERY_PASSWORD_HASH && hash === RECOVERY_PASSWORD_HASH) {
sessionStorage.setItem(SESSION_KEY, '1');
sessionStorage.setItem(SESSION_ROLE_KEY, 'developer');
sessionStorage.setItem(SESSION_ACCOUNT_KEY, 'recovery');
return 'developer';
}
const account = _readAccounts().find(a => a.passwordHash === hash);
if (account) {
sessionStorage.setItem(SESSION_KEY, '1');
sessionStorage.setItem(SESSION_ROLE_KEY, account.role);
sessionStorage.setItem(SESSION_ACCOUNT_KEY, account.id);
return account.role;
}
return false;
}
export function isAdminSessionUnlocked() {
if (_isClaimsMode()) return _activeClaimsRole() !== null;
return sessionStorage.getItem(SESSION_KEY) === '1';
}
export function getAdminRole() {
if (_isClaimsMode()) return _activeClaimsRole();
if (!isAdminSessionUnlocked()) return null;
return sessionStorage.getItem(SESSION_ROLE_KEY) || null;
}
export function getStaffRole() {
if (_isClaimsMode()) return _claimsRole() || '';
return getAdminRole() || '';
}
export function getAdminAccountId() {
if (_isClaimsMode()) return _activeClaimsRole() ? (getCurrentUser()?.uid || null) : null;
if (!isAdminSessionUnlocked()) return null;
return sessionStorage.getItem(SESSION_ACCOUNT_KEY) || null;
}
export function isDeveloperSession() {
return getAdminRole() === 'developer';
}
export function lockAdminSession() {
if (_isClaimsMode()) {
_softLockedUid = getCurrentUser()?.uid || null;
return;
}
sessionStorage.removeItem(SESSION_KEY);
sessionStorage.removeItem(SESSION_ROLE_KEY);
sessionStorage.removeItem(SESSION_ACCOUNT_KEY);
}
export function isGateConfigured() {
if (_isClaimsMode()) return true;
return Boolean(RECOVERY_PASSWORD_HASH) || _readAccounts().length > 0;
}
