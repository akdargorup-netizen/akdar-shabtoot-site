import { getStaffRole } from '../data/admin-auth.js';
export const STAFF_BADGE_LABELS = {
developer: 'مطوّر',
admin:     'مشرف',
nubian:    'مشرف آنداندي',
};
export function normalizeStaffRole(role) {
return Object.prototype.hasOwnProperty.call(STAFF_BADGE_LABELS, role) ? role : '';
}
export function staffBadge(role) {
const r = normalizeStaffRole(role);
if (!r) return '';
return `<span class="staff-badge staff-badge--${r}">${STAFF_BADGE_LABELS[r]}</span>`;
}
export function staffRoleField() {
const r = normalizeStaffRole(getStaffRole());
return r ? { staffRole: r } : {};
}
