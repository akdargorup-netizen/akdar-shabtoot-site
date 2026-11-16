# مشروع التخزين الاحتياطي (Supabase الثاني) — خطوات الإعداد

الفكرة: المشروع الأول يبقى الأساس. حين يقترب من ١ جيجا يبدأ الرفع **الجديد** (صور وصوت) بالذهاب إلى المشروع الثاني
(١ جيجا إضافية). الملفات القديمة لا تُنقل وروابطها تبقى تعمل. إلى أن تضع `STORAGE2_URL` تبقى الميزة معطّلة بالكامل.

## ١) في المشروع الثاني (Supabase → New project، سمّه `akdar-storage`)
شغّل هذا في SQL Editor (يُنشئ الحاويتين العامتين بنفس حدود الأول، ولا يسمح بأي رفع مباشر):

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
 ('akdar-images','akdar-images',true,1048576,array['image/webp','image/jpeg','image/png']),
 ('akdar-audio','akdar-audio',true,102400,array['audio/mp4','audio/x-m4a','audio/aac','audio/mpeg'])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
```
القراءة عامة تلقائيًا للحاوية العامة. لا تنشئ أي سياسة رفع: الرفع يتم برابط موقّع من الدالة فقط.

من Project Settings → API في المشروع الثاني انسخ: **Project URL** و**service_role / secret key**.

## ٢) في المشروع الأول
1. SQL Editor: شغّل `supabase/migrations/20261108_storage_overflow.sql`.
2. Edge Functions → Secrets: أضف `STORAGE2_URL` (عنوان المشروع الثاني) و`STORAGE2_SERVICE_KEY` (المفتاح السرّي).
3. انشر الدالة: يتم تلقائيًا من GitHub Actions (`deploy-functions`) عند دفع هذا التعديل، وVerify JWT معطّل.

## ٣) في الكود
1. في `js/data/storage-overflow.js` ضع عنوان المشروع الثاني في `STORAGE2_URL`.
2. في `firebase.json` أضف عنوان المشروع الثاني إلى `connect-src` (بجانب `https://rtgrkugcokqxseedzunr.supabase.co`).
3. انشر التطبيق.

## ٤) اختبار سريع
- ارفع صورة ومقطعًا صوتيًا ثم افتحهما: يبقيان في الأول ما دام الاستهلاك دون ٩٤٠ ميجابايت.
- للتجربة: خفّض `SWITCH_AT_BYTES` مؤقتًا إلى `1` فيذهب أي رفع جديد إلى الثاني، وتأكد من ظهوره في Storage → akdar-images/akdar-audio في المشروع الثاني، ثم أعد القيمة.

## ملاحظات
- مسارات الصوت المخزَّنة في الثاني تبدأ بـ `s2/` (تُقرأ من الثاني تلقائيًا). لا تغيّر هذه البادئة.
- الخطة المجانية توقف المشروع بعد أسبوع بلا نشاط: أضف المشروع الثاني إلى `.github/workflows/supabase-keepalive.yml`.
- النسخ الاحتياطي: `scripts/admin/backup-images.mjs` يعمل على المشروع الأول فقط؛ شغّله على الثاني بمفاتيحه عند الحاجة.
