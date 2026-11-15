# نسخة المساعد `ask` على Vercel — دليل التفعيل

## ما هي
نفس كود `supabase/functions/ask/index.ts` يعمل أيضًا كدالة Vercel على `https://akdar-nine.vercel.app/api/ask`.
- **مصدر واحد**: `build/prepare-vercel-api.js` ينسخ ملف Supabase إلى `dist/api/_ask-core.ts` وقت النشر، فلا يتباعد الكودان. عدّل `supabase/functions/ask/index.ts` فقط.
- **الغلاف** `vercel-api/ask.ts` يحاكي `Deno.env` و`Deno.serve` ويمرّر البثّ (SSE).
- تُنشر مع Vercel وحده: `deploy.sh` و`build/deploy-vercel.sh` وworkflow `refresh-mirror` كلها تجهّزها قبل النشر وتحذفها قبل Firebase/GitHub.
  (ضروري: كل نشر على Vercel يستبدل المنشور السابق، فنشر بلا هذه الخطوة يحذف الدالة.)
- العدّادات والكاش في قاعدة Supabase نفسها (`ai_rate_*`، `ai_cache`)، فسقف الموقع (800 يوميًا) وحدّ كل IP مشتركان بين النسختين.
  لو تعذّرت القاعدة تعود الدالة لعدّادات الذاكرة (أضعف).

## خطوات التفعيل
1. **أسرار Vercel**: لوحة Vercel ← مشروع `akdar` ← Settings ← Environment Variables (بيئة Production). بنفس أسماء أسرار Supabase:
   - `SUPABASE_URL` = `https://rtgrkugcokqxseedzunr.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` (من Supabase ← Settings ← API) — فعّل خيار **Sensitive**، وهو مفتاح قوي: لا تضعه في أي ملف.
   - `GEMINI_API_KEY` (مطلوب) و`GROQ_API_KEY` وغيرهما إن كنت تستعملها في Supabase. قيم أسرار Supabase لا تُقرأ من لوحتها، فاجلبها من مزوّديها أو من ملاحظاتك.
   - `ALLOWED_ORIGINS` = العناوين نفسها المضبوطة في Supabase (على الأقل `https://akdar-nine.vercel.app,https://akdargorup-netizen.github.io`). المدرَج افتراضيًا في الكود: web.app وfirebaseapp.com وlocalhost.
   - اختياري: `DAILY_CAP`، `PER_IP_PER_MIN`، `PER_IP_PER_DAY`، `GEMINI_MODEL`... (الافتراضيات كما في الرأس بأعلى `index.ts`).
2. **انشر**: `bash deploy.sh --only vercel` (يبني ثم ينشر؛ أو `bash build/deploy-vercel.sh`).
3. **اختبر** (بدّل العنوان إن اختلف):
   ```
   curl -s -X POST https://akdar-nine.vercel.app/api/ask -H 'Content-Type: application/json' -H 'Origin: https://akdar-nine.vercel.app' -d '{"mode":"warm"}'
   ```
   يجب أن يردّ `{"ok":true}`. ثم اختبر سؤالًا حقيقيًا من التطبيق، وبثًّا: أضف `"stream":true` وأرسل `-N` مع curl وانظر أن النص يصل تدريجيًا.
   - لو ردّ صفحة HTML لتسجيل الدخول: عطّل **Vercel Authentication / Deployment Protection** لبيئة Production.
   - لو ردّ 500 `server-error`: افتح Vercel ← Logs ← Functions (غالبًا سر ناقص).
4. **فعّل التبديل** في `content/remote-config.json` (ثم ارفع `v` وانشر):
   - احتياطًا فقط (Supabase أولًا): `"endpoints": ["<supabase>/functions/v1/ask", "https://akdar-nine.vercel.app/api/ask"]`
   - لتخفيف حمل Supabase (Vercel أولًا): اعكس الترتيب. النتيجة نفسها عند التعطل، والفرق في من يحمل الحمل العادي.

## حدود يجب أن تعرفها
- Vercel Hobby للاستعمال غير التجاري، وله حدود استدعاءات وزمن تشغيل شهرية؛ راقب صفحة Usage بعد أسبوعين.
- أول طلب بعد خمول أبطأ (بداية باردة)؛ `warmAskFunction` يوقظ النسخة الأولى فقط.
- النسخة تحمل مفتاح الخدمة في بيئة Vercel: ما يزال حقن الأسرار هناك قرارًا أمنيًا يخصّك. يُنصح بتدوير المفتاح لو شُكّ بتسريبه.
- **لوحة الإدارة** (`mode:'admin'`) لا تزال تتجه إلى Supabase وحده عمدًا.
- لم تُختبر على Vercel حيّة بعد؛ اختبرتُ الغلاف والدالة محليًا بطلبات محاكاة (CORS، warm، جسم مُحلَّل مسبقًا، رفض الأصل الغريب).
