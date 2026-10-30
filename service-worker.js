// service-worker.js — شبتوت بحري
// استراتيجية: Cache First + تحديث تلقائي في الخلفية

// ⬆️ غيّر هذا الرقم عند أي تحديث للمشروع — يجبر المستخدمين على تحميل النسخة الجديدة
const CACHE_VERSION = 'shabtoot-v545';
// كاش الصور المرفوعة (Supabase Storage) منفصل عن كاش النسخة عمدًا: كاش النسخة
// بيتمسح كله عند كل تحديث (activate)، ولو الصور فيه كانت بتتنزّل من جديد مع كل
// إصدار = استهلاك نقل (Egress) مجاني محدود (٥ جيجا/شهر). اسم الصورة فريد
// (وقت + رقم عشوائي) فمحتواها ما بيتغيّرش أبدًا → آمن تفضل محفوظة.
const IMAGE_CACHE = 'shabtoot-images-v1';
const IMAGE_CACHE_MAX_ENTRIES = 600; // الإخراج بالأقدم أولاً؛ كل إخراج = إعادة تحميل = نقل Supabase، فالسقف عالٍ عمدًا
// مقاطع النطق الصوتي (bucket akdar-audio): كاشها تديره js/shared/audio-clips.js من الصفحة نفسها
// (جلب كامل ثم blob — طلبات Range على الوسائط لا يجيب عنها الكاش جيدًا). هنا نكتفي بأمرين:
//  ١) اسم الكاش في قائمة الاستثناء بـ activate كي لا يُمسح مع كل تحديث (القائمة تحذف أي كاش غير مذكور!)
//  ٢) مسار akdar-audio يمر دون تدخل، فلا يزاحم معالج الصور (الذي يلتقط كل /storage/v1/object/public/)
const AUDIO_CACHE = 'akdar-clips-v1';
const AUDIO_PATH = '/storage/v1/object/public/akdar-audio/';
// (v431) صور مصغّرات يوتيوب (img.youtube.com / i.ytimg.com): كانت بتمرّ "شبكة أولاً" وبتتخزّن في كاش النسخة
// فقط لو status===200 — والصور عبر <img> استجابتها opaque (status 0) فما كانت تتخزّن أبدًا، ولا تظهر بلا نت
// (صورة مكسورة). الآن: كاش دائم منفصل (لا يُمسح مع رفع الإصدار)، أولوية لاستجابة CORS، وسقف صغير للعدد.
const THUMB_CACHE = 'shabtoot-thumbs-v1';
const THUMB_CACHE_MAX_ENTRIES = 80;
const THUMB_HOSTS = ['img.youtube.com', 'i.ytimg.com', 'i9.ytimg.com'];
// ⚡ أداء: مكتبات Firebase SDK (ملفات JS ثابتة بنسخة مثبّتة 10.13.0 في المسار — لا تتغيّر أبدًا)
// كانت تتحمّل من gstatic في كل إقلاع، فالتطبيق كله ينتظر الشبكة. الآن كاش أولاً في كاش منفصل
// يبقى بين إصدارات التطبيق. (طلبات Auth الحيّة على googleapis.com تظل تمر مباشرة.)
const SDK_CACHE = 'shabtoot-firebase-sdk-10.13.0';
const SDK_PATH_PREFIX = '/firebasejs/10.13.0/';
// مكتبة Supabase (نسخة مثبّتة بالرقم في supabase-client.js) — كاش أولاً مثل Firebase SDK
const SB_SDK_CACHE = 'shabtoot-supabase-sdk-2.49.4';
const SB_SDK_PATH_PREFIX = '/npm/@supabase/';
// نص القرآن (content/quran/surah-NNN.json، ملف لكل سورة): ثابت لا يتغيّر أبدًا (نص Tanzil ممنوع تعديله)
// فيُحفظ في كاش دائم منفصل لا يُمسح مع رفع الإصدارات — ما قُرئ مرة لا يُنزَّل ثانية. (غيّر الاسم لو تغيّر شكل الملفات.)
const QURAN_CACHE = 'shabtoot-quran-v1';
const QURAN_PATH = '/content/quran/';
// مرآة المحتوى العام (content/mirror/*): تتجدد بنشر المحتوى دون رفع CACHE_VERSION، فلا يصح كاش-أولًا (كانت ستبقى قديمة على الجهاز)
const MIRROR_PATH = '/content/mirror/';
const MIRROR_TIMEOUT_MS = 5000;
// الخطوط (assets/fonts/*.woff): ملفات ثابتة (~500KB مجتمعة) لا تتغيّر مع رفع الإصدارات، فتُحفظ في كاش دائم
// منفصل لا يُمسح عند التحديث — ما نُزِّل مرة لا يُنزَّل ثانية. (غيّر رقم الاسم لو استُبدل ملف خط بنفس اسمه.)
const FONT_CACHE = 'shabtoot-fonts-v2'; // v2: تفريغ الخطوط القديمة العالقة في الكاش الدائم
const FONT_PATH = '/assets/fonts/';
const _isFontUrl = (pathname) => pathname.includes(FONT_PATH) && /\.(woff2?|ttf)$/.test(pathname);
// السور الأكثر قراءة تُسخَّن بالخلفية مرة واحدة (~114KB): الفاتحة، الكهف، السجدة، يس، الدخان، الرحمن، الواقعة،
// الملك، وجزء عمّ كله (78–114). الباقي يُجلب عند أول فتح ثم يُحفظ.
const QURAN_WARM = [1, 18, 32, 36, 44, 55, 56, 67, ...Array.from({ length: 37 }, (_, i) => 78 + i)];
const _quranUrl = (n) => `./content/quran/surah-${String(n).padStart(3, '0')}.json`;

