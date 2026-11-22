export const ALIAS_GROUPS = [
{ name: 'mosque', strict: true, words: ['مسجد', 'مسيد', 'جامع', 'مساجد', 'مسايد', 'جوامع'] },
{ name: 'club',   strict: true, words: ['نادي', 'فريق', 'منتخب', 'نوادي', 'منتخبات'] },
];
export const VILLAGE_NAME_WORDS = ['شبتوت', 'بحري', 'تنجلاب'];
const PREFIX_SRC = '[وف]?(?:لل|[بلك]?(?:ال)?)';
const PREFIX = new RegExp('^' + PREFIX_SRC);
export function aliasBase(word) {
const w = String(word || '');
const m = w.match(PREFIX);
const base = m ? w.slice(m[0].length) : w;
return base.length >= 3 ? base : w;
}
const _byWord = new Map();
ALIAS_GROUPS.forEach((g) => g.words.forEach((w) => _byWord.set(w, g)));
export function aliasGroupOf(word) {
const w = String(word || '');
return _byWord.get(w) || _byWord.get(aliasBase(w)) || null;
}
export function expandAliases(words) {
const out = [...words];
const seen = new Set(out);
words.forEach((w) => {
const g = aliasGroupOf(w);
if (!g) return;
g.words.forEach((x) => { if (!seen.has(x)) { seen.add(x); out.push(x); } });
});
return out;
}
export function isStrictWord(word) {
return !!(_byWord.get(word)?.strict);
}
const _strictRe = new Map();
export function wordInText(text, word) {
if (!isStrictWord(word)) return text.includes(word);
let re = _strictRe.get(word);
if (!re) { re = new RegExp(`(?:^|\\s)${PREFIX_SRC}${word}(?=\\s|$)`); _strictRe.set(word, re); }
return re.test(text);
}
export const ALIASES_PROMPT_NOTE =
'التنجلاب = شبتوت بحري (اسمان للقرية نفسها)؛ والفحلاب جزء من شبتوت بحري (القرية = الفحلاب + التنجلاب)؛ ' +
'مسيد = مسجد = جامع؛ نادي = فريق = منتخب (نادي/فريق/منتخب شبتوت بحري هو نفسه نادي/فريق/منتخب التنجلاب)؛ ' +
'سوق التنجلاب = سوق شبتوت بحري.';
