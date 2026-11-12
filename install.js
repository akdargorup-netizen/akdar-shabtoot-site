(function () {
'use strict';
var ua = navigator.userAgent || '';
var $ = function (id) { return document.getElementById(id); };
var show = function (id) { var e = $(id); if (e) e.hidden = false; };
var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
var isAndroid = /Android/i.test(ua);
var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
var inApp = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Snapchat|TikTok|; wv\)/i.test(ua);
var iosNotSafari = isIOS && (/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//.test(ua) || !/Safari\//.test(ua));
var conn = navigator.connection || {};
var lean = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
var loadScript = function (src, cb) { var e = document.createElement('script'); e.src = src; e.onload = cb; e.onerror = function () {}; document.head.appendChild(e); };
if (standalone) show('installed');
var HOSTS = [{"id":"vercel","name":"Vercel","base":"https://akdar-nine.vercel.app/","alias":[]},{"id":"firebase","name":"Firebase","base":"https://akdar-shabtoot.web.app/","alias":["https://akdar-shabtoot.firebaseapp.com/"]},{"id":"github","name":"GitHub Pages","base":"https://akdargorup-netizen.github.io/akdar-shabtoot-site/","alias":[]}];
var GATEWAY_ID = "vercel";
var norm = function (u) { return u.charAt(u.length - 1) === '/' ? u : u + '/'; };
var here = norm(location.origin + location.pathname.replace(/[^\/]*$/, ''));
var hereIdx = -1;
HOSTS.forEach(function (h, i) { if (here === h.base || h.alias.indexOf(here) > -1) hereIdx = i; });
var local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
var redirecting = false;
var gateway = HOSTS[0];
HOSTS.forEach(function (h) { if (h.id === GATEWAY_ID) gateway = h; });
var GATEWAY = gateway.base + 'install.html';
var PKEY = 'akdar_probe', PROBE_MS = 4000, CACHE_MS = 300000;
var res = {};
try {
var c = JSON.parse(sessionStorage.getItem(PKEY) || 'null');
if (c && Date.now() - c.t < CACHE_MS) res = c.r || {};
} catch (e) {}
if (hereIdx > -1) res[HOSTS[hereIdx].id] = true;
function probe(h, cb) {
var done = false, ctl = window.AbortController ? new AbortController() : null;
var finish = function (v) { if (done) return; done = true; clearTimeout(t); cb(v); };
var t = setTimeout(function () { finish(false); if (ctl) ctl.abort(); }, PROBE_MS);
fetch(h.base + 'health.json?t=' + Date.now(), { cache: 'no-store', mode: 'cors', signal: ctl ? ctl.signal : undefined })
.then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
.then(function (j) { finish(!!(j && j.ok === true && j.app === 'akdar')); })
.catch(function () { finish(false); });
}
function decide() {
for (var i = 0; i < HOSTS.length; i++) {
var r = res[HOSTS[i].id];
if (r === undefined) return -2;
if (r) return i;
}
return hereIdx;
}
var q = location.search;
var noRoute = standalone || local || !window.fetch || hereIdx < 0 || /[?&](stay|from)=/.test(q) || location.hash === '#stay';
var decided = noRoute;
function act(d) {
if (d === hereIdx || d < 0) {
if (hereIdx > 0) { $('fb-name').textContent = HOSTS[hereIdx].name; show('fallback'); }
return;
}
redirecting = true;
$('mv-name').textContent = HOSTS[d].name;
show('moving');
location.replace(HOSTS[d].base + 'install.html?from=' + encodeURIComponent(HOSTS[hereIdx].id) + location.hash);
}
if (HOSTS.length > 1 && !standalone && !local && window.fetch) {
var pending = 0;
HOSTS.forEach(function (h) {
if (res[h.id] !== undefined) return;
pending++;
probe(h, function (ok) {
res[h.id] = ok;
try { sessionStorage.setItem(PKEY, JSON.stringify({ t: Date.now(), r: res })); } catch (e) {}
if (!decided) { var d = decide(); if (d !== -2) { decided = true; act(d); } }
});
});
if (!decided) { var d0 = decide(); if (d0 !== -2) { decided = true; act(d0); } }
}
var mine = isIOS ? 'ios' : isAndroid ? 'android' : 'other';
var mineEl = $(mine);
mineEl.classList.add('mine');
['android', 'ios', 'other'].forEach(function (id) { var e = $(id); if (e && id !== mine) e.hidden = true; });
Array.prototype.forEach.call(document.querySelectorAll('#faq .faq-group'), function (g) { g.hidden = g.getAttribute('data-for') !== mine; });
var first = $('main').querySelector('.card:not(#installed)');
if (mineEl !== first) first.parentNode.insertBefore(mineEl, first);
if (isIOS && iosNotSafari) { show('ios-notsafari'); show('inapp'); $('inapp-ios').hidden = false; $('inapp-and').hidden = true; }
if (isAndroid && inApp) { show('inapp'); $('inapp-ios').hidden = true; $('inapp-and').hidden = false; }
var notChromeAnd = isAndroid && !standalone && (inApp || !/Chrome\//.test(ua) ||
/UCBrowser|UCWeb|MiuiBrowser|HuaweiBrowser|HeyTapBrowser|Quark|Firefox|Opera Mini|Puffin/i.test(ua));
if (notChromeAnd && !local) {
var chromeBtn = $('chrome-btn');
if (chromeBtn) {
chromeBtn.href = 'intent://' + location.host + location.pathname + location.search +
'#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' +
encodeURIComponent('https://play.google.com/store/apps/details?id=com.android.chrome') + ';end';
if (inApp) $('chrome-why').hidden = true;
show('open-chrome');
}
}
var mv = /OS (\d+)_(\d+)/.exec(ua);
if (isIOS && mv && +mv[1] < 13) { $('ios-ver').textContent = mv[1] + '.' + mv[2]; show('ios-old'); }
var deferred = null;
var pcBtn = $('install-btn-pc');
var myManual = mine === 'android' ? $('android-manual') : mine === 'other' ? $('pc-manual') : null;
var autoOpened = false;
window.addEventListener('beforeinstallprompt', function (e) {
e.preventDefault();
deferred = e;
$('install-hint').hidden = true;
if (pcBtn) pcBtn.hidden = false;
if (autoOpened && myManual) { myManual.open = false; autoOpened = false; }
});
function doInstall() {
if (!deferred) {
$('install-hint').hidden = false;
if (myManual) { myManual.open = true; myManual.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
return;
}
deferred.prompt();
deferred.userChoice.then(function (c) { deferred = null; if (c && c.outcome === 'accepted') show('installing'); });
}
var instBtn = $('install-btn');
if (instBtn) instBtn.addEventListener('click', doInstall);
if (pcBtn) pcBtn.addEventListener('click', doInstall);
if (!standalone && myManual && mine !== 'android') {
setTimeout(function () { if (!deferred) { myManual.open = true; autoOpened = true; } }, 2500);
}
window.addEventListener('appinstalled', function () { show('installing'); });
var url = local ? location.origin + location.pathname : GATEWAY;
var alts = HOSTS.filter(function (h) { return h !== gateway; }).map(function (h) { return h.base + 'install.html'; });
var msg = 'ثبّت تطبيق أخضر شبتوت بحري على تلفونك:\n' + url;
if (alts.length) msg += '\n\nلو الرابط ما فتح جرّب:\n' + alts.join('\n');
$('wa').href = 'https://wa.me/?text=' + encodeURIComponent(msg);
function buildQR() {
if (!window.QRCode) return;
try {
var q = new window.QRCode(-1, 2);
q.addData(url);
q.make();
var n = q.getModuleCount(), m = 4, s = n + m * 2, d = '';
for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
$('qr').outerHTML = '<svg id="qr" role="img" aria-label="رمز QR لصفحة التثبيت" viewBox="0 0 ' + s + ' ' + s + '" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="' + d + '"/></svg>';
$('qr-url').textContent = url;
show('qr-card');
} catch (e) {}
}
function enhance() {
if (lean || redirecting || mine !== 'other') return;
loadScript('assets/vendor/qrcode.js', buildQR);
}
if (document.readyState === 'complete') setTimeout(enhance, 300);
else window.addEventListener('load', function () { setTimeout(enhance, 300); });
var apkAlt = $('apk-alt');
if (apkAlt) apkAlt.href = gateway.base + 'Akdar.apk';
var apkMain = $('apk-btn');
function reach(url, sameOrigin, cb) {
var t0 = Date.now(), done = false, ctl = window.AbortController ? new AbortController() : null;
var finish = function (ok) { if (done) return; done = true; clearTimeout(tm); cb(ok, Date.now() - t0); };
var tm = setTimeout(function () { finish(false); if (ctl) ctl.abort(); }, 4000);
var opts = { method: 'HEAD', cache: 'no-store', signal: ctl ? ctl.signal : undefined };
if (!sameOrigin) opts.mode = 'no-cors';
fetch(url, opts).then(function (r) { finish(sameOrigin ? r.ok : true); }, function () { finish(false); });
}
if (apkMain && apkAlt && isAndroid && !standalone && !local && window.fetch) {
var rm = null, ra = null;
var altSame = here === gateway.base;
var decideApk = function () {
if (!rm || !ra) return;
if (altSame && !ra.ok) return;
if (rm.ok && (!ra.ok || rm.ms <= ra.ms + 2500)) return;
if (!ra.ok) return;
var a = apkMain.href; apkMain.href = apkAlt.href; apkAlt.href = a;
var sw = $('apk-switched'); if (sw) sw.hidden = false;
};
reach(apkMain.href, false, function (ok, ms) { rm = { ok: ok, ms: ms }; decideApk(); });
reach(apkAlt.href, altSame, function (ok, ms) { ra = { ok: ok, ms: ms }; decideApk(); });
}
function resumableDownload(o) {
var got = 0, chunks = [], total = 0, tries = 0, attemptId = 0, ctl = null, last = 0;
var stopped = false, finished = false, retryTimer = null, watch = null;
var now = o.now || Date.now;
function clearRetry() { if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; } }
function stop() {
stopped = true; clearRetry();
if (watch) { clearInterval(watch); watch = null; }
if (ctl) { try { ctl.abort(); } catch (e) {} }
}
function fail(why) { if (stopped || finished) return; stop(); o.onFail(why); }
function fatal(msg) { var e = new Error(msg); e.fatal = true; return e; }
function retry(why) {
if (stopped || finished) return;
tries++;
if (tries > o.maxTries) { fail(why); return; }
o.onStatus('retry', tries);
clearRetry();
retryTimer = setTimeout(function () { retryTimer = null; attempt(); }, Math.min((o.retryMs || 1500) * tries, 6000));
}
function attempt() {
if (stopped || finished) return;
var id = ++attemptId, c = new AbortController();
ctl = c; last = now();
var opts = { cache: 'no-store', mode: 'cors', credentials: 'omit', signal: c.signal };
if (got > 0) opts.headers = { Range: 'bytes=' + got + '-' };
o.fetchFn(o.url, opts).then(function (r) {
if (id !== attemptId) return;
if (got > 0 && r.status === 200) { got = 0; chunks = []; total = 0; }
else if (got > 0 && r.status !== 206) throw new Error('http');
else if (got === 0 && !r.ok) throw fatal('http');
if (!r.body || !r.body.getReader) throw fatal('nostream');
var cl = Number(r.headers.get('content-length')) || 0;
if (!total && cl) total = r.status === 206 ? got + cl : cl;
if (total > o.maxBytes) throw fatal('big');
o.onStatus('run', 0);
var rd = r.body.getReader();
return (function pump() {
return rd.read().then(function (x) {
if (id !== attemptId || x.done) return;
chunks.push(x.value); got += x.value.length; last = now();
if (tries) { tries = 0; o.onStatus('run', 0); }
o.onProgress(got, total);
return pump();
});
})().then(function () {
if (id !== attemptId) return;
if (total && got < total) throw new Error('short');
if (got < o.minBytes || (total && got !== total)) throw fatal('small');
finished = true; clearRetry();
if (watch) { clearInterval(watch); watch = null; }
o.onDone(chunks, got);
});
}).catch(function (err) {
if (id !== attemptId || stopped || finished) return;
if (err && err.fatal) { fail(err.message); return; }
retry(err && err.message || 'net');
});
}
watch = setInterval(function () {
if (stopped || finished || retryTimer) return;
if (now() - last > o.stallMs && ctl) { try { ctl.abort(); } catch (e) {} }
}, o.watchMs || 2000);
attempt();
return {
cancel: stop,
wake: function () {
if (stopped || finished) return;
if (retryTimer) { clearRetry(); attempt(); return; }
if (now() - last > 4000 && ctl) { try { ctl.abort(); } catch (e) {} }
}
};
}
var MAX_BYTES = 200 * 1048576;
var openGuideFn = null, tracking = false, dl = null, wakeLock = null, io = null;
var warnMode = '', t0 = 0, samples = [], baseTitle = document.title;
var ar = function (n) { return String(n).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.charAt(d); }); };
var mb = function (n) { return ar((n / 1048576).toFixed(1)); };
var apkMainEl = $('apk-btn'), trk = $('dl-track'), readyEl = $('dl-ready');
var trkBar = $('dl-bar'), trkPct = $('dl-pct'), trkMsg = $('dl-msg'), sizeEl = $('dl-size'), keepEl = $('dl-keep');
var barWrap = $('dl-barwrap'), warnEl = $('dl-warn'), warnTxt = $('dl-warn-txt'), doneEl = $('dl-done');
var miniEl = $('dl-mini'), miniPct = $('dl-mini-pct'), miniBar = $('dl-mini-bar');
var canTrack = !!apkMainEl && !!trk && !!readyEl && isAndroid && !standalone && !inApp && !local && window.fetch && window.AbortController &&
window.ReadableStream && window.Blob && window.URL && URL.createObjectURL;
function etaTxt(s) {
if (s < 45) return 'باقي أقل من دقيقة';
var m = Math.max(1, Math.round(s / 60));
return 'باقي نحو ' + (m === 1 ? 'دقيقة' : m === 2 ? 'دقيقتين' : m <= 10 ? ar(m) + ' دقائق' : ar(m) + ' دقيقة');
}
function showWarn(mode, text) { warnMode = mode; warnTxt.textContent = text; warnEl.hidden = false; }
function hideWarn() { warnMode = ''; if (warnEl) warnEl.hidden = true; }
function setPct(p) {
var t = ar(p) + '٪';
trkBar.style.width = p + '%'; trkPct.textContent = t; barWrap.setAttribute('aria-valuenow', p);
miniBar.style.width = p + '%'; miniPct.textContent = t;
document.title = '⬇ ' + t + ' — ' + baseTitle;
}
function paint(got, total) {
var p = total ? Math.min(99, Math.floor(got * 100 / total)) : -1;
if (p >= 0) setPct(p); else { trkPct.textContent = mb(got) + ' م.ب'; miniPct.textContent = mb(got); }
var t = Date.now();
samples.push([t, got]);
while (samples.length > 1 && t - samples[0][0] > 5000) samples.shift();
var dt = (t - samples[0][0]) / 1000, bps = dt > 0.5 ? (got - samples[0][1]) / dt : 0;
var line = total ? mb(got) + ' من ' + mb(total) + ' م.ب' : mb(got) + ' م.ب';
if (total && bps > 1024 && t - t0 > 4000) line += ' · ' + etaTxt((total - got) / bps);
sizeEl.textContent = line;
if (t - t0 > 20000 && p >= 0 && p < 50 && bps < 30720) showWarn('slow', 'التحميل بطيء على هذه الشبكة، تقدر تكمل هنا أو:');
else if (warnMode === 'slow' && bps >= 61440) hideWarn();
}
function onStatus(st) {
if (st === 'retry') {
var off = typeof navigator.onLine === 'boolean' && !navigator.onLine;
trkMsg.textContent = off ? 'انقطع النت — نكمل أول ما يرجع' : 'النت متقطّع — نكمل من نفس النقطة';
showWarn('retry', 'ما تقلق، التحميل بيكمل من حيث وقف. أو:');
} else {
trkMsg.textContent = 'جاري التحميل…';
if (warnMode === 'retry') hideWarn();
}
}
function lockScreen() {
try {
if (!(navigator.wakeLock && navigator.wakeLock.request)) return;
navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; }, function () {});
} catch (e) {}
}
function unlockScreen() { try { if (wakeLock) wakeLock.release(); } catch (e) {} wakeLock = null; }
function watchTrack() {
if (!window.IntersectionObserver) return;
io = new IntersectionObserver(function (es) { miniEl.hidden = !tracking || es[0].isIntersecting; }, { threshold: 0.2 });
io.observe(trk);
}
function endTracking() {
tracking = false; dl = null; unlockScreen(); hideWarn();
if (io) { io.disconnect(); io = null; }
miniEl.hidden = true; document.title = baseTitle;
}
function candidates() {
var out = [];
HOSTS.forEach(function (h) { if (h.id === 'vercel') out.push(h.base + 'Akdar.apk'); });
return out;
}
var mirrorStale = false;
function timed(u, opts, ms) {
var c = new AbortController(), t = setTimeout(function () { c.abort(); }, ms);
opts.signal = c.signal;
return fetch(u, opts).then(function (r) { clearTimeout(t); return r; }, function (e) { clearTimeout(t); throw e; });
}
function checkMirror() {
var m = /github\.com\/([^\/]+\/[^\/]+)\/releases\//.exec(apkMainEl.href), vc = candidates()[0];
if (!m || !vc) return;
var gh = timed('https://api.github.com/repos/' + m[1] + '/releases/latest', { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } }, 6000)
.then(function (r) { return r.ok ? r.json() : null; })
.then(function (j) {
var n = 0;
if (j && j.assets) j.assets.forEach(function (a) { if (a.name === 'Akdar.apk') n = a.size || 0; });
return n;
}).catch(function () { return 0; });
var mir = timed(vc, { method: 'HEAD', cache: 'no-store', mode: 'cors' }, 6000)
.then(function (r) { return r.ok ? Number(r.headers.get('content-length')) || 0 : 0; })
.catch(function () { return 0; });
Promise.all([gh, mir]).then(function (v) { if (v[0] && v[1] && v[0] !== v[1]) mirrorStale = true; });
}
function giveUp(fallbackHref) {
if (dl) dl.cancel();
endTracking();
if (trk) trk.hidden = true;
if (readyEl) readyEl.hidden = false;
if (openGuideFn) openGuideFn();
location.href = fallbackHref;
}
function finish(chunks) {
var blob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });
endTracking();
trkBar.style.width = '100%'; barWrap.setAttribute('aria-valuenow', 100);
trkPct.textContent = '✓';
trkMsg.textContent = 'اكتمل التحميل ✅';
sizeEl.textContent = mb(blob.size) + ' م.ب';
keepEl.textContent = 'اضغط «فتح» في إشعار التحميل بأعلى الشاشة، ثم كمّل التثبيت.';
trk.classList.add('is-done'); doneEl.hidden = false;
var a = document.createElement('a');
var u = URL.createObjectURL(blob);
a.href = u; a.download = 'Akdar.apk'; a.style.display = 'none';
document.body.appendChild(a); a.click();
setTimeout(function () { URL.revokeObjectURL(u); if (a.parentNode) a.parentNode.removeChild(a); }, 120000);
var t = $('dl-title'), l = $('dl-lead');
if (t) t.textContent = 'اكتمل التحميل ✅';
if (l) l.innerHTML = 'ظهر إشعار في <b>أعلى الشاشة</b> (أو شريط في أسفلها). اضغط <b>«فتح»</b> ثم كمّل الخطوات:';
}
if (canTrack) apkMainEl.addEventListener('click', function (e) {
e.preventDefault(); e.stopImmediatePropagation();
if (tracking) return;
var cands = candidates(), fb = apkMainEl.href;
if (!cands.length || mirrorStale) { giveUp(fb); return; }
tracking = true; t0 = Date.now(); samples = []; hideWarn();
readyEl.hidden = true; doneEl.hidden = true; trk.classList.remove('is-done');
keepEl.textContent = 'ابقَ في هذه الصفحة حتى يكتمل التحميل. لو خرجت ورجعت نكمل من حيث وقفنا.';
trkMsg.textContent = 'جاري التحميل…'; sizeEl.textContent = '';
setPct(0); trk.hidden = false;
try { trk.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) {}
lockScreen(); watchTrack();
dl = resumableDownload({
url: cands[0], fetchFn: function (u, o) { return fetch(u, o); },
maxBytes: MAX_BYTES, minBytes: 1048576, stallMs: 12000, maxTries: 6,
onProgress: paint, onStatus: onStatus, onDone: finish,
onFail: function () { giveUp(fb); }
});
});
if (canTrack) {
setTimeout(checkMirror, 1200);
$('dl-native').addEventListener('click', function () { giveUp(apkMainEl.href); });
$('dl-steps').addEventListener('click', function () { if (openGuideFn) openGuideFn(); });
$('dl-again').addEventListener('click', function () { trk.hidden = true; trk.classList.remove('is-done'); readyEl.hidden = false; });
miniEl.addEventListener('click', function () { try { trk.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) {} });
document.addEventListener('visibilitychange', function () {
if (document.visibilityState === 'visible' && tracking) { lockScreen(); if (dl) dl.wake(); }
});
window.addEventListener('online', function () { if (dl) dl.wake(); });
window.addEventListener('offline', function () { if (tracking) onStatus('retry'); });
}
var apkBtns = document.querySelectorAll('a[data-apk]'), guide = $('dl-guide');
if (apkBtns.length && guide && isAndroid && !standalone && !inApp && !notChromeAnd) {
var closeGuide = function () { guide.hidden = true; document.removeEventListener('keydown', onKey); };
var onKey = function (e) { if (e.key === 'Escape') closeGuide(); };
var openGuide = openGuideFn = function () {
setTimeout(function () {
if (tracking) return;
guide.hidden = false;
document.addEventListener('keydown', onKey);
var cb = $('dl-close'); if (cb) cb.focus();
}, 500);
};
Array.prototype.forEach.call(apkBtns, function (b) { b.addEventListener('click', function () { if (!tracking) openGuide(); }); });
$('dl-close').addEventListener('click', closeGuide);
guide.addEventListener('click', function (e) { if (e.target === guide) closeGuide(); });
}
$('copy').addEventListener('click', function () {
var b = this;
var ok = function () { b.textContent = 'تم النسخ ✅'; };
if (navigator.clipboard && navigator.clipboard.writeText) {
navigator.clipboard.writeText(url).then(ok, function () { window.prompt('انسخ الرابط:', url); });
} else { window.prompt('انسخ الرابط:', url); }
});
})();
