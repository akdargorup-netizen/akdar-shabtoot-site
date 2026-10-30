import { getIdToken } from '../data/auth.js';
const ENDPOINT = 'https://rtgrkugcokqxseedzunr.supabase.co/functions/v1/ask';
async function _call(body, timeoutMs) {
const token = await getIdToken();
if (!token) { const e = new Error('no-session'); e.code = 'no-session'; throw e; }
const ctrl = new AbortController();
const timer = setTimeout(() => ctrl.abort(), timeoutMs);
try {
const res = await fetch(ENDPOINT, {
method: 'POST',
headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
body: JSON.stringify({ mode: 'admin', ...body }),
signal: ctrl.signal,
});
let data = null;
try { data = await res.json(); } catch {   }
if (!res.ok) {
const e = new Error(data?.error || `http-${res.status}`);
e.code = res.status === 403 ? 'forbidden' : res.status === 429 ? 'rate-limited' : 'http';
e.reason = data?.reason || '';
throw e;
}
return data;
} catch (err) {
if (err?.name === 'AbortError') { const e = new Error('timeout'); e.code = 'timeout'; throw e; }
throw err;
} finally {
clearTimeout(timer);
}
}
export function getAiAdminStatus() {
return _call({ op: 'status' }, 15000);
}
export function testAiProvider(provider, question) {
return _call({ op: 'test', provider, question }, 30000);
}
export function getAiInsights() {
return _call({ op: 'insights' }, 15000);
}
