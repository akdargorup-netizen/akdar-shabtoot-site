const DB_NAME = 'akdar-tanjalab';
const STORE = 'kv';
export async function requestPersist() {
try {
if (navigator.storage && navigator.storage.persist) {
if (await navigator.storage.persisted()) return true;
return await navigator.storage.persist();
}
} catch {   }
return false;
}
function openDb() {
return new Promise((resolve, reject) => {
try {
const req = indexedDB.open(DB_NAME, 1);
req.onupgradeneeded = () => req.result.createObjectStore(STORE);
req.onsuccess = () => resolve(req.result);
req.onerror = () => reject(req.error);
} catch (e) { reject(e); }
});
}
export async function mirrorSet(key, value) {
try {
const db = await openDb();
await new Promise((resolve, reject) => {
const tx = db.transaction(STORE, 'readwrite');
tx.objectStore(STORE).put(value, key);
tx.oncomplete = resolve;
tx.onerror = () => reject(tx.error);
});
db.close();
} catch {   }
}
export async function mirrorGet(key) {
try {
const db = await openDb();
const val = await new Promise((resolve, reject) => {
const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
req.onsuccess = () => resolve(req.result);
req.onerror = () => reject(req.error);
});
db.close();
return val || null;
} catch { return null; }
}
export function whatsappUrl(code) {
const msg = 'نسخة تقدّمي في لعبة «تحدي التنجلاب».\n' +
'للاسترجاع: افتح اللعبة ← «استرجاع تقدّمي» ← الصق الكود التالي:\n\n' + code;
return 'https://wa.me/?text=' + encodeURIComponent(msg);
}
