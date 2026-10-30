export const thumb  = id => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
export const ytLink = id => `https://youtu.be/${id}`;
export function extractYouTubeId(input) {
if (!input) return null;
const raw = input.trim();
if (/^[\w-]{11}$/.test(raw)) return raw;
let url;
try {
url = new URL(raw);
} catch {
return null;
}
const host = url.hostname.replace(/^www\./, '');
if (host === 'youtu.be') {
return url.pathname.split('/').filter(Boolean)[0] || null;
}
if (host === 'youtube.com' || host === 'm.youtube.com') {
if (url.searchParams.has('v')) return url.searchParams.get('v');
const parts = url.pathname.split('/').filter(Boolean);
if (['shorts', 'embed', 'live'].includes(parts[0])) return parts[1] || null;
}
return null;
}
