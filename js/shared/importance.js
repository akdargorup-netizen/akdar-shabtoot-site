export function importancePayload(checked, existing) {
if (!checked) return { important: false, importantAt: null };
if (existing?.important) {
const at = Number(existing.importantAt);
return { important: true, importantAt: Number.isFinite(at) && at > 0 ? at : null };
}
return { important: true, importantAt: Date.now() };
}
export function sortByImportance(list) {
const rank = (x) => (x && x.important ? (Number(x.importantAt) || 0) : Infinity);
return (Array.isArray(list) ? list : [])
.map((x, i) => [x, i])
.sort((a, b) => {
const ra = rank(a[0]);
const rb = rank(b[0]);
if (ra === rb) return a[1] - b[1];
return ra < rb ? -1 : 1;
})
.map((p) => p[0]);
}
