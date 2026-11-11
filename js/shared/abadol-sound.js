const STORE_KEY = 'andandi_game_sound';
export function isSoundOn() {
try { return localStorage.getItem(STORE_KEY) !== 'off'; } catch { return true; }
}
export function setSoundOn(on) {
try { localStorage.setItem(STORE_KEY, on ? 'on' : 'off'); } catch {   }
}
let _ctx = null;
function _context() {
const Ctor = window.AudioContext || window.webkitAudioContext;
if (!Ctor) return null;
if (!_ctx) _ctx = new Ctor();
return _ctx;
}
export function unlockAudio() {
try {
const ctx = _context();
if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
} catch {   }
}
function _playWhenReady(build) {
if (!isSoundOn()) return;
try {
const ctx = _context();
if (!ctx) return;
if (ctx.state === 'running') { build(ctx, ctx.currentTime); return; }
ctx.resume().then(() => build(ctx, ctx.currentTime)).catch(() => {});
} catch {   }
}
function _pluck(ctx, { freq, start, gain = 0.16, decay = 0.7 }) {
const out = ctx.createGain();
out.gain.setValueAtTime(0, start);
out.gain.linearRampToValueAtTime(gain, start + 0.006);
out.gain.exponentialRampToValueAtTime(0.0001, start + decay);
const lp = ctx.createBiquadFilter();
lp.type = 'lowpass';
lp.frequency.setValueAtTime(freq * 7, start);
lp.frequency.exponentialRampToValueAtTime(freq * 1.6, start + decay * 0.6);
const body = ctx.createOscillator();
body.type = 'triangle';
body.frequency.setValueAtTime(freq, start);
const over = ctx.createOscillator();
const og = ctx.createGain();
over.type = 'sine';
over.frequency.setValueAtTime(freq * 2, start);
og.gain.setValueAtTime(0.35, start);
body.connect(lp);
over.connect(og); og.connect(lp);
lp.connect(out); out.connect(ctx.destination);
const end = start + decay + 0.03;
let left = 2;
const done = () => {
if (--left > 0) return;
[body, over, og, lp, out].forEach(n => { try { n.disconnect(); } catch {   } });
};
body.onended = done; over.onended = done;
body.start(start); over.start(start);
body.stop(end); over.stop(end);
}
const D4 = 293.66, G4 = 392.0, A4 = 440.0, D5 = 587.33, G5 = 784.0, E4 = 329.63;
export function playTap() {
_playWhenReady((ctx, t) => _pluck(ctx, { freq: E4, start: t, gain: 0.10, decay: 0.35 }));
}
export function playStart() {
_playWhenReady((ctx, t) => {
_pluck(ctx, { freq: D4, start: t, gain: 0.13, decay: 0.55 });
_pluck(ctx, { freq: G4, start: t + 0.12, gain: 0.13, decay: 0.7 });
});
}
export function playCorrect() {
_playWhenReady((ctx, t) => {
_pluck(ctx, { freq: G4, start: t, gain: 0.16, decay: 0.55 });
_pluck(ctx, { freq: D5, start: t + 0.09, gain: 0.17, decay: 0.8 });
});
}
export function playPair() {
_playWhenReady((ctx, t) => {
_pluck(ctx, { freq: A4, start: t, gain: 0.15, decay: 0.45 });
_pluck(ctx, { freq: D5, start: t + 0.07, gain: 0.15, decay: 0.5 });
});
}
export function playWrong() {
_playWhenReady((ctx, t) => {
_pluck(ctx, { freq: A4 / 2, start: t, gain: 0.17, decay: 0.5 });
_pluck(ctx, { freq: D4 * 0.75, start: t + 0.1, gain: 0.17, decay: 0.65 });
});
}
export function playResult(stars) {
_playWhenReady((ctx, t) => {
if (stars <= 0) { _pluck(ctx, { freq: D4, start: t, gain: 0.16, decay: 0.9 }); return; }
const notes = [D4, G4, A4, D5, G5].slice(0, stars === 1 ? 3 : stars === 2 ? 4 : 5);
notes.forEach((f, i) => _pluck(ctx, { freq: f, start: t + i * 0.11, gain: 0.16, decay: i === notes.length - 1 ? 1.1 : 0.6 }));
});
}
export function playAbadolVoice(mood = 'hi') {
const seq = {
hi:    [D4, G4, A4],
think: [A4, G4, E4],
happy: [G4, D5, G5],
cheer: [D4, G4, D5, G5],
win:   [D4, G4, A4, D5, G5],
sad:   [A4, E4, D4],
time:  [A4, E4],
}[mood] || [D4, G4, A4];
_playWhenReady((ctx, t) => seq.forEach((f, i) =>
_pluck(ctx, { freq: f, start: t + i * 0.12, gain: 0.15, decay: i === seq.length - 1 ? 0.95 : 0.55 })));
}
