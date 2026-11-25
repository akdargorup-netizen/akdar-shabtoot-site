import { SUPABASE_URL, SUPABASE_KEY } from '../data/supabase-client.js';
import { AUDIO_PREFIX, primaryIsFull, markPrimaryFull, overflowEnabled, uploadToSecondary, deleteFromSecondary, dualWriteEnabled, mirrorToSecondary } from '../data/storage-overflow.js';
import { clipUrl, isValidClipPath } from './audio-clips.js';
import { escapeHtml } from './sanitize.js';
const MAX_BYTES = 100 * 1024;
const MAX_SECONDS = 14;
const MAX_RECORD_SECONDS = 12;
const MIME_BY_EXT = { m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', mp3: 'audio/mpeg' };
let _seq = 0;
function _recordMime() {
if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) return '';
for (const t of ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4']) {
try { if (MediaRecorder.isTypeSupported(t)) return t; } catch {   }
}
return '';
}
export async function deleteClip(path) {
if (!isValidClipPath(path)) return false;
if (path.startsWith(AUDIO_PREFIX)) return (await deleteFromSecondary('akdar-audio', [path.slice(AUDIO_PREFIX.length)])) > 0;
try {
const token = await (await import('../data/auth.js')).getIdToken();
if (!token) return false;
const res = await fetch(`${SUPABASE_URL}/storage/v1/object/akdar-audio/${path}`, {
method: 'DELETE',
headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
});
if (res.ok && dualWriteEnabled()) deleteFromSecondary('akdar-audio', [path]).catch(() => {});
return res.ok;
} catch { return false; }
}
function _randomId() {
const bytes = new Uint8Array(6);
crypto.getRandomValues(bytes);
return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
function _extOf(file) {
const m = /\.([a-zA-Z0-9]+)$/.exec(file.name || '');
const ext = m ? m[1].toLowerCase() : '';
return MIME_BY_EXT[ext] ? ext : '';
}
function _durationOf(blobUrl) {
return new Promise((resolve) => {
const a = new Audio();
const done = (v) => { a.removeAttribute('src'); resolve(v); };
const t = setTimeout(() => done(0), 4000);
a.preload = 'metadata';
a.addEventListener('loadedmetadata', () => { clearTimeout(t); done(Number.isFinite(a.duration) ? a.duration : 0); });
a.addEventListener('error', () => { clearTimeout(t); done(0); });
a.src = blobUrl;
});
}
function _userError(msg) {
const e = new Error(msg);
e.userFacing = true;
return e;
}
async function _upload(file, ext, pathPrefix) {
const safePrefix = String(pathPrefix).replace(/[^a-zA-Z0-9_-]/g, '') || 'w';
const path = `${safePrefix}/${Date.now()}-${_randomId()}.${ext}`;
let token = null;
try { token = await (await import('../data/auth.js')).getIdToken(); } catch {   }
if (!token) throw _userError('لازم تكون مسجّل دخول كمشرف عشان ترفع الصوت');
const toSecondary = async () => {
try {
await uploadToSecondary({ bucket: 'akdar-audio', path, blob: file, contentType: MIME_BY_EXT[ext] });
return AUDIO_PREFIX + path;
} catch (err) {
throw _userError(err?.message === 'network' ? 'الاتصال ضعيف هسّع — تأكد من النت وجرّب تاني' : 'المقطع لسع ما اترفع — جرّب تاني');
}
};
if (await primaryIsFull()) return toSecondary();
let res;
try {
res = await fetch(`${SUPABASE_URL}/storage/v1/object/akdar-audio/${path}`, {
method: 'POST',
headers: {
apikey: SUPABASE_KEY,
Authorization: `Bearer ${token}`,
'Content-Type': MIME_BY_EXT[ext],
'x-upsert': 'false',
'cache-control': 'max-age=31536000',
},
body: file,
});
} catch {
throw _userError('الاتصال ضعيف هسّع — تأكد من النت وجرّب تاني');
}
if (!res.ok) {
if (overflowEnabled() && ![401, 403, 429].includes(res.status)) { markPrimaryFull(); return toSecondary(); }
throw _userError(res.status === 401 || res.status === 403
? 'مافي صلاحية رفع الصوت لحسابك'
: 'المقطع لسع ما اترفع — جرّب تاني');
}
if (dualWriteEnabled()) mirrorToSecondary({ bucket: 'akdar-audio', path, blob: file, contentType: MIME_BY_EXT[ext] }).catch(() => {});
return path;
}
export function createAudioUploadField({ pathPrefix = 'w', existingPath = '', label = 'النطق الصوتي (اختياري)', onChange = null } = {}) {
const uid = `audio-upload-${++_seq}`;
const original = isValidClipPath(existingPath) ? existingPath : '';
let pendingFile = null;
let pendingExt = '';
let previewObjUrl = null;
let removed = false;
const html = `
    <div class="input-group audio-upload-field" id="${uid}">
      <label class="input-label">${escapeHtml(label)}</label>
      <div class="audio-upload-box">
        <audio class="audio-upload-player" data-role="player" controls preload="none" ${original ? `src="${escapeHtml(clipUrl(original))}"` : 'hidden'}></audio>
        <p class="audio-upload-hint" data-role="hint">${original ? 'فيه مقطع محفوظ حاليًا' : 'مافي مقطع — m4a أحادي، لحد ١٢ ثانية تقريبًا، أقل من ١٠٠KB'}</p>
        <div class="audio-upload-actions">
          ${_recordMime() ? '<button type="button" class="btn btn--sm btn--primary" data-role="record">🎙️ تسجيل</button>' : ''}
          <button type="button" class="btn btn--sm btn--ghost" data-role="pick">${original ? 'تغيير المقطع' : 'اختيار مقطع'}</button>
          <button type="button" class="btn btn--sm btn--ghost" data-role="remove" ${original ? '' : 'hidden'}>حذف المقطع</button>
        </div>
        <input type="file" data-role="file" accept=".m4a,.mp4,.aac,.mp3,audio/mp4,audio/x-m4a,audio/aac,audio/mpeg" hidden>
        <p class="input-error-msg hidden" data-role="err"></p>
      </div>
    </div>`;
let root = null;
const q = (role) => root?.querySelector(`[data-role="${role}"]`);
function _error(msg) {
const el = q('err');
if (!el) return;
el.textContent = msg || '';
el.classList.toggle('hidden', !msg);
}
function _revokePreview() {
if (previewObjUrl) { URL.revokeObjectURL(previewObjUrl); previewObjUrl = null; }
}
function _render() {
const player = q('player');
const hint = q('hint');
const hasNow = pendingFile ? true : (original && !removed);
if (pendingFile) {
player.src = previewObjUrl;
player.hidden = false;
hint.textContent = `مقطع جديد جاهز للحفظ (${Math.round(pendingFile.size / 1024)}KB) — استمع له قبل الحفظ`;
} else if (original && !removed) {
player.src = clipUrl(original);
player.hidden = false;
hint.textContent = 'فيه مقطع محفوظ حاليًا';
} else {
player.pause?.();
player.removeAttribute('src');
player.hidden = true;
hint.textContent = removed ? 'المقطع هيتشال من الكلمة عند الحفظ' : 'مافي مقطع — m4a أحادي، لحد ١٢ ثانية تقريبًا، أقل من ١٠٠KB';
}
q('remove').hidden = !hasNow;
q('pick').textContent = hasNow ? 'تغيير المقطع' : 'اختيار مقطع';
try { onChange?.(hasNow); } catch {   }
}
function hasAudio() { return Boolean(pendingFile || (original && !removed)); }
async function _onPick(file) {
_error('');
if (!file) return;
const ext = _extOf(file);
if (!ext) { _error('الصيغة غير مدعومة — استخدم ملف m4a'); return; }
if (file.size > MAX_BYTES) {
_error(`المقطع كبير (${Math.round(file.size / 1024)}KB) — الحد الأقصى ١٠٠KB. سجّله أقصر أو بجودة أقل`);
return;
}
const url = URL.createObjectURL(file);
const secs = await _durationOf(url);
if (secs > MAX_SECONDS) {
URL.revokeObjectURL(url);
_error(`المقطع طويل (${secs.toFixed(1)} ثانية) — الحد الأقصى ${MAX_SECONDS} ثواني`);
return;
}
_revokePreview();
previewObjUrl = url;
pendingFile = file;
pendingExt = ext;
removed = false;
_render();
}
let rec = null, recStream = null, recTimer = null;
function _stopTracks() { recStream?.getTracks().forEach(t => t.stop()); recStream = null; }
async function _toggleRecord() {
const btn = q('record');
if (rec && rec.state === 'recording') { clearTimeout(recTimer); rec.stop(); return; }
_error('');
const mime = _recordMime();
try {
recStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
} catch {
_error('ما قدرنا نفتح المايك — اسمح للتطبيق بالمايك من إعدادات المتصفح، أو اختر ملف جاهز');
return;
}
const chunks = [];
rec = new MediaRecorder(recStream, { mimeType: mime, audioBitsPerSecond: 48000 });
rec.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
rec.onstop = async () => {
_stopTracks();
btn.textContent = '🎙️ تسجيل';
btn.classList.remove('is-recording');
const blob = new Blob(chunks, { type: 'audio/mp4' });
rec = null;
if (blob.size) await _onPick(new File([blob], 'recording.m4a', { type: 'audio/mp4' }));
};
rec.start();
btn.textContent = '⏹ إيقاف';
btn.classList.add('is-recording');
q('hint').textContent = 'قاعدين نسجّل... اضغط إيقاف لما تخلّص (أقصى ١٢ ثانية)';
recTimer = setTimeout(() => { if (rec?.state === 'recording') rec.stop(); }, MAX_RECORD_SECONDS * 1000);
}
function mount(container) {
root = container.querySelector(`#${uid}`);
if (!root) return;
const fileInput = q('file');
q('pick').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => { _onPick(fileInput.files?.[0]); fileInput.value = ''; });
q('record')?.addEventListener('click', () => _toggleRecord());
q('remove').addEventListener('click', () => {
_error('');
_revokePreview();
pendingFile = null;
pendingExt = '';
removed = Boolean(original);
_render();
});
}
async function commit() {
if (pendingFile) {
const path = await _upload(pendingFile, pendingExt, pathPrefix);
_revokePreview();
return { changed: true, path };
}
if (removed) return { changed: true, path: '' };
return { changed: false, path: original };
}
return { html, mount, commit, original, hasAudio };
}
