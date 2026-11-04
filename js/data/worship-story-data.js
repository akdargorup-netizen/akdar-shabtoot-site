export const WORSHIP_STORIES = [
];
function _dayOfYear(date) {
const start = new Date(date.getFullYear(), 0, 0);
const diff = date - start;
return Math.floor(diff / 86400000);
}
export function getTodayStory() {
const total = WORSHIP_STORIES.length;
if (!total) return null;
const idx = _dayOfYear(new Date()) % total;
return WORSHIP_STORIES[idx];
}
