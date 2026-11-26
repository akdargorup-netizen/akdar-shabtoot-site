import { getAdminRole, getAdminAccountId, getAdminAccounts, getAdminActorName } from '../data/admin-auth.js';
import { logAdminAction as _persistLog, getActivityLog as _fetchLog } from '../data/db.js';
const ROLE_LABEL = { developer: 'مطوّر', admin: 'مشرف', nubian: 'مشرف الرُطانة' };
function _actorName() {
const real = getAdminActorName();
if (real) return real;
const id = getAdminAccountId();
if (id === 'recovery') return 'مفتاح الاسترجاع';
const account = getAdminAccounts().find(a => a.id === id);
return account?.name || 'حساب محذوف';
}
export async function logAdminAction(action, summary = '') {
try {
await _persistLog({
actorName: _actorName(),
actorRole: ROLE_LABEL[getAdminRole()] || 'غير معروف',
action,
summary,
});
} catch (err) {
console.warn('[AdminActivity] فشل تسجيل الإجراء (الإجراء نفسه سليم):', err);
}
}
export async function getActivityLog(options = {}) {
return _fetchLog(options);
}