const ASSETS = [
  // ── الجذر ─────────────────────────────────────────────────────────────────
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './content/static-snapshot.json',
  './content/feed-snapshot.json',

  // ── CSS: ١١ جزءًا مُدمَجًا بـ build/bundle-css.js (من build/css-manifest.json) ──
  // القائمة لازم تطابق وسوم <link> في index.html (بين CSS-LINKS:START/END) دائمًا؛
  // build/check-sw-core.js يفحص ذلك. كل جزء له بصمة، فتعديل CSS ينزّل جزءه فقط.
  './css/bundle-base.css',
  './css/bundle-components.css',
  './css/bundle-home.css',
  './css/bundle-tanjalab.css',
  './css/bundle-reader.css',
  './css/bundle-services.css',
  './css/bundle-misc.css',
  './css/bundle-community.css',
  './css/bundle-occasions.css',
  './css/bundle-sub.css',
  './css/bundle-theme.css',

  // ── JS: core ──────────────────────────────────────────────────────────────
  './js/core/router.js',
  './js/core/header.js',

  // ── JS: data ──────────────────────────────────────────────────────────────
  './js/data/db.js',
  './js/data/runtime-config.js',
  './js/data/read-cache.js',
  './js/data/cache-stamps.js',
  './js/data/local-data.js',
  './js/data/contact-recipients-data.js',
  './js/data/history-data.js',
  './js/data/did-you-know-data.js',
  './js/data/tanjalab-questions-data.js',
  './js/shared/relative-time.js',
  './js/data/adapters/supabase-data-adapter.js',
  './js/data/adapters/supabase-content-adapter.js',
  './js/data/adapters/supabase-library-adapter.js',
  './js/data/adapters/supabase-misc-adapter.js',
  './js/data/hosts.js',
  './js/data/adapters/sb-helpers.js',
  './js/data/adapters/rate-guard.js',
  './js/data/adapters/supabase-adapter.js',
  './js/data/firebase-init.js',
  './js/data/auth.js',
  './js/data/supabase-client.js',
  './js/data/storage-overflow.js',
  './js/data/admin-auth.js',
  './js/data/admin-access.js',
  './js/data/interaction-config.js',
  './js/shared/comment-hearts.js',
  './js/data/contact-directory-data.js',
  './js/data/contacts-seed-data.js',
  './js/data/nubian-language-data.js',
  './js/data/gallery-data.js',
  './js/data/projects-data.js',
  './js/data/idea-box-data.js',
  './js/data/occasion-categories.js',
  './js/data/moderation-config.js',
  './js/data/retention.js',
  './js/data/worship-hadith-data.js',
  './js/data/worship-hisn-data.js',
  './js/data/worship-story-data.js',
  './js/data/quran-index.js',
  './js/data/quran-loader.js',
  // نص السور (content/quran/*.json) خارج هذه القائمة عمدًا: كاش دائم منفصل (QURAN_CACHE) —
  // السور الشائعة تُسخَّن بالخلفية (QURAN_WARM) والباقي يُحفظ عند أول فتح. معالج fetch أدناه.

  // ── JS: shared ────────────────────────────────────────────────────────────
  './js/shared/icons.js',
  './js/shared/sanitize.js',
  './js/shared/image-thumb.js',
  './js/shared/submission-guard.js',
  './js/shared/img.js',
  './js/shared/toast.js',
  './js/shared/tj-mascot.js',
  './js/shared/tj-backup.js',
  './js/shared/update-banner.js',
  './js/shared/share.js',
  './js/shared/connectivity.js',
  './js/shared/empty-state.js',
  './js/shared/staff-badge.js',
  './js/shared/error-state.js',
  './js/shared/push.js',
  './js/shared/notif-prefs.js',
  './js/shared/ios-install-prompt.js',
  './js/shared/permission-onboarding.js',
  './js/shared/admin-gate.js',

  './js/shared/secret-trigger.js',
  './js/shared/idea-form-modal.js',
  './js/shared/review-notice.js',
  './js/shared/occasion-form-modal.js',
  './js/shared/notif-badge.js',
  './js/shared/confirm-modal.js',
  './js/shared/editorial-policy.js',

  './js/shared/admin-batch.js',

  './js/shared/item-actions.js',
  './js/shared/login-prompt-modal.js',
  './js/shared/member-ban-gate.js',
  './js/shared/comment-outbox.js',
  './js/shared/reaction-outbox.js',
  './js/shared/reaction-ui.js',
  './js/shared/transient-error.js',
  './js/shared/sound-fx.js',
  './js/shared/arabic-digits.js',
  './js/shared/quran-progress.js',
  './js/shared/arabic-search.js',
  './js/shared/ai-ask.js',
  './js/shared/ai-suggest.js',
  './js/shared/ai-answer-cache.js',
  './js/shared/ai-sources.js',
  './js/shared/article-markup.js',
  './js/shared/device-id.js',
  './js/shared/keyboard-scroll.js',
  './js/shared/section-badges.js',
  './js/shared/resume-position.js',
'./js/shared/app-splash.js',  './js/shared/theme.js',
  './js/shared/content-freshness.js',
  './js/shared/urgent-announcement.js',

  // ── JS: pages ─────────────────────────────────────────────────────────────
  './js/pages/home/home.js',
  './js/pages/green-generation.js',
  './js/pages/news/news.js',
  './js/pages/reader.js',
  './js/pages/event/events.js',
  './js/core/youtube.js',
  './js/data/videos-events-data.js',
  './js/pages/did-you-know.js',
  './js/pages/tanjalab.js',
  './js/pages/history.js',
  './js/pages/history/history-articles.js',
  './js/pages/memory-gallery.js',
  './js/pages/association.js',
  './js/pages/association-about.js',
  './js/pages/association-journey.js',
  './js/pages/association-join.js',
  './js/pages/association-regulations.js',
  './js/data/association-journey-data.js',
  './js/pages/services.js',
  './js/pages/student-services.js',
  './js/pages/student-course-request.js',
  './js/pages/student-videos.js',
  './js/data/study-data.js',
  './js/data/student-tips-data.js',
  './js/pages/worship.js',
  './js/pages/worship-quran.js',
  './js/pages/worship-quran-surah.js',
  './js/pages/worship-tasbih.js',
  './js/pages/worship-hisn.js',
  './js/pages/worship-hadith.js',
  './js/pages/worship-lectures.js',
  './js/pages/ai.js',
  './js/pages/notifications.js',
  './js/pages/contact-directory.js',
  './js/pages/contact-category.js',
  './js/pages/emergency-health.js',
  './js/pages/development-projects.js',
  './js/pages/project-detail.js',
  './js/pages/not-found.js',
  './js/pages/under-construction.js',
  './js/pages/settings.js',
  './js/pages/settings-appearance.js',
  './js/pages/settings-share.js',
  './js/pages/settings-contact.js',
  './js/pages/settings-notifications.js',
  './js/pages/settings-about.js',
  './js/pages/idea-box.js',
  './js/pages/idea-box-detail.js',
  './js/pages/community-occasions.js',
  './js/pages/occasion-detail.js',

  // ── JS: الرُطانة (اللغة النوبية) ──────────────────────────────────────────
  './js/pages/nubian-language/nubian-language-sub.js',
  './js/pages/nubian-language/nubian-dictionary.js',
  './js/pages/nubian-language/nubian-words.js',
  './js/shared/audio-clips.js',
  './js/shared/audio-upload-field.js',
  './js/pages/nubian-language/nubian-phrases.js',
  './js/pages/nubian-language/nubian-game.js',
  './js/pages/nubian-language/nubian-game-engine.js',
  './js/pages/nubian-language/nubian-game-map.js',
  './js/shared/abadol-mascot.js',
  './js/shared/abadol-sound.js',
  './js/pages/nubian-language/nubian-language-greetings.js',
  './js/pages/nubian-language/nubian-language-pronouns.js',
  './js/pages/nubian-language/nubian-language-family.js',
  './js/pages/nubian-language/nubian-language-time.js',
  './js/pages/nubian-language/nubian-language-numbers.js',
  './js/pages/nubian-language/nubian-language-body.js',
  './js/pages/nubian-language/nubian-language-verbs.js',
  './js/pages/nubian-language/nubian-language-adjectives.js',
  './js/pages/nubian-language/nubian-language-home.js',
  './js/pages/nubian-language/nubian-language-farming.js',
  './js/pages/nubian-language/nubian-language-animals.js',
  './js/pages/nubian-language/nubian-language-place.js',
  './js/pages/nubian-language/nubian-language-directions.js',
  './js/pages/nubian-language/nubian-language-demonstratives.js',
  './js/pages/nubian-language/nubian-language-colors.js',
  './js/pages/nubian-language/nubian-language-weather.js',
  './js/pages/nubian-language/nubian-language-diseases.js',

  // ── Assets: vendor + fonts + images ──────────────────────────────────────
  './assets/vendor/lucide/lucide-lite.js',
  // lucide.min.js (392KB) خارج التسخين عمدًا: lucide-lite يحمّله عند الحاجة لأيقونة غير موجودة فيه، ويُخزَّن عند أول استخدام
  './assets/fonts/Cairo-Variable.woff2',
  './assets/fonts/Tajawal-Regular.woff2',
  './assets/fonts/Tajawal-Medium.woff2',
  './assets/fonts/Tajawal-Bold.woff2',
  './assets/fonts/Tajawal-ExtraBold.woff2',
  './assets/fonts/AmiriQuran.woff2',
  './assets/village/village-aerial.jpg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-192.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/icon-mark.png',
  './assets/icons/icon-badge-mono.png',
  './assets/ios/apple-touch-icon.png',
];

