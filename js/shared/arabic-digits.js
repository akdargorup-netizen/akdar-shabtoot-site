const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
export function toArabicDigits(n) {
return String(n).replace(/[0-9]/g, (d) => ARABIC_DIGITS[+d]);
}
export function formatCompactCount(n) {
const num = Number(n) || 0;
if (num < 1000) return toArabicDigits(num);
if (num < 1_000_000) {
const thousands = num / 1000;
const rounded = thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
if (rounded >= 1000) return `${toArabicDigits(1)} مليون`;
const text = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', '٫');
return `${toArabicDigits(text)} ألف`;
}
const millions = num / 1_000_000;
const rounded = millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10;
const text = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', '٫');
return `${toArabicDigits(text)} مليون`;
}
