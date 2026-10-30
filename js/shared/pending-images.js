const DB_NAME = 'sbb-pending-images';
const STORE   = 'images';
export const TOKEN_PREFIX = 'pending-img:';
const _previewByToken = new Map();
const _tokenByPreview = new Map();
export function isPendingToken(v) {
return typeof v === 'string' && v.startsWith(TOKEN_PREFIX);
}
function _open() {
return new Promise((resolve, reject) => {
if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB غير متاح')); return; }
const req = indexedDB.open(DB_NAME, 1);
req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
req.onsuccess = () => resolve(req.result);
req.onerror = () => reject(req.error || new Error('تعذّر فتح التخزين المحلي'));
});
}
async function _tx(mode, fn) {
const db = await _open();
try {
return await new Promise((resolve, reject) => {
const tx = db.transaction(STORE, mode);
const store = tx.objectStore(STORE);
let result;
Promise.resolve(fn(store)).then(r => { result = r; }).catch(reject);
tx.oncomplete = () => resolve(result);
tx.onerror = () => reject(tx.error);
tx.onabort = () => reject(tx.error || new Error('فشل التخزين المحلي'));
});
} finally {
db.close();
}
}
const _req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
export async function savePendingImage({ blob, thumb = null, pathPrefix = 'uploads' }) {
const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
await _tx('readwrite', (s) => _req(s.put({ id, blob, thumb, pathPrefix, url: '', at: Date.now() })));
const token = TOKEN_PREFIX + id;
_remember(token, blob);
return token;
}
export async function getPendingImage(token) {
if (!isPendingToken(token)) return null;
const id = token.slice(TOKEN_PREFIX.length);
return _tx('readonly', (s) => _req(s.get(id))).catch(() => null);
}
export async function markPendingUploaded(token, url) {
const rec = await getPendingImage(token);
if (!rec) return;
rec.url = url;
await _tx('readwrite', (s) => _req(s.put(rec))).catch(() => {});
}
export async function deletePendingImage(token) {
if (!isPendingToken(token)) return;
const id = token.slice(TOKEN_PREFIX.length);
const url = _previewByToken.get(token);
if (url) { try { URL.revokeObjectURL(url); } catch {   } _tokenByPreview.delete(url); _previewByToken.delete(token); }
await _tx('readwrite', (s) => _req(s.delete(id))).catch(() => {});
}
export async function listPendingTokens() {
const keys = await _tx('readonly', (s) => _req(s.getAllKeys())).catch(() => []);
return (keys || []).map(k => TOKEN_PREFIX + k);
}
function _remember(token, blob) {
if (_previewByToken.has(token)) return _previewByToken.get(token);
const url = URL.createObjectURL(blob);
_previewByToken.set(token, url);
_tokenByPreview.set(url, token);
return url;
}
export function previewUrlFor(token) {
return _previewByToken.get(token) || '';
}
export function tokenForPreview(value) {
return _tokenByPreview.get(value) || value;
}
export async function hydratePreviews(tokens) {
let changed = false;
for (const t of tokens) {
if (_previewByToken.has(t)) continue;
const rec = await getPendingImage(t);
if (rec?.blob) { _remember(t, rec.blob); changed = true; }
}
return changed;
}
