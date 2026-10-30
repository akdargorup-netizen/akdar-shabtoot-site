const esc = s => String(s).replace(/[&<>"']/g, c => (
{ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const INK = '#3b1a0a';
const EYES_OPEN = (dy = 0, dx = 0) => `
  <circle cx="46" cy="76" r="9.5" fill="#fff"/><circle cx="74" cy="76" r="9.5" fill="#fff"/>
  <circle cx="${46 + dx}" cy="${76 + dy}" r="5" fill="${INK}"/><circle cx="${74 + dx}" cy="${76 + dy}" r="5" fill="${INK}"/>
  <circle cx="${44.5 + dx}" cy="${74 + dy}" r="1.6" fill="#fff"/><circle cx="${72.5 + dx}" cy="${74 + dy}" r="1.6" fill="#fff"/>`;
const EYES_HAPPY = `
  <path d="M37 78 Q46 66 55 78" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
  <path d="M65 78 Q74 66 83 78" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
const BROWS_SAD = `
  <path d="M38 70 L54 62" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>
  <path d="M82 70 L66 62" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`;
const MOUTH = {
smile: `<path d="M50 94 Q60 103 70 94" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`,
big: `<path d="M46 91 Q60 114 74 91 Z" fill="#5a1b10" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
        <path d="M52 100 Q60 108 68 100 Q60 96 52 100 Z" fill="#e8766b"/>`,
sad: `<path d="M50 102 Q60 92 70 102" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`,
oh: `<ellipse cx="60" cy="98" rx="5.5" ry="7" fill="#5a1b10" stroke="${INK}" stroke-width="2.4"/>`,
};
const TEAR = `<path class="tj-mascot__tear" d="M40 88 Q36 96 40 100 Q44 96 40 88 Z" fill="#7cc4ee" stroke="#4a9fd0" stroke-width="1"/>`;
const SWEAT = `<path d="M92 56 Q88 64 92 68 Q96 64 92 56 Z" fill="#7cc4ee" stroke="#4a9fd0" stroke-width="1"/>`;
const SPARKS = `
  <path class="tj-mascot__spark" d="M16 34 l2.6 6.4 6.4 2.6 -6.4 2.6 -2.6 6.4 -2.6 -6.4 -6.4 -2.6 6.4 -2.6z" fill="#e9c24f"/>
  <path class="tj-mascot__spark s2" d="M104 28 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#e9c24f"/>
  <path class="tj-mascot__spark s3" d="M100 78 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill="#f4dd8d"/>`;
const EYES_SLY = `
  <circle cx="46" cy="76" r="9.5" fill="#fff"/><circle cx="74" cy="76" r="9.5" fill="#fff"/>
  <circle cx="50" cy="79" r="5" fill="${INK}"/><circle cx="78" cy="79" r="5" fill="${INK}"/>
  <path d="M36.5 76 A9.5 9.5 0 0 1 55.5 76 Z" fill="#a85a1e"/><path d="M64.5 76 A9.5 9.5 0 0 1 83.5 76 Z" fill="#a85a1e"/>
  <path d="M36.5 76 H55.5 M64.5 76 H83.5" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
const BROWS_SLY = `
  <path d="M37 65 L54 66" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>
  <path d="M65 62 L83 56" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`;
const MOUTH_SLY = `<path d="M49 97 Q62 101 73 91" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>
  <path d="M74 89 l3 -2" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
const JOY_TEARS = `
  <path class="tj-mascot__tear" d="M32 80 Q27 87 32 91 Q37 87 32 80 Z" fill="#7cc4ee" stroke="#4a9fd0" stroke-width="1"/>
  <path class="tj-mascot__tear" style="animation-delay:.5s" d="M88 80 Q83 87 88 91 Q93 87 88 80 Z" fill="#7cc4ee" stroke="#4a9fd0" stroke-width="1"/>`;
const MOUTH_WOBBLY = `<path d="M49 97 Q54.5 92 60 97 Q65.5 102 71 97" fill="none" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/>`;
const MOUTH_GRIN = `<path d="M44 90 Q60 114 76 90 Q60 95 44 90 Z" fill="#fff" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M47 95 Q60 101 73 95" fill="none" stroke="${INK}" stroke-width="1.8"/>
  <path d="M60 97 V104" stroke="${INK}" stroke-width="1.6"/>`;
const FACES = {
hi:    { eyes: EYES_OPEN(), mouth: MOUTH.smile },
think: { eyes: EYES_OPEN(-1.5, 1.5), mouth: MOUTH.smile },
happy: { eyes: EYES_HAPPY, mouth: MOUTH.big },
cheer: { eyes: EYES_HAPPY, mouth: MOUTH.big },
win:   { eyes: EYES_HAPPY, mouth: MOUTH.big, extra: SPARKS },
sad:   { eyes: EYES_OPEN(3), brows: BROWS_SAD, mouth: MOUTH.sad, extra: TEAR },
time:  { eyes: EYES_OPEN(-2), mouth: MOUTH.oh, extra: SWEAT },
smirk:    { eyes: EYES_SLY, brows: BROWS_SLY, mouth: MOUTH_SLY },
laugh:    { eyes: EYES_HAPPY, mouth: MOUTH.big, extra: JOY_TEARS },
sheepish: { eyes: EYES_OPEN(-1, -3), mouth: MOUTH_WOBBLY, extra: SWEAT },
grin:     { eyes: EYES_OPEN(), mouth: MOUTH_GRIN },
};
function svg(mood) {
const f = FACES[mood] || FACES.hi;
return `
<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" focusable="false">
  <ellipse cx="60" cy="134" rx="30" ry="5" fill="#000" opacity=".18"/>
  <g class="tj-mascot__arm tj-mascot__arm--l"><ellipse cx="25" cy="92" rx="8" ry="13" fill="#8a4719" transform="rotate(18 25 92)"/></g>
  <g class="tj-mascot__arm tj-mascot__arm--r"><ellipse cx="95" cy="92" rx="8" ry="13" fill="#8a4719" transform="rotate(-18 95 92)"/></g>
  <ellipse cx="60" cy="82" rx="36" ry="46" fill="#9a521c"/>
  <ellipse cx="60" cy="86" rx="31" ry="41" fill="#b8651f" opacity=".55"/>
  <ellipse cx="44" cy="58" rx="7" ry="13" fill="#fff" opacity=".18" transform="rotate(24 44 58)"/>
  <g class="tj-mascot__cap">
    <path d="M30 50 C30 22 90 22 90 50 C76 43 44 43 30 50 Z" fill="#fdfaf0" stroke="#e1d6b8" stroke-width="1.6"/>
    <path d="M34 45 C48 40 72 40 86 45" fill="none" stroke="#c99a2e" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M60 28 l4 5 -4 5 -4 -5z" fill="#c99a2e"/>
  </g>
  <circle cx="33" cy="92" r="6" fill="#e8766b" opacity=".4"/><circle cx="87" cy="92" r="6" fill="#e8766b" opacity=".4"/>
  ${f.eyes}${f.brows || ''}${f.mouth}${f.extra || ''}
</svg>`;
}
export function mascotHtml(mood = 'hi', size = 96) {
const m = FACES[mood] ? mood : 'hi';
return `<span class="tj-mascot tj-mascot--${m}" style="--ms:${size}px" aria-hidden="true">${svg(m)}</span>`;
}
export function sayHtml(mood, text, size = 72, extraClass = '') {
return `<div class="tj-say ${extraClass}" role="status">
    ${mascotHtml(mood, size)}
    <p class="tj-say__bubble">${esc(text)}</p>
  </div>`;
}
const pick = list => list[Math.floor(Math.random() * list.length)];
const _E = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const ar = n => String(n).replace(/[0-9]/g, d => _E[Number(d)]);
const LATE = ['انتهى الوقت، معليش', 'فات الوقت! سنركّز أكثر في القادم'];
const WIN_LINES = [
{ mood: 'happy', text: 'مكنة والله مافي كلام' },
{ mood: 'happy', text: 'شقي أنت الزيك منو؟' },
{ mood: 'happy', text: 'ربنا يحفظك ما هين والله' },
{ mood: 'smirk', text: 'مفتكرك ماشي بالحظ لكين طلعت ماك هين' },
{ mood: 'grin',  text: 'أقعتني والله' },
{ mood: 'happy', text: 'نبيه ما شاءالله 🤍' },
];
const LOSS_LINES = [
{ mood: 'sad',   text: 'عادي يا زول كلنا بغلط' },
{ mood: 'sad',   text: 'قربت والله الجاي أحلى' },
{ mood: 'sad',   text: 'ولا يهمك لازم نفشل عشان نتعلم' },
{ mood: 'smirk', text: 'أغلط يا زول اللعبة حق ابو منو؟' },
{ mood: 'laugh', text: 'أنت مالك جقد كدا؟',
then: { mood: 'sheepish', text: 'لالاه قاعد أهظر معاك ولا يهمك يا غالي', delay: 1800 } },
{ mood: 'smirk', text: 'الحظ شكلو ما أسعفك' },
];
const _lastIdx = {};
function pickLine(key, list) {
let i;
do { i = Math.floor(Math.random() * list.length); } while (list.length > 1 && i === _lastIdx[key]);
_lastIdx[key] = i;
return { ...list[i] };
}
export function reactionFor({ ok, timedOut, combo }) {
if (ok) {
if (combo >= 3) return { mood: 'cheer', text: `${ar(combo)} إجابات متتالية! أنت نار!` };
return pickLine('win', WIN_LINES);
}
if (timedOut) return { mood: 'time', text: pick(LATE) };
return pickLine('loss', LOSS_LINES);
}
export function levelResultSay({ stars, finishedAll, hasNext }) {
if (finishedAll) return { mood: 'win', text: 'أنهيتَ كل المستويات! الله يعطيك العافية' };
if (stars >= 3) {
const l = pickLine('win', WIN_LINES);
return l.mood === 'happy' ? { ...l, mood: 'win' } : l;
}
if (stars === 2) return { mood: 'happy', text: 'ممتاز! اقتربت من الثلاث نجوم' };
if (stars === 1) return { mood: 'happy', text: hasNext ? 'جميل! فتحتَ المستوى الجديد' : 'جميل! اجتزتَ المستوى' };
return pickLine('loss', LOSS_LINES);
}
export function dailyResultSay(pct) {
return pct >= 80
? { mood: 'win', text: 'يا بطل! حافظ على أيامك المتتالية' }
: { mood: 'happy', text: 'عاش يا غالي! غدًا أسئلة جديدة' };
}
export const GUIDE_STEPS = [
{ mood: 'smirk', text: 'حبابو ود شبتوت، معاك بلحة، أنا معاك في اللعبة عشان أوجهك وأكون جمبك، بعد مرات بدعمك وبعد مرات بكون صريح معاك' },
{ mood: 'think', text: 'كل مستوى خمسة أسئلة. اختر الإجابة الصحيحة قبل أن ينتهي الوقت المعروض في الأعلى. وانتبه: بعض الإجابات الخاطئة مفخّخة!' },
{ mood: 'happy', text: 'إن أجبت ٣ إجابات صحيحة أو أكثر تنل نجمة وتفتح المستوى التالي. وكلما أجبت أسرع زادت نقاطك.' },
{ mood: 'cheer', text: 'الإجابات الصحيحة المتتالية تشعل النار وتزيد نقاطك.' },
{ mood: 'think', text: 'إن اشتبه عليك الأمر: «حذف إجابة» يزيل لك إجابة خاطئة، و«زيادة الوقت» يضيف ١٠ ثوانٍ، ولكلٍّ منهما مرة واحدة في كل مستوى. وفي «تحدّي اليوم» أسئلة جديدة كل يوم.' },
{ mood: 'win',   text: 'وأنا معك في كل خطوة. إن أخطأت فلا تحزن، فكلنا نتعلّم. يلا نبدأ!' },
];
