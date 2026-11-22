export const SUPABASE_URL = 'https://rtgrkugcokqxseedzunr.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_GweumDJkfZ42oVSQar-uHg_ZUZ7az2K';
export const SUPABASE_SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm';
export const SUPABASE_LOCAL_SDK = '/vendor/supabase-js.js';
const _NO_LOCAL_KEY = 'sbb:no-local-sdk-until';
async function _loadSdk() {
let skipLocal = false;
try { skipLocal = Date.now() < Number(localStorage.getItem(_NO_LOCAL_KEY) || 0); } catch {   }
if (!skipLocal) {
try {
return await import(  SUPABASE_LOCAL_SDK);
} catch {
try { localStorage.setItem(_NO_LOCAL_KEY, String(Date.now() + 24 * 3600 * 1000)); } catch {   }
}
}
return import(SUPABASE_SDK_URL);
}
let _clientPromise = null;
export function getSupabase() {
if (!_clientPromise) {
_clientPromise = _loadSdk().then(({ createClient }) =>
createClient(SUPABASE_URL, SUPABASE_KEY, {
auth: {
persistSession: true,
autoRefreshToken: true,
detectSessionInUrl: false,
storageKey: 'sb-akdar-auth',
},
})
).catch((err) => {
_clientPromise = null;
throw err;
});
}
return _clientPromise;
}
