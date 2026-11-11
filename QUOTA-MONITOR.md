# مراقبة الحصص

حدود الخطة المجانية (من supabase.com/pricing): قاعدة 500MB لكل مشروع، ملفات 1GB، نقل 5GB + 5GB مخزَّن مؤقتًا، مشروعان نشطان، إيقاف بعد أسبوع خمول. الحصة تُطبَّق على **المنظمة كلها** لا على كل مشروع على حدة.

## ما يعمل تلقائيًا (موجود أصلًا)
- رفع الصور يتحوّل للمشروع الثاني عند 940MB في الأول (`storage-overflow.js`).
- القراءة تتبدّل بين المشروعين والمضيفات عند التعثّر.
- `supabase-keepalive.yml` يمنع الإيقاف للخمول.

## الجديد: `quota-check.yml` (يوميًا)
يقيس القاعدة والملفات لكل مشروع. ≥70% تحذير في ملخص التشغيل، ≥90% تفشل المهمة فيصلك بريد من GitHub.

### الإعداد (مرة واحدة)
1. شغّل `supabase/migrations/20261109_quota_snapshot.sql` في SQL Editor لكل مشروع (دون الدالة تُقاس الملفات فقط).
2. GitHub ← Settings ← Secrets ← Actions ← سرّ `QUOTA_PROJECTS_JSON`:
   `[{"name":"akdar","url":"https://rtgrkugcokqxseedzunr.supabase.co","key":"<service_role>"},{"name":"akdar-storage","url":"https://qomxcmgtvyfdrzkkniwt.supabase.co","key":"<service_role>"}]`
3. Actions ← quota-check ← Run workflow للتجربة.

## ما لا يُقاس
**نقل البيانات (egress)**: لا تتيحه Supabase عبر أي واجهة برمجية (راجعت مرجع الـManagement API). راجعه يدويًا من Dashboard ← Organization ← Usage، وهو الأقرب للنفاد مع كثرة المستخدمين.
