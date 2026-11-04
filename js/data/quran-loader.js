const _FETCH_TIMEOUT_MS = 20000;
const _loads = new Map();
const _pad = (n) => String(n).padStart(3, '0');
async function _fetchSurah(index) {
const ctrl = new AbortController();
const timer = setTimeout(() => ctrl.abort(), _FETCH_TIMEOUT_MS);
try {
const res = await fetch(new URL(`../../content/quran/surah-${_pad(index)}.json`, import.meta.url), { signal: ctrl.signal });
if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { code: 'http' });
const ayahs = await res.json();
if (!Array.isArray(ayahs) || !ayahs.length || ayahs.some((a) => typeof a !== 'string')) {
throw Object.assign(new Error('bad-surah-file'), { code: 'bad-data' });
}
return ayahs;
} catch (err) {
if (ctrl.signal.aborted) throw Object.assign(new Error('timeout'), { code: 'timeout' });
throw err;
} finally {
clearTimeout(timer);
}
}
export function loadSurahAyahs(index) {
const n = Number(index);
if (!Number.isInteger(n) || n < 1 || n > 114) return Promise.reject(new RangeError('surah index'));
if (!_loads.has(n)) {
const p = _fetchSurah(n);
_loads.set(n, p);
p.catch(() => { if (_loads.get(n) === p) _loads.delete(n); });
}
return _loads.get(n);
}
