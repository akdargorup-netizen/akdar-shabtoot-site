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
var GATEWAY_ID = "firebase";
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
function renderHosts() {
var list = $('hosts-list');
if (!list || HOSTS.length < 2) return;
list.textContent = '';
HOSTS.forEach(function (h, i) {
var li = document.createElement('li');
var a = document.createElement('a');
a.href = h.base + 'install.html';
a.textContent = h.name;
var st = document.createElement('span');
var r = res[h.id];
st.className = 'st' + (r ? ' ok' : '');
st.textContent = i === hereIdx ? 'أنت هنا ✅' : r === true ? 'يعمل ✅' : r === false ? 'مشغول حاليًا' : 'جاري الفحص…';
li.appendChild(a); li.appendChild(st); list.appendChild(li);
});
show('hosts-card');
}
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
renderHosts();
if (!decided) { var d = decide(); if (d !== -2) { decided = true; act(d); } }
});
});
renderHosts();
if (!decided) { var d0 = decide(); if (d0 !== -2) { decided = true; act(d0); } }
}
var mine = isIOS ? 'ios' : isAndroid ? 'android' : 'other';
var mineEl = $(mine);
mineEl.classList.add('mine');
var tag = document.createElement('span');
tag.className = 'tag';
tag.textContent = 'جهازك';
mineEl.querySelector('h2').appendChild(tag);
var first = $('main').querySelector('.card:not(#installed)');
if (mineEl !== first) first.parentNode.insertBefore(mineEl, first);
if (isIOS && iosNotSafari) { show('ios-notsafari'); show('inapp'); $('inapp-ios').hidden = false; $('inapp-and').hidden = true; }
if (isAndroid && inApp) { show('inapp'); $('inapp-ios').hidden = true; $('inapp-and').hidden = false; }
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
$('install-btn').addEventListener('click', doInstall);
if (pcBtn) pcBtn.addEventListener('click', doInstall);
if (!standalone && myManual) {
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
if (lean || redirecting) return;
loadScript('assets/vendor/qrcode.js', buildQR);
}
if (document.readyState === 'complete') setTimeout(enhance, 300);
else window.addEventListener('load', function () { setTimeout(enhance, 300); });
$('copy').addEventListener('click', function () {
var b = this;
var ok = function () { b.textContent = 'تم النسخ ✅'; };
if (navigator.clipboard && navigator.clipboard.writeText) {
navigator.clipboard.writeText(url).then(ok, function () { window.prompt('انسخ الرابط:', url); });
} else { window.prompt('انسخ الرابط:', url); }
});
})();
