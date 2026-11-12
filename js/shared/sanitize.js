const _escapeEl = document.createElement('div');
export function escapeHtml(value) {
if (value === null || value === undefined) return '';
_escapeEl.textContent = String(value);
return _escapeEl.innerHTML
.replaceAll('"', '&quot;')
.replaceAll("'", '&#39;');
}
