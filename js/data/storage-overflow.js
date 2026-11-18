import { SUPABASE_URL, SUPABASE_KEY } from './supabase-client.js';
export const STORAGE2_URL = 'https://qomxcmgtvyfdrzkkniwt.supabase.co';
const SWITCH_AT_BYTES = 940 * 1024 * 1024;
const CHECK_KEY = 'akdar_s2_check_v1';
const CHECK_TTL = 10 * 60 * 1000;
export const DUAL_WRITE = false;
const ALT_STAGGER_MS = 6000;
export const AUDIO_PREFIX = 's2/';
const _base2 = () => STORAGE2_URL.replace(/\/+$/, '');
export const dualWriteEnabled = () => DUAL_WRITE && overflowEnabled();
export const overflowEnabled = () => /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(STORAGE2_URL);
export const isSecondaryUrl = (url) => overflowEnabled() && typeof url === 'string' && url.startsWith(`${_base2()}/storage/v1/object/public/`);
async function _token() {
try { return await (await import('./auth.js')).getIdToken(); } catch { return null; }
}
export async function primaryIsFull() {
if (!overflowEnabled()) return false;
try {
const c = JSON.parse(sessionStorage.getItem(CHECK_KEY) || 'null');
if (c && Date.now() - c.t < CHECK_TTL) return c.full === true;
} catch {   }
const token = await _token();
if (!token) return false;
let full = false;
try {
const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/akdar_storage_used`, {
method: 'POST',
headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
body: '{}',
});
if (!res.ok) return false;
full = Number(await res.json()) >= SWITCH_AT_BYTES;
} catch { return false; }
try { sessionStorage.setItem(CHECK_KEY, JSON.stringify({ t: Date.now(), full })); } catch {   }
return full;
}
export function markPrimaryFull() {
try { sessionStorage.setItem(CHECK_KEY, JSON.stringify({ t: Date.now(), full: true })); } catch {   }
}
async function _call(body) {
const token = await _token();
if (!token) throw new Error('no-session');
const res = await fetch(`${SUPABASE_URL}/functions/v1/storage-overflow`, {
method: 'POST',
headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
body: JSON.stringify(body),
});
if (!res.ok) throw Object.assign(new Error('overflow-call-failed'), { status: res.status });
return res.json();
}
export function uploadToSecondary({ bucket, path, blob, contentType, onProgress }) {
return _call({ action: 'sign-upload', bucket, path }).then(({ uploadUrl, publicUrl }) => new Promise((resolve, reject) => {
const xhr = new XMLHttpRequest();
xhr.open('PUT', uploadUrl, true);
xhr.setRequestHeader('Content-Type', contentType || blob.type || 'application/octet-stream');
xhr.setRequestHeader('cache-control', 'max-age=31536000');
xhr.upload.onprogress = (e) => { if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve(publicUrl) : reject(new Error('secondary-upload-failed')));
xhr.onerror = () => reject(new Error('network'));
xhr.send(blob);
}));
}
export async function deleteFromSecondary(bucket, paths) {
if (!overflowEnabled() || !paths?.length) return 0;
try { return (await _call({ action: 'delete', bucket, paths })).removed || 0; } catch { return 0; }
}
export function secondaryPathOf(url, bucket) {
if (!isSecondaryUrl(url)) return '';
const prefix = `${_base2()}/storage/v1/object/public/${bucket}/`;
return url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length).split('?')[0]) : '';
}
export const secondaryClipUrl = (path) => `${_base2()}/storage/v1/object/public/akdar-audio/${path.slice(AUDIO_PREFIX.length)}`;
export async function mirrorToSecondary({ bucket, path, blob, contentType }) {
if (!dualWriteEnabled()) return false;
for (let i = 0; i < 2; i++) {
try {
await uploadToSecondary({ bucket, path, blob, contentType });
return true;
} catch {
if (i === 0) await new Promise((r) => setTimeout(r, 2500));
}
}
return false;
}
export function alternateObjectUrl(url) {
if (!overflowEnabled() || typeof url !== 'string') return '';
const P = '/storage/v1/object/public/';
const a = `${SUPABASE_URL.replace(/\/+$/, '')}${P}`, b = `${_base2()}${P}`;
if (url.startsWith(a)) return b + url.slice(a.length);
if (url.startsWith(b)) return a + url.slice(b.length);
return '';
}
export async function fetchObject(url, init = { mode: 'cors', credentials: 'omit' }) {
const alt = alternateObjectUrl(url);
if (!alt) return fetch(url, init);
const go = (u) => fetch(u, init).then((r) => (r.ok ? r : Promise.reject(r)));
const p1 = go(url);
const p2 = new Promise((resolve, reject) => {
let started = false;
const start = () => { if (!started) { started = true; go(alt).then(resolve, reject); } };
const t = setTimeout(start, ALT_STAGGER_MS);
p1.then(() => clearTimeout(t), () => { clearTimeout(t); start(); });
});
try {
return await Promise.any([p1, p2]);
} catch (agg) {
const first = agg?.errors?.[0];
if (first instanceof Response) return first;
throw first || agg;
}
}