// ── التثبيت الأساسي (CORE) مقابل التسخين الخلفي (WARM) ──────────────────────
// قبل: كل ASSETS (~185 ملفًا، 3.3MB) تُجلب أثناء التثبيت وتنافس تحميل الصفحة نفسها على
// الشبكة، ومع كل رفع إصدار تتكرر 185 طلب تحقق. الآن:
//   • CORE_ASSETS = ما يحتاجه الإقلاع فقط (index/app.js/CSS/lucide + كل الموديولات
//     المستوردة ستاتيكيًا من app.js وصفحة الرئيسية ≈ 48 ملفًا، ~450KB) — يُجلب في التثبيت.
//   • الباقي (صفحات، خطوط، صور، بيانات) يُجلب تلقائيًا عند أول استخدام (معالج fetch أدناه)،
//     وكمان تسخين خلفي بعد الإقلاع (رسالة WARM_CACHE من app.js) كي تشتغل كل الصفحات
//     أوفلاين زي قبل. التسخين يتخطّى الشبكات البطيئة ووضع توفير البيانات.
// ⚠️ عند إضافة موديول يُستورد ستاتيكيًا من app.js أو صفحة الرئيسية: شغّل
//    node build/check-sw-core.js — يتأكد أنه موجود في CORE_ASSETS.
const CORE_ASSETS = [
  // ── الجذر + CSS + أيقونات الإنترو ─────────────────────────────────────────
  './',
  './index.html',
  './app.js',
  './manifest.json',
  // لقطة آخر الأخبار/الفعاليات (scripts/admin/export-feed-snapshot.mjs): تظهر فورًا بأول فتح لأي قسم بلا كاش.
  // في CORE عمدًا (صغيرة ~٢٠–٤٠KB): لازم تكون جاهزة محليًا، وإلا انتظر الفتح الأول الشبكة وفات الغرض منها.
  './content/feed-snapshot.json',
  './css/bundle-base.css',
  './css/bundle-components.css',
  './css/bundle-home.css',
  './css/bundle-tanjalab.css',
  './css/bundle-reader.css',
  './css/bundle-services.css',
  './css/bundle-misc.css',
  './css/bundle-community.css',
  './css/bundle-occasions.css',
  './css/bundle-sub.css',
  './css/bundle-theme.css',
  './assets/vendor/lucide/lucide-lite.js',
  './assets/icons/icon-mark.png',
  './assets/icons/icon-192.png',

  // ── JS: الإقلاع (الرسم البياني الستاتيكي من app.js + js/pages/home/home.js) ──
  // js/core
  './js/core/header.js',
  './js/core/router.js',
  // js/data/adapters
  './js/data/adapters/supabase-data-adapter.js',
  './js/data/adapters/supabase-content-adapter.js',
  './js/data/adapters/supabase-library-adapter.js',
  './js/data/adapters/supabase-misc-adapter.js',
  './js/data/hosts.js',
  './js/data/adapters/sb-helpers.js',
  './js/data/adapters/rate-guard.js',
  './js/data/adapters/supabase-adapter.js',
  // js/data
  './js/data/association-journey-data.js',
  './js/data/auth.js',
  './js/data/contact-recipients-data.js',
  './js/data/contacts-seed-data.js',
  './js/data/db.js',
  './js/data/did-you-know-data.js',
  './js/data/firebase-init.js',
  './js/data/gallery-data.js',
  './js/data/history-data.js',
  './js/data/idea-box-data.js',
  './js/data/interaction-config.js',
  './js/data/local-data.js',
  './js/data/moderation-config.js',
  './js/data/occasion-categories.js',
  './js/data/read-cache.js',
  './js/data/cache-stamps.js',
  './js/data/retention.js',
  './js/data/runtime-config.js',
  './js/data/supabase-client.js',
  './js/data/storage-overflow.js',
  './js/data/videos-events-data.js',
  // js/pages/home
  './js/pages/home/home.js',
  // js/pages
  './js/pages/not-found.js',
  // js/shared
  './js/shared/app-splash.js',
  './js/shared/arabic-search.js',
  './js/shared/comment-hearts.js',
  './js/shared/connectivity.js',
  './js/shared/content-freshness.js',
  './js/shared/device-id.js',
  './js/shared/icons.js',
  './js/shared/img.js',
  './js/shared/ios-install-prompt.js',
  './js/shared/keyboard-scroll.js',
  './js/shared/member-ban-gate.js', // يُستورد ديناميكيًا عند أول تنقّل في كل إقلاع — لازم يكون جاهزًا بلا شبكة
  './js/shared/notif-badge.js',
  './js/shared/permission-onboarding.js',
  './js/shared/push.js',
  './js/shared/relative-time.js',
  './js/shared/sanitize.js',
  './js/shared/image-thumb.js',
  './js/shared/section-badges.js',
  './js/shared/resume-position.js',
  './js/shared/share.js',
  './js/shared/submission-guard.js',
  './js/shared/theme.js',
  './js/shared/toast.js',
  './js/shared/urgent-announcement.js',
];
const CORE_SET = new Set(CORE_ASSETS);
const WARM_ASSETS = ASSETS.filter(url => !CORE_SET.has(url));

