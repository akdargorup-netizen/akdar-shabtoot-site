const READER_TYPE_TITLES = {
news:      'الأخبار',
history:   'التاريخ',
memory:    'صورة وصوت',
complaint: 'الشكاوى',
service:   'الخدمات',
};
const PAGE_TITLES = {
reader:                       'تفاصيل',
news:                         'الأخبار',
events:                       'الفعاليات',
'community-occasions':        'المناسبات',
'occasion-detail':            'تفاصيل المناسبة',
history:                      'التاريخ',
'history-articles':           'مقالاتنا',
memory:                       'صورة وصوت',
'memory-gallery':             'هنا صورنا',
association:                  'الرابطة',
'association-about':          'نبذة عن الرابطة',
'association-journey':        'مسيرة الرابطة',
'association-join':           'طلب انضمام للرابطة',
'association-regulations':    'الدستور واللوائح الداخلية',
services:                     'الخدمات',
worship:                      'العبادة',
'worship-quran':               'القرآن الكريم',
'worship-tasbih':              'السبحة الإلكترونية',
'worship-hisn':                'حصن المسلم',
'worship-hadith':              'أحاديث بشرح',
'worship-lectures':            'محاضرات دينية',
ai:                           'الذكاء الاصطناعي',
settings:                     'الإعدادات',
notifications:                'الرسائل',
'contact-directory':          'دليل البلد',
'contact-category':           'دليل البلد',
'emergency-health':           'الطوارئ والصحة',
'development-projects':       'متابعة المشاريع',
'project-detail':             'تفاصيل المشروع',
'idea-box':                   'مصنع الأفكار',
'idea-box-detail':            'تفاصيل الفكرة',
'settings-appearance':        'المظهر',
'settings-share':             'مشاركة التطبيق',
'settings-contribute':        'ساهم في التوثيق',
'settings-report':            'الإبلاغ عن خطأ',
'settings-about':             'عن التطبيق',
'settings-notifications':     'الرسائل',
'not-found':                  'ما اتلقت',
'did-you-know':               'كنت عارف دي؟',
tanjalab:                     'تحدي التنجلاب',
'nubian-game':                'لعبة آنداندي',
'student-services':           'خدمات الطلاب',
'student-videos-intermediate': 'حصص الشهادة المتوسطة',
'student-videos-secondary':   'حصص الشهادة السودانية',
admin:                        'لوحة الإدارة',
'admin-notifications':        'إدارة الرسائل',
'admin-news':                 'إدارة الأخبار',
'admin-events':               'إدارة الفعاليات',
'admin-projects':             'إدارة المشاريع',
'admin-study':                'إدارة خدمات الطلاب',
'admin-lectures':             'إدارة المحاضرات الدينية',
'admin-gallery':              'إدارة صور البلد',
'admin-history':              'إدارة تاريخ بلدنا',
'admin-association-journey':  'إدارة مسيرة الرابطة',
'admin-contacts':             'إدارة دليل الاتصال',
'admin-idea-box':             'صندوق الأفكار',
'admin-occasions':            'المناسبات',
'admin-permissions':          'صلاحيات المشرفين',
'admin-members':              'رقابة الأعضاء',
'admin-activity-log':         'سجل النشاط',
'admin-backup':               'نسخ احتياطي واستيراد',
'admin-ai':                   'الذكاء الاصطناعي',
'admin-inbox':                'الرسائل الواردة',
'admin-nubian':                'إدارة آنداندي',
'admin-nubian-words':          'الكلمات',
'admin-nubian-phrases':        'الجمل',
'admin-nubian-audio':          'صوت الكلمات',
'admin-nubian-audio-phrases':  'صوت الجمل',
'admin-nubian-record':         'وضع التسجيل',
'nubian-dictionary':          'آنداندي',
'nubian-words':               'قاموس الكلمات',
'nubian-phrases':             'تعلم الكلام',
'nubian-greetings':           'التحية والوداع',
'nubian-pronouns':            'الضمائر وضمائر الملكية',
'nubian-family':              'أفراد العائلة',
'nubian-time':                'أيام الأسبوع والزمن',
'nubian-numbers':             'الأعداد',
'nubian-body':                'أجزاء الجسم',
'nubian-verbs':               'الأفعال',
'nubian-adjectives':          'الصفات',
'nubian-home':                'المنزل ومحتوياته',
'nubian-farming':             'الزراعة والأشجار والمحاصيل',
'nubian-animals':             'الحيوانات',
'nubian-place':               'ظروف المكان',
'nubian-directions':          'الاتجاهات',
'nubian-demonstratives':      'أسماء الإشارة',
'nubian-colors':              'الألوان',
'nubian-weather':             'الفلك والطقس',
'nubian-diseases':            'الأمراض',
};
function smartTruncateTitle(title, maxChars = 20) {
const clean = (title || '').trim();
if (clean.length <= maxChars) return clean;
const words = clean.split(/\s+/);
let result = '';
for (const word of words) {
const candidate = result ? `${result} ${word}` : word;
if (candidate.length > maxChars) break;
result = candidate;
}
if (!result) result = clean.slice(0, maxChars);
return `${result}…`;
}
export function renderHeader(pageName) {
if (pageName === 'home') {
return `
      <div class="header-home">
        <div class="header-brand">
          <span class="header-brand__dot"></span>
          <span class="header-brand__name">أخضر شبتوت بحري</span>
        </div>
        <button
          class="header-icon-btn header-icon-btn--ai"
          data-action="open-ai"
          aria-label="الذكاء الاصطناعي"
        >
          <i data-lucide="sparkles"></i>
        </button>
      </div>
    `;
}
let title = PAGE_TITLES[pageName] || '';
const titleClass = 'header-page-title';
if (pageName === 'reader') {
try {
const mod = window.__readerModule;
if (mod?.readerData?.type) {
title = READER_TYPE_TITLES[mod.readerData.type] || title;
}
} catch (_) {}
}
if (pageName === 'contact-category') {
try {
const mod = window.__contactCategoryModule;
if (mod?.category?.label) {
title = mod.category.label;
}
} catch (_) {}
}
if (pageName === 'idea-box-detail') {
try {
const mod = window.__ideaDetailModule;
if (mod?.idea?.title) {
title = smartTruncateTitle(mod.idea.title);
}
} catch (_) {}
}
if (pageName === 'project-detail') {
try {
const mod = window.__projectDetailModule;
if (mod?.project?.title) {
title = smartTruncateTitle(mod.project.title);
}
} catch (_) {}
}
if (pageName === 'occasion-detail') {
try {
const mod = window.__occasionDetailModule;
if (mod?.occasion?.title) {
title = smartTruncateTitle(mod.occasion.title);
}
} catch (_) {}
}
if (pageName === 'worship-quran-surah') {
try {
const mod = window.__worshipQuranSurahModule;
if (mod?.surah?.name) {
title = `سورة ${mod.surah.name}`;
}
} catch (_) {}
}
return `
    <div class="header-inner">
      <button
        class="header-back-btn"
        data-action="go-back"
        aria-label="رجوع"
      >
        <span class="header-back-btn__icon">
          <i data-lucide="chevron-right"></i>
        </span>
        <span class="header-back-btn__ripple"></span>
      </button>
      <div class="header-title-wrap">
        <span class="${titleClass}">${title}</span>
        <span class="header-title-line"></span>
      </div>
      ${shouldShowAi(pageName) ? `
        <button
          class="header-icon-btn header-icon-btn--ai"
          data-action="open-ai"
          aria-label="الذكاء الاصطناعي"
        >
          <i data-lucide="sparkles"></i>
        </button>
      ` : ''}
    </div>
  `;
}
function shouldShowAi(pageName) {
if (pageName === 'ai') return false;
if (pageName === 'admin' || pageName.startsWith('admin-')) return false;
return true;
}
