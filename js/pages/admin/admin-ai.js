import { getAiAdminStatus, testAiProvider, getAiInsights } from '../../shared/ai-admin.js';
import { escapeHtml } from '../../shared/sanitize.js';
import { renderIcons } from '../../shared/icons.js';
import { showToast } from '../../shared/toast.js';
const DEFAULT_QUESTION = 'عرّف لي بشبتوت بحري في جملتين.';
const FAIL_TEXT = {
quota: 'الحصة نفدت (429) — انتظر أو استعمل مزوّدًا آخر',
'key-rejected': 'المفتاح مرفوض — راجع السر في Supabase',
'model-missing': 'اسم النموذج غير موجود عند المزوّد',
'no-key': 'ما فيه مفتاح مضبوط لهذا المزوّد',
timeout: 'انتهت المهلة قبل ما يرد',
'provider-down': 'المزوّد نفسه معطّل الآن',
'empty-reply': 'رد فارغ (النموذج ما أرجع نصًا)',
'network-out': 'الخادم ما قدر يوصل للمزوّد',
'bad-request': 'المزوّد رفض الطلب (400)',
'not-available': 'المزوّد غير مضبوط في الدالة',
unknown: 'سبب غير معروف — راجع Logs الدالة',
};
let _slots = [];
let _busy = false;
export function renderAdminAi() {
return `
    <section class="page admin-ai-page">

      <div class="admin-content-toolbar">
        <p>
          راقب حصة كل مزوّد وجرّب أي نموذج بسؤال حقيقي قبل ما تعتمده.
          الأرقام تُحسب من الاستعمال الفعلي للمساعد، ولا تظهر هنا أي مفاتيح.
        </p>
      </div>

      <div class="admin-group">
        <div class="admin-group__label-row">
          <span class="admin-group__label">حالة المزوّدين والحصة</span>
          <button class="btn btn--secondary btn--sm" id="admin-ai-refresh">حدّث</button>
        </div>
        <div class="settings-list" id="admin-ai-status" aria-live="polite">
          <div class="settings-item" style="cursor:default"><div class="settings-content"><h4>قاعدين نجيب الحالة...</h4></div></div>
        </div>
        <p class="admin-section-note" id="admin-ai-status-note"></p>
      </div>

      <div class="admin-group">
        <div class="admin-group__label-row">
          <span class="admin-group__label">ما يسأل عنه الناس ولا نجد له جوابًا</span>
          <button class="btn btn--secondary btn--sm" id="admin-ai-insights-refresh">حدّث</button>
        </div>
        <div class="settings-list" id="admin-ai-unanswered" aria-live="polite">
          <div class="settings-item" style="cursor:default"><div class="settings-content"><h4>قاعدين نجيب الأسئلة...</h4></div></div>
        </div>
        <p class="admin-section-note">الأسئلة التي ردّ عليها المساعد بـ«لا توجد معلومة» مجمّعة ومعدودة (بلا أسماء ولا هويات). اكتب المحتوى الناقص للأكثر تكرارًا أولًا.</p>
      </div>

      <div class="admin-group">
        <div class="admin-group__label-row">
          <span class="admin-group__label">تقييم الإجابات</span>
        </div>
        <div class="settings-list" id="admin-ai-feedback" aria-live="polite"></div>
      </div>

      <div class="admin-group">
        <div class="admin-group__label-row">
          <span class="admin-group__label">جرّب نموذجًا</span>
        </div>
        <div class="admin-ai-form">
          <div class="input-group">
            <label class="input-label" for="admin-ai-provider">المزوّد</label>
            <select class="input" id="admin-ai-provider" disabled></select>
          </div>
          <div class="input-group">
            <label class="input-label" for="admin-ai-question">السؤال</label>
            <textarea class="input" id="admin-ai-question" rows="3" maxlength="300">${escapeHtml(DEFAULT_QUESTION)}</textarea>
          </div>
          <button class="btn btn--primary btn--full" id="admin-ai-run" disabled>
            <i data-lucide="play"></i>
            جرّب
          </button>
          <button class="btn btn--secondary btn--full" id="admin-ai-compare" disabled>
            <i data-lucide="columns-2"></i>
            قارن كل المزوّدين
          </button>
          <p class="admin-section-note admin-ai-form__note">كل تجربة تستهلك من حصة المزوّد فعلًا (طلب واحد لكل مزوّد).</p>
        </div>
        <div class="admin-ai-results" id="admin-ai-results" aria-live="polite"></div>
      </div>

    </section>
  `;
}
export async function initAdminAi() {
const page = document.querySelector('.admin-ai-page');
if (!page) return;
page.querySelector('#admin-ai-refresh')?.addEventListener('click', () => _loadStatus(page));
page.querySelector('#admin-ai-run')?.addEventListener('click', () => _runSingle(page));
page.querySelector('#admin-ai-compare')?.addEventListener('click', () => _runCompare(page));
page.querySelector('#admin-ai-insights-refresh')?.addEventListener('click', () => _loadInsights(page));
renderIcons?.();
await _loadStatus(page);
_loadInsights(page);
}
async function _loadInsights(page) {
const box = page.querySelector('#admin-ai-unanswered');
const fbBox = page.querySelector('#admin-ai-feedback');
if (!box) return;
const btn = page.querySelector('#admin-ai-insights-refresh');
if (btn) btn.disabled = true;
const card = (title, body = '', badge = '') => `
    <div class="settings-item" style="cursor:default">
      <div class="settings-content"><h4 dir="auto">${escapeHtml(title)}</h4>${body}</div>${badge}
    </div>`;
try {
const r = await getAiInsights();
if (!r?.ok) {
const why = r?.reason === 'http-404' || r?.reason === 'http-401' || /http-4/.test(String(r?.reason))
? 'الجدولان لسع ما جهزوا — شغّل ملف 20261105_ai_insights.sql في Supabase.'
: 'تعذّر جلب البيانات.';
box.innerHTML = card('ما قدرنا نجيب الأسئلة', `<p>${escapeHtml(why)}</p>`);
if (fbBox) fbBox.innerHTML = '';
return;
}
const list = Array.isArray(r.unanswered) ? r.unanswered : [];
box.innerHTML = list.length
? list.map((u) => card(u.question, `<p>آخر مرة: ${_ago(u.last_at)}</p>`, `<span class="badge badge--warning">${Number(u.cnt) || 1}×</span>`)).join('')
: card('ما فيه أسئلة بلا جواب حتى الآن', '<p>كل ما سُئل وجد المساعد له جوابًا (أو لسع ما فيه استعمال).</p>');
if (fbBox) {
const fb = r.feedback || { up: 0, down: 0, recent_down: [] };
const total = (fb.up || 0) + (fb.down || 0);
let html = card(total ? `👍 ${fb.up}  —  👎 ${fb.down}` : 'لسع ما فيه تقييمات', total ? `<p>من آخر ${Number(fb.sample) || total} تقييم.</p>` : '');
(fb.recent_down || []).forEach((d) => {
html += card(d.question, `<p dir="auto">${escapeHtml(String(d.answer || '').slice(0, 220))}</p><p>${_ago(d.at)}</p>`, '<span class="badge badge--error">👎</span>');
});
fbBox.innerHTML = html;
}
} catch (err) {
console.error('[AdminAi] فشل جلب الرؤى:', err);
box.innerHTML = card('ما قدرنا نجيب الأسئلة', `<p>${escapeHtml(_errorText(err))}</p>`);
} finally {
if (btn) btn.disabled = false;
}
}
function _errorText(err) {
if (err?.code === 'no-session') return 'سجّل دخول بحساب المالك (Google) أولًا.';
if (err?.code === 'forbidden') return `رُفض الطلب${err.reason ? ` (السبب: ${err.reason})` : ''} — الصفحة لحساب المالك فقط.`;
if (err?.code === 'rate-limited') return 'طلبات كثيرة — انتظر دقيقة وأعد المحاولة.';
if (err?.code === 'timeout') return 'الخادم تأخر في الرد — أعد المحاولة.';
if (String(err?.message || '').startsWith('http-404')) return 'الدالة ask غير محدّثة — أعد نشرها.';
return 'تعذّر جلب الحالة. تأكد أن الدالة ask منشورة بآخر نسخة.';
}
function _ago(iso) {
const t = Date.parse(iso || '');
if (!Number.isFinite(t)) return '';
const m = Math.max(0, Math.round((Date.now() - t) / 60000));
if (m < 1) return 'قبل لحظات';
if (m < 60) return `قبل ${m} دقيقة`;
const h = Math.round(m / 60);
if (h < 24) return `قبل ${h} ساعة`;
return `قبل ${Math.round(h / 24)} يوم`;
}
function _summarize(slot, rows, today) {
const mine = rows.filter((r) => r.provider === slot.id);
const sum = (key, list) => list.reduce((a, r) => a + (Number(r[key]) || 0), 0);
const t = mine.filter((r) => r.day === today);
const lastQuota = mine.map((r) => r.last_quota_at).filter(Boolean).sort().pop() || '';
const rl = mine.filter((r) => r.rl_seen_at).sort((a, b) => String(b.rl_seen_at).localeCompare(String(a.rl_seen_at)))[0] || null;
return {
today: { ok: sum('ok', t), quota: sum('quota', t), fail: sum('fail', t) },
week:  { ok: sum('ok', mine), quota: sum('quota', mine), fail: sum('fail', mine) },
lastQuota,
rl,
};
}
function _stateBadge(slot) {
if (!slot.configured) return '<span class="badge badge--default">ما فيه مفتاح</span>';
if (slot.down_s > 0) return `<span class="badge badge--warning">استراحة ${slot.down_s} ث</span>`;
return '<span class="badge badge--brand">جاهز</span>';
}
function _rateLine(rl) {
if (!rl || rl.rl_remaining == null) return '';
const rem = Number(rl.rl_remaining);
const lim = Number(rl.rl_limit);
const pct = lim > 0 ? Math.round((rem / lim) * 100) : null;
const level = pct == null ? 'badge--default' : pct <= 10 ? 'badge--error' : pct <= 30 ? 'badge--warning' : 'badge--brand';
const reset = rl.rl_reset ? ` — يتجدد بعد ${escapeHtml(String(rl.rl_reset))}` : '';
const of = lim > 0 ? ` من ${lim}` : '';
return `<p>المتبقي كما أبلغ المزوّد: <span class="badge ${level}">${rem}${of}</span>${reset} (${_ago(rl.rl_seen_at)})</p>`;
}
async function _loadStatus(page) {
const box = page.querySelector('#admin-ai-status');
const note = page.querySelector('#admin-ai-status-note');
if (!box) return;
const btn = page.querySelector('#admin-ai-refresh');
if (btn) btn.disabled = true;
try {
const st = await getAiAdminStatus();
_slots = Array.isArray(st.slots) ? st.slots : [];
const rows = Array.isArray(st.usage) ? st.usage : [];
box.innerHTML = _slots.map((slot) => {
const sm = _summarize(slot, rows, st.today);
const usageLines = st.usage_ok
? `<p>اليوم: نجح ${sm.today.ok} — حصة ${sm.today.quota} — فشل ${sm.today.fail}</p>
           <p>آخر 7 أيام: نجح ${sm.week.ok} — حصة ${sm.week.quota} — فشل ${sm.week.fail}</p>
           ${sm.lastQuota ? `<p>آخر مرة نفدت فيها الحصة: ${_ago(sm.lastQuota)}</p>` : ''}
           ${_rateLine(sm.rl)}`
: '';
return `
        <div class="settings-item" style="cursor:default">
          <div class="settings-content">
            <h4 dir="auto">${escapeHtml(slot.label)}</h4>
            ${usageLines}
          </div>
          ${_stateBadge(slot)}
        </div>`;
}).join('');
const notes = [`سقف الموقع اليومي للمساعد: ${Number(st.daily_cap) || '—'} طلب.`];
if (st.site_today !== null && st.site_today !== undefined) {
notes.push(`المحسوب اليوم: ${Number(st.site_today)} طلب، وتقدير التوكنات المرسلة للنماذج: ${Number(st.tokens_est_today || 0).toLocaleString('en-US')} (تقريبي).`);
} else {
notes.push('العدّاد الدائم غير مفعّل بعد — شغّل ملف 20261106_ai_rate_limit.sql في Supabase.');
}
if (!st.usage_ok) notes.unshift('عدّادات المزوّدين لسع ما جهزت — شغّل ملف 20261103_ai_provider_usage.sql في Supabase.');
notes.push('حالة «استراحة» تخص نسخة الدالة الدافئة الحالية فقط.');
if (note) note.textContent = notes.join(' ');
_fillProviders(page);
} catch (err) {
console.error('[AdminAi] فشل جلب الحالة:', err);
box.innerHTML = `
      <div class="settings-item" style="cursor:default">
        <div class="settings-content"><h4>ما قدرنا نجيب الحالة</h4><p>${escapeHtml(_errorText(err))}</p></div>
      </div>`;
if (note) note.textContent = '';
} finally {
if (btn) btn.disabled = false;
}
}
function _fillProviders(page) {
const sel = page.querySelector('#admin-ai-provider');
const run = page.querySelector('#admin-ai-run');
const cmp = page.querySelector('#admin-ai-compare');
if (!sel) return;
const usable = _slots.filter((s) => s.configured);
const prev = sel.value;
sel.innerHTML = usable.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.label)}</option>`).join('');
if (prev && usable.some((s) => s.id === prev)) sel.value = prev;
sel.disabled = !usable.length || _busy;
if (run) run.disabled = !usable.length || _busy;
if (cmp) cmp.disabled = usable.length < 2 || _busy;
}
function _setBusy(page, busy) {
_busy = busy;
_fillProviders(page);
const refresh = page.querySelector('#admin-ai-refresh');
if (refresh) refresh.disabled = busy;
}
function _questionOf(page) {
const q = (page.querySelector('#admin-ai-question')?.value || '').replace(/\s+/g, ' ').trim();
if (!q) showToast?.('اكتب سؤالًا أولًا.');
return q;
}
function _labelOf(id) {
return _slots.find((s) => s.id === id)?.label || id;
}
function _resultCard(id, state) {
if (state.pending) {
return `<div class="admin-ai-result admin-ai-result--pending" data-id="${escapeHtml(id)}">
      <div class="admin-ai-result__head"><strong dir="auto">${escapeHtml(_labelOf(id))}</strong><span class="badge badge--info">قاعدين نسأل...</span></div>
    </div>`;
}
const secs = `${(Number(state.ms || 0) / 1000).toFixed(1)} ث`;
if (!state.ok) {
const why = FAIL_TEXT[state.detail] || FAIL_TEXT.unknown;
return `<div class="admin-ai-result admin-ai-result--fail" data-id="${escapeHtml(id)}">
      <div class="admin-ai-result__head"><strong dir="auto">${escapeHtml(_labelOf(id))}</strong><span class="badge badge--error">فشل</span></div>
      <p class="admin-ai-result__meta">${escapeHtml(why)} (${escapeHtml(String(state.detail || ''))}) — ${secs}</p>
    </div>`;
}
const rate = state.rate && state.rate.remaining != null
? ` — المتبقي: ${Number(state.rate.remaining)}${state.rate.limit ? ' من ' + Number(state.rate.limit) : ''}`
: '';
return `<div class="admin-ai-result admin-ai-result--ok" data-id="${escapeHtml(id)}">
    <div class="admin-ai-result__head"><strong dir="auto">${escapeHtml(_labelOf(id))}</strong><span class="badge badge--brand">${secs}</span></div>
    <div class="admin-ai-result__answer" dir="auto">${escapeHtml(state.answer || '')}</div>
    <p class="admin-ai-result__meta">${(state.answer || '').length} حرف${escapeHtml(rate)}</p>
  </div>`;
}
async function _askOne(page, id, question, slotEl) {
slotEl.innerHTML = _resultCard(id, { pending: true });
try {
const r = await testAiProvider(id, question);
slotEl.innerHTML = _resultCard(id, r);
} catch (err) {
console.error('[AdminAi] فشل الاختبار:', err);
slotEl.innerHTML = `<div class="admin-ai-result admin-ai-result--fail">
      <div class="admin-ai-result__head"><strong dir="auto">${escapeHtml(_labelOf(id))}</strong><span class="badge badge--error">فشل</span></div>
      <p class="admin-ai-result__meta">${escapeHtml(_errorText(err))}</p>
    </div>`;
}
}
async function _runSingle(page) {
if (_busy) return;
const question = _questionOf(page);
const id = page.querySelector('#admin-ai-provider')?.value;
if (!question || !id) return;
const out = page.querySelector('#admin-ai-results');
out.innerHTML = '<div data-slot></div>';
_setBusy(page, true);
try { await _askOne(page, id, question, out.firstElementChild); }
finally { _setBusy(page, false); await _loadStatus(page); }
}
async function _runCompare(page) {
if (_busy) return;
const question = _questionOf(page);
if (!question) return;
const ids = _slots.filter((s) => s.configured).map((s) => s.id);
if (ids.length < 2) return;
const out = page.querySelector('#admin-ai-results');
out.innerHTML = ids.map(() => '<div data-slot></div>').join('');
_setBusy(page, true);
try {
const slots = [...out.children];
for (let i = 0; i < ids.length; i++) await _askOne(page, ids[i], question, slots[i]);
} finally { _setBusy(page, false); await _loadStatus(page); }
}
