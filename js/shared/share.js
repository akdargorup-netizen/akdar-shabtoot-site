import { showToast } from './toast.js';
export async function shareContent({ title, text = '', url = location.href }) {
if (navigator.share) {
try {
await navigator.share({ title, text, url });
} catch (err) {
if (err.name !== 'AbortError') {
fallbackCopy(url);
showToast('اتنسخ الرابط ✓', 'success');
}
}
} else {
fallbackCopy(url);
showToast('اتنسخ الرابط ✓', 'success');
}
}
function fallbackCopy(text) {
if (navigator.clipboard) {
navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
} else {
legacyCopy(text);
}
}
function legacyCopy(text) {
const ta = document.createElement('textarea');
ta.value = text;
ta.style.cssText = 'position:fixed;opacity:0;';
document.body.appendChild(ta);
ta.select();
document.execCommand('copy');
document.body.removeChild(ta);
}
