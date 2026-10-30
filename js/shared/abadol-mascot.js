const esc = s => String(s).replace(/[&<>"']/g, c => (
{ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const INK = '#2a1508';
const EYES_OPEN = (dx = 0, dy = 0) => `
  <ellipse cx="170" cy="173" rx="9.5" ry="8.5" fill="#fff"/><ellipse cx="210" cy="173" rx="9.5" ry="8.5" fill="#fff"/>
  <circle cx="${170 + dx}" cy="${173 + dy}" r="5" fill="${INK}"/><circle cx="${210 + dx}" cy="${173 + dy}" r="5" fill="${INK}"/>
  <circle cx="${168.5 + dx}" cy="${171 + dy}" r="1.7" fill="#fff"/><circle cx="${208.5 + dx}" cy="${171 + dy}" r="1.7" fill="#fff"/>`;
const EYES_HAPPY = `
  <path d="M160 177 Q170 164 180 177 M200 177 Q210 164 220 177" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`;
const BROWS = {
normal: `<path d="M155 160 Q168 153 183 159 M197 159 Q212 153 225 160" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`,
happy:  `<path d="M155 158 Q168 150 183 157 M197 157 Q212 150 225 158" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`,
sad:    `<path d="M155 164 L183 153 M225 164 L197 153" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`,
think:  `<path d="M155 160 Q168 153 183 159 M197 154 Q212 146 225 154" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`,
};
const MOUSTACHE = `<path d="M158 207 Q174 196 190 203 Q206 196 222 207 Q206 214 190 209 Q174 214 158 207 Z" fill="#1f1007"/>`;
const MOUTH = {
smile: `<path d="M176 217 Q190 228 204 217" fill="none" stroke="#3b1a0a" stroke-width="3.2" stroke-linecap="round"/>`,
big:   `<path d="M172 214 Q190 242 208 214 Z" fill="#5a1b10"/><path d="M180 224 Q190 233 200 224 Q190 220 180 224 Z" fill="#e8766b"/>`,
sad:   `<path d="M178 226 Q190 216 202 226" fill="none" stroke="#3b1a0a" stroke-width="3.2" stroke-linecap="round"/>`,
oh:    `<ellipse cx="190" cy="222" rx="6" ry="8" fill="#5a1b10"/>`,
flat:  `<path d="M180 221 L200 221" fill="none" stroke="#3b1a0a" stroke-width="3.2" stroke-linecap="round"/>`,
};
const TEAR = `<path class="ab-mascot__tear" d="M156 188 Q150 198 156 204 Q162 198 156 188 Z" fill="#7cc4ee" stroke="#4a9fd0" stroke-width="1.5"/>`;
const SWEAT = `<path d="M244 140 Q238 150 244 156 Q250 150 244 140 Z" fill="#7cc4ee" stroke="#4a9fd0" stroke-width="1.5"/>`;
const SPARKS = `
  <path class="ab-mascot__spark" d="M118 130 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#e9c24f"/>
  <path class="ab-mascot__spark s2" d="M262 124 l2.6 6 6 2.6 -6 2.6 -2.6 6 -2.6 -6 -6 -2.6 6 -2.6z" fill="#e9c24f"/>
  <path class="ab-mascot__spark s3" d="M268 190 l2 4.5 4.5 2 -4.5 2 -2 4.5 -2 -4.5 -4.5 -2 4.5 -2z" fill="#f4dd8d"/>`;
const THINK_DOTS = `<circle cx="262" cy="118" r="3.4" fill="#d9c9a0"/><circle cx="274" cy="106" r="4.6" fill="#d9c9a0"/><circle cx="290" cy="90" r="6.4" fill="#d9c9a0"/>`;
const FACES = {
hi:    { brows: BROWS.normal, eyes: EYES_OPEN(),         mouth: MOUTH.smile },
think: { brows: BROWS.think,  eyes: EYES_OPEN(4, -3),    mouth: MOUTH.flat,  extra: THINK_DOTS },
happy: { brows: BROWS.happy,  eyes: EYES_HAPPY,          mouth: MOUTH.big },
cheer: { brows: BROWS.happy,  eyes: EYES_HAPPY,          mouth: MOUTH.big },
win:   { brows: BROWS.happy,  eyes: EYES_HAPPY,          mouth: MOUTH.big,   extra: SPARKS },
sad:   { brows: BROWS.sad,    eyes: EYES_OPEN(0, 3),     mouth: MOUTH.sad,   extra: TEAR },
time:  { brows: BROWS.happy,  eyes: EYES_OPEN(0, -2),    mouth: MOUTH.oh,    extra: SWEAT },
};
const KISSIR = `
  <g transform="translate(236 318) rotate(12)">
    <path d="M-23 -22 L-25 -118 M23 -22 L25 -118" fill="none" stroke="#8a5d2e" stroke-width="10" stroke-linecap="round"/>
    <path d="M-23 -22 L-25 -118 M23 -22 L25 -118" fill="none" stroke="#ecd9aa" stroke-width="6" stroke-linecap="round"/>
    <path d="M-36 -118 L36 -118" fill="none" stroke="#8a5d2e" stroke-width="10" stroke-linecap="round"/>
    <path d="M-36 -118 L36 -118" fill="none" stroke="#e5cd98" stroke-width="6" stroke-linecap="round"/>
    <g fill="#8a5d2e"><circle cx="-14" cy="-118" r="2.6"/><circle cx="0" cy="-118" r="2.6"/><circle cx="14" cy="-118" r="2.6"/></g>
    <circle r="36" fill="#a9682f" stroke="#5a3014" stroke-width="2.5"/>
    <circle r="29" fill="#e2c08a" stroke="#8a5d2e" stroke-width="1.5"/>
    <circle r="23" fill="none" stroke="#8a5d2e" stroke-width="1.6" stroke-dasharray="2.5 4.5" stroke-linecap="round"/>
    <path d="M-17 -12 L17 -12" stroke="#5a3014" stroke-width="5" stroke-linecap="round"/>
    <g stroke="#fff7df" stroke-width="1.9" stroke-linecap="round">
      <line class="ab-str s1" x1="-14" y1="-12" x2="-21" y2="-118"/>
      <line class="ab-str s2" x1="-7"  y1="-12" x2="-10.5" y2="-118"/>
      <line class="ab-str s3" x1="0"   y1="-12" x2="0"   y2="-118"/>
      <line class="ab-str s4" x1="7"   y1="-12" x2="10.5" y2="-118"/>
      <line class="ab-str s5" x1="14"  y1="-12" x2="21"  y2="-118"/>
    </g>
  </g>`;
const HOLD_ARM = `
  <path d="M248 306 Q266 298 273 270" fill="none" stroke="#fbf8f0" stroke-width="21" stroke-linecap="round"/>
  <circle cx="273" cy="262" r="10.5" fill="#7a4524"/>
  <circle cx="267" cy="258" r="4.6" fill="#7a4524" stroke="#5e3319" stroke-width="1"/>`;
const PLUCK_ARM = `
  <g class="ab-pluck">
    <path d="M142 330 Q190 312 228 288" fill="none" stroke="#fbf8f0" stroke-width="21" stroke-linecap="round"/>
    <circle cx="236" cy="283" r="10.5" fill="#7a4524"/>
    <path d="M241 276 l7 -4 M243 282 l8 -2 M241 288 l7 1" fill="none" stroke="#7a4524" stroke-width="4" stroke-linecap="round"/>
  </g>`;
const NOTE = `<ellipse cx="0" cy="0" rx="5.2" ry="3.8" transform="rotate(-22)" fill="#f7da8b"/><path d="M4.6 -1.6 V-17 q6.5 1.6 7.4 8.4" fill="none" stroke="#f7da8b" stroke-width="2.3" stroke-linecap="round"/>`;
const NOTES = `
  <g transform="translate(286 196)"><g class="ab-note n1">${NOTE}</g></g>
  <g transform="translate(306 236)"><g class="ab-note n2">${NOTE}</g></g>
  <g transform="translate(272 168)"><g class="ab-note n3">${NOTE}</g></g>`;
function svg(mood) {
const f = FACES[mood] || FACES.hi;
return `
<svg viewBox="92 84 230 270" xmlns="http://www.w3.org/2000/svg" focusable="false">
  <rect x="178" y="225" width="24" height="44" fill="#6e3d1f"/>
  <path d="M104 354 L104 309 Q108 280 140 268 Q190 246 240 268 Q272 280 276 309 L276 354 Z" fill="#fbf8f0" stroke="#cfc6b0" stroke-width="1.5"/>
  <path d="M172 262 L190 294 L208 262 Z" fill="#6e3d1f"/>
  <path d="M172 262 L190 294 L208 262" fill="none" stroke="#cfc6b0" stroke-width="1.5" stroke-linejoin="round"/>
  <circle cx="138" cy="180" r="9" fill="#6e3d1f"/><circle cx="242" cy="180" r="9" fill="#6e3d1f"/>
  <ellipse cx="190" cy="175" rx="52" ry="58" fill="#7a4524"/>
  <circle cx="153" cy="198" r="8" fill="#a05a2c" opacity=".5"/><circle cx="227" cy="198" r="8" fill="#a05a2c" opacity=".5"/>
  <path d="M139 152 Q138 98 190 96 Q242 98 241 152 Q190 140 139 152 Z" fill="#f6f0e1" stroke="#c8bd9f" stroke-width="1.5"/>
  <g fill="#ddd2b6">
    <circle cx="170" cy="112" r="2.2"/><circle cx="190" cy="110" r="2.2"/><circle cx="210" cy="112" r="2.2"/>
    <circle cx="158" cy="122" r="2.2"/><circle cx="180" cy="121" r="2.2"/><circle cx="200" cy="121" r="2.2"/><circle cx="222" cy="122" r="2.2"/>
    <circle cx="150" cy="133" r="2.2"/><circle cx="170" cy="132" r="2.2"/><circle cx="190" cy="131" r="2.2"/><circle cx="210" cy="132" r="2.2"/><circle cx="230" cy="133" r="2.2"/>
  </g>
  <path d="M139 152 Q190 140 241 152" fill="none" stroke="#b9ad8e" stroke-width="3"/>
  ${f.brows}${f.eyes}
  <path d="M185 190 Q190 197 195 190" fill="none" stroke="#4a2410" stroke-width="2.5" stroke-linecap="round"/>
  ${MOUSTACHE}${f.mouth}${f.extra || ''}
  ${KISSIR}${PLUCK_ARM}${HOLD_ARM}
  ${NOTES}
</svg>`;
}
export function abadolHtml(mood = 'hi', size = 84) {
const m = FACES[mood] ? mood : 'hi';
return `<span class="ab-mascot ab-mascot--${m}" style="--ab:${size}px" aria-hidden="true">${svg(m)}</span>`;
}
export function abadolSay(mood, text, size = 84, extraClass = '') {
return `<div class="ab-say ${extraClass}" role="status">
    ${abadolHtml(mood, size)}
    <p class="ab-say__bubble">${esc(text)}</p>
  </div>`;
}
const pick = list => list[Math.floor(Math.random() * list.length)];
const _E = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
export const arNum = n => String(n).replace(/[0-9]/g, d => _E[Number(d)]);
const OK  = ['ماشاء الله عليك يا ولدي!', 'صح عليك، كمّل كدا!', 'الله يبارك فيك، إجابة صحيحة!', 'أحسنت، لسانك نوبي أصيل!'];
const BAD = ['معليش يا ابني، التعلّم بالتكرار', 'قربت! الجاية بإذن الله تصيب', 'ما تشيل هم، كلنا اتعلمنا كدا'];
export function reactionFor({ ok, combo = 0 }) {
if (ok) {
if (combo >= 3) return { mood: 'cheer', text: `${arNum(combo)} صح ورا بعض! الله يزيدك` };
return { mood: 'happy', text: pick(OK) };
}
return { mood: 'sad', text: pick(BAD) };
}
export function roundResultSay({ stars }) {
if (stars >= 3) return { mood: 'win',   text: 'ثلاث نجوم! أنت ولد أصيل وبتتكلم زي أهلك' };
if (stars === 2) return { mood: 'happy', text: 'ممتاز يا ولدي! شوية كمان وتكمّل النجوم' };
if (stars === 1) return { mood: 'happy', text: 'حلو! عدّيت الجولة، وبنكرر عشان نثبّت الكلام' };
return { mood: 'sad', text: 'معليش، جرّب تاني وأنا قاعد معاك' };
}
export const WELCOME = { mood: 'hi', text: 'أهلًا يا ولدي، أنا آبادول. تعال نتعلم كلام أهلنا بآنداندي، واختار القسم البتحب تبدأ بيه.' };
export const MATCH_HINT = { mood: 'think', text: 'وصّل كل كلمة بمعناها. لمسة على اليمين ولمسة على اليسار.' };
export const GUIDE_STEPS = [
{ mood: 'hi',    text: 'أهلًا يا ولدي، أنا آبادول، كبير الأسرة. جيت أمشي معاك في رحلة نتعلم فيها كلام أهلنا بآنداندي.' },
{ mood: 'think', text: 'الخريطة دي فيها النيل، وعلى ضفافه محطات. كل محطة قسم من الكلام: ألوان وأهل وحيوانات وغيرها. المس المحطة وابدأ جولتك، وانتبه من التماسيح!' },
{ mood: 'happy', text: 'قبل كل جولة بعرض عليك الكلمات الجديدة ونطقها، وبعدين نختبر بعض في ست أسئلة. وإن غلطت ما تشيل هم، بشرح ليك الصحيح.' },
{ mood: 'cheer', text: 'كل جولة بتديك لحد ثلاث نجوم، والمحطة الخلصتها بتنوّر بالذهب. والكلمات الضعيفة بترجع ليك في «مراجعة كلماتي».' },
{ mood: 'win',   text: 'وأنا واقف معاك على الخريطة عند المحطة الجاية، المسني وأقول ليك الجديد. يلا نبدأ، والأهرامات في الآخر بتنتظرك!' },
];
export function buddyHints({ curTitle, allDone, dueCount = 0 }) {
const list = [];
list.push(allDone
? { mood: 'win', text: 'ما شاء الله! وصلنا الأهرامات. كرّر المحطات تكمّل النجوم الناقصة.' }
: { mood: 'hi', text: `أنا هنا يا ولدي. ابدأ بمحطة «${curTitle}».` });
if (dueCount > 0) list.push({ mood: 'think', text: `عندك ${arNum(dueCount)} كلمة حان وقت مراجعتها، المس «مراجعة كلماتي» فوق.` });
list.push({ mood: 'happy', text: 'المس أي محطة تبدأ جولة: كلمات جديدة أول، وبعدين الأسئلة.' });
list.push({ mood: 'cheer', text: 'المحطة اللي تنال فيها نجمة تنوّر بالذهب والدرب يوصّلك للي بعدها.' });
return list;
}