// ── تسخين على مراحل ───────────────────────────────────────────────────────
// قبل: كل جهاز ينزّل كل الـ~137 ملفًا بعد أول فتح مهما استخدم. الآن:
//   • (قديم/غير مستخدم الآن: app.js لا يرسل WARM_CACHE إلا من أول عودة في يوم آخر، دائمًا full=true).
//   • الجلسة الأولى: الخطوط + الأقسام الأكثر استخدامًا فقط (WARM_RARE مؤجَّلة).
//   • عند العودة: تسخين كامل (يعني الجهاز عاد فعلًا فيستحق أوفلاين كامل).
//   • نادر الاستخدام (لعبة التنجلاب، الحديث/الحصن، القرآن، مواضيع الرُطانة الفرعية، لوحة الإدارة)
//     يُخزَّن عند الفتح (معالج fetch) أو في التسخين الكامل.
// الترتيب: الأهم أولًا، فلو انقطع التسخين (شبكة ضعيفة/إغلاق) يكون الأهم قد وصل.
const WARM_RARE_RE = [
  /^js\/data\/tanjalab-/, /^js\/pages\/tanjalab/, /^js\/shared\/tj-/,
  /^js\/data\/worship-(hadith|hisn|story)-data/, /^js\/pages\/worship-(hadith|hisn|quran|quran-surah)\.js/,
  /^js\/data\/quran-/, /^js\/shared\/quran-progress/, /^assets\/fonts\/AmiriQuran/,
  /^js\/pages\/nubian-language\/nubian-language-(?!sub|home)/,
  /^js\/pages\/nubian-language\/nubian-game/, /^js\/shared\/abadol-/,
  /^js\/pages\/admin\//, /^js\/shared\/(admin-|image-upload-field|audio-upload-field|pending-images|secret-trigger|staff-badge)/, /^js\/data\/(admin-|nubian-admin-)/,
];
const _isRare = (url) => WARM_RARE_RE.some(re => re.test(url));
const _warmRank = (url) => {
  if (/^assets\/fonts\//.test(url) || url === 'content/static-snapshot.json') return 0;
  if (/^js\/pages\/(news|event|history|association|services|student|idea-box|community-occasions|occasion-detail|notifications|ai|settings)/.test(url)) return 1;
  return _isRare(url) ? 3 : 2;
};
const WARM_ORDERED = WARM_ASSETS.map((url, i) => ({ url, i, r: _warmRank(url.replace(/^\.\//, '')) }))
  .sort((a, b) => a.r - b.r || a.i - b.i);

// ── نطاقات لا يجب أبداً أن يتدخّل الكاش في طلباتها ───────────────────────────
// Firebase Auth (identitytoolkit/securetoken) تعتمد على استجابات لحظية (توكنات)؛
// تخزينها في الكاش أو إرجاع نسخة قديمة عند فشل الشبكة يكسر تسجيل الدخول.
const NO_CACHE_HOSTS = [
  'googleapis.com',
  'gstatic.com',
  'firebaseapp.com',
];

function isNoCacheHost(url) {
  return NO_CACHE_HOSTS.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

// ── التثبيت ────────────────────────────────────────────────────────────────
// (v415) تحديث تدريجي بالبصمة: dist/asset-manifest.json (يولّده build/build-dist.js) يحمل بصمة
// كل ملف في القوائم أعلاه. عند التثبيت ننسخ من كاش النسخة السابقة كل ملف بصمته لم تتغيّر،
// فلا يُعاد تنزيله (ولا حتى طلب تحقق ETag له) — ويُجلب فقط ما تغيّر فعلاً. هذا مهم على الأجهزة
// الضعيفة التي قد يمسح متصفحها كاش HTTP، وعلى شبكة القرية (٢٠٠ طلب أقل لكل تحديث).
// لو الـmanifest غير موجود أو فشل أي شيء هنا → السلوك القديم تمامًا (تنزيل كل الأساسيات).
const MANIFEST_URL = './asset-manifest.json';
const CACHE_NAME_RE = /^shabtoot-v(\d+)$/;
// الصفحات HTML لا تُنسخ أبدًا من الكاش القديم (قد يكون المتصفح حدّثها بالخلفية)
const NEVER_COPY = new Set(['./', './index.html', './offline.html', MANIFEST_URL]);

async function fetchManifest() {
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
    if (!res.ok) return null;
    const text = await res.text();
    const json = JSON.parse(text);
    if (!json || typeof json.files !== 'object' || json.files === null) return null;
    return { text, files: json.files };
  } catch { return null; }
}

async function seedFromPreviousCache(cache, next) {
  const copied = new Set();
  try {
    const names = (await caches.keys())
      .filter(k => CACHE_NAME_RE.test(k) && k !== CACHE_VERSION)
      .sort((a, b) => Number(b.match(CACHE_NAME_RE)[1]) - Number(a.match(CACHE_NAME_RE)[1]));
    if (!names.length) return copied;
    const prev = await caches.open(names[0]);
    const prevManifest = await prev.match(MANIFEST_URL);
    if (!prevManifest) return copied;
    const old = (await prevManifest.json()).files || {};
    for (const [url, hash] of Object.entries(next.files)) {
      if (NEVER_COPY.has(url) || old[url] !== hash) continue;
      const hit = await prev.match(url);
      if (!hit || !hit.ok) continue;
      await cache.put(url, hit);
      copied.add(url);
    }
  } catch { /* أي فشل → التنزيل العادي لكل شيء */ }
  return copied;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const next = await fetchManifest();
    const copied = next ? await seedFromPreviousCache(cache, next) : new Set();
    // cache: 'no-cache' — يتحقق من السيرفر (ETag) لكل ملف يُجلب: لو ما اتغيّرش يرجع 304 بلا تنزيل.
    // (v414) الأساسيات فقط (الصفحة/app.js/CSS/offline) يجب أن تنجح؛ أي ملف آخر يفشل يُتخطّى —
    // معالج fetch يجلبه من الشبكة ويحفظه عند أول استخدام (فشل ملف واحد بشبكة القرية الضعيفة
    // كان يُفشل التثبيت كله ويُبقي الجهاز على النسخة القديمة للأبد).
    const urls = [...CORE_ASSETS, './offline.html'].filter(u => !copied.has(u));
    const results = await Promise.allSettled(
      urls.map(url => cache.add(new Request(url, { cache: 'no-cache' }))),
    );
    const essential = new Set(['./', './index.html', './app.js', './offline.html']);
    // أجزاء الـCSS كلها أساسية: الواجهة تنتظر وصولها كلها قبل الإقلاع
    const isEssential = (url) => essential.has(url) || url.startsWith('./css/bundle-');
    if (urls.some((url, i) => results[i].status === 'rejected' && isEssential(url))) {
      throw new Error('sw-install-essential-failed');
    }
    // نحفظ الـmanifest في النهاية فقط (نجاح التثبيت) كي لا يعتمد عليه تثبيت لاحق وهو ناقص
    if (next) {
      await cache.put(MANIFEST_URL, new Response(next.text, { headers: { 'Content-Type': 'application/json' } }));
    }
    await self.skipWaiting(); // تفعيل فوري بدون انتظار
  })());
});

// ── طلب تفعيل فوري من شريط التحديث (js/shared/update-banner.js) ─────────
self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
  // تسخين خلفي بعد الإقلاع: يكمّل تخزين باقي الملفات (WARM_ASSETS) لتشتغل كل الصفحات أوفلاين
  if (event.data.type === 'WARM_CACHE') event.waitUntil(warmCache(event.data.full === true));
  if (event.data.type === 'WARM_PAUSE')  _warmPaused = true;
  if (event.data.type === 'WARM_RESUME') _warmPaused = false;
});

