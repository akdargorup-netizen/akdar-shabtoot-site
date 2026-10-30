const RE_INTRO   = /^\*+\s*([\s\S]+?)\s*\*+$/;
const RE_HEADING = /^#+\s*([\s\S]+?)\s*#+$/;
const RE_SUMMARY = /^<\s*([\s\S]+?)\s*>$/;
const RE_ITEM    = /^>\s*(?:([0-9٠-٩]+)\s*[.\-–:)،]?\s+)?([\s\S]+)$/;
const RE_KEY     = /^["“”]\s*([^"“”]+?)\s*["“”]$/;
export function parseBlock(raw) {
const s = String(raw ?? '').trim();
let m;
if ((m = s.match(RE_INTRO)))   return { kind: 'intro',   text: m[1] };
if ((m = s.match(RE_HEADING))) return { kind: 'heading', text: m[1] };
if ((m = s.match(RE_SUMMARY))) return { kind: 'summary', text: m[1] };
if ((m = s.match(RE_ITEM)))    return { kind: 'item',    text: m[2].trim(), num: m[1] || '' };
if ((m = s.match(RE_KEY)))     return { kind: 'key',     text: m[1] };
return { kind: 'p', text: s };
}
export function stripMarkup(raw) {
const b = parseBlock(raw);
return b.kind === 'item' && b.num ? `${b.num}- ${b.text}` : b.text;
}
export const ARTICLE_BODY_HINT =
'اكتب هنا… كل فقرة في سطر مستقل.\n' +
'للتنسيق الخاص لفّ الفقرة برمز:\n' +
'*مثال*  ← إنترو (مقدمة بارزة)\n' +
'#مثال#  ← عنوان فرعي\n' +
'<مثال>  ← خلاصة (في الآخر)\n' +
'\"مثال\"  ← معلومة مهمة (تمييز هادئ)\n' +
'>1 مثال  ← عنصر مرقَّم (سطر لكل عنصر)';
