const DB_NAME = 'akdar-sb-cache-v1';
const STORE = 'kv';
const _mem = new Map();
let _dbPromise = null;
function _openDb() {
if (_dbPromise) return _dbPromise;
_dbPromise = new Promise((resolve) => {
try {
if (typeof indexedDB === 'undefined') return resolve(null);
const req = indexedDB.open(DB_NAME, 1);
req.onupgradeneeded = () => req.result.createObjectStore(STORE);
req.onsuccess = () => resolve(req.result);
req.onerror = () => resolve(null);
req.onblocked = () => resolve(null);
} catch {
resolve(null);
}
});
return _dbPromise;
}
function _tx(db, mode, fn) {
return new Promise((resolve) => {
try {
const tx = db.transaction(STORE, mode);
const store = tx.objectStore(STORE);
const out = fn(store);
tx.oncomplete = () => resolve(out?.result);
tx.onerror = () => resolve(undefined);
tx.onabort = () => resolve(undefined);
} catch {
resolve(undefined);
}
});
}
export async function cacheGet(key) {
const m = _mem.get(key);
if (m) return m;
const db = await _openDb();
if (!db) return null;
const entry = await _tx(db, 'readonly', (s) => s.get(key));
if (entry && typeof entry.savedAt === 'number') {
_mem.set(key, entry);
return entry;
}
return null;
}
export async function cachePut(key, value, savedAt = Date.now()) {
const entry = { value, savedAt };
_mem.set(key, entry);
const db = await _openDb();
if (db) await _tx(db, 'readwrite', (s) => s.put(entry, key));
}
export async function cacheMarkStale(prefix) {
const keys = new Set([..._mem.keys()].filter(k => k.startsWith(prefix)));
const db = await _openDb();
if (db) {
const all = await _tx(db, 'readonly', (s) => s.getAllKeys());
(all || []).forEach(k => { if (String(k).startsWith(prefix)) keys.add(String(k)); });
}
for (const k of keys) {
const e = await cacheGet(k);
if (e) await cachePut(k, e.value, 0);
}
}
export async function cacheDelPrefix(prefix) {
for (const k of [..._mem.keys()]) if (k.startsWith(prefix)) _mem.delete(k);
const db = await _openDb();
if (!db) return;
const all = await _tx(db, 'readonly', (s) => s.getAllKeys());
for (const k of (all || [])) {
if (String(k).startsWith(prefix)) await _tx(db, 'readwrite', (s) => s.delete(k));
}
}
export async function cacheKeys(prefix) {
const keys = new Set([..._mem.keys()].filter(k => k.startsWith(prefix)));
const db = await _openDb();
if (db) {
const all = await _tx(db, 'readonly', (s) => s.getAllKeys());
(all || []).forEach(k => { if (String(k).startsWith(prefix)) keys.add(String(k)); });
}
return [...keys];
}