let _warming = null;
let _warmPaused = false;
const _sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function warmCache(full = false) {
  if (_warming) return _warming;
  _warming = (async () => {
    const cache = await caches.open(CACHE_VERSION);
    const fontCache = await caches.open(FONT_CACHE);
    const todo = [];
    const _target = (url) => (_isFontUrl(url) ? fontCache : cache); // الخطوط في كاشها الدائم
    for (const { url, r } of WARM_ORDERED) {
      if (!full && r >= 3) continue; // المرحلة الأولى: نؤجّل نادر الاستخدام
      if (!(await _target(url).match(url))) todo.push(url); // اللي اتخزّن بالاستخدام ما يتجلبش تاني
    }
    // ملف واحد في كل مرة + توقّف تلقائي أثناء تصفّح المستخدم (WARM_PAUSE من app.js):
    // بشبكة القرية الضعيفة التسخين الخلفي كان يزاحم تنقّل المستخدم وبياناته على نفس الخط.
    for (const url of todo) {
      while (_warmPaused) await _sleep(1500);
      try { await _target(url).add(new Request(url, { cache: 'no-cache' })); } catch { /* ملف واحد فاشل ما يوقف الباقي */ }
      await _sleep(120);
    }
    if (full) await warmQuran();
  })().finally(() => { _warming = null; });
  return _warming;
}

// تسخين السور الشائعة في الكاش الدائم — مرة واحدة لكل جهاز (بعدها cache.match يتخطّاها)، بنفس أدب
// التسخين الأساسي: ملف واحد في كل مرة وتوقّف أثناء تصفّح المستخدم.
async function warmQuran() {
  const cache = await caches.open(QURAN_CACHE);
  for (const n of QURAN_WARM) {
    const url = _quranUrl(n);
    if (await cache.match(url)) continue;
    while (_warmPaused) await _sleep(1500);
    try { await cache.add(url); } catch { /* السورة تُجلب عند فتحها */ }
    await _sleep(120);
  }
}

async function quranCacheFirst(request) {
  const cache = await caches.open(QURAN_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    if (res && res.status === 200) { try { await cache.put(request, res.clone()); } catch { /* تخزين ممتلئ */ } }
    return res;
  } catch {
    return Response.error(); // أوفلاين وسورة غير محفوظة → الصفحة تعرض رسالة واضحة
  }
}

