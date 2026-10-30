import { primaryIsFull, markPrimaryFull, overflowEnabled, dualWriteEnabled, mirrorToSecondary, uploadToSecondary, deleteFromSecondary, secondaryPathOf, isSecondaryUrl } from '../storage-overflow.js';
const SUPABASE_URL = 'https://rtgrkugcokqxseedzunr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GweumDJkfZ42oVSQar-uHg_ZUZ7az2K';
const BUCKET       = 'akdar-images';
const EXT_BY_TYPE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
function _isConfigured() {
return !SUPABASE_URL.startsWith('ضع-') && !SUPABASE_KEY.startsWith('ضع-');
}
function _randomId() {
const bytes = new Uint8Array(6);
crypto.getRandomValues(bytes);
return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function uploadImage(blob, { pathPrefix = 'uploads', onProgress, exactPath } = {}) {
if (!_isConfigured()) {
const err = new Error(
'إعداد Supabase ناقص — لازم تحط SUPABASE_URL وSUPABASE_KEY الحقيقيين' +
'شوف في أعلى ملف js/data/adapters/supabase-adapter.js (راجع التعليق فوق).'
);
err.code = 'image-host-not-configured';
throw err;
}
const ext  = EXT_BY_TYPE[blob.type] || 'jpg';
const safePrefix = String(pathPrefix).replace(/[^a-zA-Z0-9/_-]/g, '').replace(/^\/+|\/+$/g, '') || 'uploads';
const isThumb = typeof exactPath === 'string' && /^[a-zA-Z0-9_\/-]+\.(webp|jpg|png)$/.test(exactPath);
const path = isThumb ? exactPath : `${safePrefix}/${Date.now()}-${_randomId()}.${ext}`;
if (isThumb ? _onSecondary.has(path.replace(/_t(\.[a-z]+)$/, '$1')) : await primaryIsFull()) {
return _uploadSecondary(blob, path, onProgress);
}
try {
const out = await _uploadPrimary(blob, path, onProgress);
if (dualWriteEnabled()) mirrorToSecondary({ bucket: BUCKET, path, blob }).catch(() => {});
return out;
} catch (err) {
if (err.serverRejected && !isThumb && overflowEnabled()) {
markPrimaryFull();
return _uploadSecondary(blob, path, onProgress);
}
throw err;
}
}
const _onSecondary = new Set();
async function _uploadSecondary(blob, path, onProgress) {
try {
const url = await uploadToSecondary({ bucket: BUCKET, path, blob, onProgress });
_onSecondary.add(path);
onProgress?.(100);
return { url, path };
} catch (err) {
if (err?.message === 'network') throw new Error('الاتصال ضعيف هسّع — تأكد من النت وجرّب تاني');
throw new Error('الصورة لسع ما اترفعت — جرّب تاني');
}
}
async function _uploadPrimary(blob, path, onProgress) {
const base = SUPABASE_URL.replace(/\/+$/, '');
let userToken = null;
try { userToken = await (await import('../auth.js')).getIdToken(); } catch {   }
return new Promise((resolve, reject) => {
const xhr = new XMLHttpRequest();
xhr.open('POST', `${base}/storage/v1/object/${BUCKET}/${path}`, true);
xhr.setRequestHeader('apikey', SUPABASE_KEY);
if (userToken) xhr.setRequestHeader('Authorization', `Bearer ${userToken}`);
else if (SUPABASE_KEY.startsWith('eyJ')) xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_KEY}`);
xhr.setRequestHeader('Content-Type', blob.type || 'image/jpeg');
xhr.setRequestHeader('x-upsert', 'false');
xhr.setRequestHeader('cache-control', 'max-age=31536000');
xhr.upload.onprogress = (e) => {
if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
};
xhr.onload = () => {
if (xhr.status < 200 || xhr.status >= 300) {
const err = new Error('الصورة لسع ما اترفعت — جرّب تاني');
err.serverRejected = xhr.status !== 401 && xhr.status !== 403 && xhr.status !== 429;
reject(err);
return;
}
onProgress?.(100);
resolve({ url: `${base}/storage/v1/object/public/${BUCKET}/${path}`, path });
};
xhr.onerror = () => reject(new Error('الاتصال ضعيف هسّع — تأكد من النت وجرّب تاني'));
xhr.send(blob);
});
}
export async function deleteStoredImages(urls) {
if (!_isConfigured()) return 0;
const base = SUPABASE_URL.replace(/\/+$/, '');
const prefix = `${base}/storage/v1/object/public/${BUCKET}/`;
let token = null;
try { token = await (await import('../auth.js')).getIdToken(); } catch {   }
if (!token) return 0;
const headers = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` };
const unique = [...new Set((urls || []).filter(u => typeof u === 'string' && (u.startsWith(prefix) || isSecondaryUrl(u))))];
let removed = 0;
for (const url of unique) {
try {
const onSecond = isSecondaryUrl(url);
const path = onSecond ? secondaryPathOf(url, BUCKET) : decodeURIComponent(url.slice(prefix.length).split('?')[0]);
if (!/^[a-zA-Z0-9_\/-]+\.(webp|jpg|png)$/.test(path)) continue;
const chk = await fetch(`${base}/rest/v1/rpc/akdar_image_in_use`, { method: 'POST', headers, body: JSON.stringify({ p_url: url }) });
if (!chk.ok || (await chk.json()) !== false) continue;
const prefixes = [path, path.replace(/(\.[a-z]+)$/, '_t$1')];
if (onSecond) { if (await deleteFromSecondary(BUCKET, prefixes)) removed += 1; continue; }
const res = await fetch(`${base}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers, body: JSON.stringify({ prefixes }) });
if (res.ok) removed += 1;
if (res.ok && dualWriteEnabled()) deleteFromSecondary(BUCKET, prefixes).catch(() => {});
} catch {   }
}
return removed;
}
export async function fetchUsageStats() {
if (!_isConfigured()) throw Object.assign(new Error('Supabase غير مضبوط'), { code: 'config' });
let token = null;
let sessionTimer;
try {
token = await Promise.race([
import('../auth.js').then((m) => m.getIdToken()),
new Promise((_, rej) => { sessionTimer = setTimeout(() => rej(new Error('session-timeout')), 8000); }),
]);
} catch (e) {
if (e?.message === 'session-timeout') throw Object.assign(new Error('قراءة الجلسة تأخرت 8 ثوانٍ'), { code: 'timeout' });
} finally { clearTimeout(sessionTimer); }
if (!token) throw Object.assign(new Error('no session token — سجّل دخول الإدارة'), { code: 'no-token' });
const ctrl = new AbortController();
const timer = setTimeout(() => ctrl.abort(), 15000);
try {
const res = await fetch(`${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/rpc/akdar_usage_stats`, {
method: 'POST',
headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
body: '{}',
signal: ctrl.signal,
});
const text = await res.text();
if (!res.ok) {
let body = {}; try { body = JSON.parse(text); } catch {   }
throw Object.assign(new Error(String(body.message || text || res.statusText).slice(0, 200)), { code: body.code || `HTTP ${res.status}` });
}
return JSON.parse(text);
} catch (err) {
if (ctrl.signal.aborted) throw Object.assign(new Error('timeout 15s'), { code: 'timeout' });
throw err;
} finally {
clearTimeout(timer);
}
}
const BACKUP_TABLES = [
['news', 'الأخبار'], ['events', 'الفعاليات'], ['notifications', 'الإشعارات'],
['history_articles', 'مقالات التاريخ'], ['association_journey_articles', 'مسيرة الرابطة'],
['gallery', 'معرض الذاكرة'], ['memory_videos', 'فيديوهات الذاكرة'],
['projects', 'المشاريع'], ['project_milestones', 'مراحل المشاريع'],
['contacts', 'دليل الاتصال'], ['worship_lectures', 'المحاضرات'],
['study_tips', 'نصائح الدراسة'], ['study_videos', 'فيديوهات الدراسة'],
['ideas', 'الأفكار'], ['idea_comments', 'تعليقات الأفكار'],
['occasions', 'المناسبات'], ['occasion_comments', 'تعليقات المناسبات'],
['nubian_words', 'كلمات الرُطانة'], ['nubian_phrases', 'عبارات الرُطانة'],
['nubian_phrase_categories', 'تصنيفات العبارات'], ['settings', 'الإعدادات'],
];
const BACKUP_PAGE = 1000;
async function _backupHeaders() {
let token = null;
try { token = await (await import('../auth.js')).getIdToken(); } catch {   }
if (!token) throw Object.assign(new Error('سجّل دخول الإدارة أول'), { code: 'no-token' });
return { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` };
}
async function _backupFetch(url, init, ms = 20000) {
const ctrl = new AbortController();
const timer = setTimeout(() => ctrl.abort(), ms);
try {
return await fetch(url, { ...init, signal: ctrl.signal });
} catch (err) {
if (ctrl.signal.aborted) throw Object.assign(new Error('timeout'), { code: 'timeout' });
throw err;
} finally {
clearTimeout(timer);
}
}
async function _tableRows(base, headers, table) {
const rows = [];
let order = '&order=id.asc';
for (let from = 0; ; from += BACKUP_PAGE) {
let res = await _backupFetch(`${base}/rest/v1/${table}?select=*${order}`, {
headers: { ...headers, 'Range-Unit': 'items', Range: `${from}-${from + BACKUP_PAGE - 1}` },
});
if (res.status === 400 && order) { order = ''; from -= BACKUP_PAGE; continue; }
if (!res.ok && res.status !== 206) throw Object.assign(new Error(`${table}: HTTP ${res.status}`), { code: res.status });
const page = await res.json();
rows.push(...page);
if (page.length < BACKUP_PAGE) break;
}
return rows;
}
export async function exportBackup() {
if (!_isConfigured()) throw Object.assign(new Error('Supabase غير مضبوط'), { code: 'config' });
const base = SUPABASE_URL.replace(/\/+$/, '');
const headers = await _backupHeaders();
const tables = {};
for (const [name] of BACKUP_TABLES) tables[name] = await _tableRows(base, headers, name);
return { app: 'akdar-shabtoot-bahri', version: 2, source: 'supabase', exportedAt: new Date().toISOString(), tables };
}
export async function backupSummary(snapshot) {
if (snapshot?.tables) {
return BACKUP_TABLES.map(([name, label]) => ({ key: name, label, count: Array.isArray(snapshot.tables[name]) ? snapshot.tables[name].length : 0 }));
}
if (!_isConfigured()) throw Object.assign(new Error('Supabase غير مضبوط'), { code: 'config' });
const base = SUPABASE_URL.replace(/\/+$/, '');
const headers = await _backupHeaders();
return Promise.all(BACKUP_TABLES.map(async ([name, label]) => {
try {
const res = await _backupFetch(`${base}/rest/v1/${name}?select=*`, { method: 'HEAD', headers: { ...headers, Prefer: 'count=exact' } }, 8000);
if (!res.ok) return { key: name, label, count: null };
const total = Number((res.headers.get('content-range') || '').split('/')[1]);
return { key: name, label, count: Number.isFinite(total) ? total : null };
} catch { return { key: name, label, count: null }; }
}));
}
export const IMPORT_ORDER = [
'events', 'news', 'notifications', 'history_articles', 'association_journey_articles', 'gallery', 'memory_videos',
'projects', 'project_milestones', 'contacts', 'worship_lectures', 'study_tips', 'study_videos',
'nubian_phrase_categories', 'nubian_words', 'nubian_phrases',
'ideas', 'idea_comments', 'occasions', 'occasion_comments', 'settings',
];
const SETTINGS_SKIP = new Set(['cache_stamps', 'urgentAnnouncement']);
const IMPORT_BATCH = 100;
const IMPORT_MAX_ROWS = 50000;
const _pkOf = (table) => (table === 'settings' ? 'key' : 'id');
function _snapshotRows(snapshot, table) {
const rows = snapshot?.tables?.[table];
if (!Array.isArray(rows)) return null;
const pk = _pkOf(table);
return rows
.filter((r) => r && typeof r === 'object' && !Array.isArray(r) && r[pk] !== undefined && r[pk] !== null)
.filter((r) => !(table === 'settings' && SETTINGS_SKIP.has(r.key)))
.slice(0, IMPORT_MAX_ROWS);
}
export function validateBackupFile(snapshot) {
if (!snapshot || typeof snapshot !== 'object' || snapshot.app !== 'akdar-shabtoot-bahri') throw new Error('الملف دا ما نسخة احتياطية من التطبيق');
if (snapshot.source !== 'supabase' || !snapshot.tables || typeof snapshot.tables !== 'object') throw new Error('الملف ليس بصيغة النسخة الحالية (Supabase)');
if (!IMPORT_ORDER.some((t) => Array.isArray(snapshot.tables[t]))) throw new Error('الملف لا يحوي أي جدول معروف');
return true;
}
async function _existingKeys(base, headers, table) {
const pk = _pkOf(table);
const keys = new Set();
for (let from = 0; ; from += BACKUP_PAGE) {
const res = await _backupFetch(`${base}/rest/v1/${table}?select=${pk}&order=${pk}.asc`, {
headers: { ...headers, 'Range-Unit': 'items', Range: `${from}-${from + BACKUP_PAGE - 1}` },
});
if (!res.ok && res.status !== 206) throw Object.assign(new Error(`${table}: HTTP ${res.status}`), { code: res.status });
const page = await res.json();
for (const r of page) keys.add(String(r[pk]));
if (page.length < BACKUP_PAGE) break;
}
return keys;
}
export async function backupDiff(snapshot) {
validateBackupFile(snapshot);
if (!_isConfigured()) throw Object.assign(new Error('Supabase غير مضبوط'), { code: 'config' });
const base = SUPABASE_URL.replace(/\/+$/, '');
const headers = await _backupHeaders();
const labels = Object.fromEntries(BACKUP_TABLES);
const out = [];
for (const table of IMPORT_ORDER) {
const rows = _snapshotRows(snapshot, table);
if (!rows) continue;
try {
const have = await _existingKeys(base, headers, table);
const pk = _pkOf(table);
const existing = rows.filter((r) => have.has(String(r[pk]))).length;
out.push({ key: table, label: labels[table] || table, inFile: rows.length, fresh: rows.length - existing, existing });
} catch (e) {
out.push({ key: table, label: labels[table] || table, inFile: rows.length, fresh: null, existing: null, error: e?.message || 'تعذّرت المعاينة' });
}
}
return out;
}
function _dropColumn(rows, col) {
return rows.map((r) => { const { [col]: _gone, ...rest } = r; return rest; });
}
async function _writeBatch(base, headers, table, rows, mode) {
const pk = _pkOf(table);
const prefer = (mode === 'update' ? 'resolution=merge-duplicates' : 'resolution=ignore-duplicates') + ',return=minimal';
const dropped = new Set();
let cur = rows;
for (let attempt = 0; attempt < 8; attempt++) {
const res = await _backupFetch(`${base}/rest/v1/${table}?on_conflict=${pk}`, {
method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', Prefer: prefer }, body: JSON.stringify(cur),
}, 60000);
if (res.ok) return [...dropped];
const text = await res.text();
let j = {}; try { j = JSON.parse(text); } catch {   }
const msg = String(j.message || text || '');
const col = (j.code === 'PGRST204' ? msg.match(/'([^']+)' column/) : msg.match(/column "([^"]+)"/))?.[1];
if (col && (j.code === 'PGRST204' || j.code === '428C9' || /generated|non-DEFAULT/i.test(msg)) && !dropped.has(col)) {
dropped.add(col); cur = _dropColumn(cur, col); continue;
}
throw Object.assign(new Error(`${table}: ${msg || `HTTP ${res.status}`}`), { code: res.status, pg: j.code });
}
throw new Error(`${table}: أعمدة كثيرة غير متوافقة`);
}
export async function importBackup(snapshot, { tables, mode = 'new', onProgress } = {}) {
validateBackupFile(snapshot);
if (!_isConfigured()) throw Object.assign(new Error('Supabase غير مضبوط'), { code: 'config' });
if (mode !== 'new' && mode !== 'update') throw new Error('وضع استيراد غير معروف');
const base = SUPABASE_URL.replace(/\/+$/, '');
const headers = await _backupHeaders();
const labels = Object.fromEntries(BACKUP_TABLES);
const want = new Set(tables || IMPORT_ORDER);
const report = [];
for (const table of IMPORT_ORDER) {
if (!want.has(table)) continue;
const rows = _snapshotRows(snapshot, table);
if (!rows || !rows.length) continue;
const entry = { key: table, label: labels[table] || table, sent: 0, ok: true };
const droppedAll = new Set();
try {
for (let i = 0; i < rows.length; i += IMPORT_BATCH) {
const dropped = await _writeBatch(base, headers, table, rows.slice(i, i + IMPORT_BATCH), mode);
dropped.forEach((c) => droppedAll.add(c));
entry.sent = Math.min(rows.length, i + IMPORT_BATCH);
onProgress?.({ table, label: entry.label, done: entry.sent, total: rows.length });
}
} catch (e) {
entry.ok = false;
entry.error = e?.message || 'فشل';
}
if (droppedAll.size) entry.droppedColumns = [...droppedAll];
report.push(entry);
}
return report;
}
export async function getImageStorageUsage() {
if (!_isConfigured()) {
const err = new Error('إعداد Supabase ناقص');
err.code = 'image-host-not-configured';
throw err;
}
const base = SUPABASE_URL.replace(/\/+$/, '');
const headers = { 'Content-Type': 'application/json', apikey: SUPABASE_KEY };
if (SUPABASE_KEY.startsWith('eyJ')) headers.Authorization = `Bearer ${SUPABASE_KEY}`;
let bytes = 0;
let files = 0;
const queue = [''];
let guard = 0;
while (queue.length && guard++ < 200) {
const prefix = queue.shift();
let offset = 0;
for (;;) {
const res = await fetch(`${base}/storage/v1/object/list/${BUCKET}`, {
method: 'POST',
headers,
body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }),
});
if (!res.ok) {
const err = new Error('ما قدرنا نقرأ قائمة الصور من Supabase');
err.code = res.status === 401 || res.status === 403 ? 'list-not-allowed' : 'list-failed';
throw err;
}
const items = await res.json();
for (const it of items) {
if (it.id === null || it.id === undefined) {
queue.push(prefix ? `${prefix}/${it.name}` : it.name);
} else {
files += 1;
bytes += Number(it.metadata?.size) || 0;
}
}
if (items.length < 100) break;
offset += 100;
}
}
return { bytes, files };
}
