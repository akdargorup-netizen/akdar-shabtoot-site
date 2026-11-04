const DB_NAME    = 'shabtoot-prefs';
const STORE_NAME = 'notif-toggles';
const DB_VERSION = 1;
function _openDb() {
return new Promise((resolve, reject) => {
const req = indexedDB.open(DB_NAME, DB_VERSION);
req.onupgradeneeded = () => {
if (!req.result.objectStoreNames.contains(STORE_NAME)) {
req.result.createObjectStore(STORE_NAME);
}
};
req.onsuccess = () => resolve(req.result);
req.onerror   = () => reject(req.error);
});
}
export async function setPref(key, value) {
try {
const db = await _openDb();
await new Promise((resolve, reject) => {
const tx = db.transaction(STORE_NAME, 'readwrite');
tx.objectStore(STORE_NAME).put(!!value, key);
tx.oncomplete = resolve;
tx.onerror    = () => reject(tx.error);
});
db.close();
} catch (e) {
console.warn('[notif-prefs] فشل كتابة التفضيل', key, e);
}
}
export async function syncAllPrefsFromLocalStorage(keys) {
try {
const db = await _openDb();
await new Promise((resolve, reject) => {
const tx = db.transaction(STORE_NAME, 'readwrite');
const store = tx.objectStore(STORE_NAME);
keys.forEach((key) => {
const raw = localStorage.getItem(key);
const value = raw === null ? true : raw === 'true';
store.put(value, key);
});
tx.oncomplete = resolve;
tx.onerror    = () => reject(tx.error);
});
db.close();
} catch (e) {
console.warn('[notif-prefs] فشل مزامنة التفضيلات', e);
}
}
