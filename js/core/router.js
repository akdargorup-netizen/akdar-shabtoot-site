import { renderHeader }     from './header.js';
import { initImages }       from '../shared/img.js';
import { renderNotFound }   from '../pages/not-found.js';
import { initConnectivity } from '../shared/connectivity.js';
import { shareContent }     from '../shared/share.js';
import { renderIcons } from '../shared/icons.js';
import { bindResume, saveResume, readResume, disarmResume, armResume } from '../shared/resume-position.js';
initConnectivity();
const PAGE_MAP = {
home:                       { path: '../pages/home/home.js',               render: 'renderHome',                init: 'initHome' },
news:                       { path: '../pages/news/news.js',               render: 'renderNews',                init: 'initNews' },
events:                     { path: '../pages/event/events.js',            render: 'renderEvents',              init: 'initEvents' },
'community-occasions':      { path: '../pages/community-occasions.js',     render: 'renderCommunityOccasions',  init: 'initCommunityOccasions' },
'green-generation':         { path: '../pages/green-generation.js',        render: 'renderGreenGeneration' },
'occasion-detail':          { path: '../pages/occasion-detail.js',         render: 'renderOccasionDetail',      init: 'initOccasionDetail' },
ai:                         { path: '../pages/ai.js',                      render: 'renderAi',                  init: 'initAi' },
notifications:              { path: '../pages/notifications.js',           render: 'renderNotifications',       init: 'initNotifications' },
reader:                     { path: '../pages/reader.js',                  render: 'renderReader',             init: 'initReader' },
'development-projects':     { path: '../pages/development-projects.js',    render: 'renderDevelopmentProjects', init: 'initDevelopmentProjects' },
'project-detail':           { path: '../pages/project-detail.js',          render: 'renderProjectDetail',       init: 'initProjectDetail' },
'idea-box':                 { path: '../pages/idea-box.js',                render: 'renderIdeaBox',             init: 'initIdeaBox' },
'idea-box-detail':          { path: '../pages/idea-box-detail.js',         render: 'renderIdeaBoxDetail',       init: 'initIdeaBoxDetail' },
'contact-directory':        { path: '../pages/contact-directory.js',       render: 'renderContactDirectory',    init: 'initContactDirectory' },
'contact-category':         { path: '../pages/contact-category.js',        render: 'renderContactCategory',     init: 'initContactCategory' },
'emergency-health':         { path: '../pages/emergency-health.js',        render: 'renderEmergencyHealth',     init: 'initEmergencyHealth' },
services:                   { path: '../pages/services.js',                render: 'renderServices', init: 'initServices' },
worship:                    { path: '../pages/worship.js',                 render: 'renderWorship',             init: 'initWorship' },
'worship-quran':            { path: '../pages/worship-quran.js',           render: 'renderWorshipQuran',        init: 'initWorshipQuran' },
'worship-quran-surah':      { path: '../pages/worship-quran-surah.js',     render: 'renderWorshipQuranSurah',   init: 'initWorshipQuranSurah' },
'worship-tasbih':           { path: '../pages/worship-tasbih.js',          render: 'renderWorshipTasbih',       init: 'initWorshipTasbih' },
'worship-hisn':             { path: '../pages/worship-hisn.js',            render: 'renderWorshipHisn',         init: 'initWorshipHisn' },
'worship-hadith':           { path: '../pages/worship-hadith.js',          render: 'renderWorshipHadith',       init: 'initWorshipHadith' },
'worship-lectures':         { path: '../pages/worship-lectures.js',        render: 'renderWorshipLectures',     init: 'initWorshipLectures' },
history:                    { path: '../pages/history.js',                 render: 'renderHistory',             init: 'initHistory' },
'history-articles':         { path: '../pages/history/history-articles.js',render: 'renderHistoryArticles',     init: 'initHistoryArticles' },
'memory-gallery':           { path: '../pages/memory-gallery.js',          render: 'renderMemoryGallery',       init: 'initMemoryGallery' },
association:                { path: '../pages/association.js',             render: 'renderAssociation',         init: 'initAssociation' },
'association-about':        { path: '../pages/association-about.js',       render: 'renderAssociationAbout' },
'association-journey':      { path: '../pages/association-journey.js',     render: 'renderAssociationJourney', init: 'initAssociationJourney' },
'association-join':         { path: '../pages/association-join.js',        render: 'renderAssociationJoin',  init: 'initAssociationJoin' },
'association-regulations':  { path: '../pages/association-regulations.js', render: 'renderAssociationRegulations', init: 'initAssociationRegulations' },
settings:                   { path: '../pages/settings.js',                render: 'renderSettings',            init: 'initSettings' },
'settings-appearance':      { path: '../pages/settings-appearance.js',     render: 'renderAppearance',          init: 'initAppearance' },
'settings-share':           { path: '../pages/settings-share.js',          render: 'renderShareApp',            init: 'initShareApp' },
'settings-contribute':      { path: '../pages/settings-contact.js',        render: 'renderContribute',          init: 'initContribute' },
'settings-report':          { path: '../pages/settings-contact.js',        render: 'renderReportError',         init: 'initReportError' },
'settings-notifications':   { path: '../pages/settings-notifications.js',  render: 'renderSettingsNotifications', init: 'initSettingsNotifications' },
'settings-about':           { path: '../pages/settings-about.js',        render: 'renderAboutApp', init: 'initAboutApp' },
'nubian-dictionary':        { path: '../pages/nubian-language/nubian-dictionary.js',               render: 'renderNubianDictionary' },
'nubian-words':             { path: '../pages/nubian-language/nubian-words.js',                    render: 'renderNubianWords',           init: 'initNubianWords' },
'nubian-phrases':           { path: '../pages/nubian-language/nubian-phrases.js',                  render: 'renderNubianPhrases',         init: 'initNubianPhrases' },
'nubian-greetings':         { path: '../pages/nubian-language/nubian-language-greetings.js',       render: 'renderNubianGreetings',       init: 'initNubianGreetings' },
'nubian-pronouns':          { path: '../pages/nubian-language/nubian-language-pronouns.js',        render: 'renderNubianPronouns',        init: 'initNubianPronouns' },
'nubian-family':            { path: '../pages/nubian-language/nubian-language-family.js',          render: 'renderNubianFamily',          init: 'initNubianFamily' },
'nubian-time':              { path: '../pages/nubian-language/nubian-language-time.js',            render: 'renderNubianTime',            init: 'initNubianTime' },
'nubian-numbers':           { path: '../pages/nubian-language/nubian-language-numbers.js',         render: 'renderNubianNumbers',         init: 'initNubianNumbers' },
'nubian-body':              { path: '../pages/nubian-language/nubian-language-body.js',            render: 'renderNubianBody',            init: 'initNubianBody' },
'nubian-verbs':             { path: '../pages/nubian-language/nubian-language-verbs.js',           render: 'renderNubianVerbs',           init: 'initNubianVerbs' },
'nubian-adjectives':        { path: '../pages/nubian-language/nubian-language-adjectives.js',      render: 'renderNubianAdjectives',      init: 'initNubianAdjectives' },
'nubian-home':              { path: '../pages/nubian-language/nubian-language-home.js',            render: 'renderNubianHome',            init: 'initNubianHome' },
'nubian-farming':           { path: '../pages/nubian-language/nubian-language-farming.js',         render: 'renderNubianFarming',         init: 'initNubianFarming' },
'nubian-animals':           { path: '../pages/nubian-language/nubian-language-animals.js',         render: 'renderNubianAnimals',         init: 'initNubianAnimals' },
'nubian-place':             { path: '../pages/nubian-language/nubian-language-place.js',           render: 'renderNubianPlace',           init: 'initNubianPlace' },
'nubian-directions':        { path: '../pages/nubian-language/nubian-language-directions.js',      render: 'renderNubianDirections',      init: 'initNubianDirections' },
'nubian-demonstratives':    { path: '../pages/nubian-language/nubian-language-demonstratives.js',  render: 'renderNubianDemonstratives',  init: 'initNubianDemonstratives' },
'nubian-colors':            { path: '../pages/nubian-language/nubian-language-colors.js',          render: 'renderNubianColors',          init: 'initNubianColors' },
'nubian-weather':           { path: '../pages/nubian-language/nubian-language-weather.js',         render: 'renderNubianWeather',         init: 'initNubianWeather' },
'nubian-diseases':          { path: '../pages/nubian-language/nubian-language-diseases.js',        render: 'renderNubianDiseases',        init: 'initNubianDiseases' },
'did-you-know':             { path: '../pages/did-you-know.js',            render: 'renderDidYouKnow',          init: 'initDidYouKnow' },
tanjalab:                   { path: '../pages/tanjalab.js',                render: 'renderTanjalab',            init: 'initTanjalab' },
'nubian-game':              { path: '../pages/nubian-language/nubian-game.js',              render: 'renderNubianGame',            init: 'initNubianGame' },
'student-services':         { path: '../pages/student-services.js',        render: 'renderStudentServices',      init: 'initStudentServices' },
'student-videos-intermediate': { path: '../pages/student-videos.js',       render: 'renderStudentVideosIntermediate', init: 'initStudentVideosIntermediate' },
'student-videos-secondary': { path: '../pages/student-videos.js',          render: 'renderStudentVideosSecondary',    init: 'initStudentVideosSecondary' },
admin:                      { path: '../pages/admin/admin-panel.js',       render: 'renderAdminPanel',          init: 'initAdminPanel', protected: true, roles: ['developer', 'admin', 'nubian'] },
'admin-notifications':      { path: '../pages/admin/admin-notifications.js', render: 'renderAdminNotifications', init: 'initAdminNotifications', protected: true },
'admin-news':               { path: '../pages/admin/admin-news.js',        render: 'renderAdminNews',           init: 'initAdminNews', protected: true },
'admin-events':             { path: '../pages/admin/admin-events.js',      render: 'renderAdminEvents',          init: 'initAdminEvents', protected: true },
'admin-lectures':           { path: '../pages/admin/admin-lectures.js',    render: 'renderAdminLectures',        init: 'initAdminLectures', protected: true },
'admin-study':              { path: '../pages/admin/admin-study.js',       render: 'renderAdminStudy',           init: 'initAdminStudy', protected: true },
'admin-gallery':            { path: '../pages/admin/admin-gallery.js',     render: 'renderAdminGallery',         init: 'initAdminGallery', protected: true },
'admin-history':            { path: '../pages/admin/admin-history.js',     render: 'renderAdminHistory',         init: 'initAdminHistory', protected: true },
'admin-association-journey':{ path: '../pages/admin/admin-association-journey.js', render: 'renderAdminAssociationJourney', init: 'initAdminAssociationJourney', protected: true },
'admin-projects':           { path: '../pages/admin/admin-projects.js',    render: 'renderAdminProjects',        init: 'initAdminProjects', protected: true },
'admin-contacts':           { path: '../pages/admin/admin-contacts.js',    render: 'renderAdminContacts',        init: 'initAdminContacts', protected: true },
'admin-idea-box':           { path: '../pages/admin/admin-idea-box.js',    render: 'renderAdminIdeaBox',         init: 'initAdminIdeaBox', protected: true },
'admin-occasions':          { path: '../pages/admin/admin-occasions.js',   render: 'renderAdminOccasions',       init: 'initAdminOccasions', protected: true },
'admin-permissions':        { path: '../pages/admin/admin-permissions.js', render: 'renderAdminPermissions',     init: 'initAdminPermissions', protected: true },
'admin-backup':             { path: '../pages/admin/admin-backup.js',     render: 'renderAdminBackup',          init: 'initAdminBackup', protected: true, roles: ['developer'] },
'admin-ai':                 { path: '../pages/admin/admin-ai.js',         render: 'renderAdminAi',              init: 'initAdminAi', protected: true, roles: ['developer'] },
'admin-activity-log':        { path: '../pages/admin/admin-activity-log.js', render: 'renderAdminActivityLog',    init: 'initAdminActivityLog', protected: true },
'admin-members':            { path: '../pages/admin/admin-members.js',    render: 'renderAdminMembers',         init: 'initAdminMembers', protected: true },
'admin-inbox':               { path: '../pages/admin/admin-inbox.js',       render: 'renderAdminInbox',           init: 'initAdminInbox', protected: true },
'admin-nubian':              { path: '../pages/admin/admin-nubian-hub.js',  render: 'renderAdminNubianHub',        init: 'initAdminNubianHub', protected: true, roles: ['developer', 'admin', 'nubian'] },
'admin-nubian-words':        { path: '../pages/admin/admin-nubian.js',      render: 'renderAdminNubianWords',      init: 'initAdminNubianWords', protected: true, roles: ['developer', 'admin', 'nubian'] },
'admin-nubian-phrases':      { path: '../pages/admin/admin-nubian.js',      render: 'renderAdminNubianPhrases',    init: 'initAdminNubianPhrases', protected: true, roles: ['developer', 'admin', 'nubian'] },
'admin-nubian-audio':        { path: '../pages/admin/admin-nubian.js',      render: 'renderAdminNubianAudio',      init: 'initAdminNubianAudio', protected: true, roles: ['developer', 'admin', 'nubian'] },
'admin-nubian-audio-phrases': { path: '../pages/admin/admin-nubian.js',      render: 'renderAdminNubianAudioPhrases',      init: 'initAdminNubianAudioPhrases', protected: true, roles: ['developer', 'admin', 'nubian'] },
'admin-nubian-record':       { path: '../pages/admin/admin-nubian-flows.js', render: 'renderAdminNubianRecord',    init: 'initAdminNubianRecord', protected: true, roles: ['developer', 'admin', 'nubian'] },
};
const moduleCache = {};
async function loadPage(pageName) {
const def = PAGE_MAP[pageName];
if (!def) return null;
if (!moduleCache[pageName]) {
try {
moduleCache[pageName] = await import(def.path);
} catch (err) {
console.warn(`[Router] فشلت محاولة تحميل "${pageName}" الأولى، إعادة محاولة:`, err);
await new Promise(resolve => setTimeout(resolve, 400));
moduleCache[pageName] = await import(def.path);
}
}
return moduleCache[pageName];
}
const history_stack = [];
let exitGuardArmed = false;
let lastExitWarning = 0;
const EXIT_CONFIRM_WINDOW = 2000;
let _lastForwardNav = { page: null, t: 0 };
export async function navigateTo(pageName, pushToStack = true, restoreScroll = null, resetStack = false) {
if (pageName === 'search') pageName = 'ai';
if (pushToStack && !resetStack) {
const now = Date.now();
if (_lastForwardNav.page === pageName && now - _lastForwardNav.t < 600) return;
_lastForwardNav = { page: pageName, t: now };
}
const appContent = document.querySelector('#app-content');
if (!appContent) return;
{
const { checkFullBan, renderBannedScreen } = await import('../shared/member-ban-gate.js');
const ban = await checkFullBan();
if (ban) {
const header = document.querySelector('#app-header');
const nav    = document.querySelector('#app-bottom-nav');
if (header) header.style.display = 'none';
if (nav)    nav.style.display    = 'none';
appContent.dataset.currentPage = 'banned';
appContent.innerHTML = renderBannedScreen(ban);
renderIcons(appContent);
return;
}
}
const def = PAGE_MAP[pageName];
if (!def) {
console.warn(`[Router] الصفحة غير موجودة: "${pageName}"`);
appContent.innerHTML = renderNotFound(pageName);
bindPageEvents(appContent);
renderIcons();
toggleShell('not-found');
updateHeader('not-found');
updateBottomNav('');
return;
}
if (def.protected) {
const { isAdminSessionUnlocked, getAdminRole, whenAdminAuthReady } = await import('../data/admin-auth.js');
await whenAdminAuthReady();
if (!isAdminSessionUnlocked()) {
const { openAdminGate } = await import('../shared/admin-gate.js');
openAdminGate(() => navigateTo(pageName, pushToStack));
return;
}
const { allowedRolesFor } = await import('../data/admin-access.js');
const allowedRoles = pageName === 'admin' ? (def.roles || ['developer', 'admin']) : allowedRolesFor(pageName, def.roles);
const role = getAdminRole();
if (!allowedRoles.includes(role)) {
const { showToast } = await import('../shared/toast.js');
showToast('الوصول للقسم دا ما متاح ليك بصلاحيتك', 'error');
navigateTo('admin', pushToStack);
return;
}
}
if (pushToStack) {
if (resetStack) {
history_stack.length = 0;
if (pageName !== 'home') history_stack.push({ page: 'home', scroll: 0 });
} else {
const current = appContent.dataset.currentPage;
if (current) history_stack.push({ page: current, scroll: appContent.scrollTop });
}
}
const urlPage = pageName === 'home' ? '' : pageName;
const historyUrl = urlPage ? `#${urlPage}` : '#';
if (pushToStack) {
history.pushState({ page: pageName }, '', historyUrl);
} else {
history.replaceState({ page: pageName }, '', historyUrl);
}
if (pageName === 'home' && history_stack.length === 0) {
if (!exitGuardArmed) {
history.pushState({ page: 'home' }, '', historyUrl);
exitGuardArmed = true;
}
} else {
exitGuardArmed = false;
}
if (pageName !== 'tanjalab') _backInterceptor = null;
bindResume(appContent);
saveResume(appContent.dataset.currentPage, appContent);
disarmResume();
appContent.dataset.currentPage = pageName;
appContent.setAttribute('aria-busy', 'true');
appContent.innerHTML = `
    <div class="page-skeleton" aria-hidden="true">
      <div class="page-skeleton__hero"></div>
      <div class="page-skeleton__line page-skeleton__line--lg"></div>
      <div class="page-skeleton__line page-skeleton__line--md"></div>
      <div class="page-skeleton__line page-skeleton__line--sm"></div>
    </div>
  `;
let mod, renderFn, html;
try {
mod = await loadPage(pageName);
renderFn = mod?.[def.render];
if (!renderFn) {
console.warn(`[Router] دالة الرسم غير موجودة: "${def.render}" في "${pageName}"`);
appContent.innerHTML = renderNotFound(pageName);
bindPageEvents(appContent);
renderIcons();
appContent.removeAttribute('aria-busy');
toggleShell(pageName);
updateHeader(pageName);
updateBottomNav(pageName);
return;
}
html = renderFn();
} catch (err) {
console.error(`[Router] فشل تحميل/رسم الصفحة "${pageName}" (بعد إعادة المحاولة):`, err);
delete moduleCache[pageName];
appContent.innerHTML = `
      <section class="page">
        <div class="empty-state" style="padding: var(--space-8) var(--space-4);">
          <i class="empty-state__icon" data-lucide="wifi-off"></i>
          <p class="empty-state__title">الصفحة دي ما انفتحت</p>
          <p class="empty-state__description">تأكد من اتصالك بالإنترنت وجرّب تاني.</p>
          <button class="cta-button" data-page="${pageName}" style="margin-top: var(--space-4);">
            <span data-icon="refresh-cw"></span>
            إعادة المحاولة
          </button>
        </div>
      </section>
    `;
renderIcons(appContent);
bindPageEvents(appContent);
appContent.removeAttribute('aria-busy');
toggleShell(pageName);
updateHeader(pageName);
updateBottomNav(pageName);
return;
}
appContent.innerHTML = '';
const range = document.createRange();
range.selectNodeContents(appContent);
const fragment = range.createContextualFragment(html);
appContent.appendChild(fragment);
const pageEl = appContent.querySelector('.page');
if (pageEl) {
pageEl.classList.remove('animate-fade-up');
void pageEl.offsetWidth;
pageEl.classList.add('animate-fade-up');
}
renderIcons(appContent);
initImages(appContent);
enrichAria(appContent);
bindPageEvents(appContent);
appContent.removeAttribute('aria-busy');
updateBottomNav(pageName);
toggleShell(pageName);
updateHeader(pageName);
if (def.init && mod?.[def.init]) {
try {
await mod[def.init]();
} catch (err) {
console.error(`[Router] فشل init لصفحة "${pageName}":`, err);
}
}
appContent.scrollTop = restoreScroll ?? readResume(pageName) ?? 0;
armResume();
}
let _backInterceptor = null;
export function setBackInterceptor(fn) { _backInterceptor = typeof fn === 'function' ? fn : null; }
function runBackInterceptor() {
if (!_backInterceptor) return false;
try { return !!_backInterceptor(); } catch (err) { console.error('[Router] back interceptor:', err); return false; }
}
export function goBack() {
if (runBackInterceptor()) return;
if (history_stack.length > 0) {
history.back();
} else {
navigateTo('home', false);
}
}
window.addEventListener('popstate', () => {
if (exitGuardArmed) {
exitGuardArmed = false;
const now = Date.now();
if (now - lastExitWarning < EXIT_CONFIRM_WINDOW) {
return;
}
lastExitWarning = now;
import('../shared/toast.js').then(({ showToast }) => {
showToast('اضغط رجوع مرة تانية للخروج', 'info', 2000);
});
history.pushState({ page: 'home' }, '', location.hash || '#');
exitGuardArmed = true;
return;
}
if (runBackInterceptor()) {
const cur = document.querySelector('#app-content')?.dataset.currentPage || 'home';
history.pushState({ page: cur }, '', cur === 'home' ? '#' : `#${cur}`);
return;
}
const popped = history_stack.pop();
const page   = popped?.page || 'home';
const scroll = popped?.scroll ?? 0;
navigateTo(page, false, scroll);
});
function toggleShell(pageName) {
const header = document.querySelector('#app-header');
const nav    = document.querySelector('#app-bottom-nav');
if (header) header.style.display = '';
if (nav)    nav.style.display    = '';
}
function updateHeader(pageName) {
const header = document.querySelector('#app-header');
if (!header) return;
header.innerHTML = renderHeader(pageName);
renderIcons();
header.querySelectorAll('[data-action]').forEach(el => {
el.addEventListener('click', e => {
e.stopPropagation();
handleAction(el.dataset.action, el);
});
});
}
function bindPageEvents(container) {
container.querySelectorAll('[data-page]').forEach(el => {
el.addEventListener('click', e => {
e.stopPropagation();
navigateTo(el.dataset.page);
});
});
container.querySelectorAll('[data-action]').forEach(el => {
el.addEventListener('click', e => {
e.stopPropagation();
handleAction(el.dataset.action, el);
});
});
document.querySelectorAll('#app-bottom-nav [data-page]').forEach(el => {
el.onclick = () => navigateTo(el.dataset.page, true, null, true);
});
bindSectionCards(container);
bindFilterChips(container);
}
function bindSectionCards(container) {
const sectionMap = {
contacts:        'contact-directory',
};
container.querySelectorAll('[data-section]').forEach(card => {
const target = sectionMap[card.dataset.section];
if (target) {
card.style.cursor = 'pointer';
card.addEventListener('click', () => navigateTo(target));
}
});
}
async function handleAction(action) {
switch (action) {
case 'enter-app':         navigateTo('home'); break;
case 'go-back':           goBack(); break;
case 'open-ai':           navigateTo('ai'); break;
case 'join-association':  navigateTo('association-join'); break;
case 'contribute-history':
case 'contribute-project':
case 'request-service':   navigateTo('contact-directory'); break;
case 'contact-admin':     navigateTo('settings-contribute'); break;
case 'open-breaking':     break;
case 'open-article':      break;
case 'like-event':        break;
case 'share-event':
shareContent({ title: 'مناسبة — شبتوت بحري', url: location.href });
break;
case 'like-voice':        break;
case 'share-voice':
shareContent({ title: 'تسجيل صوتي — شبتوت بحري', url: location.href });
break;
case 'share-app':         navigateTo('settings-share'); break;
case 'share-article': {
const mod = await import('../pages/reader.js').catch(() => ({}));
shareContent({
title: mod.readerData?.title || 'شبتوت بحري',
text:  (await import('../shared/article-markup.js')).stripMarkup(mod.readerData?.body?.[0] || ''),
url:   location.href,
});
break;
}
case 'appearance':        navigateTo('settings-appearance'); break;
case 'font-size':         navigateTo('settings-appearance'); break;
case 'contribute':        navigateTo('settings-contribute'); break;
case 'report-error':      navigateTo('settings-report'); break;
case 'about-app':         navigateTo('settings-about'); break;
case 'settings-notifications': navigateTo('settings-notifications'); break;
case 'copy-number':       break;
case 'admin-lock':        break;
case 'add-idea':          break;
case 'vote-idea':         break;
case 'idea-details':      break;
case 'vote-idea-detail':  break;
default:
console.warn(`[Router] إجراء غير معروف: "${action}"`);
}
}
function bindFilterChips(container) {
const chips = container.querySelectorAll('.filter-chip[data-filter]');
if (!chips.length) return;
chips.forEach(chip => {
chip.addEventListener('click', () => {
chips.forEach(c => c.classList.remove('active'));
chip.classList.add('active');
const filter = chip.dataset.filter;
container.querySelectorAll('.event-card[data-category]').forEach(card => {
card.style.display = (filter === 'all' || card.dataset.category === filter) ? '' : 'none';
});
});
});
}
function enrichAria(container) {
const labelMap = {
'go-back':       'رجوع',
'open-ai':       'الذكاء الاصطناعي',
'enter-app':     'دخول التطبيق',
'share-app':     'مشاركة التطبيق',
'like-event':    'إعجاب بالمناسبة',
'share-event':   'مشاركة المناسبة',
'like-voice':    'إعجاب بالتسجيل',
'share-voice':   'مشاركة التسجيل',
'share-article': 'مشاركة المقال',
'open-breaking': 'فتح الخبر العاجل',
'open-article':  'فتح المقال',
'toggle-vision': 'تبديل وضع الرؤية',
'contact-admin': 'التواصل مع الإدارة',
'contribute-project': 'طرق المساهمة في المشروع',
'contribute':    'ساهم في التوثيق',
'report-error':  'الإبلاغ عن خطأ',
'about-app':     'عن التطبيق',
};
container.querySelectorAll('[data-action]').forEach(el => {
if (el.hasAttribute('aria-label')) return;
const label = labelMap[el.dataset.action];
if (label) el.setAttribute('aria-label', label);
});
container.querySelectorAll('[data-page]:not([aria-label])').forEach(el => {
const text = el.textContent.trim();
if (!text) el.setAttribute('aria-label', `الانتقال إلى ${el.dataset.page}`);
});
}
function updateBottomNav(pageName) {
document.querySelectorAll('#app-bottom-nav .nav-tab').forEach(btn => {
btn.classList.toggle('nav-tab--active', btn.dataset.page === pageName);
});
}
export function hasPage(name) {
return name in PAGE_MAP;
}
window.addEventListener('akdar:member-ban-changed', (e) => {
const cur = document.querySelector('#app-content')?.dataset.currentPage;
if (e.detail?.banned) {
if (cur && cur !== 'banned') navigateTo(cur, false);
} else if (cur === 'banned') {
location.reload();
}
});
