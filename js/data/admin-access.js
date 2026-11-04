export const ADMIN_CONTENT_OPEN_TO_ADMINS = false;
const ALWAYS_DEVELOPER = new Set([
'admin-notifications', 'admin-members', 'admin-inbox', 'admin-idea-box',
'admin-occasions', 'admin-permissions', 'admin-activity-log', 'admin-backup', 'admin-ai',
]);
const CONTENT_PAGES = new Set([
'admin-news', 'admin-events', 'admin-study', 'admin-lectures', 'admin-gallery', 'admin-history',
'admin-association-journey', 'admin-projects', 'admin-contacts', 'admin-nubian',
]);
export function allowedRolesFor(page, defRoles) {
if (ALWAYS_DEVELOPER.has(page)) return ['developer'];
if (page === 'admin-nubian' || page.startsWith('admin-nubian-')) return ['developer', 'nubian'];
if (CONTENT_PAGES.has(page) && !ADMIN_CONTENT_OPEN_TO_ADMINS) return ['developer'];
return defRoles || ['developer', 'admin'];
}
export function canAccessAdminPage(role, page, defRoles) {
return allowedRolesFor(page, defRoles).includes(role);
}
