export const RETENTION_DAYS = {
news:          45,
notifications: 45,
ideas:         45,
comments:      45,
occasions:     60,
inbox:         90,
};
export const FEED_LIMIT = {
news:          50,
notifications: 50,
ideas:         50,
comments:      200,
occasions:     50,
inbox:         200,
};
export const RETENTION_LABELS = {
news:          'الأخبار',
notifications: 'الرسائل',
ideas:         'الأفكار',
comments:      'التعليقات',
occasions:     'المناسبات',
inbox:         'الرسائل الواردة',
};
export function isArchived(isoDate, type) {
if (!isoDate) return false;
const date = typeof isoDate.toDate === 'function' ? isoDate.toDate() : new Date(isoDate);
const days = (Date.now() - date.getTime()) / 86400000;
return days > (RETENTION_DAYS[type] ?? Infinity);
}
