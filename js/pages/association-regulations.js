export function renderAssociationRegulations() {
return `
    <section class="page association-regulations-page">

      <nav class="regs-filters" id="regs-filters" aria-label="فلاتر الصفحة">
        <button class="filter-chip active" data-filter="all">الكل</button>
        <button class="filter-chip" data-filter="regs-constitution">الدستور</button>
        <button class="filter-chip" data-filter="regs-bylaws">اللوائح الداخلية</button>
      </nav>

      <!-- ═══════════ الباب الأول: الدستور ═══════════ -->
      <article class="regs-doc" id="regs-constitution">
        <header class="regs-doc__header">
          <span class="regs-doc__eyebrow">الباب الأول</span>
          <h2 class="regs-doc__title">الدستور</h2>
          <p class="regs-doc__subtitle">النظام الأساسي لرابطة طلاب شبتوت بحري بالجامعات والمعاهد العليا.</p>
        </header>

        <section class="regs-chapter">
          <h3 class="regs-chapter__title"><span class="regs-chapter__num">1</span>أهداف الرابطة</h3>
          <ol class="regs-list">
            <li>تأسيس رابطة طلابية فاعلة مهتدية بهدي الدين الإسلامي والأعراف والتقاليد السودانية.</li>
            <li>توطيد علاقة الأخاء والترابط بين أعضاء الرابطة وتوثيق الروابط الاجتماعية فيما بينهم.</li>
            <li>الارتقاء بوعي الأعضاء وتعميق التزامهم الأخلاقي والسلوكي.</li>
            <li>المساهمة الجادة في خدمة أعضاء الرابطة ومساعدتهم قدر المستطاع.</li>
            <li>العمل على الارتقاء بمستوى الأعضاء علمياً وأكاديمياً وثقافياً ورياضياً.</li>
            <li>نشر الثقافة وتنمية ورعاية المواهب المختلفة لدى الأعضاء.</li>
            <li>العمل الجاد بالنهوض بالمنطقة ثقافياً واجتماعياً ورياضياً.</li>
            <li>تقديم كافة الخدمات والسعي لإبراز الشخصية الاعتبارية للرابطة خاصة وللمنطقة عموماً.</li>
            <li>إثراء العمل الطوعي بالمنطقة والمشاركة فيها والعمل على الترابط بين الأعضاء.</li>
          </ol>
        </section>

        <section class="regs-chapter">
          <h3 class="regs-chapter__title"><span class="regs-chapter__num">2</span>وسائل تحقيق الأهداف</h3>
          <ol class="regs-list">
            <li>إقامة الندوات والمحاضرات الثقافية والعلمية والإسلامية.</li>
            <li>إقامة الكورسات والدورات العلمية والعملية لطلاب المراحل الدراسية المختلفة.</li>
            <li>إقامة المخيمات والمهرجانات والمنافسات الثقافية والعلمية والرياضية.</li>
            <li>تنظيم وتسيير القوافل الخدمية بالمنطقة.</li>
            <li>العمل على إصلاح البيئة بالمنطقة بجانب الاهتمام بالأنشطة المختلفة.</li>
            <li>القيام بالمشاريع الاستثمارية التي تدر بفائدة على الرابطة خاصة والمنطقة عامة.</li>
            <li>التعاون والتنسيق مع الروابط والاتحادات الطلابية الأخرى والجهات الخيرية بهدف تبادل اكتساب الخبرات.</li>
            <li>أي وسائل أخرى تراها الرابطة مناسبة.</li>
          </ol>
        </section>

        <section class="regs-chapter regs-chapter--last">
          <h3 class="regs-chapter__title"><span class="regs-chapter__num">3</span>أجهزة الرابطة</h3>
          <p class="regs-text">تتكون أجهزة الرابطة من:</p>
          <ul class="regs-list">
            <li>الجمعية العمومية</li>
            <li>لجنة الشورى</li>
            <li>اللجنة التنفيذية</li>
            <li>اللجان المساعدة</li>
          </ul>
        </section>
      </article>

      <div class="regs-divider" aria-hidden="true"><span class="regs-divider__ornament"></span></div>

      <!-- ═══════════ الباب الثاني: اللوائح الداخلية ═══════════ -->
      <article class="regs-doc" id="regs-bylaws">
        <header class="regs-doc__header">
          <span class="regs-doc__eyebrow">الباب الثاني</span>
          <h2 class="regs-doc__title">اللوائح الداخلية</h2>
          <p class="regs-doc__subtitle">
            لائحة المكتب التنفيذي لرابطة طلاب شبتوت بحري بالجامعات والمعاهد العليا،
            يُعمل بها من تاريخ اعتمادها في أول اجتماع للمكتب التنفيذي.
          </p>
        </header>

        <section class="regs-chapter">
          <h3 class="regs-chapter__title"><span class="regs-chapter__num">1</span>صلاحيات الضباط الثلاثة</h3>

          <article class="regs-card">
            <h4 class="regs-card__title">رئيس الرابطة</h4>
            <ul class="regs-list regs-list--tight">
              <li>يرأس كل اجتماعات المكتب التنفيذي.</li>
              <li>يمثل الرابطة في كل المحافل الخارجية.</li>
              <li>يستلم كل الخطابات الرسمية للرابطة.</li>
              <li>التوقيع الأساسي لدى البنك.</li>
              <li>طرح مشاريع وبرامج للرابطة دون التعسف في استخدام هذا البند.</li>
              <li>يجوز له اتخاذ ما يراه مناسباً من القرارات.</li>
              <li>يكون له صوت إضافي مرجح في حالة تساوي الأصوات عند طرح قرار للتصويت.</li>
            </ul>
          </article>

          <article class="regs-card">
            <h4 class="regs-card__title">الأمين العام</h4>
            <ul class="regs-list regs-list--tight">
              <li>لديه التوقيع الأساسي لدى البنك.</li>
              <li>تحديد زمن ومكان الاجتماع بالتنسيق مع الرئيس.</li>
              <li>لديه ختم الرابطة.</li>
              <li>يقوم بكتابة المحضر في كل الاجتماعات.</li>
              <li>الإشراف العام على الأمانات.</li>
              <li>متابعة تكاليف المكتب التنفيذي وتكاليف الرئيس.</li>
              <li>يرد على كل المكاتبات والدعوات الرسمية للرابطة.</li>
              <li>يكون بحوزته كل أصول الرابطة.</li>
              <li>التبليغ عن الاجتماعات الدورية للرابطة.</li>
            </ul>
          </article>

          <article class="regs-card">
            <h4 class="regs-card__title">الأمين المالي</h4>
            <ul class="regs-list regs-list--tight">
              <li>التوقيع الأساسي لدى البنك.</li>
              <li>جلب المال بالطرق المشروعة.</li>
              <li>الاحتفاظ بأموال الرابطة.</li>
              <li>الإشراف على تنفيذ الميزانية السنوية للرابطة.</li>
            </ul>
          </article>
        </section>

        <section class="regs-chapter">
          <h3 class="regs-chapter__title"><span class="regs-chapter__num">2</span>اجتماعات المكتب</h3>

          <article class="regs-card">
            <h4 class="regs-card__title">الاجتماع الدوري</h4>
            <ul class="regs-list regs-list--tight">
              <li>يكون بشكل دوري يحدده المكتب زماناً ومكاناً.</li>
              <li>ينعقد مرتين على الأقل في كل شهر.</li>
              <li>يقوم الأمين العام بالتبليغ عنه قبل 24 ساعة بالاتصال ثم التذكير عبر الوسائط المتاحة.</li>
              <li>في حالة الاعتذار يجب أن يكون قبل 24 ساعة.</li>
            </ul>
          </article>

          <article class="regs-card">
            <h4 class="regs-card__title">الاجتماع الطارئ</h4>
            <p class="regs-text regs-text--tight">يبلّغ عنه الرئيس ونصابه بمن حضر.</p>
          </article>

          <article class="regs-card">
            <h4 class="regs-card__title">اجتماع الضباط الثلاثة</h4>
            <ul class="regs-list regs-list--tight">
              <li>زمن الاجتماع ساعة ونص، وزيادته متروكة للرئيس والأمين العام.</li>
              <li>إذا حضر العضو بعد نصف ساعة يُعتبر غياباً مع مراعاة سبب التأخير.</li>
              <li>يُمنع من الاطلاع على محضر الاجتماع ومخرجاته في حالة الغياب.</li>
            </ul>
          </article>
        </section>

        <section class="regs-chapter">
          <h3 class="regs-chapter__title"><span class="regs-chapter__num">3</span>أمانات المكتب التنفيذي</h3>

          <article class="regs-card">
            <h4 class="regs-card__title">الأمانة الاجتماعية</h4>
            <ul class="regs-list regs-list--tight">
              <li>حصر عدد العضوية.</li>
              <li>دعم رسوم الطلاب.</li>
              <li>إقامة جلسات أسرية.</li>
              <li>عمل قوافل صحية وأكاديمية.</li>
              <li>إفطارات رمضان.</li>
            </ul>
          </article>

          <article class="regs-card">
            <h4 class="regs-card__title">الأمانة الأكاديمية</h4>
            <ul class="regs-list regs-list--tight">
              <li>عمل كورسات تقوية.</li>
              <li>عمل قوافل أكاديمية.</li>
              <li>دعم الطلاب.</li>
              <li>دعم المدارس.</li>
            </ul>
          </article>

          <article class="regs-card">
            <h4 class="regs-card__title">الأمانة الثقافية</h4>
            <ul class="regs-list regs-list--tight">
              <li>عمل برامج ثقافية.</li>
              <li>المهرجان الثانوي.</li>
              <li>استقبال الطلاب الجدد.</li>
              <li>وداع الخريجين.</li>
              <li>عمل ندوات ثقافية.</li>
            </ul>
          </article>

          <article class="regs-card">
            <h4 class="regs-card__title">أمانة الإسكان</h4>
            <ul class="regs-list regs-list--tight">
              <li>إدارة سكن الطلاب.</li>
              <li>عمل صيانة دورية للسكن.</li>
            </ul>
          </article>

          <article class="regs-card">
            <h4 class="regs-card__title">الأمانة الرياضية</h4>
            <ul class="regs-list regs-list--tight">
              <li>عمل دورات رياضية.</li>
              <li>دعم كل المحافل الرياضية.</li>
            </ul>
          </article>

          <article class="regs-card">
            <h4 class="regs-card__title">الأمانة الإعلامية</h4>
            <p class="regs-text regs-text--tight">تغطية كل مناشط الرابطة إعلامياً عبر كل وسائل التواصل المتاحة.</p>
          </article>
        </section>

        <section class="regs-chapter">
          <h3 class="regs-chapter__title"><span class="regs-chapter__num">4</span>خطة سير الاجتماع</h3>
          <article class="regs-card">
            <ol class="regs-list regs-list--tight">
              <li>الافتتاح.</li>
              <li>تقرير الأمانة العامة بالحضور والغياب والاعتذار.</li>
              <li>مراجعة تكاليف المكتب والرئيس للاجتماع السابق.</li>
              <li>أجندة الاجتماع.</li>
              <li>تُتم إجازة البنود السابقة وأجندة الاجتماع ثم الشروع في الإجازة.</li>
            </ol>
          </article>
        </section>

        <section class="regs-chapter">
          <h3 class="regs-chapter__title"><span class="regs-chapter__num">5</span>فقدان العضوية في المكتب التنفيذي</h3>
          <article class="regs-card">
            <ol class="regs-list regs-list--tight">
              <li>إذا غاب العضو عن ثلاثة اجتماعات متتالية يجوز للرئيس تكوين لجنة محاسبة وفق إجراءات الجزاءات والمحاسبة.</li>
              <li>إذا غاب العضو عن أربعة اجتماعات خلال الدورة يجوز للرئيس تكوين لجنة محاسبة وفق بند الجزاءات.</li>
              <li>فقدان الأهلية.</li>
              <li>إفشاء أسرار المكتب التنفيذي وإساءة التعامل داخل المكتب.</li>
              <li>جريمة تمس الشرف والأمانة.</li>
              <li>عدم تنفيذ أو تعويق قرارات المكتب التنفيذي.</li>
            </ol>
          </article>
        </section>

        <section class="regs-chapter regs-chapter--last">
          <h3 class="regs-chapter__title"><span class="regs-chapter__num">6</span>إجراءات المحاسبة والجزاءات</h3>
          <article class="regs-card">
            <p class="regs-text regs-text--tight">
              في حالة مخالفة بنود هذه اللائحة من أي من أعضاء المكتب التنفيذي،
              يجوز لرئيس الرابطة تكوين لجنة محاسبة بحيث توقع على العضو المخالف
              إحدى الجزاءات التالية:
            </p>
            <ul class="regs-list regs-list--tight">
              <li>لفت النظر.</li>
              <li>تجميد العضوية لمدة لا تزيد عن 6 أشهر.</li>
              <li>فقدان عضوية المكتب التنفيذي.</li>
            </ul>
          </article>
        </section>
      </article>

    </section>
  `;
}
export function initAssociationRegulations() {
const page = document.querySelector('.association-regulations-page');
if (!page) return;
const filterBar = page.querySelector('#regs-filters');
if (!filterBar) return;
const docs = {
'regs-constitution': page.querySelector('#regs-constitution'),
'regs-bylaws': page.querySelector('#regs-bylaws'),
};
const divider = page.querySelector('.regs-divider');
filterBar.querySelectorAll('.filter-chip').forEach(chip => {
chip.addEventListener('click', () => {
filterBar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
chip.classList.add('active');
const key = chip.dataset.filter;
if (key === 'all') {
Object.values(docs).forEach(doc => doc?.removeAttribute('hidden'));
divider?.removeAttribute('hidden');
} else {
Object.entries(docs).forEach(([docKey, doc]) => {
if (!doc) return;
docKey === key ? doc.removeAttribute('hidden') : doc.setAttribute('hidden', '');
});
divider?.setAttribute('hidden', '');
}
docs[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
if (key === 'all') filterBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
});
}
