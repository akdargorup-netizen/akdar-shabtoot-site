let _ctx = null;
function _createContext() {
const Ctor = window.AudioContext || window.webkitAudioContext;
if (!Ctor) return null;
if (!_ctx) _ctx = new Ctor();
return _ctx;
}
function _warmUp() {
try {
const ctx = _createContext();
if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
} catch {   }
}
['pointerdown', 'touchstart', 'click'].forEach(evt =>
document.addEventListener(evt, _warmUp, { once: true, capture: true })
);
function _tone(ctx, { freq, start, duration, gain = 0.1, type = 'sine' }) {
const osc = ctx.createOscillator();
const g = ctx.createGain();
osc.type = type;
osc.frequency.setValueAtTime(freq, start);
g.gain.setValueAtTime(0, start);
g.gain.linearRampToValueAtTime(gain, start + 0.008);
g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
osc.connect(g);
g.connect(ctx.destination);
osc.onended = () => { osc.disconnect(); g.disconnect(); };
osc.start(start);
osc.stop(start + duration + 0.02);
}
function _whoosh(ctx, { start, duration = 0.13, gain = 0.10, freqFrom = 2600, freqTo = 500 }) {
const size = Math.max(1, Math.floor(ctx.sampleRate * duration));
const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
const data = buffer.getChannelData(0);
for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
const noise = ctx.createBufferSource();
noise.buffer = buffer;
const filter = ctx.createBiquadFilter();
filter.type = 'bandpass';
filter.Q.value = 0.85;
filter.frequency.setValueAtTime(freqFrom, start);
filter.frequency.exponentialRampToValueAtTime(Math.max(freqTo, 60), start + duration);
const g = ctx.createGain();
g.gain.setValueAtTime(0, start);
g.gain.linearRampToValueAtTime(gain, start + 0.015);
g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
noise.connect(filter);
filter.connect(g);
g.connect(ctx.destination);
noise.onended = () => { noise.disconnect(); filter.disconnect(); g.disconnect(); };
noise.start(start);
noise.stop(start + duration + 0.02);
}
function _playWhenReady(build) {
const ctx = _createContext();
if (!ctx) return;
if (ctx.state === 'running') {
build(ctx, ctx.currentTime);
return;
}
ctx.resume()
.then(() => build(ctx, ctx.currentTime))
.catch(() => {});
}
export function playLikeSound() {
try {
_playWhenReady((ctx, now) => {
_pop(ctx, { start: now });
});
} catch {   }
}
function _pop(ctx, { start, duration = 0.16, gain = 0.11 }) {
const osc = ctx.createOscillator();
const g = ctx.createGain();
osc.type = 'sine';
osc.frequency.setValueAtTime(720, start);
osc.frequency.exponentialRampToValueAtTime(1500, start + 0.07);
g.gain.setValueAtTime(0, start);
g.gain.linearRampToValueAtTime(gain, start + 0.012);
g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
osc.connect(g);
g.connect(ctx.destination);
osc.onended = () => { osc.disconnect(); g.disconnect(); };
osc.start(start);
osc.stop(start + duration + 0.02);
const shimmer = ctx.createOscillator();
const sg = ctx.createGain();
shimmer.type = 'sine';
shimmer.frequency.setValueAtTime(2200, start + 0.02);
sg.gain.setValueAtTime(0, start + 0.02);
sg.gain.linearRampToValueAtTime(gain * 0.45, start + 0.032);
sg.gain.exponentialRampToValueAtTime(0.0001, start + 0.1);
shimmer.connect(sg);
sg.connect(ctx.destination);
shimmer.onended = () => { shimmer.disconnect(); sg.disconnect(); };
shimmer.start(start + 0.02);
shimmer.stop(start + 0.12);
}
export function playCommentSound() {
try {
_playWhenReady((ctx, now) => {
_whoosh(ctx, { start: now, duration: 0.13, gain: 0.10, freqFrom: 2600, freqTo: 500 });
_tone(ctx, { freq: 1200, start: now + 0.10, duration: 0.06, gain: 0.09 });
});
} catch {   }
}
export function playVoteUpSound() {
try {
_playWhenReady((ctx, now) => {
_tone(ctx, { freq: 660, start: now, duration: 0.10, gain: 0.10, type: 'sine' });
_tone(ctx, { freq: 990, start: now + 0.075, duration: 0.14, gain: 0.11, type: 'sine' });
});
} catch {   }
}
export function playVoteDownSound() {
try {
_playWhenReady((ctx, now) => {
_tone(ctx, { freq: 640, start: now, duration: 0.11, gain: 0.22, type: 'triangle' });
_tone(ctx, { freq: 440, start: now + 0.08, duration: 0.18, gain: 0.22, type: 'triangle' });
});
} catch {   }
}