// الخطوط: الكاش الدائم أولًا؛ لو غابت نبحث في أي كاش آخر (نسخة قديمة/مبذورة) وننقلها بدل إعادة التنزيل.
async function fontCacheFirst(request) {
  const cache = await caches.open(FONT_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const other = await caches.match(request);
  if (other && other.ok) { try { await cache.put(request, other.clone()); } catch { /* تخزين ممتلئ */ } return other; }
  try {
    const res = await fetch(request);
    if (res && res.status === 200) { try { await cache.put(request, res.clone()); } catch { /* تخزين ممتلئ */ } }
    return res;
  } catch {
    return Response.error();
  }
}

// ── التفعيل: حذف الكاش القديم + إبلاغ الصفحة بالتحديث ────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION && key !== IMAGE_CACHE && key !== SDK_CACHE && key !== SB_SDK_CACHE && key !== QURAN_CACHE && key !== FONT_CACHE && key !== THUMB_CACHE && key !== AUDIO_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
      .then(() => {
        // أبلغ كل الصفحات المفتوحة أن تحديثاً جديداً متاح
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

// طلبات الصورة الواحدة المتزامنة (بطاقة + تفاصيل + معاينة) تشترك في جلب واحد بدل جلب لكل طلب
const _imgInflight = new Map();

async function _evictOldest(cache, keepMax) {
  const keys = await cache.keys();
  if (keys.length > keepMax) {
    await Promise.all(keys.slice(0, keys.length - keepMax).map(k => cache.delete(k)));
  }
  return keys.length;
}

// يخزّن الاستجابة دون أن يُفشل عرض الصورة أبدًا: عند امتلاء مساحة الجهاز (QuotaExceededError)
// نُخلي الخُمس الأقدم ونعيد المحاولة مرة واحدة؛ وإن فشلت تبقى الصورة تُعرض من الشبكة لهذه المرة.
async function _putSafe(cache, href, res) {
  const retry = res.clone(); // جسم الاستجابة يُستهلك في أول put، فنحتفظ بنسخة للمحاولة الثانية
  try {
    await cache.put(href, res);
  } catch {
    try {
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(10, Math.ceil(keys.length / 5))).map(k => cache.delete(k)));
      await cache.put(href, retry);
    } catch { /* التخزين تحسين فقط */ }
    return;
  }
  try { await _evictOldest(cache, IMAGE_CACHE_MAX_ENTRIES); } catch { /* */ }
}

// ── بديل مصدر الصور: مشروعا Storage (الأول والثاني) يحملان نسخة من كل صورة جديدة بالمسار نفسه (الكتابة المزدوجة،
//    راجع js/data/storage-overflow.js). لو فشل المشروع الذي يحمل الرابط (حجب/حصة/تعطّل/404) جُرّب الآخر،
//    ولو تأخّر ٦ ثوانٍ بدأ الآخر بالتوازي. الكاش يبقى بمفتاح الرابط الأصلي. ⚠️ يلزم تطابق القائمة مع المشروعين في التطبيق.
const STORAGE_HOSTS = ['rtgrkugcokqxseedzunr.supabase.co', 'qomxcmgtvyfdrzkkniwt.supabase.co'];
const ALT_STAGGER_MS = 6000;
function altStorageHref(href) {
  try {
    const u = new URL(href);
    const i = STORAGE_HOSTS.indexOf(u.hostname);
    if (i < 0) return '';
    u.hostname = STORAGE_HOSTS[1 - i];
    return u.href;
  } catch { return ''; }
}
async function fetchImageWithAlt(href) {
  const init = { mode: 'cors', credentials: 'omit' };
  const alt = altStorageHref(href);
  if (!alt) return fetch(href, init);
  const go = (u) => fetch(u, init).then((r) => (r.ok ? r : Promise.reject(r)));
  const p1 = go(href);
  const p2 = new Promise((resolve, reject) => {
    let started = false;
    const start = () => { if (!started) { started = true; go(alt).then(resolve, reject); } };
    const t = setTimeout(start, ALT_STAGGER_MS);
    p1.then(() => clearTimeout(t), () => { clearTimeout(t); start(); });
  });
  try {
    return await Promise.any([p1, p2]);
  } catch (agg) {
    const first = agg && agg.errors && agg.errors[0];
    if (first instanceof Response) return first;   // فشل الاثنان: نعيد استجابة الأصل كما كان السلوك
    throw first || agg;
  }
}

async function imageCacheFirst(href) {
  try {
    const cache = await caches.open(IMAGE_CACHE);
    const hit = await cache.match(href);
    if (hit) return hit;

    let pending = _imgInflight.get(href);
    if (!pending) {
      pending = (async () => {
        const res = await fetchImageWithAlt(href);
        if (res && res.ok) {
          // نخزّن نسخة ونُعيد الأصل؛ التخزين لا يؤخّر عرض الصورة
          _putSafe(cache, href, res.clone());
        }
        return res;
      })().finally(() => _imgInflight.delete(href));
      _imgInflight.set(href, pending);
    }
    const res = await pending;
    // كل مستهلك يحتاج نسخته الخاصة من الجسم
    return res.clone();
  } catch {
    return Response.error(); // أوفلاين وبلا نسخة محفوظة → الصورة تفشل بهدوء (المتصفح يعرض بديلها)
  }
}

// مصغّرة يوتيوب: كاش أولاً (مصغّرة الفيديو الواحد ثابتة عملياً). أول مرة بنجرّب CORS عشان نقدر نخزّنها
// كاستجابة عادية؛ لو اليوتيوب رفض CORS نجلبها opaque ونخزّنها برضه (الصورة تظهر بلا نت لاحقًا).
async function thumbCacheFirst(request) {
  const href = request.url;
  try {
    const cache = await caches.open(THUMB_CACHE);
    const hit = await cache.match(href);
    if (hit) return hit;
    let res;
    try {
      res = await fetch(href, { mode: 'cors', credentials: 'omit' });
    } catch {
      res = await fetch(href, { mode: 'no-cors', credentials: 'omit' });
    }
    // ok (CORS) أو opaque (status 0 ونوعها opaque) — نخزّن الاثنين، ونرفض أخطاء الشبكة/404
    if (res && (res.ok || res.type === 'opaque')) {
      await cache.put(href, res.clone());
      const keys = await cache.keys();
      if (keys.length > THUMB_CACHE_MAX_ENTRIES) {
        await Promise.all(keys.slice(0, keys.length - THUMB_CACHE_MAX_ENTRIES).map(k => cache.delete(k)));
      }
    }
    return res;
  } catch {
    return Response.error(); // بلا نت وبلا نسخة محفوظة → الصفحة تعرض بديلها (js/shared/img.js)
  }
}

// ── الطلبات: كاش أولاً، شبكة للتحديث في الخلفية ─────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // فحص صحّة الاستضافة (صفحة التثبيت) — مباشر للشبكة دائمًا؛ نسخة الكاش ستُظهر موقعًا معطّلًا كأنه سليم
  if (url.pathname === '/health.json') return;

  // Firebase / Google APIs — تمرير مباشر للشبكة بدون أي لمس من الكاش
  // (توكنات المصادقة يجب ألا تُخزَّن أو تُستبدل بنسخة قديمة)
  // استثناء: ملفات SDK الثابتة (نسخة مثبّتة بالمسار) → كاش أولاً
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith(SDK_PATH_PREFIX)) {
    event.respondWith(
      caches.open(SDK_CACHE).then(async cache => {
        const hit = await cache.match(event.request);
        if (hit) return hit;
        const res = await fetch(event.request);
        if (res && res.status === 200) cache.put(event.request, res.clone());
        return res;
      })
    );
    return;
  }

  // مكتبة Supabase (jsdelivr، نسخة مثبّتة) → كاش أولاً
  if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.startsWith(SB_SDK_PATH_PREFIX)) {
    event.respondWith(
      caches.open(SB_SDK_CACHE).then(async cache => {
        const hit = await cache.match(event.request);
        if (hit) return hit;
        const res = await fetch(event.request);
        if (res && res.status === 200) cache.put(event.request, res.clone());
        return res;
      })
    );
    return;
  }

  // Supabase API الحيّة (دخول/بيانات/دوال) — تمرير مباشر للشبكة بلا أي كاش:
  // التوكنات والتعليقات لحظية، والنسخة القديمة تكسر الجلسة. (الصور /storage/ لها قاعدة تحتها)
  if (url.hostname.endsWith('.supabase.co') &&
      (url.pathname.startsWith('/auth/v1/') || url.pathname.startsWith('/rest/v1/') ||
       url.pathname.startsWith('/functions/v1/') || url.pathname.startsWith('/realtime/'))) {
    return;
  }

  if (isNoCacheHost(url)) {
    return; // اترك المتصفح يتعامل مع الطلب مباشرة، دون respondWith
  }

  // مقاطع الصوت — تُدار من الصفحة (audio-clips.js)؛ لا نلتقطها هنا أبدًا
  if (url.hostname.endsWith('.supabase.co') && url.pathname.startsWith(AUDIO_PATH)) {
    return;
  }

  // صور Supabase Storage — كاش أولاً (محتوى الملف ثابت: اسمه فريد)، تتنزّل مرة واحدة
  // لكل جهاز بدل كل زيارة. بنخزّن استجابة CORS (مش opaque) لأن الـopaque بتاخد
  // حصة تخزين كبيرة في المتصفح. أي نطاق صور تاني (يوتيوب...) يفضل زي ما هو.
  if (url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/storage/v1/object/public/')) {
    event.respondWith(imageCacheFirst(url.href));
    return;
  }

  // مصغّرات يوتيوب — كاش دائم أولاً (تعمل بلا نت بعد أول مشاهدة)
  if (THUMB_HOSTS.includes(url.hostname)) {
    event.respondWith(thumbCacheFirst(event.request));
    return;
  }

  // الصور الخارجية (Cloudinary وغيرها) — شبكة أولاً
  const isExternal = url.origin !== self.location.origin;

  if (isExternal) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request)) // كاش كاحتياط
    );
    return;
  }

  // الخطوط — كاش دائم أولاً (ثابتة لا تتغيّر مع الإصدارات)
  if (!isExternal && _isFontUrl(url.pathname)) {
    event.respondWith(fontCacheFirst(event.request));
    return;
  }

  // نص القرآن — كاش دائم أولاً (ثابت لا يتغيّر)
  if (!isExternal && url.pathname.includes(QURAN_PATH)) {
    event.respondWith(quranCacheFirst(event.request));
    return;
  }

  // مرآة المحتوى — شبكة أولًا بمهلة قصيرة ثم الكاش (ملفها وختمها يُجلبان معًا من الاستضافة فيبقى الزوج متسقًا)
  if (!isExternal && url.pathname.includes(MIRROR_PATH)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      try {
        const res = await Promise.race([
          fetch(event.request),
          new Promise((_, reject) => setTimeout(() => reject(new Error('mirror-timeout')), MIRROR_TIMEOUT_MS)),
        ]);
        if (res && res.status === 200) cache.put(event.request, res.clone()).catch(() => {});
        return res;
      } catch {
        return (await cache.match(event.request)) || Response.error();
      }
    })());
    return;
  }

  // طلبات التنقل (index.html والهيدر والـ nav المدمجَين فيه) — شبكة أولاً
  // لأن هذه العناصر لا تُعاد قراءتها إلا عند reload كامل، فكانت تُظهر نسخة قديمة
  // حتى بعد نجاح تحديث الكاش في الخلفية
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    // ⚡ أداء (v367): كانت الصفحة تنتظر الشبكة أولاً (حتى ٦ ثواني) قبل أي رسم — فالفتح مع
    // الإنترنت أبطأ من الفتح بدونه (بدون نت يفشل الطلب فوراً فتأتي النسخة المحفوظة).
    // الآن: لو عندنا نسخة محفوظة نعرضها فوراً ونحدّثها في الخلفية للمرة القادمة.
    // الحداثة مضمونة بطريقتين: كل إصدار جديد (رفع CACHE_VERSION) يعيد تخزين index.html
    // عند التثبيت، والتحديث الخلفي هنا يلتقط أي تغيير بعد ذلك.
    // لو ما فيه نسخة محفوظة (أول زيارة/صفحة غير مخزّنة): السلوك القديم — شبكة بمهلة ٦ ثواني.
    event.respondWith((async () => {
      // ignoreSearch: تجاهل الـ query (?fbclid=... أو ?source=pwa...) كي تُطابَق النسخة المحفوظة
      const cached = (await caches.match(event.request))
        || (await caches.match(event.request, { ignoreSearch: true }));
      const refresh = () => fetch(event.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
        }
        return res;
      });
      if (cached) {
        event.waitUntil(refresh().catch(() => {})); // تحديث صامت؛ فشله (أوفلاين) لا يهم
        return cached;
      }
      try {
        return await Promise.race([
          refresh(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('nav-timeout')), 6000)),
        ]);
      } catch {
        return (await caches.match('./offline.html')) || Response.error();
      }
    })());
    return;
  }

  // الملفات المحلية — كاش أولاً، والشبكة فقط لو الملف غير محفوظ.
  // (v386) كان هنا "تحديث خلفي" يطلق طلب شبكة لكل ملف يُقرأ من الكاش — يعني عشرات
  // الطلبات عند كل إقلاع وتنقّل تزاحم بيانات المستخدم على خط القرية الضعيف، فيتصرّف
  // التطبيق كأنه أونلاين 100% حتى وكل ملفاته محفوظة. الحداثة مضمونة بالإصدار: كل رفع
  // لـ CACHE_VERSION يعيد تثبيت الملفات (install) بتحقق ETag، فلا حاجة لتحديث كل ملف
  // عند كل قراءة. ⚠️ لذلك لازم تغيير CACHE_VERSION مع أي تعديل (كما هو متّبع).
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          event.waitUntil(caches.open(CACHE_VERSION).then(c => c.put(event.request, clone)));
        }
        return res;
      }).catch(() => {
        // عند انقطاع الشبكة: أرجع صفحة Offline للطلبات الـ HTML
        if (event.request.destination === 'document') {
          return caches.match('./offline.html');
        }
        return Response.error();
      });
    })
  );
});


