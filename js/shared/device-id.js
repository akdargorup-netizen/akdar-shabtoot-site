const KEY = 'shabtoot-device-id';
export function getDeviceId() {
let id = localStorage.getItem(KEY);
if (!id) {
id = (typeof crypto !== 'undefined' && crypto.randomUUID)
? crypto.randomUUID()
: `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
localStorage.setItem(KEY, id);
}
return id;
}
