export function formatRelativeTime(iso) {
if (!iso) return '';
if (typeof iso.toDate === 'function') iso = iso.toDate().toISOString();
const diffMs = Date.now() - new Date(iso).getTime();
const min    = Math.floor(diffMs / 60000);
const hour   = Math.floor(diffMs / 3600000);
const day    = Math.floor(diffMs / 86400000);
if (min < 1)   return 'الآن';
if (min < 60)  return `منذ ${min} دقيقة`;
if (hour < 24) return `منذ ${hour} ساعة`;
if (day === 1) return 'أمس';
if (day < 7)   return `منذ ${day} أيام`;
return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
}