// ══════════════════════════════════════════════════════════════
//  Web Push — استقبال إشعار من الخادم/Firebase والتطبيق مغلق
//  (الاستقبال والتطبيق مفتوح [foreground] يتم عبر js/shared/push.js)
// ══════════════════════════════════════════════════════════════

// ── فلترة حسب تصنيفات المستخدم (صفحة "الرسائل" → settings-notifications.js) ──
// نسخة مطابقة لـ NOTIFICATION_TYPE_TO_SETTING في js/data/local-data.js —
// مكرّرة هنا لأن هذا سكريبت كلاسيكي (مسجَّل من غير type:'module' في
// index.html) ومايقدرش يعمل import لملف ES module. أي تعديل في
// local-data.js لازم يتزامن هنا يدويًا. 'system' عمداً مش موجودة —
// رسالة عامة من الإدارة تفضل تظهر دايمًا بدون توغل.
const NOTIF_TYPE_TO_TOGGLE = {
  news:       'notif-news',
  event:      'notif-events',
  solidarity: 'notif-community-life',
  congrats:   'notif-community-life',
  condolence: 'notif-community-life',
  community:  'notif-community',
  project:    'notif-projects',
  idea:       'notif-projects',
  worship:    'notif-worship',
  nubian:     'notif-community',
};

