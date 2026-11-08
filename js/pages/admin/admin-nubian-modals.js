let _cleanup = null;
export function setCleanup(fn) { _cleanup = fn; }
export function closeComposeModal() {
if (_cleanup) { const fn = _cleanup; _cleanup = null; fn(); }
}
