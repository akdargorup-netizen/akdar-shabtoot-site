import { lockAdminSession, getAdminRole, ADMIN_AUTH_MODE } from '../../data/admin-auth.js';
import { canAccessAdminPage } from '../../data/admin-access.js';
import { getArchiveStats, purgeArchivedContent, getUnreadInboxCount, getReviewQueueCounts, getImageStorageUsage, getUsageStats } from '../../data/db.js';
import { renderNubianHub, initNubianHub } from './admin-nubian-hub.js';
import { showToast } from '../../shared/toast.js';
import { refreshNotifBadge } from '../../shared/notif-badge.js';
import { renderIcons } from '../../shared/icons.js';
import { confirmPurge } from '../../shared/admin-ui.js';
import { isBatchMode, setBatchMode, confirmDisableBatchMode } from '../../shared/admin-batch.js';
const ADMIN_GROUPS = [
{
group: 'المحتوى',
items: [
{ icon: 'newspaper',    title: 'الأخبار',      desc: 'إضافة وتعديل وحذف الأخبار.', page: 'admin-news', enabled: true },
{ icon: 'calendar',     title: 'الفعاليات',    desc: 'فيديوهات فعاليات ومناسبات القرية (روابط يوتيوب).', page: 'admin-events', enabled: true },
{ icon: 'trending-up',  title: 'المشاريع',     desc: 'تحديث حالة ونسبة إنجاز المشاريع.', page: 'admin-projects', enabled: true },
{ icon: 'landmark',     title: 'تاريخ بلدنا',   desc: 'إضافة وتعديل وحذف مقالات الأقسام التاريخية الأربعة.', page: 'admin-history', enabled: true },
{ icon: 'scroll-text',  title: 'مسيرة الرابطة', desc: 'إضافة وتعديل وحذف مقالات الحكاية والإنجازات والسجل الذهبي.', page: 'admin-association-journey', enabled: true },
{ icon: 'headphones',   title: 'المحاضرات الدينية', desc: 'محاضرات قسم العبادة (روابط يوتيوب).', page: 'admin-lectures', enabled: true },
{ icon: 'graduation-cap', title: 'خدمات الطلاب', desc: 'حصص الفيديو (روابط يوتيوب) للشهادة المتوسطة والسودانية.', page: 'admin-study', enabled: true },
{ icon: 'images',       title: 'صور البلد',    desc: 'رفع وتعديل وحذف صور معرض البلد.', page: 'admin-gallery', enabled: true },
{ icon: 'languages',    title: 'آنداندي',      desc: 'إضافة وتعديل الكلمات والجمل والنطق الصوتي — لكل عمل صفحته.', page: 'admin-nubian', enabled: true },
],
},
{
group: 'التواصل',
items: [
{ icon: 'phone',       title: 'دليل الاتصال',   desc: 'إضافة وتعديل وحذف جهات الاتصال لكل تصنيف.', page: 'admin-contacts', enabled: true },
{ icon: 'inbox',       title: 'الرسائل الواردة', desc: 'مساهمات الأهالي وبلاغات الأخطاء.', page: 'admin-inbox', enabled: true, badgeKey: 'inbox-unread' },
{ icon: 'lightbulb',   title: 'صندوق الأفكار',  desc: 'مراجعة الأفكار المقترحة من الأهالي.', page: 'admin-idea-box', enabled: true, badgeKey: 'ideas-review' },
{ icon: 'flower-2',    title: 'المناسبات',   desc: 'مراجعة وحذف مناسبات الأهالي (تعازي، تبريكات، أعراس...).', page: 'admin-occasions', enabled: true, badgeKey: 'occasions-review' },
{ icon: 'shield-x',    title: 'رقابة الأعضاء',   desc: 'حظر عضو كليًا من التطبيق، أو جزئيًا من التعليق والمشاركة.', page: 'admin-members', enabled: true },
],
},
{
group: 'النظام',
developerOnly: true,
items: [
{ icon: 'bell',          title: 'الرسائل',          desc: 'إرسال وإدارة رسائل: أخبار، مناسبات، تكافل، تبريك وتعازي.', page: 'admin-notifications', enabled: true },
{ icon: 'user-cog',      title: 'صلاحيات المشرفين', desc: 'إضافة/إزالة حسابات مشرفين ودورهم.', page: 'admin-permissions', enabled: true },
{ icon: 'scroll-text',   title: 'سجل النشاط',       desc: 'كل تعديل إداري: مين وايمتى وايش.', page: 'admin-activity-log', enabled: true },
{ icon: 'database',      title: 'نسخ احتياطي واستيراد', desc: 'تصدير/استيراد بيانات التطبيق كاملة.', page: 'admin-backup', enabled: true },
{ icon: 'bot',           title: 'الذكاء الاصطناعي', desc: 'حصة كل مزوّد، وتجربة النماذج وتقارنها.', page: 'admin-ai', enabled: true },
],
},
];
function _renderNubianHome() {
return `
    <section class="page admin-panel-page nadm-home">
      ${renderNubianHub({ withTitle: true })}
      <button type="button" class="btn btn--ghost nadm-lock" data-action="admin-lock">
        <span data-icon="log-out"></span> خروج من الإدارة
      </button>
    </section>
  `;
}
function _initNubianHome() {
document.querySelector('[data-action="admin-lock"]')?.addEventListener('click', async () => {
lockAdminSession();
const { navigateTo } = await import('../../core/router.js');
navigateTo('settings');
});
initNubianHub(document.querySelector('.nadm-home'));
}
export function renderAdminPanel() {
const role = getAdminRole();
if (role === 'nubian') return _renderNubianHome();
const isDeveloper = role === 'developer';
const isNubianEditor = role === 'nubian';
const visibleGroups = ADMIN_GROUPS
.filter(g => !g.developerOnly || isDeveloper)
.map(g => ADMIN_AUTH_MODE === 'claims'
? { ...g, items: g.items.filter(i => i.page !== 'admin-permissions') }
: g
)
.map(g => isNubianEditor
? { ...g, items: g.items.filter(i => i.page === 'admin-nubian') }
: g
)
.map(g => ({ ...g, items: g.items.filter(i => canAccessAdminPage(role, i.page)) }))
.filter(g => g.items.length > 0);
const restrictedNote = (!isDeveloper && !visibleGroups.length)
? '<p class="admin-section-note">أقسام الإدارة مقصورة على المطوّر حالياً.</p>'
: '';
const groupsHtml = visibleGroups.map(g => `
    <div class="admin-group">
      <div class="admin-group__label-row">
        <span class="admin-group__label">${g.group}</span>
        ${g.developerOnly ? `
          <span class="admin-group__restricted-tag">
            <span data-icon="shield-alert"></span>
            مطوّر فقط
          </span>
        ` : ''}
      </div>
      <div class="admin-grid">
        ${g.items.map(s => `
          <div
            class="admin-card ${g.developerOnly ? 'admin-card--restricted' : ''}"
            ${s.enabled ? `data-page="${s.page}"` : `data-disabled="true" aria-disabled="true"`}
          >
            <div class="admin-card__icon">
              <i data-lucide="${s.icon}"></i>
            </div>
            <div class="admin-card__body">
              <div class="admin-card__title-row">
                <h3 class="admin-card__title">${s.title}</h3>
                ${s.badgeKey ? `<span class="admin-card__badge hidden" data-badge-key="${s.badgeKey}"></span>` : ''}
              </div>
              <p class="admin-card__desc">${isDeveloper ? s.desc : s.desc.replace(/ و?حذف /, ' ')}</p>
            </div>
            <div class="admin-card__arrow" aria-hidden="true">
              <i data-lucide="chevron-left"></i>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
const roleLabel = isDeveloper ? 'مطوّر' : isNubianEditor ? 'مشرف آنداندي' : 'مشرف';
const roleIcon  = isDeveloper ? 'key-round' : isNubianEditor ? 'languages' : 'shield-check';
const heroClass = isDeveloper ? 'admin-hero admin-hero--developer' : isNubianEditor ? 'admin-hero admin-hero--nubian' : 'admin-hero';
const chipClass = isDeveloper ? 'admin-role-chip admin-role-chip--developer' : isNubianEditor ? 'admin-role-chip admin-role-chip--nubian' : 'admin-role-chip admin-role-chip--admin';
const subMessage = isNubianEditor
? 'صلاحيتك محصورة بقسم آنداندي (قاموس اللغة النوبية) — إضافة وتعديل الكلمات بس.'
: isDeveloper
? 'كل الأقسام شغّالة. البيانات الحالية محلية وبتضيع عند تحديث الصفحة — صدّر نسخة من "نسخ احتياطي واستيراد" في قسم النظام.'
: 'كل أقسام المحتوى والتواصل شغّالة. بعض الأقسام (النظام) متاحة لجلسة المطوّر فقط.';
return `
    <section class="page admin-panel-page">

      <div class="${heroClass}">
        <div class="admin-hero__icon"><span data-icon="layout-dashboard"></span></div>
        <h2 class="admin-hero__title">لوحة الإدارة</h2>
        <span class="${chipClass}">
          <span data-icon="${roleIcon}"></span>
          صلاحية: ${roleLabel}
        </span>
        <p class="admin-hero__sub">
          ${subMessage}
        </p>
      </div>

      <div class="admin-group">
        <div class="admin-group__label-row">
          <span class="admin-group__label">طريقة الحفظ</span>
        </div>
        <div class="settings-list">
          <div class="settings-item" id="admin-batch-item" style="cursor:default">
            <div class="settings-icon"><span data-icon="list-checks"></span></div>
            <div class="settings-content">
              <h4>وضع التعديل المجمّع</h4>
              <p>كل شغلك (إضافة، تعديل، حذف، أرشفة، موافقة) بيتجمّع عندك، وبعدها تحفظه كله مرة واحدة بزر "حفظ الكل". وحتى لو الوضع مقفول: لو النت انقطع، شغلك بيتسجّل عندك ويترفع لوحده لما النت يرجع.</p>
            </div>
            <div class="toggle ${isBatchMode() ? 'toggle--on' : ''}" id="admin-batch-toggle" role="switch" tabindex="0" aria-checked="${isBatchMode()}" aria-label="وضع التعديل المجمّع">
              <div class="toggle__track"></div>
              <div class="toggle__thumb"></div>
            </div>
          </div>
        </div>
      </div>

      ${!isNubianEditor ? `
      <div class="admin-group" id="admin-review-queue">
        <div class="admin-group__label-row">
          <span class="admin-group__label">يحتاج مراجعتك</span>
        </div>
        <div class="settings-list" id="admin-review-list" aria-live="polite">
          <div class="settings-item" style="cursor:default">
            <div class="settings-content"><h4>قاعدين نحسب...</h4></div>
          </div>
        </div>
      </div>
      ` : ''}

      ${groupsHtml}
      ${restrictedNote}

      ${isDeveloper ? `
      <div class="admin-group">
        <div class="admin-group__label-row">
          <span class="admin-group__label">إدارة التخزين</span>
        </div>
        <p class="admin-section-note">
          المحتوى القديم يُؤرشف تلقائياً من الخلاصة (يختفي لكن لا يُحذف)، وتقدر تحذفه نهائياً من هنا بضغطة واحدة.
        </p>
        <div class="settings-list" id="admin-storage-stats" style="margin-bottom: var(--space-3);">
          <div class="settings-item" style="cursor:default">
            <div class="settings-content">
              <h4>إحصائيات التخزين</h4>
              <p>بتتحسب عند الطلب بس، لأنها بتقرا كل المحتوى والتعليقات.</p>
            </div>
            <button class="btn btn--secondary btn--sm" id="admin-storage-stats-btn">احسب الإحصائيات</button>
          </div>
        </div>
        <div class="settings-list" id="admin-image-usage" style="margin-bottom: var(--space-3);">
          <div class="settings-item" style="cursor:default">
            <div class="settings-content">
              <h4>مساحة الصور</h4>
              <p>المستهلك من 1 جيجا (الخطة المجانية). بتتحسب عند الطلب بس.</p>
            </div>
            <button class="btn btn--secondary btn--sm" id="admin-image-usage-btn">احسب</button>
          </div>
        </div>
        <div class="settings-list" id="admin-usage" style="margin-bottom: var(--space-3);">
          <div class="settings-item" style="cursor:default">
            <div class="settings-content">
              <h4>لوحة الاستهلاك</h4>
              <p>أسئلة المساعد اليوم مقابل السقف، وحجم قاعدة البيانات وأكبر الجداول. بتتحسب عند الطلب بس.</p>
            </div>
            <button class="btn btn--secondary btn--sm" id="admin-usage-btn">اعرض</button>
          </div>
        </div>
        <div style="padding: 0 var(--spacing-page-x);">
          <button class="btn btn--danger btn--full" id="admin-purge-btn">
            <i data-lucide="trash-2"></i>
            تنظيف الأرشيف نهائياً
          </button>
        </div>
      </div>
      ` : ''}

      <div class="settings-list" style="margin-top: var(--space-6);">
        <div class="settings-item" data-action="admin-lock" style="cursor:pointer">
          <div class="settings-icon"><span data-icon="lock"></span></div>
          <div class="settings-content"><h4>قفل الخروج من لوحة الإدارة</h4></div>
        </div>
      </div>

    </section>
  `;
}
export async function initAdminPanel() {
if (getAdminRole() === 'nubian') { await _initNubianHome(); renderIcons(); return; }
document.querySelectorAll('.admin-panel-page [data-disabled="true"]')
.forEach(el => { el.style.pointerEvents = 'none'; });
const batchToggle = document.getElementById('admin-batch-toggle');
if (batchToggle) {
const flip = async () => {
const next = !batchToggle.classList.contains('toggle--on');
if (!next && !await confirmDisableBatchMode()) return;
setBatchMode(next);
batchToggle.classList.toggle('toggle--on', next);
batchToggle.setAttribute('aria-checked', String(next));
};
batchToggle.addEventListener('click', flip);
batchToggle.addEventListener('keydown', e => {
if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
});
}
const lockBtn = document.querySelector('[data-action="admin-lock"]');
if (lockBtn) {
lockBtn.addEventListener('click', async () => {
lockAdminSession();
const { navigateTo } = await import('../../core/router.js');
navigateTo('settings');
});
}
document.getElementById('admin-storage-stats-btn')?.addEventListener('click', async e => {
const btn = e.currentTarget;
btn.disabled = true;
btn.textContent = 'قاعدين نحسب...';
await _loadStorageStats();
});
document.getElementById('admin-image-usage-btn')?.addEventListener('click', _loadImageUsage);
document.getElementById('admin-usage-btn')?.addEventListener('click', _loadUsage);
if (getAdminRole() === 'developer') await _loadCardBadges();
document.getElementById('admin-purge-btn')?.addEventListener('click', async () => {
if (!await confirmPurge({ what: 'المحتوى المؤرشف' })) return;
const btn = document.getElementById('admin-purge-btn');
btn.disabled = true;
btn.textContent = 'قاعدين ننظّف...';
try {
const removed = await purgeArchivedContent();
const total = Object.values(removed).reduce((a, b) => a + b, 0);
showToast(total ? `اتمسح ${total} عنصر من الأرشيف` : 'مافي حاجة لسه محتاجة تنظيف', 'success');
refreshNotifBadge();
await _loadStorageStats();
} catch (err) {
console.error('[AdminPanel] فشل تنظيف الأرشيف:', err);
showToast('التنظيف لسع ما تم — جرّب تاني', 'error');
} finally {
btn.disabled = false;
btn.innerHTML = '<i data-lucide="trash-2"></i> تنظيف الأرشيف نهائياً';
renderIcons();
}
});
}
const IMAGE_QUOTA_BYTES = 1024 * 1024 * 1024;
function _fmtBytes(n) {
if (n >= 1024 * 1024 * 1024) return `${(n / 1024 / 1024 / 1024).toFixed(2)} جيجا`;
if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} ميجا`;
return `${Math.round(n / 1024)} كيلو`;
}
async function _loadImageUsage() {
const container = document.getElementById('admin-image-usage');
if (!container) return;
const btn = document.getElementById('admin-image-usage-btn');
if (btn) { btn.disabled = true; btn.textContent = 'قاعدين نحسب...'; }
try {
const { bytes, files } = await getImageStorageUsage();
const pct = Math.min(100, (bytes / IMAGE_QUOTA_BYTES) * 100);
const state = pct >= 90 ? 'badge--error' : pct >= 70 ? 'badge--warning' : 'badge--default';
container.innerHTML = `
      <div class="settings-item" style="cursor:default">
        <div class="settings-content">
          <h4>مساحة الصور</h4>
          <p>${_fmtBytes(bytes)} من 1 جيجا — ${files} صورة</p>
        </div>
        <span class="badge ${state}">${pct.toFixed(1)}%</span>
      </div>
      <div class="settings-item" style="cursor:default">
        <div class="settings-content">
          <p>${pct >= 70 ? 'قربت المساحة تمتلي — انقل أو احذف صور قديمة من لوحة Supabase.' : 'المساحة مريحة.'}</p>
        </div>
        <button class="btn btn--secondary btn--sm" id="admin-image-usage-btn">حدّث</button>
      </div>
    `;
} catch (err) {
console.error('[AdminPanel] فشل حساب مساحة الصور:', err);
const msg = err.code === 'list-not-allowed'
? 'ما عندنا إذن قراءة القائمة — شغّل سياسة القراءة في Supabase (SQL).'
: _explainError(err, '20261019_storage_hardening.sql');
container.innerHTML = `
      <div class="settings-item" style="cursor:default">
        <div class="settings-content"><h4>مساحة الصور</h4><p>${msg}</p><p dir="ltr" style="font-size:.75rem;opacity:.7;text-align:left">${escapeHtml(String(err?.code || ''))} ${escapeHtml(String(err?.message || err || '').slice(0, 160))}</p></div>
        <button class="btn btn--secondary btn--sm" id="admin-image-usage-btn">أعد المحاولة</button>
      </div>`;
}
document.getElementById('admin-image-usage-btn')?.addEventListener('click', _loadImageUsage);
}
const AI_DAILY_CAP = 800;
const DB_QUOTA_BYTES = 500 * 1024 * 1024;
function _usageBadge(pct) {
return pct >= 90 ? 'badge--error' : pct >= 70 ? 'badge--warning' : 'badge--default';
}
function _explainError(err, sqlFile) {
const code = String(err?.code || '');
const all = `${code} ${String(err?.message || err || '')}`;
if (/not_allowed|42501/.test(all)) return 'حسابك ما عنده صلاحية مشرف/مالك في جدول user_roles.';
if (code === 'no-token') return 'ما في جلسة دخول — سجّل خروج ودخول بحساب الإدارة.';
if (code === 'timeout') return 'الرد تأخر — الشبكة بطيئة أو الخادم لسع صاحي. أعد المحاولة.';
if (code === 'config') return 'اتصال Supabase غير مضبوط في التطبيق.';
if (/PGRST301|JWT|HTTP 401/i.test(all)) return 'الجلسة منتهية أو غير صالحة — سجّل خروج ودخول.';
if (/PGRST202|HTTP 404/.test(all)) return `الدالة المطلوبة غير موجودة في Supabase — شغّل ملف ${sqlFile}.`;
if (/57014/.test(all)) return 'القاعدة أخذت وقتًا أطول من المسموح — حاول لاحقًا.';
if (/HTTP 5\d\d/.test(all)) return 'الخادم فيه عطل مؤقت — حاول بعد قليل.';
if (/Failed to fetch|NetworkError|Load failed/i.test(all)) return 'ما قدرنا نتصل — تأكد من الإنترنت.';
return 'سبب غير معروف — شوف الرمز بالأسفل.';
}
async function _loadUsage() {
const container = document.getElementById('admin-usage');
if (!container) return;
const btn = document.getElementById('admin-usage-btn');
if (btn) { btn.disabled = true; btn.textContent = 'قاعدين نحسب...'; }
try {
const u = await getUsageStats();
const t = u.ai_today || {};
const calls = (t.route || 0) + (t.ask || 0);
const aiPct = Math.min(100, (calls / AI_DAILY_CAP) * 100);
const dbPct = Math.min(100, ((u.db_bytes || 0) / DB_QUOTA_BYTES) * 100);
const wk = u.ai_week || {};
const share = calls ? Math.round(((t.route || 0) / calls) * 100) : 0;
const rows = (u.tables || []).slice(0, 5).map(r => `
      <div class="settings-item" style="cursor:default">
        <div class="settings-content"><p>${escapeHtml(String(r.name))} — ${Number(r.rows) || 0} صف</p></div>
        <span class="badge badge--default">${_fmtBytes(Number(r.bytes) || 0)}</span>
      </div>`).join('');
container.innerHTML = `
      <div class="settings-item" style="cursor:default">
        <div class="settings-content">
          <h4>المساعد اليوم</h4>
          <p>${calls} من ${AI_DAILY_CAP} استدعاء — إجابة ${t.ask || 0}، توجيه ${t.route || 0} (${share}%)، من الكاش ${t.cache_hit || 0}</p>
          <p>آخر 7 أيام: ${(wk.route || 0) + (wk.ask || 0)} استدعاء، ${wk.cache_hit || 0} من الكاش</p>
        </div>
        <span class="badge ${_usageBadge(aiPct)}">${aiPct.toFixed(0)}%</span>
      </div>
      <div class="settings-item" style="cursor:default">
        <div class="settings-content">
          <h4>قاعدة البيانات</h4>
          <p>${_fmtBytes(u.db_bytes || 0)} من 500 ميجا</p>
        </div>
        <span class="badge ${_usageBadge(dbPct)}">${dbPct.toFixed(1)}%</span>
      </div>
      ${rows}
      <div class="settings-item" style="cursor:default">
        <div class="settings-content"><p>${aiPct >= 70 || dbPct >= 70 ? 'قربت من الحد — راجع الاستهلاك قبل ما يوقف.' : 'الاستهلاك مريح.'}</p></div>
        <button class="btn btn--secondary btn--sm" id="admin-usage-btn">حدّث</button>
      </div>`;
} catch (err) {
console.error('[AdminPanel] فشل جلب لوحة الاستهلاك:', err);
const msg = _explainError(err, '20261023_usage_dashboard.sql');
container.innerHTML = `
      <div class="settings-item" style="cursor:default">
        <div class="settings-content"><h4>لوحة الاستهلاك</h4><p>${msg}</p><p dir="ltr" style="font-size:.75rem;opacity:.7;text-align:left">${escapeHtml(String(err?.code || ''))} ${escapeHtml(String(err?.message || err || '').slice(0, 160))}</p></div>
        <button class="btn btn--secondary btn--sm" id="admin-usage-btn">أعد المحاولة</button>
      </div>`;
}
document.getElementById('admin-usage-btn')?.addEventListener('click', _loadUsage);
}
async function _loadStorageStats() {
const container = document.getElementById('admin-storage-stats');
if (!container) return;
try {
const stats = await getArchiveStats();
container.innerHTML = stats.map(s => `
      <div class="settings-item" style="cursor:default">
        <div class="settings-content">
          <h4>${s.label}</h4>
          <p>يتأرشف تلقائياً بعد ${s.retentionDays} يوم</p>
        </div>
        <span class="badge ${s.archived ? 'badge--warning' : 'badge--default'}">
          ${s.archived} من ${s.total} مؤرشف
        </span>
      </div>
    `).join('');
} catch (err) {
console.error('[AdminPanel] فشل تحميل إحصائيات التخزين:', err);
container.innerHTML = `<div class="settings-item"><div class="settings-content"><h4>الإحصائيات لسع ما وصلت</h4></div></div>`;
}
}
async function _loadCardBadges() {
const counts = { inbox: 0, ideas: 0, occasions: 0 };
let failed = false;
await Promise.all([
getUnreadInboxCount().then(n => { counts.inbox = n; }),
getReviewQueueCounts().then(c => { counts.ideas = c.ideas; counts.occasions = c.occasions; }),
].map(p => p.catch(err => { failed = true; console.error('[AdminPanel] فشل تحميل أرقام المراجعة:', err); })));
const setBadge = (key, n) => {
const el = document.querySelector(`.admin-panel-page [data-badge-key="${key}"]`);
if (!el || !n) return;
el.textContent = n > 99 ? '99+' : String(n);
el.classList.remove('hidden');
};
setBadge('inbox-unread', counts.inbox);
setBadge('ideas-review', counts.ideas);
setBadge('occasions-review', counts.occasions);
_renderReviewQueue(counts, failed);
}
function _renderReviewQueue(counts, failed) {
const list = document.getElementById('admin-review-list');
if (!list) return;
const rows = [
{ n: counts.inbox,     icon: 'inbox',     page: 'admin-inbox',    text: n => `${n} رسالة جديدة من الأهالي`,     sub: 'مساهمات أو بلاغات ما اتراجعت' },
{ n: counts.ideas,     icon: 'lightbulb', page: 'admin-idea-box', text: n => `${n} فكرة بانتظار المراجعة`,      sub: 'جديدة أو مخفية بالبلاغات — ما تظهر للناس قبل موافقتك' },
{ n: counts.occasions, icon: 'flower-2',  page: 'admin-occasions', text: n => `${n} مناسبة بانتظار المراجعة`,   sub: 'جديدة أو مخفية بالبلاغات — ما تظهر للناس قبل موافقتك' },
].filter(r => r.n > 0);
if (!rows.length) {
list.innerHTML = `
      <div class="settings-item" style="cursor:default">
        <div class="settings-icon"><span data-icon="check-circle"></span></div>
        <div class="settings-content">
          <h4>${failed ? 'حساب ما ينتظر مراجعتك لسع ما اكتمل' : 'ما في شيء ينتظر مراجعتك'}</h4>
          ${failed ? '<p>افتح الأقسام بنفسك للتأكد.</p>' : ''}
        </div>
      </div>`;
renderIcons();
return;
}
list.innerHTML = rows.map(r => `
    <div class="settings-item" data-review-page="${r.page}" style="cursor:pointer">
      <div class="settings-icon"><span data-icon="${r.icon}"></span></div>
      <div class="settings-content">
        <h4>${r.text(r.n)}</h4>
        <p>${r.sub}</p>
      </div>
    </div>`).join('');
renderIcons();
list.querySelectorAll('[data-review-page]').forEach(el => {
el.addEventListener('click', async () => {
const { navigateTo } = await import('../../core/router.js');
navigateTo(el.dataset.reviewPage);
});
});
}