// service worker مالوش وصول لـlocalStorage — بيقرا من IndexedDB اللي
// js/shared/notif-prefs.js بيكتب فيها من صفحة الإعدادات. أي فشل أو
// قيمة غير موجودة → true (نفس افتراضي isOn() في صفحة الإعدادات: التصنيف
// شغال ما لم يقفله المستخدم صراحة).
function _getNotifPref(toggleKey) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('shabtoot-prefs', 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('notif-toggles')) {
          req.result.createObjectStore('notif-toggles');
        }
      };
      req.onerror = () => resolve(true);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction('notif-toggles', 'readonly');
          const getReq = tx.objectStore('notif-toggles').get(toggleKey);
          getReq.onsuccess = () => { resolve(getReq.result === undefined ? true : getReq.result); db.close(); };
          getReq.onerror   = () => { resolve(true); db.close(); };
        } catch (_) {
          resolve(true);
        }
      };
    } catch (_) {
      resolve(true);
    }
  });
}

// hash نصي بسيط وثابت (نفس المدخل = نفس المخرج دايمًا) — مستخدم لبناء
// tag الإشعار لمنع التكرار لما السيرفر ما يبعتش payload.id (توافقًا مع
// أي مرسل قديم). مش تشفير أمني، مجرد بصمة قصيرة للمقارنة.
function _stableTag(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: 'أخضر شبتوت بحري', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'أخضر شبتوت بحري';
  const page  = payload.page || 'notifications';

  // ── منع التكرار (نفس الإشعار يوصل مرتين: retry من المتصفح/الشبكة،
  // أو أكتر من اشتراك على نفس الجهاز الفعلي) ──────────────────────────
  // tag ثابت مبني من محتوى الرسالة + يوم اليوم (مش timestamp لحظي) —
  // فلو نفس push وصل مرتين، showNotification التانية بتستبدل الأولى
  // بدل ما تضيف واحدة جديدة جنبها (سلوك tag القياسي في Notifications
  // API)، فتفضل رسالة واحدة بس ظاهرة. لو الإدارة بعتت رسالة تانية بنفس
  // النص بالظبط بعد كذا يوم، الـtag بيختلف (تاريخ مختلف) فتظهر عادي.
  const tag = payload.id
    ? `shabtoot-${payload.id}`
    : _stableTag(`${title}|${payload.body || ''}|${page}|${new Date().toISOString().slice(0, 10)}`);

  const options = {
    body: payload.body || '',
    icon: './assets/icons/icon-192.png',       // الأيقونة الكبيرة (بعد سحب الستار)
    badge: './assets/icons/icon-badge-mono.png', // أيقونة شريط الحالة/شاشة القفل —
    // لازم تكون سيلويت أبيض شفاف الخلفية (مش لوجو ملوّن): أندرويد بياخد
    // قناة الشفافية بس ويرسمها بيضا في شريط الحالة، فلو الصورة معتّمة
    // بالكامل (زي icon-192 القديمة) بيطلع مربّع أبيض غير مفهوم — وده
    // بالظبط اللي كان بيحصل قبل التعديل ده.
    tag,
    renotify: false,
    dir: 'rtl',
    lang: 'ar',
    data: { page },
    // نبضة اهتزاز — بتأثّر بس في أندرويد ٧.١ وأقدم (API 25-)، وده اللي
    // شرحه في رد المحادثة: من ٨.٠ لفوق أندرويد بيحدد "هل تطلع فوق
    // الشاشة (heads-up) ولا تنزل بالستار بس" حسب أهمية قناة الإشعار،
    // مش حسب أي خيار هنا. القناة دي بيتحكم فيها المتصفح/نظام
    // التشغيل، مش كود الموقع.
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    (async () => {
      // نوع بدون تعيين في الخريطة (زي 'system' أو إشعار من نسخة قديمة
      // من غير type أصلاً) يفضل يظهر دايمًا — التوغل يخص التصنيفات
      // المعروفة بس
      const toggleKey = NOTIF_TYPE_TO_TOGGLE[payload.type];
      if (toggleKey) {
        const enabled = await _getNotifPref(toggleKey);
        if (!enabled) return; // المستخدم قافل التصنيف ده — ما نعرضش push أصلاً
      }

      await self.registration.showNotification(title, options);

      // بلّغ أي تبويب/نافذة مفتوحة عشان تحفظ الإشعار محليًا وتحدّث الشارة
      const clientsList = await self.clients.matchAll({ type: 'window' });
      clientsList.forEach((client) => {
        client.postMessage({
          type: 'PUSH_RECEIVED',
          payload: { title, body: options.body, page: options.data.page },
        });
      });
    })()
  );
});

// ─── ضغط المستخدم على الإشعار ─────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPage = event.notification.data?.page || 'notifications';

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({ type: 'window' });
      const existing = clientsList.find((c) => c.url.includes(self.location.origin));

      if (existing) {
        existing.postMessage({ type: 'NOTIFICATION_CLICKED', page: targetPage });
        return existing.focus();
      }
      return self.clients.openWindow(`./#${targetPage}`);
    })()
  );
});
