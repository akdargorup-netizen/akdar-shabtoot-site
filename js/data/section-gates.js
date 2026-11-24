import { getSupabase } from './supabase-client.js';
import { _sbWrite, _run, _WRITE_TIMEOUT_MS, _fail } from './adapters/sb-helpers.js';
import { applyGateStates, getGateStates, GATEABLE_SECTIONS, isSectionClosed } from '../shared/gate-state.js';
const ROW_KEY = 'sectionGates';
const STALE_MS = 5 * 60 * 1000;
const READ_TIMEOUT_MS = 6000;
let _lastFetch = 0;
let _inflight = null;
export function fetchGates() {
if (_inflight) return _inflight;
if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve(false);
_inflight = (async () => {
const ctrl = new AbortController();
const t = setTimeout(() => ctrl.abort(), READ_TIMEOUT_MS);
try {
const sb = await getSupabase();
const res = await sb.from('settings').select('data').eq('key', ROW_KEY).maybeSingle().abortSignal(ctrl.signal);
if (!res || res.error) return false;
const d = res.data?.data;
if (d && typeof d === 'object' && d.states && typeof d.states === 'object') applyGateStates(d.states);
_lastFetch = Date.now();
return true;
} catch { return false; } finally { clearTimeout(t); _inflight = null; }
})();
return _inflight;
}
export function initSectionGates() { return fetchGates(); }
export function refreshIfStale() {
if (Date.now() - _lastFetch < STALE_MS) return Promise.resolve(false);
return fetchGates();
}
export async function loadSectionStatesForAdmin() {
await fetchGates();
return GATEABLE_SECTIONS.map(s => ({ ...s, closed: isSectionClosed(s.key) }));
}
export async function setSectionClosed(key, closed) {
if (!GATEABLE_SECTIONS.some(s => s.key === key)) throw new Error('قسم غير معروف');
await fetchGates();
const next = { ...getGateStates(), [key]: closed ? 'closed' : 'open' };
const sb = await _sbWrite();
const { error } = await _run(sb.from('settings').upsert({ key: ROW_KEY, data: { states: next } }, { onConflict: 'key' }), _WRITE_TIMEOUT_MS);
if (error) _fail(error);
applyGateStates(next);
_lastFetch = Date.now();
return isSectionClosed(key);
}
